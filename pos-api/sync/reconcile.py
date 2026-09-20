"""
Make this branch's database tally with the central (cloud) database.

    python reconcile.py            # dry run: prints what WOULD change, writes nothing
    python reconcile.py --apply    # performs the repair on the LOCAL database
    python reconcile.py --verify   # read-only tally, exit code 1 if anything disagrees
    python reconcile.py --status   # when the sync last pushed / pulled, and what is waiting

Inside the stack:   docker-compose exec sync python reconcile.py
From a dev machine: LOCAL_DATABASE_URL=mongodb://localhost:8003 python sync/reconcile.py

What --apply does (local database only — the central database is never written):
  1. Matches every local-only lookup record (a branch/user/role/... that central
     does not have under that _id) to its central twin by natural key.
  2. Rewrites every reference to the local id (transactions, users, reports,
     discounts...) to the central id, re-flagging changed sales documents so
     they upload with the corrected branch.
  3. Copies the local duplicates to `_reconcile_backup_<collection>_<time>` and
     removes them.
  4. Flags sales/report documents that were written before `_sync` stamping
     existed so the upstream sync finally uploads them.
Anything that cannot be matched unambiguously is listed and left untouched.
"""
import argparse
import datetime
import os
import sys

import pymongo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lookup_tally  # noqa: E402

LOOKUPS = lookup_tally.LOOKUPS


def _connect():
    local_url = os.getenv('LOCAL_DATABASE_URL')
    remote_url = os.getenv('REMOTE_DATABASE_URL')
    db_name = os.getenv('DATABASE', 'pos')
    if not local_url or not remote_url:
        sys.exit('LOCAL_DATABASE_URL and REMOTE_DATABASE_URL must both be set.')
    local = pymongo.MongoClient(local_url, serverSelectionTimeoutMS=8000)
    remote = pymongo.MongoClient(remote_url, serverSelectionTimeoutMS=8000)
    try:
        local.admin.command('ping')
        remote.admin.command('ping')
    except Exception as e:
        sys.exit(f'Cannot reach a database, nothing was changed: {e!r}')
    return local[db_name], remote[db_name]


_MANILA = datetime.timezone(datetime.timedelta(hours=8))


def _when(value):
    """'2026-09-21 03:10:42 (2 min ago)' for a stored UTC datetime, or 'never'."""
    if not value:
        return 'never'
    utc = value.replace(tzinfo=datetime.timezone.utc)
    seconds = int((datetime.datetime.now(datetime.timezone.utc) - utc).total_seconds())
    if seconds < 90:
        ago = f'{max(seconds, 0)} s ago'
    elif seconds < 5400:
        ago = f'{seconds // 60} min ago'
    elif seconds < 172800:
        ago = f'{seconds // 3600} h ago'
    else:
        ago = f'{seconds // 86400} days ago'
    return f'{utc.astimezone(_MANILA).strftime("%Y-%m-%d %I:%M:%S %p")} ({ago})'


def run_status(local_db):
    status = lookup_tally.sync_status(local_db)
    up, down = status['upstream'], status['downstream']
    print('Times are Asia/Manila.\n')
    print('UPLOAD (this branch -> cloud)')
    print(f'  last push (something uploaded) : {_when(up.get("last_push_at"))}')
    print(f'  last successful check          : {_when(up.get("last_success_at"))}')
    print(f'  last cycle                     : {_when(up.get("last_run_at"))}  pushed={up.get("pushed", "-")} failed={up.get("failed", "-")} conflicts={up.get("conflicts", "-")}')
    print('\nDOWNLOAD (cloud -> this branch)')
    print(f'  last pull (something came down): {_when(down.get("last_pull_at"))}')
    print(f'  last successful check          : {_when(down.get("last_success_at"))}')
    print(f'  last cycle                     : {_when(down.get("last_run_at"))}  pulled={down.get("pulled", "-")}')
    for label, meta in (('upload', up), ('download', down)):
        if meta.get('last_error_at') and meta.get('last_error_at') >= (meta.get('last_success_at') or meta['last_error_at']):
            print(f'\n!! LAST {label.upper()} FAILED {_when(meta["last_error_at"])}: {meta.get("last_error")}')
    print('\nWaiting to upload:', status['waiting_to_upload'] or 'nothing')
    print('Rejected by the cloud (conflict):', status['conflicts'] or 'none')
    if not up and not down:
        print('\nNo sync activity recorded yet. Is the sync container running?  docker-compose ps sync')


