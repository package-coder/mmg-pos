from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import roles

get_roles = Blueprint("/roles", __name__)

@get_roles.route('/roles', methods=['GET'])
def _get_roles():

   res = roles.find()

   ret = []
   for record in res:

         ret.append({
            "_id": str(record["_id"]),
            "name": record["name"],
            "authorizations": record["authorizations"]
          })
   return {
          'data': ret,
        }, 200
      
