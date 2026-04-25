import copy
from datetime import datetime, timedelta

import moment
from bson.objectid import ObjectId

from app.database.config import branches, product_categories, transactions


def generateSummaryIncome(args):
   branchIds = args.getlist('branchIds')

   categories = []
   _branches = []
   objectIds = []

   min_date = datetime.strptime(args.get('min'), "%m/%d/%Y").date()
   max_date = datetime.strptime(args.get('max'), "%m/%d/%Y")
   max_date = (max_date  + timedelta(days=1)).date()

   res = transactions.find({
      "status": "Completed",
      "branchId": {"$in": branchIds}
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
            'total': 0,
            'cash': 0,
            'charge': 0
         })

      
   if res_branch:
      for branch in res_branch:
         _branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'categories': copy.deepcopy(categories),
            'total': 0,
            'totalCash': 0,
            'totalCharge': 0
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
                                if transaction['paymentDetails']['tenderType'].lower() == 'cash':
                                    category['cash'] += item.get('amount', 0)
                                    category['total'] += item.get('amount', 0)
                                    branch['totalCash'] += item.get('amount', 0)
                                else: #charge
                                    category['charge'] += item.get('amount', 0)
                                    category['total'] += item.get('amount', 0)
                                    branch['totalCharge'] += item.get('amount', 0)
           else: 
              for branch in _branches:
                if transaction['branchId'] == branch['id']:
                   for category in branch['categories']:
                     service_category = item.get('category')
                     if service_category != None and category['id'] == service_category['id']:
                        if transaction['paymentDetails']['tenderType'].lower() == 'cash':
                            category['cash'] += service.get('amount', 0)
                            category['total'] += service.get('amount', 0)
                            branch['totalCash'] += service.get('amount', 0)
                        else:
                            category['charge'] += service.get('amount', 0)
                            category['total'] += service.get('amount', 0)
                            branch['totalCharge'] += service.get('amount', 0)

   return _branches


