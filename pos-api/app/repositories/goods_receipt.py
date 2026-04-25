
from pydash import omit
from app.repositories.base import Repository


class GoodsReceiptRepository(Repository):
    _collection = 'goods_receipt'

    def find(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        '_id': {'$toString': '$_id' },
                        'purchaseOrderId': {'$toObjectId': '$purchaseOrderId' },
                        'receiverId': {'$toObjectId': '$receiverId' },
                        'inspectorId': {'$toObjectId': '$inspectorId' },
                    }
                },
                { 
                    '$lookup': {
                        'from': 'goods_receipt_items',
                        'localField': '_id',
                        'foreignField': 'receiptId',
                        'as': 'items'
                    }, 
                },
                {
                    '$lookup': {
                        'from': 'purchase_orders',
                        'localField': 'purchaseOrderId',
                        'foreignField': '_id',
                        'as': 'purchaseOrder'
                    }
                },
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'receiverId',
                        'foreignField': '_id',
                        'as': 'receiver'
                    }
                },
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'inspectorId',
                        'foreignField': '_id',
                        'as': 'inspector'
                    }
                },
                { "$unwind": "$purchaseOrder" },
                { 
                    "$unwind": {
                        'path': "$receiver",
                        'preserveNullAndEmptyArrays': True    
                    }
                },
                { 
                    "$unwind": {
                        'path': "$inspector",
                        'preserveNullAndEmptyArrays': True    
                    }
                },
                {
                    '$addFields': {
                        'purchaseOrder.approverUserID': {'$toObjectId': '$purchaseOrder.approverUserID' },
                    }
                },
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'purchaseOrder.approverUserID',
                        'foreignField': '_id',
                        'as': 'purchaseOrder.approver'
                    }
                },
                { 
                    "$unwind": {
                        'path': "$purchaseOrder.approver",
                        'preserveNullAndEmptyArrays': True    
                    }
                },
                { '$sort': {"_id":-1} },
                *args,
                {
                    '$addFields': {
                        'purchaseOrderId': {'$toString': '$purchaseOrderId' },
                        'purchaseOrder._id': {'$toString': '$purchaseOrder._id' },
                        'receiver._id': {'$toString': '$receiver._id' },
                        'inspector._id': {'$toString': '$inspector._id' },
                        'purchaseOrder.approver._id': {'$toString': '$purchaseOrder.approver._id' },
                    }
                },
                {
                    '$project': {
                        'purchaseOrderId': 0,
                        'purchaseOrder.approverUserID': 0,
                        'purchaseOrder.approver': {
                            '_id': 0,
                            'password': 0,
                        },
                        'inspectorId': 0,
                        'receiverId': 0,
                        'inspector': {
                            '_id': 0,
                            'password': 0,
                        },
                        'receiver': {
                            '_id': 0,
                            'password': 0,
                        },
                    }
                }
            ]))
            items = []
            for order in data:
                order['items'] = list(map(lambda i: { **omit(i, '_id') }, order['items']))
                # if order.get('inspector') is None or order.get('inspector').get('_id') is None:
                #     order['inspector'] = None
                # if order.get('receiver') is None or order.get('receiver').get('_id') is None:
                #     order['receiver'] = None
                items.append(order)
            return items
        except Exception as e:
            raise Exception(f"MongoDB find error: {e}")

    def insert_one(self, data):
        result = super().insert_one(data)
        return self.find_one({ "_id": result.inserted_id })
    
    def update_one(self, query, data, *args, **kwargs):
        result = super().update_one(query, data, *args, **kwargs)
        return self.find_one({ "_id": result['_id'] })