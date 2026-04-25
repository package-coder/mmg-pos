from datetime import date
from bson.objectid import ObjectId
from flask import Blueprint, g
from pydash import omit

from app.database.config import cashier_reports

get_cashier_report_today = Blueprint("/cashier-reports/today", __name__)

@get_cashier_report_today.route('/cashier-reports/today', methods=['GET'])
def _get_cashier_report_today():
   
     prev_report = None

     try:
          reports = cashier_reports.find({ 
               'cashierId': g.user_id, 
               'date': { '$ne': str(date.today()) }
          }).sort({ '_id': -1 }).limit(1)

          reports = list(reports)

          if(len(reports) > 0):
               prev_report = reports[0]
          
     except Exception as e:
          return {
               'message': 'Unable to get previous report',
               'error': repr(e),
          }, 206

     print(str(date.today()))
     report = cashier_reports.find_one({ 
          'cashierId': g.user_id, 
          'date': str(date.today()) 
     })
     
     if prev_report is not None:
          prev_report = {
          **omit(prev_report, '_id'), 
               "id": str(prev_report["_id"]) 
          }

     if report is None:
          return {
               'message': 'No report is available for today',
               'data': None,
               'previous': prev_report
          }, 206
     

     return { 
               'data': { 
                    **omit(report, '_id'), 
                    "id": str(report["_id"]) 
               },
               
          }, 200 


