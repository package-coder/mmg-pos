import copy

import moment
from bson.objectid import ObjectId
from pydash import merge, omit

from app.database.config import (branches, customers, product_categories,
                                 transactions)
from app.models.Transaction import DiscountApplied
from app.utils.invoice_setting import generate_invoice_str

# 1.Sales Journal (All Payment Method)

# Ref No.
# Date
# Customer
# Address
# Gross Sales
# Discount
# Discount Type
# Net Sales Amount
def getSalesJournal(args, filter):
   branchIds = args.getlist('branchIds')
   _filter = None
   query = {
      "status": "Completed",
      "branchId": {"$in": branchIds}
   }
   if filter and filter['tenderType']:
       query['paymentDetails.tenderType'] = filter['tenderType']

   print(query)
   min = moment.date(args.get('min'), 'MM/DD/YYYY 00:00:00')
   max = moment.date(args.get('max'), 'MM/DD/YYYY 00:00:00').add(day = 1)
   res = transactions.find(query)
   ret = []

   # branch = branches.find_one({
   #    "_id": ObjectId(args.get('branchIds'))
   #  })
   res_copy = []
   if res:
      for transaction in res:
         if (str(moment.date(transaction['transactionDate'])) >= str(min)) and (str(moment.date(transaction['transactionDate'])) <= str(max)):
                res_copy.append(transaction)
   total = 0
   discount = 0
   if res_copy:
      for transaction in res_copy:
          discountApplied = DiscountApplied.toDict(DiscountApplied.fromDict(transaction.get('discountApplied')))
          discount += 0 if discountApplied["totalDiscount"] is None else discountApplied["totalDiscount"] 
          total += transaction["paymentDetails"]["subTotal"]
          branch = branches.find_one({
              "_id": ObjectId(transaction['branchId'])
          })
          ret.append({
              "refNo": generate_invoice_str(branch['code'], transaction['invoiceNumber']),
              "date": transaction['transactionDate'],
              "customer": transaction['customerData']['name'],
              "address": transaction['customerData']['address'],
              "discount": discountApplied["totalDiscount"],
              "discountType": discountApplied["type"],
              "netSales": transaction["paymentDetails"]["subTotal"] - (0 if discountApplied["totalDiscount"] is None else discountApplied["totalDiscount"]),
              "grossSales": transaction["paymentDetails"]["subTotal"],
              "id": str(transaction['_id'])
            },)
   
   return ret


