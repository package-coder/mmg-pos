import copy
from pprint import pprint

import moment
from bson.objectid import ObjectId

from app.database.config import branches, product_categories, transactions


def comparativeData(args):
    year1 = generateYearReport(args.getlist('branchIds'), args.get('min'))
    year2 = generateYearReport(args.getlist('branchIds'), args.get('max'))
    categories = []
    res_categories = product_categories.find()
    if res_categories:
      for category in res_categories:
         categories.append({
            'id': str(category['_id']),
            'name': category['name'],
            '% INCREASE/DECREASE': 0,
         })
  
      categories.append({
            'id': None,
            'name': 'NO. OF CLIENTS',
            '% INCREASE/DECREASE': 0,
      })
   #(currnt year rev - last year rev) / last year rev * 100
    pprint(year1)
    for i, x in enumerate(year1):
       if x['revenue'] <= 0:
           if year2[i]['revenue'] <= 0:
               categories[i]['% INCREASE/DECREASE'] = 0
               continue
           categories[i]['% INCREASE/DECREASE'] = 100
           continue
       percent = abs(x['revenue'] - year2[i]['revenue']) / x['revenue'] * 100
  
       categories[i]['% INCREASE/DECREASE'] = percent

    return {
      'diff': categories,
      args.get('min'): year1,
      args.get('max'): year2,
    }

def generateYearReport(branchIds, year):
   
   categories = []
   objectIds = []
   total = 0
   min = moment.date(year).format('YYYY/MM')
   max = moment.date(year).add(month=1).format('YYYY/MM')

   res = transactions.find({
      "status": "Completed",
      "branchId": {"$in": branchIds},
   })
   res_copy = []
   if res:
      for transaction in res:
         transaction_date = str(moment.date(transaction['transactionDate']).format('YYYY/MM'))
         if (transaction_date >= str(min)) and transaction_date < str(max):
                res_copy.append(transaction)

   for branchId in branchIds:
      objectIds.append(ObjectId(branchId))
   
   res_categories = product_categories.find()
   if res_categories:
      for category in res_categories:
         categories.append({
            'id': str(category['_id']),
            'name': category['name'],
            'count': 0,
            'revenue': 0,
         })
   if res_copy:
      for transaction in res_copy:
        for service in transaction['services']:
           if service['source'] == 'package':
              for item in service['items']:
                for category in categories:
                    if category['id'] == item['category']['id']:
                         category['count'] += 1
                         category['revenue'] += item['amount']
                         total += item['amount']
                    break
           else:
                   for category in categories:
                      if category['id'] == service['category']['id']:
                          category['count'] += 1
                          category['revenue'] += service['amount']
                          total += service['amount']
      
   categories.append({
         'id': None,
         'name': 'NO. OF CLIENTS',
         'count': len(res_copy),
         'revenue': total,
   })
   return categories