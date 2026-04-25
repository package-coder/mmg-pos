
import os

import bcrypt
from bson import ObjectId
from jwt.api_jwt import encode
from flask import Blueprint, request
from pydash import omit

from app.config import JWT_SECRET_KEY
from app.database.config import roles, users, branches
from app.models.Branch import Branch
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

logger = AuditLogRepository()
login = Blueprint("login", __name__)

@login.route('/login', methods=['POST'])
def _authenticate():
 user = list(users.find({"username": request.form['username']}))

 if len(user) > 0:   
   if user[0]['role'] == None:
    return {
     'message': 'User has no role',
     'code': 10,
    }, 200
  
   splitpw = user[0]['password'].split(' ')
   pwd_bytes = request.form['password'].encode('utf-8')

   salt = splitpw[1].encode('utf-8')

   hashed = bcrypt.hashpw(pwd_bytes, salt)
   string_password = hashed.decode('utf8')

   if string_password == splitpw[0]: 
    token = encode({"user_id": str(user[0]['_id'])}, JWT_SECRET_KEY, algorithm="HS256")
    
    user_role = None
    try:
        role = roles.find_one({"_id": ObjectId(user[0]["role"])})
        user_role = {
            "_id": str(role["_id"]),
            "name": role["name"],
            "authorizations": role['authorizations']
        }
    except:
        user_role = None
    
    branch_list = []
    for branch_id in user[0]['branches']:
      branch = branches.find_one({"_id": ObjectId(branch_id) })
      branch_list.append({ **omit(branch, '_id'), "id": str(branch["_id"]) })

    logger.insert_one(AuditLog(action=AuditCode.USER_LOGIN, userId=str(user[0]['_id'])))

    return {
      'token': token,
      'data': {
        'id': str(user[0]['_id']) ,
        'username': user[0]['username'],
        'first_name': user[0]['first_name'],
        'last_name': user[0]['last_name'],
        'role': user_role,
        'branches': branch_list
      }
    }, 200
   else: 

    logger.insert_one(
      AuditLog(
        action=AuditCode.USER_LOGIN_ERR_INCORRECT_CRED,  
        userId=str(user[0]['_id']),
        message='Entered wrong password'
      )
    )
    return {
      'message': 'wrong username or password',
      'code': 11
    }, 200
 else: 
    logger.insert_one(
      AuditLog(
        action=AuditCode.USER_LOGIN_ERR_NOT_EXIST, 
        ipaddress=request.remote_addr, 
        userId='',
        message="User not found"
      )
    )
    return {
      'message': 'wrong username or password',
      'code': 11
    }, 200