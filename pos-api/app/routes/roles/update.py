
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import roles
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

logger = AuditLogRepository()
update_role = Blueprint("/role/edit", __name__)

@update_role.route('/role/edit', methods=['POST'])
def _update_role():
   request_data = request.get_json()
   update_val = {}
   id = request_data['id']

   try:
        ObjectId(id)
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'name' in request_data:
      update_val['name'] = request_data['name']
   if 'authorizations' in request_data:
      update_val['authorizations'] = request_data['authorizations']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = roles.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.ROLE_UPDATE, userId=g.user_id, data={**update_val, 'id': id}))
      
      return {
         'message': 'Role update success',
         'code': 18
      }, 200
   else:
      logger.insert_one(AuditLog(action=AuditCode.ROLE_UPDATE_ERR, userId=g.user_id, data={**update_val, 'id': id}, error='Unable to update role'))

      return {
         'message': 'Unable to update role',
         'code': 16
      }


