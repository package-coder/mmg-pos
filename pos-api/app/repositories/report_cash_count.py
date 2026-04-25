


from bson import ObjectId
from app.repositories.base import BackupRepository, Repository


class CashCountRepository(Repository):
    _collection = 'report_cash_counts'

    # def insert_one(self, data, refetch: bool = True):
    #     result = super().insert_one(data)

    #     if(not refetch):
    #         return result
        
    #     return self.find_one({ '_id': ObjectId(result.inserted_id) })
        