
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import corporates
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

update_company = Blueprint("/corporate/edit", __name__)
logger = AuditLogRepository()


@update_company.route('/corporate/edit', methods=['POST'])
def _update_company():
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
   if 'streetAddress' in request_data:
      update_val['street_address'] = request_data['streetAddress']
   if 'tinId' in request_data:
      update_val['tin_id'] = request_data['tinId']
   if 'city' in request_data:
      update_val['city'] = request_data['city']
   if 'state' in request_data:
      update_val['state'] = request_data['state']
   if 'postalCode' in request_data:
      update_val['postal_code'] = request_data['postalCode']
   if 'contactNo' in request_data:
      update_val['contact_number'] = request_data['contactNo']
   if 'emailAddress' in request_data:
      update_val['email_address'] = request_data['emailAddress']
   if 'promoDiscount' in request_data:
      update_val['promoDiscount'] = request_data['promoDiscount']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a corporate',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = corporates.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.CORPORATE_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'Corporate update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update corporate',
         'code': 16
      }


