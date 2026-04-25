
from datetime import date, datetime
from flask import Blueprint, g, request
from pydash import merge, omit

from app.database.config import branch_reports
from app.database.store import insert_one
from app.models.BranchReports import BranchReport
from app.routes.branch_reports.read_generated import generate_branch_report
from app.utils.utils import getLocalTime, getTimeZone, getLocalDateStr

create_branch_reports = Blueprint("/branch-reports/create", __name__)

@create_branch_reports.route('/branch-reports/create', methods=['POST'])
def _create_branch_reports():
   request_data = request.get_json()
   report = None
   today = getLocalDateStr()

   try:
      existing_report = branch_reports.find({ "branchId": request_data['branchId'], 'date': today })

      if len(list(existing_report)) > 0:
         raise Exception('Only one branch report is allowed per day.')

      generated_branch_report = generate_branch_report(request_data['branchId'], today)[0]

      report = { **request_data, **generated_branch_report }
      
      doc = insert_one('branch_reports', {
         **report,
         "created_at": getLocalTime(),
         "date": today,
         "cashierId": g.user_id
      })
      
      if not doc.inserted_id:
         raise Exception('Document failed to create')

      # report.id = doc.inserted_id
      return {
         'message': 'Branch report successfully created',
         'code': 15,
         # 'data': report.toDict()
      }, 200 
   except Exception as e:
      return {
            'message': 'Unable to add branch report.',
            'error': repr(e),
         }, 500
   