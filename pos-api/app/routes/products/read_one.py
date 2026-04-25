from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories, products

get_product = Blueprint("/product", __name__)

@get_product.route('/product', methods=['GET'])
def _get_product():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = products.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
        category = None
        try: 
              p_cat_record = product_categories.find_one({"_id": ObjectId(record["category_id"])})
              if p_cat_record: 
                  category = {
                      "id": str(p_cat_record['_id']),
                      "name": p_cat_record['name'],
                      "description": p_cat_record['description']
                    }
        except: 
            category = None
        return {
          'data': {
          "_id": str(record["_id"]),
          "sku": record.get("sku"),
          "name": record["name"],
          "price": record["price"],
          "description": record.get("description"),
          "category": category,
          "inventory_prerequisite": record["inventory_prerequisite"],
          "created_by": record["created_by"],
          "created_at": record["created_at"],
          "no_price": record.get('no_price'),
          "transaction_count": record.get('transaction_count')
          },
       }, 200 
   else:
        return {
            'message': 'Product not found',
            'code': 20
        }, 200
   
