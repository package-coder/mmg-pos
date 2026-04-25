


from bson import ObjectId
from flask import Blueprint, jsonify, request,g
from pydantic import ValidationError
from pydash import omit, pick 

from app.filters.date_filter import DateFilter
from app.middlewares.authorized_attribute import authorized
from app.new_models.AuditLog import AuditCode, AuditLog
from app.new_models.CashierReport import TimeInCashierReport, TimeOutCashierReport
from app.new_models.Transaction import TransactionStatus
from app.repositories.audit_log import AuditLogRepository
from app.repositories.cashier_report import CashierReportRepository
from app.repositories.report_cash_count import CashCountRepository
from app.repositories.transaction import TransactionRepository
from app.utils.utils import getLocalDateStr, getLocalTimeStr

api = '/v2/cashier-reports'
cashier_report_bp = Blueprint('cashier-reports', __name__)
reportRepository = CashierReportRepository()
cashCountRepository = CashCountRepository()
transactionRepository = TransactionRepository()
logger = AuditLogRepository()


@cashier_report_bp.route(api)
@authorized
def get_reports(user_id):
    date_filter = int(request.args.get('dateFilter', DateFilter.ALL))
    custom_date = request.args.get('customDate')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    params = pick(request.args.to_dict(), ['date', 'cashierId'])
    

    try:
        previous_report = reportRepository.find_one({ 
            'cashierId': user_id, 
        })

        # query = {} if cashierId is None else { 'cashierId': cashierId }
        reports = reportRepository.find_by_date_and(date_filter, start_date, end_date, custom_date, params)

        return jsonify({
            'data': {
                'previousReports': previous_report,
                'reports': reports
            }
        })
    # except ValidationError as e:
    #     return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500

@cashier_report_bp.post(api + '/time-in')
@authorized
def time_in_report(user_id):
    request_data = request.get_json()

    date_today = getLocalDateStr()
    report = reportRepository.find_one({ 
        'cashierId': user_id, 
        'date': date_today,
        'branchId': request_data['branchId']
    })

    if(report is not None):
        return jsonify({ 'data': report, 'message': 'Report today returned' })
    
    model = TimeInCashierReport(
        **request_data, 
        cashierId=user_id,
    )

    openingFund = cashCountRepository.insert_one({ 
        **model.openingFund.count, 
        **model.model_dump(include={'branchId', 'date'}),
        "total": model.openingFund.total,
        "type": "opening"
    })

    result = reportRepository.insert_one({
        **model.model_dump(exclude={'openingFund'}),
        "openingFundId": str(openingFund.inserted_id)
    })
    
    if result is not None:
        logger.insert_one(AuditLog(action=AuditCode.CASHIER_REPORT_TIME_IN, userId=g.user_id, data=model.model_dump()))
        return jsonify({'message': 'Report created successfully'})
    else:
        logger.insert_one(AuditLog(action=AuditCode.CASHIER_REPORT_TIME_IN_ERR, userId=g.user_id, error='Unable to time in report'))
        return jsonify({'error': 'Unable to create report'}), 500

@cashier_report_bp.post(api + '/time-out')
@authorized
def time_out_report(user_id):
    request_data = request.get_json()

    model = TimeOutCashierReport(
        **request_data,
        timeOut=getLocalTimeStr(),
    )

    query = { '_id': ObjectId(model.id) }

    cashCount = cashCountRepository.insert_one({ 
        **model.endingCashCount.count, 
        **model.model_dump(include={'branchId', 'date'}),
        "total": model.endingCashCount.total,
        "type": "ending"
    })


    result = reportRepository.update_one_bare(query, {
        **model.model_dump(exclude={'endingCashCount', 'id'}),
        "endingCashCountId": str(cashCount.inserted_id)
    }) 
   
    if result is not None:
        logger.insert_one(AuditLog(action=AuditCode.CASHIER_REPORT_TIME_OUT, userId=g.user_id, data=model.model_dump()))
        logger.insert_one(AuditLog(action=AuditCode.X_REPORT_GENERATE, userId=user_id))
        return jsonify({'message': 'Report updated successfully', 'data': result })
    else:
        logger.insert_one(AuditLog(action=AuditCode.CASHIER_REPORT_TIME_OUT_ERR, userId=g.user_id, data=model.model_dump(), error='Unable to time out report'))

        return jsonify({'error': 'Unable to update report'}), 500
    