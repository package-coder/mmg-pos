from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.Payment import Payment
from app.database.config import payments
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/payment'
payment_bp = Blueprint('payments', __name__)

@payment_bp.get(api + 's/history')
@authorized
def get_payment_history(user_id):
    ret = []
    try:

        data = payments.find()
        for item in data: 
          ret.append(Payment.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500
    
@payment_bp.get(api + 's/report')
@authorized
def get_payment_report(user_id):
    ret = []
    try:

        data = payments.find()
        for item in data: 
          ret.append(Payment.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
# @accounts_type_bp.get(api + '/<id>')
# @authorized
# def get_category(user_id, id):

#     try:
#         data = categories.find_one({ '_id': ObjectId(id) })

#         if data is not None: 
           
#             return {'data': Category.fromDict(data).toDict() }
#         return {'message': 'Unable to find supplier.'}

#     except Exception as e:
#         return {'message': repr(e) }, 500

@payment_bp.post(api + '/create')
@authorized
def create_payment(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('payments', filterValues(Payment.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'Payment successfully created.'}
        else:
            return {'message': 'Unable to create Payment.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
@payment_bp.post(api + '/edit')
@authorized
def edit_payment(user_id):
    request_data = request.get_json()
    id = request_data['id']

    try:
      item = Payment.fromDict(request_data)
   
    
      filter = { '_id': ObjectId(id) }
      new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

      res = payments.update_one(filter, new_val)

      if res.modified_count > 0:
        return { 'message': 'Payment successfully updated.' }
      else:
        return { 'message': 'Unable to update Payment.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }
