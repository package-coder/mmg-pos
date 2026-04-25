
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import discounts
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

update_discount = Blueprint("/discount/edit", __name__)
logger = AuditLogRepository()


@update_discount.route('/discount/edit', methods=['POST'])
def _update_discount():
   request_data = request.get_json()
   update_val = {}
   id = request_data['id']

   print(request_data)
   try:
        ObjectId(request_data['id'])
        if 'value' in request_data:
            update_val['value'] = float(request_data['value'])
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'name' in request_data:
      update_val['name'] = request_data['name']
   if 'description' in request_data:
      update_val['description'] = request_data['description']
   if 'type' in request_data:
      update_val['type'] = request_data['type']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = discounts.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.DISCOUNT_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'Discount update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update discount',
         'code': 16
      }


