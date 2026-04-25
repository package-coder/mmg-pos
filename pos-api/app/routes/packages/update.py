
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import packages
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository
from app.utils.utils import getLocalTime

update_package = Blueprint("/package/edit", __name__)
logger = AuditLogRepository()


@update_package.route('/package/edit', methods=['POST'])
def _update_package():
   request_data = request.get_json()
   update_val = {}
   id = request_data['id']
   try:
        ObjectId(id)
      #   if 'discount' in request_data:
      #       update_val['discount'] = float(request_data['discount'])
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'name' in request_data:
      update_val['name'] = request_data['name']
   if 'description' in request_data:
      update_val['description'] = request_data['description']
   # if 'discountType' in request_data:
   #    update_val['discount_type'] = request_data['discountType']
   # if 'applyDiscountBy' in request_data:
   #    update_val['apply_discount_by'] = request_data['applyDiscountBy']
   if 'packageType' in request_data:
      update_val['package_type'] = request_data['packageType']
   if 'labTest' in request_data:
      update_val['lab_test'] = request_data['labTest']
   if 'discount' in request_data:
      update_val['discount'] = request_data['discount']
   if 'packageForMemberType' in request_data:
      update_val['packageForMemberType'] = request_data['packageForMemberType']
   if 'totalPackagePrice' in request_data:
      update_val['totalPackagePrice'] = request_data['totalPackagePrice']
   if 'totalDiscountedPrice' in request_data:
      update_val['totalDiscountedPrice'] = request_data['totalDiscountedPrice']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   update_val['updated_at'] = getLocalTime()
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = packages.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.PACKAGE_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'Package update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update package',
         'code': 16
      }