def _describe(doc):
    return f"{doc['_id']}  {doc.get('name') or doc.get('username') or ''}"


def run_verify(local_db, remote_db):
    report = lookup_tally.verify(remote_db, local_db, LOOKUPS)
    clean = True
    for title, section in (
        ('Local-only lookup records (not in central)', report['local_only_lookups']),
        ('References to ids central does not have', report['orphan_references']),
        ('Sales/report docs never flagged for upload', report['unstamped_upstream']),
        ('Docs central rejected (unique-index conflict, NOT uploaded; fix, then set _sync.status back to pending)', report['sync_conflicts']),
    ):
        print(f'\n{title}:')
        if not section:
            print('  none')
            continue
        clean = False
        for key, value in section.items():
            shown = len(value) if isinstance(value, list) else value
            print(f'  {key}: {shown}')
    print('\nTALLY OK' if clean else '\nTALLY MISMATCH')
    return clean


def run_reconcile(local_db, remote_db, apply):
    id_map, unmatched, ambiguous = lookup_tally.build_id_map(remote_db, local_db)

    print('Local records matched to a central twin (will be remapped):')
    if not id_map:
        print('  none')
    for name in lookup_tally.NATURAL_KEYS:
        for local_id, central_id in id_map.items():
            doc = local_db[name].find_one({'_id': lookup_tally.ObjectId(local_id)})
            if doc:
                print(f'  {name:18} {local_id}  ->  {central_id}   ({doc.get("name") or doc.get("username")})')

    for title, section in (('Unmatched local-only records (left untouched)', unmatched),
                           ('Ambiguous matches (left untouched)', ambiguous)):
        print(f'\n{title}:')
        if not section:
            print('  none')
        for name, items in section.items():
            for item in items:
                doc = item[0] if isinstance(item, tuple) else item
                print(f'  {name:18} {_describe(doc)}')

    changed = lookup_tally.rewrite_references(local_db, id_map, apply=apply)
    print('\nDocuments whose references are rewritten:')
    print('  none' if not changed else '\n'.join(f'  {k}: {v}' for k, v in changed.items()))

    removed = lookup_tally.backup_and_remove_strays(local_db, id_map, list(lookup_tally.NATURAL_KEYS), apply=apply)
    print('\nLocal duplicates removed (backed up first):')
    print('  none' if not removed else '\n'.join(f'  {k}: {v}' for k, v in removed.items()))

    if apply:
        flagged = lookup_tally.backfill_upstream_stamps(local_db)
    else:
        flagged = {n: local_db[n].count_documents({'_sync': {'$exists': False}})
                   for n in lookup_tally.UPSTREAM_COLLECTIONS if n in local_db.list_collection_names()}
        flagged = {k: v for k, v in flagged.items() if v}
    print('\nSales/report documents flagged for upload:')
    print('  none' if not flagged else '\n'.join(f'  {k}: {v}' for k, v in flagged.items()))

    print('\n' + ('APPLIED to the local database.' if apply else 'DRY RUN only. Re-run with --apply to make these changes.'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--apply', action='store_true', help='write the repair to the local database')
    parser.add_argument('--verify', action='store_true', help='read-only tally; exit 1 on mismatch')
    parser.add_argument('--status', action='store_true', help='when the sync last pushed/pulled, and what is waiting (local only)')
    args = parser.parse_args()

    if args.status:   # needs only the local database, so it works even when the cloud is unreachable
        if not os.getenv('LOCAL_DATABASE_URL'):
            sys.exit('LOCAL_DATABASE_URL must be set.')
        run_status(pymongo.MongoClient(os.getenv('LOCAL_DATABASE_URL'), serverSelectionTimeoutMS=8000)[os.getenv('DATABASE', 'pos')])
        sys.exit(0)

    local_db, remote_db = _connect()
    if args.verify:
        sys.exit(0 if run_verify(local_db, remote_db) else 1)
    run_reconcile(local_db, remote_db, apply=args.apply)
    if args.apply:
        print('\n--- verification after apply ---')
        sys.exit(0 if run_verify(local_db, remote_db) else 1)
