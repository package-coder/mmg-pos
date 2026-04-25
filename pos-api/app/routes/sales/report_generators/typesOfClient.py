import copy

import moment
from bson.objectid import ObjectId

from app.database.config import (branches, customers, product_categories,
                                 transactions)


def typesOfClient(args):
   branchIds = args.getlist('branchIds')

   _branches = []
   objectIds = []
   types = []
   min = moment.date(args.get('min'), 'MM/DD/YYYY 00:00:00')
   max = moment.date(args.get('max'), 'MM/DD/YYYY 00:00:00').add(day = 1)

   res = transactions.find({
      "status": "Completed",
      "branchId": {"$in": branchIds},
      # "transactionDate": {"$gte": str(min), "$lte": str(max)}
   })

   #filter -> to be refactored using aggregation.
   res_copy = []
   if res:
      for transaction in res:
         
         if (str(moment.date(transaction['transactionDate'])) >= str(min)) and (str(moment.date(transaction['transactionDate'])) <= str(max)):
                res_copy.append(transaction)
   

   for branchId in branchIds:
      objectIds.append(ObjectId(branchId))
   
   res_branch = branches.find({
      "_id": {"$in": objectIds}
   })

   total = 0
   customer_types = customers.distinct("customer_type")
   

   if customer_types:
      customer_types.append('corporates')
      for customer_type in customer_types:
         types.append({"name": customer_type, "count": 0, "amount": 0})
      types.append({"name": 'NO. OF CLIENTS', "count": 0, "amount": 0})

   if res_branch:
      for branch in res_branch:
         _branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'types': copy.deepcopy(types)
         })
   if res_copy:
      for transaction in res_copy:
        total += 1
        for branch in _branches:
           if branch['id'] == transaction['branchId']:
              for type in branch['types']:
                 if type['name'] == transaction['customerData'].get('customerType') or type['name'] == transaction['customerData']['type']:
                    type['count'] += 1
                    type['amount'] += transaction['paymentDetails']['paymentDue']
                    index = len(branch['types']) - 1
                    branch['types'][index]['count'] += 1
                    branch['types'][index]['amount'] += transaction['paymentDetails']['paymentDue']      

   return _branches


