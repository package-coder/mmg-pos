from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from pydash import omit

from app.cas_app.models.GoodsReceipt import CompletePurchaseOrder, InspectPurchaseOrder, InventoryPurchaseOrder, PurchaseOrderTransactionStatus, ReceiveMultiplePurchaseOrder, Receipt, ReceivePurchaseOrder
from app.cas_app.models.new_models.PurchaseOrder import PurchaseOrderAction, PurchaseOrderDiscrepancyType
from app.database.config import purchase_orders, items, inventories, goods_receipt_items
from app.middlewares.authorized_attribute import authorized
from app.repositories.goods_item import GoodsItemRepository
from app.repositories.goods_receipt import GoodsReceiptRepository

api = '/api/cas/goods-receipts'
goods_receipt_bp = Blueprint('goods-receipts', __name__)
repository = GoodsReceiptRepository()

@goods_receipt_bp.get('/api/cas/goods-items')
@authorized
def get_all_goods_items(user_id):
    query = request.args.to_dict()

    try:
        goods_items = GoodsItemRepository().find(query)
        return { 'data': goods_items }
    except Exception as e:
        return jsonify({'message': 'Unable to get all goods items', 'error': repr(e)}), 500
    
@goods_receipt_bp.get(api)
@authorized
def get_all_goods_receipts(user_id):
    query = request.args.to_dict()

    try:
        receipts = repository.find(query)
        return { 'data': receipts }
    except Exception as e:
        return jsonify({'message': 'Unable to get all goods receipt', 'error': repr(e)}), 500
    
@goods_receipt_bp.get(api + '/<id>')
@authorized
def get_goods_receipt(user_id, id):
    try:
        purchase_order = repository.find_one({ '_id': ObjectId(id) })
        if purchase_order is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
    
        return { 'data': purchase_order }
    except Exception as e:
        return jsonify({'message': 'Unable to get receipt', 'error': repr(e)}), 500

@goods_receipt_bp.post(api + '/receive-multiple')
@authorized
def receive_multiple_purchase_order(user_id):
    request_data = request.get_json()
    try:
        model = ReceiveMultiplePurchaseOrder(
            **request_data,
            receiverId=user_id,
        )
        
        receipts = []
        for receipt in model.receipts:
            purchase_order = purchase_orders.find_one({ '_id': receipt.purchaseOrderObjectId })
            if purchase_order is None:
                return { '_id': receipt.purchaseOrderId, 'message': 'Purchase order not found' }, 404
        
            document = repository.insert_one({ 
                **receipt.model_dump(exclude={'items'}),
                **model.model_dump(exclude={'receipts'})
            })
            goods_receipt_items.insert_many(
                map(
                    lambda i: { 
                        **i.model_dump(), 
                        'purchaseOrderId': receipt.purchaseOrderId,
                        'receiptId': document['_id']
                    }, 
                    receipt.items
                )
            )
            document = repository.find_one({ '_id': ObjectId(document['_id']) })
            receipts.append(document)

        return { 'message': 'Multiple purchase order received successfully.', 'data': receipts }
    except ValidationError as e:
        return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to receive purchase order', 'error': repr(e)}), 500

@goods_receipt_bp.post(api + '/receive')
@authorized
def receive_purchase_order(user_id):
    request_data = request.get_json()
    try:
        receipt = ReceivePurchaseOrder(
            **request_data, 
            receiverId=user_id, 
        )
        
        purchase_order = purchase_orders.find_one({ '_id': receipt.purchaseOrderObjectId })
        if purchase_order is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
        
        document = repository.insert_one(receipt.model_dump(exclude={'items'}))
        goods_receipt_items.insert_many(
            map(
                lambda i: { 
                    **i.model_dump(), 
                    'purchaseOrderId': receipt.purchaseOrderId,
                    'receiptId': document['_id']
                }, 
                receipt.items
            )
        )
        document = repository.find_one({ '_id': ObjectId(document['_id']) })
        return { 'message': 'Purchase order received successfully.', 'data': document }
    except ValidationError as e:
        return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to receive purchase order', 'error': repr(e)}), 500

@goods_receipt_bp.post(api + '/<id>/inspect')
@authorized
def inspect_purchase_order(user_id, id):
    request_data = request.get_json()
    try:
        inspect = InspectPurchaseOrder(
            **request_data, 
            inspectorId=user_id, 
        )
        
        receipt = repository.find_one({ '_id': ObjectId(id) })
        
        if receipt is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
        
        if receipt['status'] != PurchaseOrderTransactionStatus.PENDING_INSPECTION:
            return { 'data': None, 'message': 'Goods is not applicable for inspection' }, 404

        print(inspect.model_dump_json())
        for item in inspect.items:
            goods_receipt_items.update_one(
                { 'itemId': item.itemId, 'receiptId': id },
                { '$set': item.model_dump() }
            )
        
        document = repository.update_one(
            { '_id': ObjectId(id) },
            { '$set': inspect.model_dump(exclude={'items'})}
        )
        return { 'message': 'Purchase order inspected successfully.', 'data': document }
    except ValidationError as e:
        return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to inspect purchase order', 'error': repr(e)}), 500

