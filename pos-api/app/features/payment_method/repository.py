from bson import ObjectId

from app.database.config import roles, users
from app.repositories.base import BackupRepository


# BackupRepository so each write carries the `_sync` stamp that central -> branch (downstream)
# sync orders by. Payment methods are created on the admin/central instance and pulled down to
# every branch like the other lookups (see sync/lookup_tally.py: LOOKUPS).
class PaymentMethodRepository(BackupRepository):
    _collection = 'payment_methods'

    def find_all(self) -> list:
        return list(self._db[self._collection].find({}))

    def find_by_code(self, code: str):
        return self._db[self._collection].find_one({'code': code})

    def create(self, doc: dict):
        return self.insert_one(doc)

    def upsert_by_code(self, code: str, fields: dict):
        # refetch=False: update_one_bare's refetch path wraps _id in ObjectId(...) - fine here, but
        # nothing needs the document back and the upsert may have just created it.
        self.update_one_bare({'code': code}, fields, refetch=False, upsert=True)

    def get_role_name(self, user_id: str):
        user = users.find_one({'_id': ObjectId(user_id)})
        if not user or not user.get('role'):
            return None
        role = roles.find_one({'_id': ObjectId(user['role'])})
        return role['name'].lower() if role and role.get('name') else None
