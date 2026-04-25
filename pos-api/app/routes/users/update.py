
from bson.objectid import ObjectId
from flask import Blueprint, request, g

from app.database.config import users
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

update_user = Blueprint("/user/edit", __name__)
logger = AuditLogRepository()


@update_user.route('/user/edit', methods=['POST'])
def _update_user():
   request_data = request.get_json()
   id = request_data['id']

   update_val = {}
   try: 
      ObjectId(id)
      if 'roleId' in request_data:
         ObjectId(request_data['roleId'])
         update_val['role'] = request_data['roleId']
      if 'branchIds' in request_data:
         for branchId in request_data['branchIds']:
            ObjectId(branchId)
         update_val['branches'] = request_data['branchIds']
   except:
    return {
      'message': 'data format is invalid',
      'code': 23
    }, 401
   
   if 'username' in request_data:
      update_val['username'] = request_data['username']
   if 'firstName' in request_data:
      update_val['first_name'] = request_data['firstName']
   if 'lastName' in request_data:
      update_val['last_name'] = request_data['lastName']
   if 'isActive' in request_data:
      update_val['is_active'] = request_data['isActive']

   
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }

   res = users.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.USER_UPDATE, userId=g.user_id, data={**update_val, 'id': id}))

      return {
         'message': 'user update success',
         'code': 6
      }, 200
   else:
      message = 'Unable to update user'
      logger.insert_one(AuditLog(action=AuditCode.USER_UPDATE_ERR, userId=g.user_id, error=message, data={**update_val, 'id': id}))
      
      return {
         'message': message,
         'code': 16
      }

