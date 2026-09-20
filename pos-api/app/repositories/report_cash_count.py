


from bson import ObjectId
from app.repositories.base import BackupRepository, Repository


# BackupRepository (not Repository): cash counts feed the X/Z readings and must
# carry the `_sync` stamp or the upstream sync never uploads them.
class CashCountRepository(BackupRepository):
    _collection = 'report_cash_counts'

    # def insert_one(self, data, refetch: bool = True):
    #     result = super().insert_one(data)

    #     if(not refetch):
    #         return result
        
    #     return self.find_one({ '_id': ObjectId(result.inserted_id) })
        