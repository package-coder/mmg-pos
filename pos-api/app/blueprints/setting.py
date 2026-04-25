from bson import ObjectId
from flask import Blueprint, jsonify, request

from app.filters.date_filter import DateFilter, compare_date_filter
from app.middlewares.authorized_attribute import authorized
from app.new_models.Transaction import CreateTransaction
from app.repositories.settings import SettingRepository

api = '/v2/settings'
setting_bp = Blueprint('settings', __name__)
repository = SettingRepository()

@setting_bp.get(api)
@authorized
def get_settings(user_id):
    try:
        query = { 'userId': user_id }
        settings = repository.find(query)
        return jsonify({'data': settings})
    except Exception as e:
        return jsonify({'message': 'Unable to get settings', 'error': repr(e)}), 500

@setting_bp.post(api)
@authorized
def save_settings(user_id):
    try:
        request_data = request.get_json()
        active_transaction = repository.find_one({ 'userId': user_id })

        if active_transaction is not None:
            return { 
                'data': active_transaction, 
                'message': 'Return active transaction' 
            }, 200
            
        transaction = CreateTransaction(
            branchId=request_data['branchId'],
            cashierId=user_id
        )

        result = repository.insert_one(transaction.dict())
        if result is not None:
            return jsonify({'message': 'Transaction created successfully', 'data': result })
    except Exception as e:
        return jsonify({'message': 'Unable to create transaction', 'error': repr(e)}), 500
