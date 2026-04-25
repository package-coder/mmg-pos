


from bson import ObjectId
from app.new_models.Transaction import TransactionStatus
from app.repositories.base import BackupRepository, Repository
from app.repositories.transaction import TransactionRepository


class BranchRepository(Repository):
    _collection = 'branches'
    _transaction_collection = TransactionRepository()._collection

    def find_reports(self, query={}, *args):
        try:

            data = list(self._db[self._collection].aggregate([
                {
                    "$addFields": {
                        "_id": {"$toString": "$_id"}
                    }
                },
                {
                    "$lookup": {
                        "from": self._transaction_collection,
                        "let": {
                            "branchId": "$_id",
                        },
                        "pipeline": [
                            { '$match': query },
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            { "$eq": ["$branchId", "$$branchId"] },
                                            { "$in": ["$status", [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED]] },
                                        ]
                                    }
                                }
                            },
                            {
                                "$group": {
                                    "_id": None,
                                    'branchId': { '$first': '$branchId' },
                                    "totalGrossSales": { "$sum": "$totalGrossSales" },
                                    "totalNetSales": { "$sum": "$totalNetSales" },
                                    "totalDiscount": { "$sum": "$totalDiscount" },
                                    "totalSalesWithoutMemberDiscount": { "$sum": '$totalSalesWithoutMemberDiscount' } ,
                                    "totalMemberDiscount": { "$sum": '$totalMemberDiscount' } ,
                                    "invoiceStartNumber": { '$min': "$invoiceNumber" },
                                    "invoiceEndNumber": { '$max': "$invoiceNumber" }
                                }
                            },
                        ],
                        "as": "report"
                    }
                },
                { "$unwind": {
                    'path': '$report',
                    'preserveNullAndEmptyArrays': True    
                }},
                *args,
            ]))

            return data
        except:
            raise