from bson import ObjectId
from flask import Blueprint, jsonify, request

from app.filters.date_filter import DateFilter, compare_date_filter
from app.middlewares.authorized_attribute import authorized
from app.new_models.Transaction import CreateTransaction
from app.repositories.audit_log import AuditLogRepository
from app.repositories.settings import SettingRepository

api = '/v2/audit-logs'
audit_log_bp = Blueprint('audit_logs', __name__)
repository = AuditLogRepository()

@audit_log_bp.get(api)
@authorized
def get_audit_logs(user_id):
    try:
        logs = repository.find({})
        return jsonify({'data': logs})
    except Exception as e:
        return jsonify({'message': 'Unable to get audit logs', 'error': repr(e)}), 500