@goods_receipt_bp.post(api + '/<id>/complete')
@authorized
def complete_purchase_order(user_id, id):
    request_data = request.get_json()
    try:
        complete = CompletePurchaseOrder(**request_data, completorId=user_id)
        receipt = repository.find_one({ '_id': ObjectId(id) })
        
        if receipt is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
        
        if receipt['status'] != PurchaseOrderTransactionStatus.PENDING_ACTION:
            return { 'data': None, 'message': 'Goods is not applicable for completion' }, 404

        document = repository.update_one(
            { '_id': ObjectId(id) },
            {  '$set': complete.model_dump()}
        )

        return { 'message': 'Purchase order completed successfully.', 'data': document }
    except ValidationError as e:
        return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to complete purchase order', 'error': repr(e)}), 500

@goods_receipt_bp.get(api + '/<id>/match')
@authorized
def match_purchase_order(user_id, id):
    try:
        receipt = repository.find_one({ '_id': ObjectId(id) })
        purchase_order = purchase_orders.find_one({ '_id': ObjectId(receipt['purchaseOrderId']) })

        if receipt is None or purchase_order is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
     
        order_items = []
        for order in purchase_order.get('items', []):
            received_items = receipt.get('items') or []
            received_item = list(filter(lambda i: i['itemId'] == order['itemId'], received_items))

            if(received_item is None or len(received_item) == 0):
                order_items.append({ 
                    **order, 
                    "discrepancyType": PurchaseOrderDiscrepancyType.MISSING 
                })
                continue
            received_item = received_item[0]

            if order['quantity'] > (received_item['quantityReceived'] or 0):
                order_items.append({ 
                    **order, 
                    **received_item,
                    "discrepancyType": PurchaseOrderDiscrepancyType.QUANTITY_MISMATCH 
                })
                
        return { 'data': { **receipt, 'items': order_items } }
    except Exception as e:
        return jsonify({'message': 'Unable to complete purchase order', 'error': repr(e)}), 500

@goods_receipt_bp.post(api + '/<id>/update-inventory')
@authorized
def invent_purchase_order(user_id, id):
    try:
        receipt = repository.find_one({ '_id': ObjectId(id) })
        purchase_order = purchase_orders.find_one({ '_id': ObjectId(receipt['purchaseOrderId']) })

        
        if receipt is None:
            return { 'data': None, 'message': 'Purchase order not found' }, 404
        
        if receipt['status'] != PurchaseOrderTransactionStatus.COMPLETED:
            return { 'data': receipt, 'message': 'Goods is applicable for adding in inventory' }, 404
        
        if receipt['action'] != PurchaseOrderAction.ACCEPTED:
            return { 'data': receipt, 'message': 'Goods should be accepted first before adding it on inventory' }, 404

       
        order_items = []
        for order_item in purchase_order.get('items', []):
            received_items = receipt.get('items') or []
            received_item = list(filter(lambda i: i['itemId'] == order_item['itemId'], received_items))

            if(received_item is None or len(received_item) == 0):
                continue
            received_item = received_item[0]

            if order_item['quantity'] > (received_item['quantityReceived'] or 0):
                continue

            if(received_item.get('inspection') == PurchaseOrderAction.REJECTED):
                continue
            
            order_items.append({ **order_item, **received_item, 'inventoryStatus': PurchaseOrderTransactionStatus.STOCKED  })
            inventories.update_one(
                { 'itemId': received_item['itemId'] },
                { 
                    '$set': {
                        'quantityOnHand': { '$inc':  received_item['quantityReceived'] },
                    } 
                }
            )
        
        for item in order_items: 
            goods_receipt_items.update_one(
                { 'itemId': item['itemId'], },
                { '$set': { 'inventoryStatus': PurchaseOrderTransactionStatus.STOCKED  } }
            )

        inventory = InventoryPurchaseOrder(inventoriedId=user_id, addedItems=order_items)
        document = repository.update_one(
            { '_id': ObjectId(id) },
            {  '$set': inventory.model_dump()}
        )


        return { 'data': document, 'addedItems': order_items }
    except ValidationError as e:
        return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to invetory purchase order', 'error': repr(e)}), 500

