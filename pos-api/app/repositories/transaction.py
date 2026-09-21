


from bson import ObjectId
from app.repositories.base import BackupRepository
from app.utils.utils import getLocalDateStr


class TransactionRepository(BackupRepository):
    _collection = 'new_transactions'
    _transaction_discount_collection = "transaction_discounts"
    _transaction_item_collection = "transaction_items"

    def find(self, query={}, *args, agreggate=True):
        if(not agreggate): 
            return list(self._db[self._collection].find(query, *args))
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        'cashierId': {'$toObjectId': '$cashierId' },
                        'customerId': {'$toObjectId': '$customerId' },
                        'branchId': {'$toObjectId': '$branchId' },
                        'referredById': {'$toObjectId': '$referredById' },
                        'requestedById': {'$toObjectId': '$requestedById' },
                        '_id': {'$toString': '$_id' },
                    }
                },
                { 
                    '$lookup': {
                        'from': 'users',
                        'localField': 'cashierId',
                        'foreignField': '_id',
                        'as': 'cashier'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': self._transaction_item_collection,
                        'localField': '_id',
                        'foreignField': 'transactionId',
                        'as': 'transactionItems'
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
                        'from': 'doctors',
                        'localField': 'referredById',
                        'foreignField': '_id',
                        'as': 'referredBy'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': 'doctors',
                        'localField': 'requestedById',
                        'foreignField': '_id',
                        'as': 'requestedBy'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': self._transaction_discount_collection,
                        'localField': '_id',
                        'foreignField': 'transactionId',
                        'as': 'discounts'
                    }, 
                },
                { "$unwind": "$cashier" },
                { "$unwind": "$customer" },
                { "$unwind": "$branch" },
                { "$unwind": {
                    'path': "$referredBy",
                    'preserveNullAndEmptyArrays': True    
                }},
                { "$unwind": {
                    'path': "$requestedBy",
                    'preserveNullAndEmptyArrays': True    
                }},
                { '$sort': {"_id":-1} },
                *args,
                {
                    '$addFields': {
                        "cashier.name": {
                            "$concat": [
                                "$cashier.first_name",
                                " ",
                                "$cashier.last_name"
                            ]
                        },
                        "customer.name": {
                            "$concat": [
                                "$customer.first_name",
                                " ",
                                "$customer.last_name"
                            ]
                        },
                        "cashier._id": { "$toString": "$cashier._id" },
                        "customer._id": { "$toString": "$customer._id" },
                        "branch._id": { "$toString": "$branch._id" },
                        'referredBy._id': {'$toString': '$referredBy._id' },
                        'requestedBy._id': {'$toString': '$requestedBy._id' },
                    },
                },
                {
                    '$project': {
                        'cashierId': 0,
                        'branchId': 0,
                        'referredById': 0,
                        'requestedById': 0,
                        'customerId': 0,
                        "discounts._id": 0,
                        "transactionItems._id": 0,
                        # Internal sync-outbox bookkeeping — stamp_id is a real ObjectId with no
                        # jsonify() encoder, so leaving it in crashes this endpoint the moment any
                        # transaction has gone through the sync-stamping path (BackupRepository).
                        '_sync': 0,
                        'cashier': {
                            'password': 0,
                        }
                    }
                },
            ]))

            transactions = []
            for item in data:
                if item.get('referredBy') is None or item.get('referredBy').get('_id') is None:
                    item['referredBy'] = None
                
                if item.get('requestedBy') is None or item.get('requestedBy').get('_id') is None:
                    item['requestedBy'] = None
                
                transactions.append(item)
            return transactions
        except Exception as e:
            raise e

    def list_terminals(self, include_dev_test=False):
        """Distinct (branch, PTU) pairs that have completed/refunded sales — the choices for the
        admin BIR-report filters. Sales with no PTU (from before terminal scoping) are left out."""
        return list(self._db[self._collection].aggregate([
            { '$match': {
                'status': { '$in': ['completed', 'refunded'] },
                'ptuNumber': { '$nin': [None, ''] },
                **({} if include_dev_test else { 'isDevTest': { '$ne': True } }),
            } },
            { '$group': { '_id': { 'branchId': '$branchId', 'ptuNumber': '$ptuNumber' }, 'min': { '$first': '$min' }, 'sn': { '$first': '$sn' } } },
            { '$addFields': { 'branchObjectId': { '$convert': { 'input': '$_id.branchId', 'to': 'objectId', 'onError': None, 'onNull': None } } } },
            { '$lookup': { 'from': 'branches', 'localField': 'branchObjectId', 'foreignField': '_id', 'as': 'branch' } },
            { '$project': {
                '_id': 0,
                'branchId': '$_id.branchId',
                'ptuNumber': '$_id.ptuNumber',
                'min': 1, 'sn': 1,
                'branchName': { '$ifNull': [{ '$arrayElemAt': ['$branch.name', 0] }, '---'] },
            } },
            { '$sort': { 'branchName': 1, 'ptuNumber': 1 } },
        ]))

    def find_one(self, query={}, agreggate=True):
        data = self.find(query, agreggate=agreggate)

        if(len(data) > 0):
            return data[0]
        return None

    def find_active(self, user_id):
        
        return self.find_one({
          "status": "active",
          "cashierId": user_id,
           "date": getLocalDateStr(),
        })

    def insert_one(self, data, refetch: bool = True):
        result = super().insert_one(data)

        if(not refetch):
            return result
        
        return self.find_one({ '_id': ObjectId(result.inserted_id) })
        