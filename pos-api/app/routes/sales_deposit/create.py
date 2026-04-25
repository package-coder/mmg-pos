
from datetime import date, datetime

from flask import Blueprint, g, request
from pydash import omit

from app.database.config import sales_deposits
from app.database.store import insert_one
from app.filters.date_filter import DateFilter
from app.models.SalesDeposit import SalesDeposit
from app.repositories.cashier_report import CashierReportRepository
from app.utils.utils import getLocalTime

create_sales_deposit = Blueprint("/sales-deposits/create", __name__)

cashierReportRepository = CashierReportRepository()

@create_sales_deposit.route('/sales-deposits/create', methods=['POST'])
def _create_sales_deposit():
   request_data = request.get_json()
   deposit = None
   today = str(date.today())

   try:
      # existing_deposits = sales_deposits.find({ "branchId": request_data['branchId'], 'dateDeposited': today })

      # if len(list(existing_deposits)) > 0:
      #    raise Exception('Only one sales deposit is allowed per day in any branch.')

      reports = cashierReportRepository.find_by_date_and(date_filter=DateFilter.TODAY, query={ 'cashierId': g.user_id })
      if len(reports) <= 0:
         raise Exception('Forbidden to create sales deposit')

      deposit = SalesDeposit.fromDict(request_data)
      deposit.created_at = getLocalTime()
      deposit.date_deposited = today
      deposit.cashier_id = g.user_id
      
      doc = insert_one('sales_deposits', omit(deposit.toDict(), 'id'))
      
      if not doc.inserted_id:
         raise Exception('Document failed to create')

      deposit.id = doc.inserted_id
      return {
         'message': 'Sales deposit successfully created',
         'code': 15,
         'data': deposit.toDict()
      }, 200 
   except Exception as e:
      return {
            'message': 'Unable to add sales deposit.',
            'error': repr(e),
         }, 500
   