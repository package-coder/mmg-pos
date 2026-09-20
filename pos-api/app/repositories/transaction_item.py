


from app.repositories.base import BackupRepository
from app.repositories.transaction import TransactionRepository


# BackupRepository (not Repository): line items are sales data and must carry the
# `_sync` stamp or the upstream sync never uploads them.
class TransactionItemRepository(BackupRepository):
    _collection = 'transaction_items'
    _transaction_collection = TransactionRepository()._collection


    def find(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        'transactionId': {'$toObjectId': '$transactionId' },
                        'customerId': {'$toObjectId': '$customerId' },
                        'branchId': {'$toObjectId': '$branchId' },
                    }
                },
                { 
                    '$lookup': {
                        'from': 'branches',
                        'localField': 'branchId',
                        'foreignField': '_id',
                        'as': 'branch'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': self._transaction_collection,
                        'localField': 'transactionId',
                        'foreignField': '_id',
                        'as': 'transaction'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': 'customers',
                        'localField': 'customerId',
                        'foreignField': '_id',
                        'as': 'customer'
                    }, 
                },
                { "$unwind": "$transaction" },
                { "$unwind": "$customer" },
                { "$unwind": "$branch" },
                {
                    '$project': {
                        'transactionId': 0,
                        'customerId': 0,
                        'branchId': 0,
                        # Internal sync-outbox bookkeeping on the joined transaction — stamp_id is
                        # a real ObjectId with no jsonify() encoder.
                        'transaction._sync': 0,
                    }
                },
                { '$sort': {"_id":-1} },
                *args,
                {
                    "$addFields": {
                        "_id": { "$toString": "$_id" },
                        "branch._id": { "$toString": "$branch._id" },
                        "transaction._id": { "$toString": "$transaction._id" },
                        "customer._id": { "$toString": "$customer._id" },
                        "customer.name": {
                            "$concat": [
                                "$customer.first_name",
                                " ",
                                "$customer.last_name"
                            ]
                        },
                    }
                }
            ]))
            return data
        except Exception as e:
            raise e