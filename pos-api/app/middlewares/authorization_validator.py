
import os

import jwt
from bson import ObjectId
from flask import Blueprint, g, request

from app.database.config import roles, users
from app.routes.roles.read_resources import apis, permission

excluded_routes_for_validator = [
  '/',
]

def authorization_validator():
 if request.path in excluded_routes_for_validator:
  return None
 
 print(str(apis))
 if request.path in str(apis):
    user = users.find_one({'_id': ObjectId(g.user_id)})
    print(user)
    if user: 
        role = roles.find_one({'_id': ObjectId(user['role'])})
        for authorization in role['authorizations']:
             if authorization['resource'] in request.path:
               return None

 return {
    'message': 'Unauthorized',
     'code': 9
  }, 401
 