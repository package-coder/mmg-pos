from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import packages, transactions

get_packages_reports = Blueprint("/sales", __name__)

@get_packages_reports.route('/reports/package-monitoring', methods=['GET'])
def _get_packages_reports():
  
   # add date for and filters
   res = transactions.find({"status": "Completed", "servicesParentType": "package"})
   res_packages = packages.find()
   total = 0
   ret = []
   
   if res_packages:
      for package in res_packages:
         ret.append({
            'id': str(package['_id']),
            'name': package['name'],
            'qty': 0,
            'amount': 0
         })
   if res:
      for transaction in res:
         for obj in ret:
            if obj['id'] == transaction['servicesParentId']:
               obj['qty'] += 1
               obj['amount'] += transaction['paymentDetails']['paymentDue']
               break

   
   return {
      "data": {
         "cols": ret,
         "total": total
      }
   }, 200
