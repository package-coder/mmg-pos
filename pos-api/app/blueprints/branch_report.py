


from datetime import timedelta
from bson import ObjectId
from flask import Blueprint, jsonify, request,g
from pydantic import ValidationError
from pydash import omit 

from app.filters.date_filter import DateFilter
from app.middlewares.authorized_attribute import authorized
from app.new_models.AuditLog import AuditCode, AuditLog
from app.new_models.CashierReport import TimeInCashierReport, TimeOutCashierReport
from app.new_models.BranchReport import GenerateBranchReport, GetBranchReportQuery
from app.new_models.Transaction import TransactionStatus
from app.repositories.audit_log import AuditLogRepository
from app.repositories.branch_reports import BranchReportRepository
from app.repositories.transaction import TransactionRepository
from app.utils.utils import getLocalDateStr, getLocalTime, getLocalTimeStr

api = '/v2/branch-reports'
branch_report_bp = Blueprint('branch-reports', __name__)
reportRepository = BranchReportRepository()
transactionRepository = TransactionRepository()
logger = AuditLogRepository()


@branch_report_bp.route(api)
@authorized
def get_reports(user_id):
    params = request.args.to_dict()
    branchIds = params.get('branchIds', '').split(',')

    try:
        model = GetBranchReportQuery(**omit(params, 'branchIds'), branchIds=branchIds)
        query = { 
            **omit(model.model_dump(exclude_none=True), 'branchIds'),  
            "branchId": { "$in": model.branchIds }
        }
        reports = reportRepository.find(query)
        return jsonify({ 'data': reports })
    except ValidationError as e:
        return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500

@branch_report_bp.post(api + '/generate')
@authorized
def generate_reports(user_id): 
    request_data = request.get_json()

    errorMessage = "Unable to generate reports"

    try:
        model = GenerateBranchReport(**request_data, cashierId=user_id)
        transactionRepository.update_many_bare(
            {
                **model.model_dump(exclude={'cashierId'}),
                "status": TransactionStatus.HOLD
            }, 
            { "status": TransactionStatus.CANCELLED }
        )

        previousDate = getLocalTime() - timedelta(days=1)
        reportRepository.insert_one({
            **model.model_dump(),
            "datetime": getLocalTimeStr(),
            "previousDate": str(previousDate.date())
        })
        
        message = "Z Report has been generated"
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE,  
                userId=user_id,
                message=message
            )
        )
        return jsonify({ 'message': message })
    except ValidationError as e:
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE_ERR,  
                userId=user_id,
                message=errorMessage
            )
        )
        return jsonify({'message': errorMessage, 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE_ERR,  
                userId=user_id,
                message=errorMessage
            )
        )
        return jsonify({'message': errorMessage, 'error': repr(e)}), 500

