
import os
from datetime import datetime
from operator import itemgetter

import bcrypt
import jwt
from flask import Blueprint, g, request

from app.database.config import roles
from app.database.store import insert_one
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository
from app.utils.utils import getLocalTime

create_role = Blueprint("/role/create", __name__)
logger = AuditLogRepository()


@create_role.route('/role/create', methods=['POST'])
def _create_role():
   request_data = request.get_json()
   name, authorizations = request_data['name'], request_data['authorizations']
   
   created_by = g.user_id
   created_at = getLocalTime()
   
   doc = insert_one('roles', {
      "name": name,
      "authorizations": authorizations,
      "created_by": created_by,
      "created_at": created_at
   })
   
   if doc.inserted_id:
      logger.insert_one(AuditLog(action=AuditCode.ROLE_CREATE, userId=g.user_id))

      return {
         'message': 'Role successfully created',
         'code': 15,
      }, 200
   else:
      message = 'Unable to add role'
      logger.insert_one(AuditLog(action=AuditCode.ROLE_CREATE_ERR, userId=g.user_id, error=message))

      return {
         'message': message,
         'code': 30,
      }, 200


