


from itertools import groupby

from pydash import get
from app.new_models.Transaction import TransactionStatus
from app.repositories.base import Repository
from app.repositories.transaction import TransactionRepository
from app.repositories.transaction_item import TransactionItemRepository


class CategoryRepository(Repository):
    _collection = 'product_categories'
    _transaction_item_collection = TransactionItemRepository()._collection
    _transaction_collection = TransactionRepository()._collection


    def find_transactions(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                {
                    "$addFields": {
                        "_id": {"$toString": "$_id"}
                    }
                },
                {
                    "$lookup": {
                        "from": self._transaction_item_collection,
                        "let": {
                            "categoryId": "$_id",
                        },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            { "$eq": ["$categoryId", "$$categoryId"] },
                                        ]
                                    }
                                }
                            },
                            { 
                                '$lookup': {
                                    'from': self._transaction_collection,
                                    "let": {
                                        "transactionId": "$transactionId",
                                    },
                                    "pipeline": [
                                        { '$match': query },
                                        {
                                            "$addFields": {
                                                "_id": {"$toString": "$_id"}
                                            }
                                        },
                                        {
                                            "$match": {
                                                "$expr": {
                                                    "$and": [
                                                        { "$eq": ["$_id", "$$transactionId"] },
                                                    ]
                                                }
                                            }
                                        },
                                    ],
                                    'as': 'transaction'
                                }, 
                            },
                            { "$unwind": {
                                'path': '$transaction',
                                'preserveNullAndEmptyArrays': True    
                            }},
                        ],
                        "as": "transactionItems"
                    }
                },
                {
                    '$project': {
                        'transactionItems._id': 0,
                        'transactionItems.transactionId': 0,
                    }
                },
                # { '$sort': {"_id":-1} },
                *args,
            ]))

            categories = []
            for item in data:
                transactionSummary = {}
                transactionItems = list(filter(lambda i: get(i, 'transaction.tender.type') is not None and get(i, 'transaction.status') == 'completed', item['transactionItems']))
                for key, value in groupby(transactionItems, lambda i: get(i, 'transaction.tender.type')):
                    total = sum(map(lambda i: get(i, 'price'), value))
                    total += transactionSummary.get(key, 0)
                    transactionSummary[key] = total
                item['transactionSummary'] = transactionSummary     
                item['totalNetSales'] = sum(map(lambda i: get(i, 'price'), transactionItems))

                categories.append(item)
            return categories
        except Exception as e:
            raise e