import datetime
import os
import time

import pymongo
import schedule

REMOTE_DATABASE_URL = os.getenv('REMOTE_DATABASE_URL')
LOCAL_DATABASE_URL = os.getenv('LOCAL_DATABASE_URL')

print('REMOTE_DATABASE_URL: ', REMOTE_DATABASE_URL)
print('LOCAL_DATABASE_URL: ', LOCAL_DATABASE_URL)

# Downstream (central -> branch) lookup/master-data collections. These are not
# yet stamped with `_sync` on write (only collections behind BackupRepository
# are — see app/repositories/base.py), so this list still gets a full mirror
# every cycle, same as before. Upstream is the part rebuilt here.
lookups = [
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
  'product_categories'
]

# A doc that failed to push isn't retried again until this many seconds have
# passed, so a persistently-unreachable remote doesn't spin the CPU re-trying
# the same handful of docs every 20 seconds.
RETRY_BACKOFF_SECONDS = 60

# Above this many failed attempts, keep retrying (financial/BIR-relevant
# records must never be silently dropped) but log loudly so it's visible in
# container logs instead of failing forever in silence.
ATTEMPTS_WARNING_THRESHOLD = 10


def push_pending(source_client: pymongo.MongoClient, source_db_name, dest_client: pymongo.MongoClient, dest_db_name):
  """Upstream sync: push every doc flagged `_sync.status: pending` (skipping
  ones that already failed within the backoff window) from source to dest,
  then mark the source doc synced. Idempotent: dest is written via
  update_one(..., upsert=True) keyed on _id, so re-pushing an already-synced
  doc (e.g. after a crash between the dest write and the source status
  update) just overwrites dest with identical content — never a duplicate.
  """
  try:
    source_db = source_client[source_db_name]
    dest_db = dest_client[dest_db_name]
    now = datetime.datetime.utcnow()
    retry_cutoff = now - datetime.timedelta(seconds=RETRY_BACKOFF_SECONDS)

    query = {
      '_sync.status': 'pending',
      '$or': [
        {'_sync.last_attempt_at': None},
        {'_sync.last_attempt_at': {'$lt': retry_cutoff}},
      ],
    }

    pushed = 0
    failed = 0

    for collection_name in source_db.list_collection_names():
      if collection_name in lookups:
        continue

      source_collection = source_db[collection_name]
      dest_collection = dest_db[collection_name]

      for doc in source_collection.find(query):
        doc_id = doc['_id']
        payload = {k: v for k, v in doc.items() if k != '_sync'}

        try:
          dest_collection.update_one({'_id': doc_id}, {'$set': payload}, upsert=True)
          source_collection.update_one(
            {'_id': doc_id},
            {'$set': {
              '_sync.status': 'synced',
              '_sync.synced_at': now,
              '_sync.last_error': None,
            }}
          )
          pushed += 1
        except Exception as e:
          attempts = doc.get('_sync', {}).get('attempts', 0) + 1
          source_collection.update_one(
            {'_id': doc_id},
            {'$set': {
              '_sync.attempts': attempts,
              '_sync.last_attempt_at': now,
              '_sync.last_error': repr(e),
            }}
          )
          failed += 1
          level = 'WARNING' if attempts >= ATTEMPTS_WARNING_THRESHOLD else 'error'
          print(f'[upstream-sync] {level}: {collection_name}/{doc_id} attempt {attempts} failed: {repr(e)}')

    source_db['sync_meta'].update_one(
      {'_id': 'upstream'},
      {'$set': {'last_run_at': now, 'pushed': pushed, 'failed': failed}},
      upsert=True,
    )
    print(f'[upstream-sync] pushed={pushed} failed={failed}')

  except Exception as e:
    print('[upstream-sync] Error: ', repr(e))


def sync_data(source_client: pymongo.MongoClient, source_db_name, dest_client: pymongo.MongoClient, dest_db_name, downstream=False):
  try:
    source_db = source_client[source_db_name]
    dest_db = dest_client[dest_db_name]

    for collection_name in source_db.list_collection_names():
      if((not downstream and not collection_name in lookups) or (downstream and collection_name in lookups)):
        print(f'- Collection: {collection_name}')
        source_collection = source_db[collection_name]
        dest_collection = dest_db[collection_name]

        for doc in source_collection.find():
          filter = { '_id': doc['_id'] }
          value = { "$set": doc }
          dest_collection.update_one(filter, value, upsert=True)

  except Exception as e:
    print('Error: ', repr(e))


def downstream_sync_data():
  source_client = pymongo.MongoClient(REMOTE_DATABASE_URL)
  dest_client = pymongo.MongoClient(LOCAL_DATABASE_URL)

  print('\n=========================================================================')
  print(f'Downstream-Sync data from remote to backup...')
  sync_data(source_client, "pos", dest_client, "pos", True)

  print(f'Downstream-Sync was sucessfully done...')


def upstream_sync_data():
  source_client = pymongo.MongoClient(LOCAL_DATABASE_URL)
  dest_client = pymongo.MongoClient(REMOTE_DATABASE_URL)

  print('\n=========================================================================')
  print(f'Upstream-Sync: pushing pending docs from local to remote...')
  push_pending(source_client, "pos", dest_client, "pos")


print('Auto-Sync starting...')
schedule.every(3).minutes.do(downstream_sync_data)
schedule.every(20).seconds.do(upstream_sync_data)

downstream_sync_data()
while True:
  schedule.run_pending()
  time.sleep(1)
