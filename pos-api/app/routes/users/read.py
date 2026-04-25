
import os

import bcrypt
import jwt
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request
from pydash import omit

from app.database.config import branches, users, roles
from app.models.Branch import Branch

JWT_SECRET = os.getenv('JWT_SECRET')

get_users = Blueprint("/users", __name__)

@get_users.route('/users', methods=['GET'])
def _get_users():
       #todo add more handling
       res = users.find()

        
       ret = []
       for user in res:
          user_branch = None
          user_role = None
          try:
              role = roles.find_one({"_id": ObjectId(user["role"])})
              user_role = {
                "_id": str(role["_id"]),
                "name": role["name"],
                "authorizations": role['authorizations']
              } 
          except:
            user_role = None


          branch_list = []
          for branch_id in user['branches']:
            branch = branches.find_one({"_id": ObjectId(branch_id) })
            branch_list.append({ **omit(branch, '_id'), "id": str(branch["_id"]) })
            
          ret.append({
            "_id": str(user["_id"]),
            "username": user["username"],
            "role": user_role,
            "branches": branch_list,
            "firstName": user["first_name"],
            "lastName": user["last_name"],
            "isActive": user["is_active"],
            "createdBy": user["created_by"],
            "createdAt": user["created_at"],
          })
       return {
          'data': ret,
        }, 200
   
