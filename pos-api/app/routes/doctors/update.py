
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import doctors
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

update_doctor = Blueprint("/doctor/edit", __name__)
logger = AuditLogRepository()


@update_doctor.route('/doctor/edit', methods=['POST'])
def _update_doctor():
   request_data = request.get_json()
   print(request_data)
   id = request_data['id']
   update_val = {}

   try:
        ObjectId(id)
        if 'age' in request_data:
            update_val['age'] = int(request_data['age'])
        if 'isMember' in request_data:
            update_val['isMember'] = bool(int(request_data['isMember']))
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'firstName' in request_data:
      update_val['firstName'] = request_data['firstName']
   if 'lastName' in request_data:
      update_val['lastName'] = request_data['lastName']
   if 'middleName' in request_data:
      update_val['middleName'] = request_data['middleName']
   if 'gender' in request_data:
      update_val['gender'] = request_data['gender']
   if 'address' in request_data:
      update_val['address'] = request_data['address']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = doctors.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.DOCTOR_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'Doctor update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update doctor',
         'code': 16
      }


