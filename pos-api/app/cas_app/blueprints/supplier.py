from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.Supplier import Supplier
from app.database.config import suppliers
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/supplier'
supplier_bp = Blueprint('suppliers', __name__)

@supplier_bp.get(api.replace('supplier', 'suppliers'))
@authorized
def get_suppliers(user_id):
    ret = []
    try:

        data = suppliers.find()
        for item in data: 
          ret.append(Supplier.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
@supplier_bp.get(api + '/<id>')
@authorized
def get_supplier(user_id, id):

    try:
        data = suppliers.find_one({ '_id': ObjectId(id) })
        if data is not None: 
           
            return {'data': Supplier.fromDict(data).toDict() }
        return {'message': 'Unable to find supplier.'}
    except Exception as e:
        return {'message': repr(e) }, 500

@supplier_bp.post(api + '/create')
@authorized
def create_supplier(user_id):
    request_data = request.get_json()
    
    try:
        print('test', filterValues(Supplier.fromDict(request_data).toDict()))
        doc = insert_one('suppliers', filterValues(Supplier.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'Supplier successfully created.'}
        else:
            return {'message': 'Unable to create supplier.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
@supplier_bp.post(api + '/edit')
@authorized
def edit_supplier(user_id):
    request_data = request.get_json()
    id = request_data['id']

    try:
      item = Supplier.fromDict(request_data)
   
   
      filter = { '_id': ObjectId(id) }
      new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

      res = suppliers.update_one(filter, new_val)

      if res.modified_count > 0:
        return { 'message': 'Supplier successfully updated.' }
      else:
        return { 'message': 'Unable to update suppliers.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }
