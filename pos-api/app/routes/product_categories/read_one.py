from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories

get_product_category = Blueprint("/product/category", __name__)

@get_product_category.route('/product/category', methods=['GET'])
def _get_product_category():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = product_categories.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "name": record["name"],
            "description": record["description"],
            "isActive": record["isActive"],
          },
       }, 200 
   else:
        return {
            'message': 'Product category not found',
            'code': 20
        }, 200
   
