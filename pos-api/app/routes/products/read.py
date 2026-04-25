from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories, products

get_products = Blueprint("/products", __name__)

@get_products.route('/products', methods=['GET'])
def _get_products():
       #todo add more handling
      #  res = products.find()
       res = products.find().sort("transaction_count", -1)

       ret = []
       for record in res:
         
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
          ret.append({
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
          })
       return {
          'data': ret,
        }, 200
   
