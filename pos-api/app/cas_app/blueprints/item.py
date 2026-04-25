from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.Item import Item
from app.database.config import items
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/item'
item_bp = Blueprint('items', __name__)

@item_bp.get(api + 's')
@authorized
def get_items(user_id):
    ret = []
    try:

        data = items.find()
        for item in data: 
          ret.append(Item.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
@item_bp.get(api + '/<id>')
@authorized
def get_item(user_id, id):

    try:
        data = items.find_one({ '_id': ObjectId(id) })

        if data is not None: 
           
          return {'data': Item.fromDict(data).toDict() }
        return {'message': 'Unable to find supplier.'}

    except Exception as e:
        return {'message': repr(e) }, 500

@item_bp.post(api + '/create')
@authorized
def create_item(user_id):
    print('get item ' + user_id)
    request_data = request.get_json()
    
    try:
        doc = insert_one('items', filterValues(Item.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'Item successfully created.'}
        else:
            return {'message': 'Unable to create item.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
@item_bp.post(api + '/edit')
@authorized
def edit_item(user_id):
    request_data = request.get_json()
    id = request_data['id']

    try:
      item = Item.fromDict(request_data)
   
    
      filter = { '_id': ObjectId(id) }
      new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

      res = items.update_one(filter, new_val)

      if res.modified_count > 0:
        return { 'message': 'Item successfully updated.' }
      else:
        return { 'message': 'Unable to update item.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }
