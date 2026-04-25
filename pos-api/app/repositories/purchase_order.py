
from app.repositories.base import Repository
from app.utils.utils import getLocalDateStr


class PurchaseOrderRepository(Repository):
    _collection = 'purchase_orders'

    def find(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        '_id': {'$toString': '$_id' },
                        'new_items': {
                            "$map": {
                                "input": "$items",
                                "as": "item",
                                "in": {
                                    "$lookup": {
                                        "from": "goods_receipt_items",
                                        "let": {
                                            "itemId": "$item.itemId",
                                            "purchaseOrderId": "$item.purchaseOrderId",
                                        },
                                        "as": "receipts"
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    '$lookup': {
                        'from': 'goods_receipt',
                        'localField': '_id',
                        'foreignField': 'purchaseOrderId',
                        'as': 'goods_receipt_logs',
                        'pipeline': [
                            {
                                '$addFields': {
                                    '_id': {'$toString': '$_id' },
                                }
                            },
                        ]
                    }, 
                },
                { '$sort': {"_id":-1} },
                *args,
            ]))
            print(data)
            items = []
            for order in data:
                # order['items'] = list(map(lambda i: { **i, '_id': str(i['_id']) }, order['items']))
                items.append(order)
            return items
        except Exception as e:
            raise Exception(f"MongoDB find error: {e}")

    def insert_one(self, data):
        result = super().insert_one(data)
        return self.find_one({ "_id": result.inserted_id })
