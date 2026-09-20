"""
Keeps a branch's lookup/master data identical (same `_id`s) to the central
database, and repairs branches that drifted.

Why this exists
---------------
`seed.py` used to run against each branch's own MongoDB, so every branch (and
the central server) created its "MMG Albay Main" branch, roles, users, etc.
with freshly generated ObjectIds. Sync merges by `_id`, so the central copy was
then pulled down *next to* the locally seeded copy: two branches, two admins,
and every local sale pointing at a branch/user that does not exist centrally.
Central reports join on those ids, so those sales silently vanish.

Rules enforced here
-------------------
* Central is the only source of lookup ids. A branch never mints its own.
* `bootstrap_from_central` copies lookup collections verbatim (same `_id`).
* `build_id_map` + `rewrite_references` + `backup_and_remove_strays` repair a
  branch that was already seeded locally (driven by reconcile.py): local-only duplicates are matched to their central
  twin by natural key, every reference to the local id is rewritten to the
  central id, and only then is the duplicate removed (after a backup).

Nothing in this module ever writes to the central database.

This file must stay importable on its own (no Flask/app imports): it is
shipped in the `sync` container image and also imported by `seed.py`.
"""
import datetime
import hashlib
import importlib.util
import json
import os
import re

from bson import ObjectId
from pymongo.errors import DuplicateKeyError


