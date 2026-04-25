from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import sales

get_betalife_reports = Blueprint("/reports/betalife", __name__)

@get_betalife_reports.route('/reports/betalife', methods=['GET'])
def _get_betalife_reports():
  
   res = sales.find({
      "branch": request.args.get('branchId'),
      "cashierId": request.args.get('cashierId')
   })
   total = 0
   ret = []
   if res:
      for sale in res:
        total += sale["amount"]
        ret.append({
          "customerData": sale.get("customerData"),
          "labExams": sale.get("labExams"),
          "invoiceNumber": sale.get("invoiceNumber"),
          "amount": sale.get("amount"),
          "categories": sale.get("categories"),
          "discount": sale.get("discount"),
          "referrer": sale.get("referrer")
        })

   
   return {
      "data": {
         "cols": ret,
         "total": total
      }
   }, 200
