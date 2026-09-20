from app.config import IS_INTERNAL_PRODUCTION
from app.utils.sync import pending_sync
from .config import database
from .database import backup_database


def insert_one(collection_name, data, *args):
    data['_sync'] = pending_sync()
    ret = database[collection_name].insert_one(data, *args)

    if IS_INTERNAL_PRODUCTION:
        try:
            backup_db = backup_database.connect()
            backup_db[collection_name].insert_one(data, *args)
        except Exception as e:
            print(f"Backup insert failed: {e}")
    return ret


# Downstream (central -> branch) lookup/master-data collections write updates
# via ~10 separate route files, each calling .update_one() directly on its
# own raw collection object with no shared function at all — the create side
# already had one choke point (insert_one above); this gives updates the
# same treatment so `_sync` stamping (and any future cross-cutting concern)
# lives in one place instead of drifting across ten independent call sites.
def update_one(collection_name, query, update, *args, **kwargs):
    if '$set' in update:
        update = {**update, '$set': {**update['$set'], '_sync': pending_sync()}}
    else:
        update = {**update, '$set': {'_sync': pending_sync()}}
    return database[collection_name].update_one(query, update, *args, **kwargs)
