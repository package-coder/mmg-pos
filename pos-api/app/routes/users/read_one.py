
import os

import bcrypt
import jwt
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, g, request
from pydash import omit

from app.database.config import branches, users, roles
from app.models.Branch import Branch

JWT_SECRET = os.getenv('JWT_SECRET')

get_user = Blueprint("/user", __name__)

@get_user.route('/user', methods=['GET'])
def _get_user():
    try: 
        ObjectId(request.args.get('id'))
    except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401
    
    id = g.user_id
    if 'id' in request.args:
        id = request.args.get('id')

    user = users.find_one({"_id": ObjectId(id)})
    user_role = None

    if user:
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
        print(user['branches'])
        for branch_id in user['branches']:
            branch = branches.find_one({"_id": ObjectId(branch_id) })
            branch_list.append({ **omit(branch, '_id'), "id": str(branch["_id"]) })
            
        return {
            'data': {
                "_id": str(user["_id"]),
                "username": user["username"],
                "role": user_role,
                "firstName": user["first_name"],
                "branches": branch_list,
                "lastName": user["last_name"],
                "isActive": user["is_active"],
                "createdBy": user.get("created_by"),
                "createdAt": user.get("created_at"),
            },
        }, 200
    else:
        return {
            'message': 'User not found',
            'code': 21
        }, 200
    
