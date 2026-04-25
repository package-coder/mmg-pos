from flask import Blueprint

from app.database.config import discounts

get_discounts = Blueprint("/discounts", __name__)

@get_discounts.route('/discounts', methods=['GET'])
def _get_discounts():
    res = list(discounts.find().sort({'created_at': -1}))
    data = list(map(lambda i: {**i, "_id": str(i['_id'])}, res))
    return {'data': data}, 200

