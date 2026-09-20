


from app.repositories.base import BackupRepository
from app.repositories.transaction import TransactionRepository


# BackupRepository (not Repository): discounts are sales data and must carry the
# `_sync` stamp or the upstream sync never uploads them.
class TransactionDiscountRepository(BackupRepository):
    _collection = 'transaction_discounts'
    _transaction_collection = TransactionRepository()._collection


    def find(self, query={}, *args, include_dev_test=False):
        try:
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                # Dev Test Mode discounts (mocked terminal, see
                # app/blueprints/transaction.py _is_dev_test) must never appear in a real
                # discount report, UNLESS the browser generating/viewing it has Dev Test Mode on
                # (see app/blueprints/reports.py) — applied unconditionally here rather than
                # left to callers to remember only when it's False.
                *([{ '$match': { 'isDevTest': { '$ne': True } } }] if not include_dev_test else []),
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
                # { '$sort': {"_id":-1} },
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