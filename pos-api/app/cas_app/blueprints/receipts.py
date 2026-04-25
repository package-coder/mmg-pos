from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.Receipt import Receipt
from app.database.config import receipts
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/receipt'
receipts_bp = Blueprint('receipts', __name__)

@receipts_bp.get(api + 's/history')
@authorized
def get_receipts(user_id):
    ret = []
    try:

        data = receipts.find()
        for item in data: 
          ret.append(Receipt.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

@receipts_bp.get(api + 's/reports')
@authorized
def get_receipts_reports(user_id):
    ret = []
    try:

        data = receipts.find()
        for item in data: 
          ret.append(Receipt.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500


@receipts_bp.post(api + '/create')
@authorized
def create_receipt(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('receipts', filterValues(Receipt.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'Receipt successfully created.'}
        else:
            return {'message': 'Unable to create Receipt.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    
