from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories

get_product_categories = Blueprint("/product/categories", __name__)

@get_product_categories.route('/product/categories', methods=['GET'])
def _get_product_categories():

   res = product_categories.find()

   ret = []
   for record in res:

         ret.append({
            "_id": str(record["_id"]),
            "name": record["name"],
            "description": record["description"],
            "isActive": record["isActive"],
          })
   return {
          'data': ret,
        }, 200
      
