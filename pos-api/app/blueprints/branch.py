


from datetime import timedelta
from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from pydash import omit 

from app.middlewares.authorized_attribute import authorized
from app.new_models.AuditLog import AuditCode, AuditLog
from app.new_models.BranchReport import GenerateBranchReport, GetBranchReportQuery
from app.new_models.Filter import DateFilter
from app.new_models.Transaction import TransactionStatus
from app.repositories.audit_log import AuditLogRepository
from app.repositories.branch import BranchRepository
from app.repositories.branch_reports import BranchReportRepository
from app.repositories.transaction import TransactionRepository
from app.utils.utils import getLocalTime, getLocalTimeStr

api = '/v2/branches'
branch_bp = Blueprint('branches', __name__)
repository = BranchRepository()
logger = AuditLogRepository()


@branch_bp.route(api + '/reports')
@authorized
def get_branch_reports(user_id):
    params = request.args.to_dict()

    try:
        model = DateFilter(**params)
        query = { 
            **model.transform()
        }
        branches = repository.find_reports(query)
        return jsonify({ 'data': branches })
    except ValidationError as e:
        return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500
