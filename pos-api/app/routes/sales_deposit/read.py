from flask import Blueprint, g, request
from pydash import merge, omit, pick

from app.database.config import sales_deposits
from app.utils.compare_date import compare_date_year_month, compare_date_range, compare_date_today
from app.utils.utils import ToStringId
from app.filters.date_filter import DateFilter


get_sales_deposits = Blueprint("/sales-deposits", __name__)

@get_sales_deposits.route('/sales-deposits', methods=['GET'])
def _get_sales_deposits():


     try:
          query = request.args.to_dict()
          filters = pick(query, ['dateFilter', 'customDate', 'startDate', 'endDate'])
          query = omit(query, ['dateFilter', 'customDate', 'startDate', 'endDate'])

          deposits = sales_deposits.aggregate([
              { '$match': query },
              {
                    "$addFields": {
                         "cashierId": {"$toObjectId": "$cashierId"},
                         "branchId": {"$toObjectId": "$branchId"}
                    }
               },
              { 
                    '$lookup': {
                         'from': 'users',
                         'localField': 'cashierId',
                         'foreignField': '_id',
                         'as': 'cashier'
                    }, 
               },
               { 
                    '$lookup': {
                        'from': 'branches',
                        'localField': 'branchId',
                        'foreignField': '_id',
                        'as': 'branch'
                    }, 
               },
               {
                    "$addFields": {
                         "branch": { "$arrayElemAt": ["$branch", 0] },
                         "cashier": { "$arrayElemAt": ["$cashier", 0] }
                    }
               },
               {
                    "$addFields": {
                         "cashier.name": {
                              "$concat": [
                                   "$cashier.first_name",
                                   " ",
                                   "$cashier.last_name"
                              ]
                         }
                    }
               },
               { "$sort": { "_id": -1 }},
               {
                   '$project': {
                       'cashierId': 0,
                       'branchId': 0,
                       'cashierName': 0,
                       'cashier': {
                           'password': 0,
                           'branches': 0
                       }
                   }
               }
          ])

          dateFilter = DateFilter.TODAY
          if(filters.get('dateFilter') is not None):
               dateFilter = int(filters.get('dateFilter'))

          deposit_list = []
          for deposit in deposits:
               date = deposit['dateDeposited']

               if(dateFilter != DateFilter.ALL):

                    if(dateFilter == DateFilter.CUSTOM_DATE and not compare_date_year_month(date, filters.get('customDate'))):
                         continue
                    if(dateFilter == DateFilter.CUSTOM_FILTER and not compare_date_range(date, filters.get('startDate'),  filters.get('endDate'))):
                         continue
                    if(dateFilter < 9 and not compare_date_today(dateFilter, date)):
                         continue
               
               deposit = ToStringId(deposit)
               deposit['branch'] = ToStringId(deposit['branch'])
               deposit['cashier'] = ToStringId(deposit['cashier'])
               deposit_list.append(deposit)

          return { 'data': deposit_list, }, 200
     except Exception as e:
      return {
            'message': 'Unable to get sales deposits.',
            'error': repr(e),
         }, 500

