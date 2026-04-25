import copy
from datetime import date, datetime, timedelta

import moment
from bson.objectid import ObjectId

from app.database.config import branches, product_categories, transactions


def getMancomPaymentType(args):
   branchIds = args.getlist('branchIds')

   categories = []
   _branches = []
   objectIds = []
   
   min_date = datetime.strptime(args.get('min'), "%m/%d/%Y").date()
   max_date = datetime.strptime(args.get('max'), "%m/%d/%Y")
   max_date = (max_date  + timedelta(days=1)).date()

   res = transactions.find({
      "status": "Completed",
      "branchId": {"$in": branchIds},
   })
   res_copy = []
   if res:
      for transaction in res:
         transaction_date = datetime.fromisoformat(transaction['transactionDate']).date()
         if (min_date <= transaction_date <= max_date):
            res_copy.append(transaction)
   
   for branchId in branchIds:
      objectIds.append(ObjectId(branchId))
   
   res_branch = branches.find({
      "_id": {"$in": objectIds}
   })

   
   
   res_categories = product_categories.find()
   if res_categories:
      for category in res_categories:
         categories.append({
            'id': str(category['_id']),
            'name': category['name'],
            'Cash': 0,
            'AR': 0,
            'Count': 0
         })
     
   if res_branch:
      for branch in res_branch:
         _branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'categories': copy.deepcopy(categories),
            'totalCash': 0,
            'totalAr': 0
         })

   if res_copy:
      for transaction in res_copy:
        for service in transaction['services']:
           if service['source'] == 'package':
               for item in service.get('labTest', []):
                  for branch in _branches:
                     if transaction['branchId'] == branch['id']:
                        for category in branch['categories']:
                           service_category = item.get('category')
                           if service_category != None and category['id'] == service_category['id']:
                              if item['name'].lower() == 'account receivable':
                                 category['AR'] += item.get('amount', 0)
                                 category['Count'] += 1
                                 branch['totalAr'] += item.get('amount', 0)
                              else:
                                 category['Cash'] += item.get('amount', 0)
                                 category['Count'] += 1
                                 branch['totalCash'] += item.get('amount', 0)
           else: 
              for branch in _branches:
                if transaction['branchId'] == branch['id']:
                   for category in branch['categories']:
                     # service_category = item.get('category')
                      #if service_category != None and category['id'] == service_category['id']:
                        if service['name'].lower() == 'account receivable':
                            category['AR'] += service.get('amount', 0)
                            category['Count'] += 1
                            branch['totalAr'] += service.get('amount', 0)
                        else:
                            category['Cash'] += service.get('amount', 0)
                            category['Count'] += 1
                            branch['totalCash'] += service.get('amount', 0)
   return _branches