def _load_sibling(name):
    """Import a module that sits next to this file, whatever the import path is
    (the tests load this file by path, and `import customer_identity` would fail)."""
    spec = importlib.util.spec_from_file_location(name, os.path.join(os.path.dirname(os.path.abspath(__file__)), f'{name}.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


customer_identity = _load_sibling('customer_identity')

# Lookup collections that are ALSO created at a branch and must therefore upload
# (everything else in LOOKUPS flows central -> branch only).
BRANCH_ORIGINATED = ['customers']

# Central -> branch collections. The single definition: sync/app.py, seed.py
# and reconcile.py all use this list so they can never disagree about what
# central owns.
LOOKUPS = [
    'branches',
    'users',
    'customers',
    'discounts',
    'doctors',
    'corporates',
    'roles',
    'items',
    'audit_logs_lookup',
    'products',
    'packages',
    'product_categories',
]

# collection -> fields that identify "the same real-world record" across
# databases. A local-only doc is only auto-matched when exactly one central
# doc has the same key (and vice versa); anything else is reported, not guessed.
NATURAL_KEYS = {
    # one person = one record; the rule lives in customer_identity.py (ID number, else name + birthday)
    'customers': customer_identity.identity_key,
    'branches': ['name', 'tin'],
    'roles': ['name'],
    'users': ['username'],
    'discounts': ['name'],
    'product_categories': ['name'],
    'packages': ['name'],
    'products': ['name'],
}

# Collections that hold sales/report data produced at a branch and that the
# upstream sync must deliver. Used to (a) re-flag documents whose references
# were rewritten and (b) backfill documents written before `_sync` stamping
# existed, which the outbox would otherwise never pick up.
UPSTREAM_COLLECTIONS = [
    'new_transactions',
    'transaction_items',
    'transaction_discounts',
    'cashier_reports',
    'report_cash_counts',
    'branch_reports',
    'audit_logs',
    'bookings',
    'sales',
    'sales_deposits',
]

# Never touched by reference rewriting: not business data, or keyed on their own
# (counters are scoped per terminal/branch and must never be renumbered).
_REWRITE_SKIP = {'counters', 'sync_meta'}

_OBJECT_ID_RE = re.compile(r'^[0-9a-f]{24}$')


def _now():
    return datetime.datetime.utcnow()


def pending_stamp():
    """Same shape as app/utils/sync.py:pending_sync (this module cannot import
    the app package inside the sync container)."""
    return {
        'status': 'pending',
        'synced_at': None,
        'attempts': 0,
        'last_attempt_at': None,
        'last_error': None,
        'stamp_id': ObjectId(),
    }


def _strip_sync(doc):
    return {k: v for k, v in doc.items() if k != '_sync'}


# --- Downstream: mirror ----------------------------------------------------

def _content_hash(doc):
    return hashlib.sha1(json.dumps(_strip_sync(doc), sort_keys=True, default=str).encode()).hexdigest()


def _load_hashes(local_db, collection_name):
    meta = local_db['sync_meta'].find_one({'_id': f'mirror_hashes_{collection_name}'}) or {}
    return dict(meta.get('hashes', {}))


def _save_hashes(local_db, collection_name, hashes):
    local_db['sync_meta'].update_one(
        {'_id': f'mirror_hashes_{collection_name}'}, {'$set': {'hashes': hashes}}, upsert=True)


def mirror_unstamped(remote_db, local_db, collection_name):
    """Copy central docs that carry no `_sync.stamp_id`.

    The downstream watermark only sees stamped documents, so anything written
    centrally through a path that does not stamp (seeders, scripts, manual
    edits) would never reach a branch once a watermark exists. Lookup
    collections are small, so comparing these directly each cycle is cheap.

    Central wins only when central actually CHANGED: the hash of each central
    doc as of the last copy is remembered in `sync_meta`, and a doc whose
    central content is unchanged is left alone. So a deliberate local fix to a
    central-owned record is not reverted every cycle, while a genuine central
    edit still overwrites it. Returns the number of documents written.
    """
    written = 0
    remote_collection = remote_db[collection_name]
    local_collection = local_db[collection_name]
    hashes = _load_hashes(local_db, collection_name)
    dirty = False
    for doc in remote_collection.find({'_sync.stamp_id': {'$exists': False}}):
        key, digest = str(doc['_id']), _content_hash(doc)
        payload = _strip_sync(doc)
        current = local_collection.find_one({'_id': doc['_id']})
        if current is not None and hashes.get(key) == digest:
            continue  # central unchanged since we last copied it: keep whatever is here
        if current is not None and (current.get('_sync') or {}).get('status') == 'pending':
            continue  # a local edit is waiting to upload; do not overwrite it with an older copy
        if current is None or _strip_sync(current) != payload:
            if current is not None and '_sync' in current:
                payload['_sync'] = current['_sync']
            try:
                local_collection.replace_one({'_id': doc['_id']}, payload, upsert=True)
            except DuplicateKeyError as e:
                # e.g. the same person was also created here: leave both, retry next cycle,
                # and let `reconcile.py` merge them. One bad doc must not stop the cycle.
                print(f'[mirror] {collection_name}/{doc["_id"]} not copied (duplicate of a local record): {e.details.get("errmsg", e) if getattr(e, "details", None) else e}')
                continue
            written += 1
        hashes[key] = digest
        dirty = True
    if dirty:
        _save_hashes(local_db, collection_name, hashes)
    return written


def local_only_ids(remote_db, local_db, collection_name):
    """`_id`s that exist locally but not centrally for a lookup collection."""
    if collection_name not in local_db.list_collection_names():
        return []
    central = {d['_id'] for d in remote_db[collection_name].find({}, {'_id': 1})}
    return [d['_id'] for d in local_db[collection_name].find({}, {'_id': 1}) if d['_id'] not in central]


# --- Bootstrap (fresh install) --------------------------------------------

def bootstrap_from_central(remote_db, local_db, lookups):
    """Copy every lookup collection from central verbatim (same `_id`s).
    Returns {collection: docs_copied}. Never writes to central."""
    counts = {}
    names = set(remote_db.list_collection_names())
    for name in lookups:
        if name not in names:
            continue
        copied = 0
        hashes = _load_hashes(local_db, name)
        for doc in remote_db[name].find({}):
            current = local_db[name].find_one({'_id': doc['_id']}, {'_sync': 1})
            payload = _strip_sync(doc)
            if current is not None and '_sync' in current:
                payload['_sync'] = current['_sync']
            local_db[name].replace_one({'_id': doc['_id']}, payload, upsert=True)
            if '_sync' not in doc or 'stamp_id' not in (doc.get('_sync') or {}):
                hashes[str(doc['_id'])] = _content_hash(doc)  # so a later local fix is not "reverted"
            copied += 1
        _save_hashes(local_db, name, hashes)
        counts[name] = copied
    return counts


# --- Reconciliation --------------------------------------------------------

def _natural_key(doc, fields):
    if callable(fields):
        return fields(doc)
    values = tuple(doc.get(f) for f in fields)
    return None if any(v in (None, '') for v in values) else tuple(str(v).strip().lower() for v in values)


def build_id_map(remote_db, local_db, lookups=None):
    """Match local-only lookup docs to their central twin by natural key.

    Returns (id_map, unmatched, ambiguous):
      id_map     {local_id_str: central_id_str}
      unmatched  {collection: [local docs with no central twin]}
      ambiguous  {collection: [(local doc, [central docs])]}
    """
    id_map, unmatched, ambiguous = {}, {}, {}
    collections = lookups if lookups is not None else list(NATURAL_KEYS)
    for name in collections:
        fields = NATURAL_KEYS.get(name)
        stray_ids = set(local_only_ids(remote_db, local_db, name))
        if not stray_ids:
            continue
        stray_docs = list(local_db[name].find({'_id': {'$in': list(stray_ids)}}))
        if not fields:
            unmatched[name] = stray_docs
            continue
        central_by_key = {}
        for doc in remote_db[name].find({}):
            key = _natural_key(doc, fields)
            if key is not None:
                central_by_key.setdefault(key, []).append(doc)
        for doc in stray_docs:
            key = _natural_key(doc, fields)
            twins = central_by_key.get(key, []) if key is not None else []
            if len(twins) == 1:
                id_map[str(doc['_id'])] = str(twins[0]['_id'])
            elif len(twins) > 1:
                ambiguous.setdefault(name, []).append((doc, twins))
            else:
                unmatched.setdefault(name, []).append(doc)
    return id_map, unmatched, ambiguous


def _rewrite(value, id_map):
    """Deep-replace ids while preserving their type (str stays str, ObjectId
    stays ObjectId). Returns (new_value, changed)."""
    if isinstance(value, ObjectId):
        new = id_map.get(str(value))
        return (ObjectId(new), True) if new else (value, False)
    if isinstance(value, str):
        if _OBJECT_ID_RE.match(value) and value in id_map:
            return id_map[value], True
        return value, False
    if isinstance(value, list):
        changed = False
        out = []
        for item in value:
            new_item, item_changed = _rewrite(item, id_map)
            changed = changed or item_changed
            out.append(new_item)
        return out, changed
    if isinstance(value, dict):
        changed = False
        out = {}
        for key, item in value.items():
            new_item, item_changed = _rewrite(item, id_map)
            changed = changed or item_changed
            out[key] = new_item
        return out, changed
    return value, False


def rewrite_references(local_db, id_map, apply=False):
    """Rewrite every reference to a mapped local id, in every non-lookup
    collection. Documents in UPSTREAM_COLLECTIONS are re-flagged pending so the
    corrected version reaches central. Lookup collections are included too, so
    a kept local-only record (e.g. a locally created customer) that points at a
    remapped branch/role follows it. Returns {collection: docs_changed}."""
    changes = {}
    if not id_map:
        return changes
    for name in local_db.list_collection_names():
        if name in _REWRITE_SKIP or name.startswith('_reconcile_backup_') or name.startswith('system.'):
            continue
        collection = local_db[name]
        touched = 0
        for doc in collection.find({}):
            updates = {}
            for key, value in doc.items():
                if key in ('_id', '_sync'):
                    continue
                new_value, changed = _rewrite(value, id_map)
                if changed:
                    updates[key] = new_value
            if not updates:
                continue
            touched += 1
            if apply:
                if name in UPSTREAM_COLLECTIONS:
                    updates['_sync'] = pending_stamp()
                collection.update_one({'_id': doc['_id']}, {'$set': updates})
        if touched:
            changes[name] = touched
    return changes


def backfill_upstream_stamps(local_db):
    """Flag pre-existing, never-stamped docs as pending so they upload.
    Idempotent (central is written by upsert on `_id`). Returns
    {collection: docs_flagged}."""
    flagged = {}
    existing = set(local_db.list_collection_names())
    for name in UPSTREAM_COLLECTIONS:
        if name not in existing:
            continue
        docs = list(local_db[name].find({'_sync': {'$exists': False}}, {'_id': 1}))
        for doc in docs:
            local_db[name].update_one({'_id': doc['_id'], '_sync': {'$exists': False}}, {'$set': {'_sync': pending_stamp()}})
        if docs:
            flagged[name] = len(docs)
    return flagged


def backup_and_remove_strays(local_db, id_map, lookups_with_strays, apply=False):
    """Remove local-only duplicate lookup docs that have been remapped, after
    copying them to `_reconcile_backup_<collection>` in the same database.
    Returns {collection: docs_removed}."""
    removed = {}
    stamp = _now().strftime('%Y%m%d%H%M%S')
    for name in lookups_with_strays:
        ids = [ObjectId(k) for k in id_map if local_db[name].count_documents({'_id': ObjectId(k)})]
        if not ids:
            continue
        removed[name] = len(ids)
        if apply:
            docs = list(local_db[name].find({'_id': {'$in': ids}}))
            local_db[f'_reconcile_backup_{name}_{stamp}'].insert_many(docs)
            local_db[name].delete_many({'_id': {'$in': ids}})
    return removed


# --- Reset -----------------------------------------------------------------

def pending_upload_count(local_db):
    """Sales/report docs that have not reached central yet (pending or parked
    as a conflict). Wiping the database while any exist would destroy the only copy."""
    counts = {}
    existing = set(local_db.list_collection_names())
    for name in UPSTREAM_COLLECTIONS:
        if name in existing:
            n = local_db[name].count_documents({'_sync.status': {'$in': ['pending', 'conflict']}})
            if n:
                counts[name] = n
    return counts


def reset_database(local_db):
    """Empty every collection, keeping the indexes (they are created once at
    server start and would otherwise be gone until the next restart). A full
    copy goes to `<db>_backup_<timestamp>` on the same server first.
    Returns (backup_db_name, {collection: docs_removed})."""
    client = local_db.client
    backup_name = f'{local_db.name}_backup_{_now().strftime("%Y%m%d%H%M%S")}'
    removed = {}
    for name in local_db.list_collection_names():
        if name.startswith('system.'):
            continue
        docs = list(local_db[name].find({}))
        if docs:
            client[backup_name][name].insert_many(docs)
        removed[name] = local_db[name].delete_many({}).deleted_count
    return backup_name, removed


# --- Verification ----------------------------------------------------------

def verify(remote_db, local_db, lookups):
    """Read-only tally. Empty lists / zeros everywhere means the branch and
    central agree."""
    report = {'local_only_lookups': {}, 'orphan_references': {}, 'unstamped_upstream': {}, 'sync_conflicts': {}}
    for name in lookups:
        stray = local_only_ids(remote_db, local_db, name)
        if stray:
            report['local_only_lookups'][name] = [str(i) for i in stray]

    central_branches = {str(d['_id']) for d in remote_db['branches'].find({}, {'_id': 1})}
    central_users = {str(d['_id']) for d in remote_db['users'].find({}, {'_id': 1})}
    existing = set(local_db.list_collection_names())
    for name, field, known in (
        ('new_transactions', 'branchId', central_branches),
        ('new_transactions', 'cashierId', central_users),
        ('cashier_reports', 'branchId', central_branches),
        ('cashier_reports', 'cashierId', central_users),
        ('branch_reports', 'branchId', central_branches),
    ):
        if name not in existing:
            continue
        orphans = sum(1 for d in local_db[name].find({}, {field: 1}) if str(d.get(field)) not in known and d.get(field) is not None)
        if orphans:
            report['orphan_references'][f'{name}.{field}'] = orphans

    for name in UPSTREAM_COLLECTIONS:
        if name in existing:
            n = local_db[name].count_documents({'_sync': {'$exists': False}})
            if n:
                report['unstamped_upstream'][name] = n
            # Parked by the upstream sync because a unique index on central rejected them
            # (e.g. a duplicate invoice number for the same terminal). Never uploaded.
            c = local_db[name].count_documents({'_sync.status': 'conflict'})
            if c:
                report['sync_conflicts'][name] = c
    return report
