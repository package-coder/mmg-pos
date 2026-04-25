from bson import ObjectId
from flask import Blueprint, request, jsonify
from collections import Counter



from app.database.config import purchase_orders
from app.database.config import goods_receipt
from app.database.config import inventories
from app.middlewares.authorized_attribute import authorized
from app.cas_app.models.GoodsReceipt import  CompletePurchaseOrder

# def objectid_to_str(data):
#     if isinstance(data, dict):
#         return {k: objectid_to_str(v) for k, v in data.items()}
#     elif isinstance(data, list):
#         return [objectid_to_str(item) for item in data]
#     elif isinstance(data, ObjectId):
#         return str(data)
#     return data
api = '/api/cas/purchase-to-received'
purchase_order_receipt_bp = Blueprint('purchase_order_receipt', __name__)

pipeline = [
    {
        "$match": {
            "status": "Approved"
        }
    },
    {
        "$unwind": "$items"
    },
    {
        "$lookup": {
            "from": "goods_receipt_items",
            "let": {
                "itemId": "$items.itemId",
                "purchaseOrderId": {"$toString": "$_id"}
            },
            "pipeline": [
                {
                    "$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$itemId", "$$itemId"]},
                                {"$eq": ["$purchaseOrderId", "$$purchaseOrderId"]},
                                {"$ne": ["$inspection", "REJECTED"]}
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "quantityReceived": {"$sum": "$quantityReceived"},
                        "goodReceiptsCount": {"$sum": 1}
                    }
                }
            ],
            "as": "good_receipts"
        }
    },
    {
        "$unwind": {
            "path": "$good_receipts",
            "preserveNullAndEmptyArrays": True
        }
    },
    {
        "$addFields": {
            "quantityReceived": {"$ifNull": ["$good_receipts.quantityReceived", 0]},
            "goodReceiptsCount": {"$ifNull": ["$good_receipts.goodReceiptsCount", 0]},
            "requiredQuantity": {"$subtract": ["$items.quantity", {"$ifNull": ["$good_receipts.quantityReceived", 0]}]}
        }
    },
    {
        "$match": {
            "$or": [
                {"$expr": {"$lt": ["$quantityReceived", "$items.quantity"]}},
                {"goodReceiptsCount": {"$lt": 1}}
            ]
        }
    },
    {
        "$project": {
            "_id": {"$toString": "$_id"},  # Convert purchase order _id to string
            "supplierId": "$supplierId",
            "totalAmount": "$totalAmount",
            "status": "$status",
            "supplierEmail": "$supplierEmail",
            "supplierName": "$supplierName",
            "approverUserID": "$approverUserID",
            "notes": "$notes",
            "item": {
                "itemId": "$items.itemId",
                "itemName": "$items.itemName",
                "quantity": "$items.quantity",
                "unitPrice": "$items.unitPrice",
                "totalPrice": "$items.totalPrice",
                "quantityReceived": "$quantityReceived",
                "requiredQuantity": "$requiredQuantity"
            }
        }
    }
]

def validate_purchase_order(request_data):
    items = request_data["items"]
    purchaseOrderId = request_data["purchaseOrderId"]

    # Fetch the purchase order from the database
    purchase_order = purchase_orders.find_one({"_id": ObjectId(purchaseOrderId)})

    if not purchase_order:
        return False  # Purchase order not found

    # Create a dictionary for easy quantity lookup
    order_items = {item['itemId']: item['quantity'] for item in purchase_order['items']}

    # Create a counter for items from the request
    requested_items_counter = Counter((item['itemID'], item['quantity']) for item in items)

    # Create a counter for order items
    order_items_counter = Counter((item['itemId'], item['quantity']) for item in purchase_order['items'])

    # Check if the two counters match
    return requested_items_counter == order_items_counter


@purchase_order_receipt_bp.get(api)
@authorized
def get_purchase_order_received(user_id):
    results = list(purchase_orders.aggregate(pipeline))
    return {"data": results } 


@purchase_order_receipt_bp.post(api + "/complete-purchase-order-items")
@authorized
def update_good_receipts_and_inventory(user_id):
    request_data = request.get_json() 
    items = request_data["items"]
    purchaseOrderId = request_data["purchaseOrderId"]
    matchPurchase = validate_purchase_order(request_data)
    if not matchPurchase:
        return jsonify({"message": "Purchase order mismatch."}), 400
    
    complete = CompletePurchaseOrder(**request_data, completorId=user_id)
    update_data = complete.model_dump()
    # Perform the update
    update_result = goods_receipt.update_many(
        { '_id': { '$in': [ObjectId(id) for id in request_data["receiptIds"]] } },
        { '$set': update_data }
    )   

    # Check if any receipts were updated
    if update_result.modified_count > 0:
           
        for item in items:
            itemID = item['itemID']
            quantity = item['quantity']

            # Find the existing inventory item
            inventory_item = inventories.find_one(
                {"itemId": itemID},
            )

                # Create a new inventory item if it doesn't exist
            new_inventory_item = {
                "itemId": itemID,
                "quantityOnHand": quantity,
                "reorderPoint": inventory_item['reorderPoint'] if inventory_item and 'reorderPoint' in inventory_item else "",
                "expirationDate": inventory_item['expirationDate'] if inventory_item and 'expirationDate' in inventory_item else "",
                "expirationWarningDays": inventory_item['expirationWarningDays'] if inventory_item and 'expirationWarningDays' in inventory_item else 30,
                "expirationStatus": inventory_item['expirationStatus'] if inventory_item and 'expirationStatus' in inventory_item else "",
                "lotNumber": inventory_item['lotNumber'] if inventory_item and 'lotNumber' in inventory_item else 0,
                "purchaseId": purchaseOrderId
            }

        inventories.insert_one(new_inventory_item)  # Insert new inventory item            
        update_result = purchase_orders.update_one(
                {"_id": ObjectId(purchaseOrderId)},
                {
                    "$set": {"isOrderCompleted": True},  # Update to true
                }
        )
               
        print(update_result)
        return jsonify({"message": "Purchase order marked as completed."}), 200
    else:
        return jsonify({"message": "No receipts were updated. Inventory update skipped."}), 400