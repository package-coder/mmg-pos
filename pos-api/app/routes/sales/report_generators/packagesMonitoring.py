import copy

import moment
from bson.objectid import ObjectId

from app.database.config import (branches, packages, product_categories,
                                 transactions)

months = ['January', 'February', 'March','April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

def getMonthList(min, max):
   month1, month2 = min.month - 1, max.month - 1
   year1, year2 = min.year, max.year
   ret = []
   while year1 <= year2:
      month2 = 11 if abs(year2 - year1) > 0 else max.month - 1
      while month1 <= month2:
         ret.append(months[month1] + " " + str(year1))
         month1 += 1
      month1 = 0
      year1 += 1

   return ret

def generatePackagesReports(args):
   branchIds = args.getlist('branchIds')

   _branches = []
   objectIds = []
   min = moment.date(args.get('min'), 'MM/YYYY')
   max = moment.date(args.get('max'), 'MM/YYYY')
   month_list = getMonthList(min, max)
   min = min.format('YYYY/MM')
   max = max.format('YYYY/MM')
   res = transactions.find({
      "services.source": 'package',
      "status": "Completed",
      "branchId": {"$in": branchIds},
   })
   res_copy = []
   if res:
        for transaction in res:
        
         if (str(moment.date(transaction['transactionDate']).format("YYYY/MM")) >= str(min)) and (str(moment.date(transaction['transactionDate']).format("YYYY/MM")) <= str(max)):
                res_copy.append(transaction)
   res_packages = packages.find()
   _packages = []
   table = dict()

   if res_packages:
        for package in res_packages:
            _packages.append({
                'id': str(package['_id']),
                'name': package['name'],
                'count': 0,
                'amount': 0
            })  

   for month in month_list:
      table[month] = {
        'packages': copy.deepcopy(_packages),
        "total": 0
      }
   
   _branches = []

   for branchId in branchIds:
      objectIds.append(ObjectId(branchId))
   
   res_branch = branches.find({
      "_id": {"$in": objectIds}
   })
   
   if res_branch:
      for branch in res_branch:
         _branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'table': copy.deepcopy(table),
            'total': 0
         })
   if res_copy:
      for transaction in res_copy:
        key = str(moment.date(transaction['transactionDate']).format("MMMM YYYY"))
        for branch in _branches:
          if branch['id'] == transaction['branchId']:
            for service in transaction['services']:
                if service['source'] == 'package':
                    for col in branch['table'][key]['packages']:
                        if col['id'] == service['_id']:
                            total = 0
                            for item in service['items']:
                                total += item['amount']
                            col['count'] += 1
                            col['amount'] += total
                            branch["total"] += total
                            break
   return _branches


