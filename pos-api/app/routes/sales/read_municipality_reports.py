from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import customers, products, transactions

get_municipality_reports = Blueprint("/reports/municipality", __name__)

@get_municipality_reports.route('/reports/municipality', methods=['GET'])
def _get_municipality_reports():
  
   res = customers.find()
   res_transactions = transactions.find({"status": "Completed"})
   total = 0
   ret = dict()
   for customer in res:
      ret[customer['address']['cityMunicipality']] = 0

   if res_transactions:
      for transaction in res_transactions: 
         for obj in ret:
            if obj.lower() in transaction['customerData']['address'].lower():
               ret[obj] += 1
               break

   return {
      "data": {
         "cols": ret,
         "total": total
      }
   }, 200
