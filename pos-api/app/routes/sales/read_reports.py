from bson import ObjectId
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import branches, product_categories, transactions
from app.models.Transaction import Transaction
from app.routes.sales.report_generators.comparativeData import comparativeData
from app.routes.sales.report_generators.mancomPaymentType import \
    getMancomPaymentType
from app.routes.sales.report_generators.packagesMonitoring import \
    generatePackagesReports
from app.routes.sales.report_generators.salesJournal import getSalesJournal
from app.routes.sales.report_generators.summaryIncome import \
    generateSummaryIncome
from app.routes.sales.report_generators.typesOfClient import typesOfClient

get_reports = Blueprint("/reports", __name__)

@get_reports.route('/reports', methods=['GET'])
def _get_reports():
   type = request.args.get('type')
   if type == 'paymentType':
      return { 'data': getMancomPaymentType(request.args) }, 200
   if type == 'comparativeData':
      return { 'data': comparativeData(request.args) }, 200
   if type == 'typesOfClient':
      return { 'data': typesOfClient(request.args) }, 200
   if type == 'summaryIncome':
      return { 'data': generateSummaryIncome(request.args) }, 200
   if type == 'packagesReports':
      return { 'data': generatePackagesReports(request.args) }, 200
   if type == 'salesJournal':
      return { 'data': getSalesJournal(args = request.args, filter = None) }, 200
   if type == 'cashReceiptsJournal':
      return { 'data': getSalesJournal(args = request.args, filter = {'tenderType': 'Cash'})  }, 200
   return {
      'message': 'unkwown report type.'
   }, 401


