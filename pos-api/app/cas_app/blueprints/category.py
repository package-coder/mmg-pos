from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.Category import Category
from app.database.config import categories
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/category'
category_bp = Blueprint('categories', __name__)

@category_bp.get(api.replace('category', 'categories'))
@authorized
def get_categories(user_id):
    ret = []
    try:

        data = categories.find()
        for item in data: 
          ret.append(Category.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
@category_bp.get(api + '/<id>')
@authorized
def get_category(user_id, id):

    try:
        data = categories.find_one({ '_id': ObjectId(id) })

        if data is not None: 
           
            return {'data': Category.fromDict(data).toDict() }
        return {'message': 'Unable to find supplier.'}

    except Exception as e:
        return {'message': repr(e) }, 500

@category_bp.post(api + '/create')
@authorized
def create_category(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('categories', filterValues(Category.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'Category successfully created.'}
        else:
            return {'message': 'Unable to create Category.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
@category_bp.post(api + '/edit')
@authorized
def edit_category(user_id):
    request_data = request.get_json()
    id = request_data['id']

    try:
      item = Category.fromDict(request_data)
   
    
      filter = { '_id': ObjectId(id) }
      new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

      res = categories.update_one(filter, new_val)

      if res.modified_count > 0:
        return { 'message': 'Category successfully updated.' }
      else:
        return { 'message': 'Unable to update categories.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }
