import datetime
import os
import time

import sys

import pymongo
import schedule
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lookup_tally  # noqa: E402

REMOTE_DATABASE_URL = os.getenv('REMOTE_DATABASE_URL')
LOCAL_DATABASE_URL = os.getenv('LOCAL_DATABASE_URL')
APP_ENV = os.getenv('APP_ENV')

# Only a real branch/central deployment may push data upstream. A developer's
# local .env pointed at a real REMOTE_DATABASE_URL (e.g. for testing against
# UAT) would otherwise let throwaway dev data reach it — there's no other
# check anywhere in the stack that stops that.
UPSTREAM_ALLOWED_ENVS = {'internal-production', 'production'}

def _redact(url):
  """Hide user:password in a connection string before it reaches the logs."""
  if not url or '@' not in url:
    return url
  scheme, _, rest = url.partition('://')
  return f"{scheme}://***@{rest.rsplit('@', 1)[1]}"


print('REMOTE_DATABASE_URL: ', _redact(REMOTE_DATABASE_URL))
print('LOCAL_DATABASE_URL: ', _redact(LOCAL_DATABASE_URL))

# Downstream (central -> branch) lookup/master-data collections. Single source
# of truth is lookup_tally.LOOKUPS (shared with seed.py and reconcile.py).
lookups = list(lookup_tally.LOOKUPS)

# A doc that failed to push isn't retried again until this many seconds have
# passed, so a persistently-unreachable remote doesn't spin the CPU re-trying
# the same handful of docs every 20 seconds.
RETRY_BACKOFF_SECONDS = 60

# Above this many failed attempts, keep retrying (financial/BIR-relevant
# records must never be silently dropped) but log loudly so it's visible in
# container logs instead of failing forever in silence.
ATTEMPTS_WARNING_THRESHOLD = 10

# Cap on how many pending docs one cycle pushes, per collection. Without this,
# a branch that's been offline for days and accumulated a large backlog would
# have its very first recovery cycle try to push everything at once — a long,
# unpredictable-duration cycle that delays every other collection and the
# next scheduled run. Capping keeps each cycle's duration bounded; a large
# backlog just drains over several 20s cycles instead of one giant one.
BATCH_SIZE = 200


# --- Connection management -------------------------------------------------
#
# MongoClient is thread-safe, long-lived, and pools/retries connections on
# its own — constructing a brand new client every 20s (the previous design)
# throws that away for nothing. Bigger problem it caused: constructing a
# client for a malformed/unreachable REMOTE_DATABASE_URL (e.g. an
# unconfigured mongodb+srv:// placeholder) raises immediately, and that call
# happened INSIDE downstream_sync_data()/upstream_sync_data(), unguarded, and
# downstream_sync_data() ran once unconditionally BEFORE the scheduler loop
# even started — so a bad remote config crashed the whole process before
# upstream sync ever got a chance to run, even though upstream doesn't
# depend on the remote being reachable at connection-construction time.
# Fixed by: building each client lazily, once, cached; a construction
# failure is logged and retried on the next cycle instead of crashing.

_clients = {}


def get_client(name, url):
  if name in _clients:
    return _clients[name]
  try:
    client = pymongo.MongoClient(url, serverSelectionTimeoutMS=5000)
    _clients[name] = client
    return client
  except Exception as e:
    print(f'[sync] Could not create {name} MongoDB client: {repr(e)}')
    return None


_MANILA = datetime.timezone(datetime.timedelta(hours=8))


def _stamp():
  """Human-readable current time (Asia/Manila) for log lines."""
  return datetime.datetime.now(_MANILA).strftime('%Y-%m-%d %I:%M:%S %p')


def _write_meta(local_db, meta_id, fields):
  """Record sync progress where `python reconcile.py --status` can read it.
  Never raises: bookkeeping must not be able to break syncing."""
  try:
    # Mongo stores dates in UTC. Add a Manila-time text copy next to each one
    # (last_push_at -> last_push_at_manila) so the raw record reads correctly too.
    for key, value in list(fields.items()):
      if key.endswith('_at') and isinstance(value, datetime.datetime):
        fields[f'{key}_manila'] = value.replace(tzinfo=datetime.timezone.utc).astimezone(_MANILA).strftime('%Y-%m-%d %I:%M:%S %p (Manila)')
    local_db['sync_meta'].update_one({'_id': meta_id}, {'$set': fields}, upsert=True)
  except Exception as e:
    print(f'[sync] Could not record {meta_id} status: {repr(e)}')


def push_pending(source_client: pymongo.MongoClient, source_db_name, dest_client: pymongo.MongoClient, dest_db_name):
  """Upstream sync: push every doc flagged `_sync.status: pending` (skipping
  ones that already failed within the backoff window) from source to dest,
  then mark the source doc synced. Idempotent: dest is written via
  update_one(..., upsert=True) keyed on _id, so re-pushing an already-synced
  doc (e.g. after a crash between the dest write and the source status
  update) just overwrites dest with identical content — never a duplicate.
  """
  try:
    # Prove central is reachable even when nothing is pending, so a quiet cycle
    # can never look healthy while the cloud is actually unreachable.
    dest_client.admin.command('ping')
    source_db = source_client[source_db_name]
    dest_db = dest_client[dest_db_name]
    now = datetime.datetime.utcnow()
    retry_cutoff = now - datetime.timedelta(seconds=RETRY_BACKOFF_SECONDS)

    query = {
      '_sync.status': 'pending',
      # Automated/manual test data (any collection) marked isLocal=True is never pushed, full
      # stop — regardless of APP_ENV. Unlike the APP_ENV check in upstream_sync_data() (which
      # only blocks local-development/development), this catches a stack deliberately
      # configured to look like a real branch for testing purposes. Left permanently pending;
      # nothing else in the app cares about a local document's sync status.
      'isLocal': {'$ne': True},
      '$or': [
        {'_sync.last_attempt_at': None},
        {'_sync.last_attempt_at': {'$lt': retry_cutoff}},
      ],
    }

    pushed = 0
    failed = 0
    conflicts = 0

    for collection_name in source_db.list_collection_names():
      # Lookups flow central -> branch only, except the ones also created at a branch
      # (customers), which must upload or their sales vanish from central reports.
      if collection_name in lookups and collection_name not in lookup_tally.BRANCH_ORIGINATED:
        continue

      # `_`-prefixed collections are local backups/scratch (reconcile and reset copy
      # documents there with their `_sync` stamp intact). They must never upload:
      # a backup copy of a sale would otherwise arrive on central as junk.
      if collection_name.startswith('_'):
        continue

      source_collection = source_db[collection_name]
      dest_collection = dest_db[collection_name]

      for doc in source_collection.find(query).limit(BATCH_SIZE):
        doc_id = doc['_id']
        # Captured at read time. Used as an optimistic-concurrency guard: if
        # the app edits this same document (via BackupRepository.update_one)
        # between our read and our write-back below, that edit resets `_sync`
        # to a fresh pending stamp. Without this guard, our write-back would
        # stomp that fresh stamp with "synced" even though only the OLDER
        # content we read here was ever actually pushed — silently losing
        # the newer edit (it would never sync, since it now reads as already
        # synced). Filtering on the exact original `_sync` value means the
        # write-back only applies if nothing changed underneath us; if it
        # did change, this doc simply falls through to the next cycle and
        # gets picked up correctly then — matched_count check below is what
        # detects the race and skips counting it as pushed/failed.
        original_sync = doc.get('_sync')
        payload = {k: v for k, v in doc.items() if k != '_sync'}

        try:
          dest_collection.update_one({'_id': doc_id}, {'$set': payload}, upsert=True)
          result = source_collection.update_one(
            {'_id': doc_id, '_sync': original_sync},
            {'$set': {
              '_sync.status': 'synced',
              '_sync.synced_at': now,
              '_sync.last_error': None,
            }}
          )
          if result.matched_count == 0:
            print(f'[upstream-sync] {collection_name}/{doc_id} was edited concurrently — '
                  f'pushed the version we read, but leaving it pending so the newer edit '
                  f'gets synced on the next cycle instead of being marked synced by mistake.')
          else:
            pushed += 1
        except pymongo.errors.DuplicateKeyError as e:
          # Central's unique index (e.g. one invoice number per terminal) rejects this
          # document. Retrying can never succeed, so instead of failing every minute
          # forever, park it as a visible conflict. It is NOT dropped: fix the cause,
          # then set `_sync.status` back to 'pending' to re-queue it.
          source_collection.update_one(
            {'_id': doc_id, '_sync': original_sync},
            {'$set': {
              '_sync.status': 'conflict',
              '_sync.last_attempt_at': now,
              '_sync.last_error': repr(e),
            }}
          )
          conflicts += 1
          print(f'[upstream-sync] CONFLICT: {collection_name}/{doc_id} rejected by a unique index on central '
                f'and parked (status=conflict, not retried): {e.details.get("errmsg", repr(e)) if getattr(e, "details", None) else repr(e)}')
        except Exception as e:
          attempts = original_sync.get('attempts', 0) + 1 if original_sync else 1
          source_collection.update_one(
            {'_id': doc_id, '_sync': original_sync},
            {'$set': {
              '_sync.attempts': attempts,
              '_sync.last_attempt_at': now,
              '_sync.last_error': repr(e),
            }}
          )
          failed += 1
          level = 'WARNING' if attempts >= ATTEMPTS_WARNING_THRESHOLD else 'error'
          print(f'[upstream-sync] {level}: {collection_name}/{doc_id} attempt {attempts} failed: {repr(e)}')

    fields = {'last_run_at': now, 'last_success_at': now, 'pushed': pushed, 'failed': failed, 'conflicts': conflicts}
    if pushed:
      fields['last_push_at'] = now   # only when something really went up
    _write_meta(source_db, 'upstream', fields)
    print(f'[upstream-sync] {_stamp()} pushed={pushed} failed={failed} conflicts={conflicts}')

  except Exception as e:
    now = datetime.datetime.utcnow()
    _write_meta(source_client[source_db_name], 'upstream', {'last_run_at': now, 'last_error_at': now, 'last_error': repr(e)[:300]})
    print(f'[upstream-sync] {_stamp()} Error: ', repr(e))


