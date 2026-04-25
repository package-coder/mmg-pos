from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import roles

get_role = Blueprint("/role", __name__)

@get_role.route('/role', methods=['GET'])
def _get_role():

   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401
   record = roles.find_one({"_id": ObjectId(request.args.get('id'))})

   ret = []
   if record:
         ret.append({
            "_id": str(record["_id"]),
            "name": record["name"],
            "authorizations": record["authorizations"]
          })
        
   return {
          'data': ret,
        }, 200
      
