from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import doctors

get_doctor = Blueprint("/doctor", __name__)

@get_doctor.route('/doctor', methods=['GET'])
def _get_doctor():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = doctors.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "firstName": record["firstName"],
            "middleName": record["middleName"],
            "lastName": record["lastName"],
            "age": record["age"],
            "gender": record["gender"],
            "address": record["address"],
            "isMember": record["isMember"],
            "created_by": record["created_by"],
            "created_at": record["created_at"]
          },
       }, 200 
   else:
        return {
            'message': 'Doctor not found',
            'code': 20
        }, 200
   