def pull_pending(remote_client: pymongo.MongoClient, remote_db_name, local_client: pymongo.MongoClient, local_db_name):
  """Downstream sync: pull lookup/master-data docs from the central source
  that are newer than THIS branch's own last-seen watermark, per collection.

  Deliberately NOT the same pending/synced flag pattern as push_pending.
  Upstream is one branch -> one central, so "mark synced after pushing"
  makes sense. Downstream is one central -> potentially many branches — if
  the first branch to pull an update marked the central document `synced`,
  every OTHER branch would then see it as already-synced and never receive
  it, silently. So each branch tracks its own progress locally (the newest
  `_sync.stamp_id` it has pulled per collection) and never mutates anything
  on the source. Idempotent for the same reason push_pending is: the local
  write is upsert-by-_id, so re-pulling something already pulled is a
  harmless no-op.

  Requires every doc to have been written after this rebuild (so it has a
  `_sync.stamp_id`) — there's no backfill for pre-existing un-stamped data,
  which is fine for a fresh system but would need one before adopting this
  against a database with real history.
  """
  try:
    remote_client.admin.command('ping')   # fail visibly if central is unreachable
    remote_db = remote_client[remote_db_name]
    local_db = local_client[local_db_name]
    now = datetime.datetime.utcnow()
    pulled = 0

    for collection_name in lookups:
      if collection_name not in remote_db.list_collection_names():
        continue

      watermark_id = f'downstream_watermark_{collection_name}'
      watermark_doc = local_db['sync_meta'].find_one({'_id': watermark_id})
      last_stamp_id = watermark_doc['last_stamp_id'] if watermark_doc else None

      # Only STAMPED central docs are tracked by the watermark. With `{}` here, a collection
      # whose central docs carry no stamp (everything a seeder wrote) never got a watermark,
      # so every cycle re-copied the whole collection and overwrote local fixes. Unstamped
      # docs are handled below by lookup_tally.mirror_unstamped, which copies only changes.
      query = {'_sync.stamp_id': {'$gt': last_stamp_id}} if last_stamp_id else {'_sync.stamp_id': {'$exists': True}}

      remote_collection = remote_db[collection_name]
      local_collection = local_db[collection_name]
      newest_stamp_id = last_stamp_id

      for doc in remote_collection.find(query).sort('_sync.stamp_id', 1).limit(BATCH_SIZE):
        payload = {k: v for k, v in doc.items() if k != '_sync'}
        local_collection.update_one({'_id': doc['_id']}, {'$set': payload}, upsert=True)
        pulled += 1
        stamp_id = doc.get('_sync', {}).get('stamp_id')
        if stamp_id is not None and (newest_stamp_id is None or stamp_id > newest_stamp_id):
          newest_stamp_id = stamp_id

      if newest_stamp_id != last_stamp_id:
        local_db['sync_meta'].update_one(
          {'_id': watermark_id},
          {'$set': {'last_stamp_id': newest_stamp_id}},
          upsert=True,
        )

      # The watermark only ever sees docs carrying `_sync.stamp_id`. Anything
      # central wrote without one (seeders, scripts, manual edits) would never
      # arrive, so branch and central would quietly drift apart.
      pulled += lookup_tally.mirror_unstamped(remote_db, local_db, collection_name)

    # Central is the only source of lookup ids. A local record central does not
    # have is exactly how a branch ends up with a second "Main" branch whose
    # sales never show up centrally, so make it loud instead of silent.
    for collection_name in lookups:
      strays = lookup_tally.local_only_ids(remote_db, local_db, collection_name)
      if strays:
        print(f'[downstream-sync] WARNING: {collection_name} has {len(strays)} local-only record(s) '
              f'central does not have, so sales referencing them will not tally. '
              f'Run: python reconcile.py --verify')

    try:
      pulled += pull_cloud_dev_transactions(remote_db, local_db)
    except Exception as e:
      print(f'[downstream-sync] cloud dev-test transactions skipped: {repr(e)}')

    fields = {'last_run_at': now, 'last_success_at': now, 'pulled': pulled}
    if pulled:
      fields['last_pull_at'] = now   # only when something really came down
    _write_meta(local_db, 'downstream', fields)
    print(f'[downstream-sync] {_stamp()} pulled={pulled}')

  except Exception as e:
    now = datetime.datetime.utcnow()
    _write_meta(local_client[local_db_name], 'downstream', {'last_run_at': now, 'last_error_at': now, 'last_error': repr(e)[:300]})
    print(f'[downstream-sync] {_stamp()} Error: ', repr(e))


