


from app.new_models.AuditLog import AuditLog
from app.repositories.base import BackupRepository


class AuditLogRepository(BackupRepository):
    _collection = 'audit_logs'

    def find(self, query={}, *args):
        try:
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    # onError/onNull: null instead of the $toObjectId shorthand — a login attempt
                    # against a username that doesn't exist at all has no real user to attribute
                    # it to, so it's logged with userId='' (see app/routes/users/auth.py). $toObjectId
                    # throws hard on that, which previously crashed this endpoint for every user,
                    # for every request, the moment a single such row existed.
                    "$addFields": {
                        "userId": {"$convert": {"input": "$userId", "to": "objectId", "onError": None, "onNull": None}}
                    }
                },
                { 
                    '$lookup': {
                        'from': 'users',
                        'localField': 'userId',
                        'foreignField': '_id',
                        'as': 'user'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': 'audit_logs_lookup',
                        'localField': 'action',
                        'foreignField': 'code',
                        'as': 'action'
                    }, 
                },
                { "$unwind": {
                    'path': "$action",
                    'preserveNullAndEmptyArrays': True    
                }},
                { "$unwind": {
                    'path': "$user",
                    'preserveNullAndEmptyArrays': True    
                }},
                {
                    "$project": {
                        'userId': 0,
                        'data._id': 0,
                        '_sync': 0,
                        'user': {
                            'password': 0,
                        }
                    }
                },
                { "$sort": { "_id": -1 }},
                *args,
                {
                    "$addFields": {
                        "_id": { "$toString": "$_id" },
                        "user._id": { "$toString": "$user._id" },
                        "action._id": { "$toString": "$action._id" },
                    }
                }
            ]))
            return data
        except Exception as e:
            raise e
        
    def insert_one(self, data: AuditLog):
        return super().insert_one(data.model_dump())