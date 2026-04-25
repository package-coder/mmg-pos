from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import products, transactions

get_products_reports = Blueprint("/reports/products", __name__)

@get_products_reports.route('/reports/products', methods=['GET'])
def _get_products_reports():
  
   res = products.find()
   res_transactions = transactions.find({"status": "Completed"})
   total = 0
   ret = []
   for product in res: 
      ret.append({
         'id': str(product['_id']),
         'name': product['name'],
         'qty': 0
      })

   if res_transactions:
      for transaction in res_transactions: 
         for service in transaction['services']:
            if service['source'] == 'labTest':
               for obj in ret:
                  if obj['id'] == service['_id']:
                     obj['qty'] += service['qty']
                     break

   return {
      "data": {
         "cols": ret,
         "total": total
      }
   }, 200