# TEMPORARY: Dev Test Mode transactions created on central (admin portal) are copied down to the
# branch so they can be viewed/printed there. This is the one exception to "transactions flow
# upward only" — scoped to isDevTest records of this branch's own branchId(s), tagged
# `tempSyncedFromCloud` (plus their shifts, cash counts and Z records), and stamped `_sync.status = synced` so they can never be pushed back.
# Remove this (and delete the tagged docs) once the requirements submission is done.
TEMP_CLOUD_TRANSACTION_CHILDREN = ['transaction_items', 'transaction_discounts']


def pull_cloud_dev_transactions(remote_db, local_db):
  """Returns the number of documents copied/refreshed."""
  now = datetime.datetime.utcnow()
  branch_ids = [b['_id'] for b in local_db['branches'].find({}, {'_id': 1})]
  branch_ids += [str(b) for b in branch_ids]
  if not branch_ids:
    return 0

  temp_fields = {'tempSyncedFromCloud': True, 'tempSyncedAt': now}
  copied = 0

  def copy(collection_name, docs):
    n = 0
    for doc in docs:
      payload = {k: v for k, v in doc.items() if k not in ('_id', '_sync')}
      try:
        local_db[collection_name].update_one(
          {'_id': doc['_id']},
          {'$set': {**payload, **temp_fields},
           '$setOnInsert': {'_sync': {'status': 'synced', 'synced_at': now, 'attempts': 0, 'from_cloud': True}}},
          upsert=True,
        )
        n += 1
      except pymongo.errors.DuplicateKeyError as e:
        # A local unique index (e.g. one open shift per cashier/day, one invoice number per PTU)
        # rejects this copy; skip just this doc rather than losing the rest of the cycle.
        print(f'[downstream-sync] cloud dev-test {collection_name}/{doc["_id"]} skipped (duplicate key): {e}')
    return n

  transactions = list(remote_db['new_transactions']
                      .find({'isDevTest': True, 'branchId': {'$in': branch_ids}})
                      .sort('_id', -1).limit(BATCH_SIZE))
  copied += copy('new_transactions', transactions)

  transaction_ids = [t['_id'] for t in transactions]
  transaction_ids += [str(i) for i in transaction_ids]
  if transaction_ids:
    for name in TEMP_CLOUD_TRANSACTION_CHILDREN:
      copied += copy(name, remote_db[name].find({'transactionId': {'$in': transaction_ids}}))

  # Shifts (cashier_reports) and Z-reading records (branch_reports) so the branch can print a
  # matching X/Z. Those docs carry no isDevTest flag, so they are picked by the Dev Test PTU
  # prefix plus the shifts the pulled transactions point at (`shiftId`).
  dev_ptu = {'$regex': '^DEV-PTU-'}
  shift_ids = set()
  for t in transactions:
    try:
      if t.get('shiftId'):
        shift_ids.add(ObjectId(t['shiftId']))
    except Exception:
      pass
  shifts = list(remote_db['cashier_reports'].find({'$or': [
    {'branchId': {'$in': branch_ids}, 'ptuNumber': dev_ptu},
    {'_id': {'$in': list(shift_ids)}},
  ]}).sort('_id', -1).limit(BATCH_SIZE))
  copied += copy('cashier_reports', shifts)

  count_ids = [s[k] for s in shifts for k in ('openingFundId', 'endingCashCountId') if s.get(k)]
  if count_ids:
    copied += copy('report_cash_counts', remote_db['report_cash_counts'].find({'_id': {'$in': count_ids}}))

  copied += copy('branch_reports', remote_db['branch_reports']
                 .find({'branchId': {'$in': branch_ids}, 'ptuNumber': dev_ptu})
                 .sort('_id', -1).limit(BATCH_SIZE))
  return copied


