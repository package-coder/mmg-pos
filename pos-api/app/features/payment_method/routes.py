from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.features.payment_method import service
from app.features.payment_method.models import CreatePaymentMethodRequest, UpdatePaymentMethodRequest
from app.features.payment_method.repository import PaymentMethodRepository
from app.middlewares.authorized_attribute import authorized

api = '/v2/payment-methods'
payment_methods_bp = Blueprint('payment-methods', __name__)
repository = PaymentMethodRepository()


def _ensure_can_manage(user_id):
    # Admin role only. The API can't tell the admin/cloud instance from a branch server (both run
    # APP_ENV=internal-production; only the frontend's VITE_ROLE=admin differs), so the "manage
    # from the admin portal" rule is enforced in the UI: PaymentMethodSettings is read-only unless
    # VITE_ROLE=admin, and the menu lives under the admin-only Settings group.
    service.ensure_admin(repository, user_id)


def _error(e: Exception, message: str):
    if isinstance(e, service.PaymentMethodError):
        return jsonify({'message': str(e)}), e.status
    if isinstance(e, ValidationError):
        return jsonify({'message': message, 'error': e.errors(include_input=False, include_context=False, include_url=False)}), 400
    return jsonify({'message': message, 'error': repr(e)}), 500


@payment_methods_bp.get(api)
@authorized
def list_payment_methods(user_id):
    try:
        include_inactive = request.args.get('includeInactive') == 'true'
        return jsonify({'data': service.list_methods(repository, include_inactive=include_inactive)})
    except Exception as e:
        return _error(e, 'Unable to get payment methods')


@payment_methods_bp.post(api)
@authorized
def create_payment_method(user_id):
    try:
        _ensure_can_manage(user_id)
        data = CreatePaymentMethodRequest(**request.get_json())
        return jsonify({'data': service.create_method(repository, data)}), 201
    except Exception as e:
        return _error(e, 'Unable to create payment method')


# POST, not PATCH: the branch proxy (pos-api/proxy/app.py) only forwards GET/POST/PUT/DELETE.
@payment_methods_bp.post(api + '/<code>')
@authorized
def update_payment_method(user_id, code):
    try:
        _ensure_can_manage(user_id)
        data = UpdatePaymentMethodRequest(**request.get_json())
        return jsonify({'data': service.update_method(repository, code, data)})
    except Exception as e:
        return _error(e, 'Unable to update payment method')
