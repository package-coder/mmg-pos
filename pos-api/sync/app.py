import os
import os
import pymongo
import time
import schedule

REMOTE_DATABASE_URL = os.getenv('REMOTE_DATABASE_URL') 
LOCAL_DATABASE_URL = os.getenv('LOCAL_DATABASE_URL')  

print('REMOTE_DATABASE_URL: ', REMOTE_DATABASE_URL)
print('LOCAL_DATABASE_URL: ', LOCAL_DATABASE_URL)

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

      # if(drop_source_collection):
      #   source_collection.drop()

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
  print(f'Upstream-Sync data from local to remote...')
  sync_data(source_client, "pos", dest_client, "pos")
  
  print(f'Upstream-Sync was sucessfully done...')

print('Auto-Sync starting...')
schedule.every(3).minutes.do(downstream_sync_data)
schedule.every(20).seconds.do(upstream_sync_data)

downstream_sync_data()
while True:
  schedule.run_pending()
  time.sleep(1)