def downstream_sync_data():
  remote = get_client('remote', REMOTE_DATABASE_URL)
  local = get_client('local', LOCAL_DATABASE_URL)
  if remote is None or local is None:
    print(f'[downstream-sync] {_stamp()} Skipping this cycle — a client is unavailable.')
    if local is not None:
      now = datetime.datetime.utcnow()
      _write_meta(local['pos'], 'downstream', {'last_run_at': now, 'last_error_at': now, 'last_error': 'central client unavailable (check REMOTE_DATABASE_URL)'})
    return

  print('\n=========================================================================')
  print(f'Downstream-Sync: pulling newer lookup data from central...')
  pull_pending(remote, "pos", local, "pos")


def upstream_sync_data():
  if APP_ENV not in UPSTREAM_ALLOWED_ENVS:
    print(f'[upstream-sync] {_stamp()} Skipping — APP_ENV={APP_ENV!r} is not a real branch/central '
          f'deployment, refusing to push local data upstream.')
    return

  local = get_client('local', LOCAL_DATABASE_URL)
  remote = get_client('remote', REMOTE_DATABASE_URL)
  if local is None or remote is None:
    print(f'[upstream-sync] {_stamp()} Skipping this cycle — a client is unavailable.')
    if local is not None:
      now = datetime.datetime.utcnow()
      _write_meta(local['pos'], 'upstream', {'last_run_at': now, 'last_error_at': now, 'last_error': 'central client unavailable (check REMOTE_DATABASE_URL)'})
    return

  print('\n=========================================================================')
  print(f'Upstream-Sync: pushing pending docs from local to remote...')
  push_pending(local, "pos", remote, "pos")


def backfill_upstream_stamps_job():
  """Documents written before `_sync` stamping existed (or by a repository that
  did not stamp) are invisible to the outbox and would never upload."""
  local = get_client('local', LOCAL_DATABASE_URL)
  if local is None:
    return
  flagged = lookup_tally.backfill_upstream_stamps(local['pos'])
  if flagged:
    print(f'[sync] Flagged never-stamped documents for upload: {flagged}')


def run_safely(job_name, fn):
  """Last line of defense: nothing a scheduled job does should ever be able
  to kill the process. An uncaught exception here previously took down the
  whole `while True` loop, forcing Docker to fully restart the container —
  losing the in-memory client cache and any timing state — instead of just
  waiting for the next scheduled attempt."""
  try:
    fn()
  except Exception as e:
    print(f'[sync] {job_name} raised unexpectedly: {repr(e)}')


if __name__ == '__main__':
  print('Auto-Sync starting...')
  schedule.every(3).minutes.do(run_safely, 'downstream', downstream_sync_data)
  schedule.every(20).seconds.do(run_safely, 'upstream', upstream_sync_data)

  schedule.every(1).hours.do(run_safely, 'backfill', backfill_upstream_stamps_job)
  run_safely('backfill', backfill_upstream_stamps_job)

  run_safely('downstream', downstream_sync_data)
  while True:
    schedule.run_pending()
    time.sleep(1)
