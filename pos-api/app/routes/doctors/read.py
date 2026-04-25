from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import doctors

get_doctors = Blueprint("/doctors", __name__)

@get_doctors.route('/doctors', methods=['GET'])
def _get_doctors():

   res = doctors.find()

   ret = []
   for record in res:
  
         ret.append({
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
          })
   return {
          'data': ret,
        }, 200
      
