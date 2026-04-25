from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import discounts

get_discount = Blueprint("/discount", __name__)

@get_discount.route('/discount', methods=['GET'])
def _get_discount():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = discounts.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "name": record["name"],
            "description": record["description"],
            "value": record["value"],
            "type": record["type"],
          },
       }, 200 
   else:
        return {
            'message': 'Branch not found',
            'code': 20
        }, 200
   
