from datetime import date
from bson.objectid import ObjectId
from flask import Blueprint, g, request
from pydash import merge, omit

from app.database.config import cashier_reports
from app.new_models.CashierReport import CashierReport
from app.utils.filter_values import filterValues
from app.utils.utils import ToStringId

get_generated_branch_reports = Blueprint("/branch-reports/generated", __name__)

@get_generated_branch_reports.route('/branch-reports/generated', methods=['GET'])
def _get_generated_branch_reports():

     try:
          branchId = request.args.get('branchId')
          today = str(date.today())
          
          report = generate_branch_report(branchId, today)
          return { 'data': report, }, 200
     except Exception as e:
      return {
            'message': 'Unable to get branch reports',
            'error': repr(e),
         }, 500

def generate_branch_report(branchId, date):
     data = cashier_reports.aggregate([
          { 
               '$match': {
                    'branchId': branchId,
                    'date': date
               } 
          },
          {
               "$lookup": {
                    "from": "sales",
                    "let": {
                         "branchId": "$branchId",
                         "date": "$date"
                    },
                    "pipeline": [
                         {
                              "$match": {
                                   "$expr": {
                                        "$and": [
                                             { "$eq": ["$branch", "$$branchId"] },
                                             { "$eq": ["$date", "$$date"] }
                                        ]
                                   }
                              }
                         },
                         {
                              "$group": {
                                   "_id": "$branchId",
                                   "totalGrossSales": { "$sum": "$paymentDetails.subTotal" },
                                   "totalNetSales": { "$sum": "$paymentDetails.paymentDue" },
                                   "totalDiscount": { "$sum": { "$subtract": ["$paymentDetails.subTotal", "$paymentDetails.paymentDue"] } },
                                   "invoiceStartNumber": { '$min': "$invoiceNumber" },
                                   "invoiceEndNumber": { '$max': "$invoiceNumber" }
                              }
                         },
                    ],
                    "as": "sales"
               }
          },
          {
               "$addFields": {
                    "cashSales": { 
                         "$cond": [
                              { "$gt": [ { "$size": "$sales" }, 0 ] },
                              { "$arrayElemAt": ["$sales", 0] },
                              None
                         ]
                    },
                    "invoiceStartNumber": "$cashSales.invoiceStartNumber",
                    "invoiceEndNumber": "$cashSales.invoiceEndNumber",
               }
          },
          {
               "$group": {
                   "_id": "$branchId",
                    'date': { '$first': '$date' },
                    "totalBeginningCashOnHand": { "$sum": "$beginningCashOnHand.total" },
                    "countBeginningCashOnHand": { "$push": "$beginningCashOnHand.count" },
                    "totalEndingCashOnHand": { "$sum": "$endingCashOnHand.total" },
                    "totalGrossSales": { "$sum": "$cashSales.totalGrossSales" },
                    "totalNetSales": { "$sum": "$cashSales.totalNetSales" },
                    "totalDiscount": { "$sum": "$cashSales.totalDiscount" },
                    "invoiceStartNumber": { '$min': "$cashSales.invoiceStartNumber" },
                    "invoiceEndNumber": { '$max': "$cashSales.invoiceEndNumber" }
               }
          },
          {
               "$addFields": {
                    "_id": {"$toObjectId": "$_id"},
                    "beginningCashOnHand": {
                         "total": "$totalBeginningCashOnHand"
                    },
                    "endingCashOnHand": {
                         "total": "$totalEndingCashOnHand"
                    },
                    "cashSales": {
                        "totalGrossSales": "$totalGrossSales",
                        "totalNetSales": "$totalNetSales",
                        "totalDiscount": "$totalDiscount",
                        "invoiceStartNumber": "$invoiceStartNumber",
                        "invoiceEndNumber": "$invoiceEndNumber",
                    }
               }
          },
          { 
               '$lookup': {
                    'from': 'branches',
                    'localField': '_id',
                    'foreignField': '_id',
                    'as': 'branch'
               }, 
          },
          { "$unwind": "$branch" },
          {
               "$addFields": {
                    "_id": { "$toString": "$_id" },
                    "branch._id": { "$toString": "$branch._id" },
               }
          },
          {
              "$project": {
                  "totalBeginningCashOnHand": 0,
                  "totalEndingCashOnHand": 0,
                  "totalGrossSales": 0,
                    "totalNetSales": 0,
                    "totalDiscount": 0,
                    "invoiceStartNumber": 0,
                    "invoiceEndNumber": 0,
              }
          }
     ])

     reports = [
     #     CashierReport.model_construct(**report).model_dump() 
          report
         for report in list(data)
     ]

     if len(reports) == 0:
          return None

     return reports
     report = reports[0]
     report['branch'] = ToStringId(report['branch'])
     # report['salesDeposit'] = ToStringId(report['salesDeposit'])
     report = ToStringId(report)
     return report