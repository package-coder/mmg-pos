from flask import Blueprint, jsonify, request

from app.middlewares.authorized_attribute import authorized
from app.repositories.app_settings import AppSettingsRepository, DEV_TEST_MODE_KEY

api = '/v2/app-settings'
app_settings_bp = Blueprint('app-settings', __name__)
repository = AppSettingsRepository()


@app_settings_bp.get(api + '/dev-test-mode')
@authorized
def get_dev_test_mode(user_id):
    try:
        enabled = repository.get_flag(DEV_TEST_MODE_KEY, default=False)
        return jsonify({'data': {'enabled': enabled}})
    except Exception as e:
        return jsonify({'message': 'Unable to get Dev Test Mode', 'error': repr(e)}), 500


@app_settings_bp.post(api + '/dev-test-mode')
@authorized
def set_dev_test_mode(user_id):
    try:
        enabled = bool(request.get_json().get('enabled'))
        repository.set_flag(DEV_TEST_MODE_KEY, enabled)
        return jsonify({'data': {'enabled': enabled}})
    except Exception as e:
        return jsonify({'message': 'Unable to set Dev Test Mode', 'error': repr(e)}), 500
