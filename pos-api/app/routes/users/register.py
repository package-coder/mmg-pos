
import os
from datetime import datetime

import bcrypt
import jwt
from bson.objectid import ObjectId
from flask import Blueprint, g, request

from app.database.config import users
from app.database.store import insert_one
from app.utils.utils import getLocalTime

register = Blueprint("/user/register", __name__)

@register.route('/user/register', methods=['POST'])
def _create_account():
   request_data = request.get_json()
   username = request_data['username']
   password = request_data['password']
   first_name = request_data['firstName']
   last_name = request_data['lastName']
   role_id = request_data['roleId']
   branch_ids = request_data['branchIds']
   created_by = g.user_id
   create_at = getLocalTime()

   try:
      ObjectId(role_id)
      for branch_id in branch_ids:
         ObjectId(branch_id)
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
      }, 401
   

   
   user = list(users.find({"username": username}))

   if len(user) > 0:  
    return {
        'message': 'username already exist',
        'code': 1
    }, 200
   else:
     pwd_bytes = password.encode('utf-8')
     salt = bcrypt.gensalt()
     hashed = bcrypt.hashpw(pwd_bytes, salt)
     string_password = hashed.decode('utf8')
     doc = insert_one('users', {
        "username": username,
        "password": string_password + " " + salt.decode('utf8'),
        "first_name": first_name,
        "last_name": last_name,
        "role": role_id,
        "created_by": created_by,
        "created_at": create_at,
        "branches": branch_ids,
        "is_active": True
     })
     
     if doc.inserted_id:
         return {
            'message': 'User successfully registered',
            'code': 2,
         }, 200
     else:
         return {
            'message': 'Unable to register user',
            'code': 16,
         }

