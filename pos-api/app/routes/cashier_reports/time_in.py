
from datetime import date, datetime

from flask import Blueprint, g, request
from pydash import omit

from app.database.config import cashier_reports
from app.database.store import insert_one
from app.models.CashierReport import CashierReport
from app.utils.utils import getLocalTime

time_in_cashier_report = Blueprint("/cashier-reports/time-in", __name__)

@time_in_cashier_report.route('/cashier-reports/time-in', methods=['POST'])
def _create_cashier_report():
   request_data = request.get_json()

   try:
      report = cashier_reports.find_one({ 
         'cashierId': g.user_id, 
         'date': str(date.today()),
         'branchId': request_data['branchId']
      })

      if report is not None:
         return { 
            'data': { **omit(report, '_id'), "id": str(report["_id"]) },
            'message': 'Existing report returned'
         }, 200   
   except:
      pass
   
   report = CashierReport.fromDict(request_data)
   report.time_in = str(getLocalTime().time())
   report.date = str(date.today())
   report.cashier_id = g.user_id
   
   doc = insert_one('cashier_reports', omit(report.toDict(), 'id'))
   
   if doc.inserted_id:
      report.id = doc.inserted_id
      return {
         'message': 'Report successfully created',
         'code': 15,
         'data': report.toDict()
      }, 200
   else:
      return {
         'message': 'Unable to add report.',
         'code': 30,
      }, 500


