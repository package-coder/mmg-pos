
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g
from pydash import omit

from app.database.config import branches
from app.models.Branch import Branch
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository
from app.utils.filter_values import filterValues

update_branch = Blueprint("/branch/edit", __name__)
logger = AuditLogRepository()


@update_branch.route('/branch/edit', methods=['POST'])
def _update_branch():
   request_data = request.get_json()
   id = request_data['id']

   try:
      branch = Branch.fromDict(request_data)
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200


   filter = { '_id': ObjectId(id) }
   new_val = { "$set": filterValues(omit(branch.toDict(), 'id')) }

   res = branches.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.BRANCH_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'Branch update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update branch',
         'code': 16
      }


