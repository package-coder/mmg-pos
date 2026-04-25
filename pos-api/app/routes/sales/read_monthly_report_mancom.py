from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories, transactions

get_mancom = Blueprint("/reports/mancom", __name__)

@get_mancom.route('/reports/mancom', methods=['GET'])
def _get_mancom():
  
   res_transactions = transactions.find({"status": "Completed"})
   res_categories = product_categories.find()

   total = 0
   ret = []
   if res_categories:
      for category in res_categories:
        ret.append({
            "id": str(category['_id']),
            "name": category['name'],
            "qty": 0,
            "total": 0
        })
   if res_transactions:
      for transaction in res_transactions:
        for service in transaction['services']:
            if service['source'] == 'labTest':
               for obj in ret:
                  if obj['id'] == service['category']['id']:
                     obj['qty'] += service['qty']
                     obj['total'] += service['amount']
                     break
   
   return {
      "data": {
         "cols": ret,
         "total": total
      }
   }, 200
