from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit
from datetime import datetime

from app.cas_app.models.PurchaseOrder import PurchaseOrder
from app.database.config import purchase_orders, users
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/purchase-order'
purchase_order_bp = Blueprint('purchase_orders', __name__)

@purchase_order_bp.get(api + 's')
@authorized
def get_purchase_orders(user_id):
    ret = []
    try:

        data = purchase_orders.find()
        for item in data: 
          ret.append(PurchaseOrder.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
@purchase_order_bp.get(api + '/<id>')
@authorized
def get_purchase_order(user_id, id):

    try:
        data = purchase_orders.find_one({ '_id': ObjectId(id) })

        if data is not None: 
          return {'data': PurchaseOrder.fromDict(data).toDict() }
        return {'message': 'Unable to find Purchase Order.'}

    except Exception as e:
        return {'message': repr(e) }, 500

@purchase_order_bp.post(api + '/create')
@authorized
def create_purchase_order(user_id):
    request_data = request.get_json()
    request_data['status'] = 'Pending Approval'
    try:
        purhcase_order = PurchaseOrder.fromDict(request_data).toDict()
        doc = insert_one('purchase_orders', filterValues(purhcase_order))
        if doc.inserted_id:
            return {'data': purhcase_order}
        else:
            return {'message': 'Unable to create purchase order.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
@purchase_order_bp.post(api + '/edit')
@authorized
def approve_purchase_orders(user_id):
    request_data = request.get_json()
    id = request_data['id']
    request_data['approverUserID'] = request_data["approverUserID"]
    try:
        item = PurchaseOrder.fromDict(request_data)
        user = users.find_one({"_id": ObjectId(request_data['approverUserID'])})
        
        if user:
            logs = {
                "name": user["first_name"] + " " + user["last_name"],
                "userId": str(user["_id"]),
                "notes": request_data["notes"], 
                "status": request_data["status"], 
                "createdAt": datetime.now().strftime("%m/%d/%Y %I:%M:%S %p"),

            }
            filter = { '_id': ObjectId(id) }
            new_val = { 
                "$set": filterValues(omit(item.toDict(), 'id', 'logs')),  # Update other fields (but not 'logs')
                 "$push": {
                    "logs": logs  # Append the new log entry to 'logs'
                },
            }

            res = purchase_orders.update_one(filter, new_val)

            if res.modified_count > 0:
                return { 'message': 'Purchase order successfully updated.' }
            else:
                return { 'message': 'Unable to update purchase order.' }, 400
        else:
            return { 'message': 'Unable to update purchase order.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }


@purchase_order_bp.get(api + '/completed')
@authorized
def purchaseOrderCompleted(user_id):
  
    try:
        pipeline = [
        {
            '$match': {
                'isOrderCompleted': True  # Filter for completed purchase orders
            }
        },
        {
            '$addFields': {
                'orderNumber': {'$toString': '$_id'}  # Convert _id to string and add as orderNumber
            }
        },
        {
            '$lookup': {
                'from': 'purchase_invoices',
                'localField': 'orderNumber',  # Match the newly created orderNumber
                'foreignField': 'refInvoiceNumber',  # Match with refInvoiceNumber in purchase_invoices
                'as': 'invoices'
            }
        },
        {
            '$match': {
                'invoices': {'$eq': []}  # Only keep purchase orders with no matching invoices
            }
        },
        {
        '$project': {
            '_id': {'$toString': '$_id'},  # Convert _id to string in the output
            'supplierId': 1,
            'items': 1,
            'totalAmount': 1,
            'status': 1,
            'supplierEmail': 1,
            'supplierName': 1,
            'approverUserID': 1,
            'notes': 1,
            "isOrderCompleted": 1
            }
    }
         ]
        result = list(purchase_orders.aggregate(pipeline))
        return {"data":result }, 200
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }
