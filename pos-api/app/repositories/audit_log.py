


from app.new_models.AuditLog import AuditLog
from app.repositories.base import BackupRepository


class AuditLogRepository(BackupRepository):
    _collection = 'audit_logs'

    def find(self, query={}, *args):
        try:
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    "$addFields": {
                        "userId": {"$toObjectId": "$userId"}
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