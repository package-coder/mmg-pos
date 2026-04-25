


from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.middlewares.authorized_attribute import authorized
from app.new_models.Filter import BranchFilter, DateFilter
from app.repositories.audit_log import AuditLogRepository
from app.repositories.category import CategoryRepository

api = '/v2/categories'
category_bp = Blueprint('pos-categories', __name__)
repository = CategoryRepository()
logger = AuditLogRepository()


@category_bp.route(api + '/reports')
@authorized
def get_categoy_reports(user_id):
    params = request.args.to_dict()

    try:
        dateFilter = DateFilter(**params)
        branchFilter = BranchFilter(**params)
        query = { 
            **dateFilter.transform(),
            **branchFilter.transform()
        }
        branches = repository.find_transactions(query)
        return jsonify({ 'data': branches })
    except ValidationError as e:
        return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500
