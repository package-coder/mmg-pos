
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request, g

from app.database.config import products
from app.new_models.AuditLog import AuditCode, AuditLog
from app.repositories.audit_log import AuditLogRepository

update_product = Blueprint("/product/edit", __name__)
logger = AuditLogRepository()


@update_product.route('/product/edit', methods=['POST'])
def _update_product():
   request_data = request.get_json()
   id = request_data['id']
   update_val = {}

   try:
      ObjectId(id) 
      if 'categoryId' in request_data:
         ObjectId(request_data['categoryId'])
      if 'price' in request_data:
         update_val['price'] = float(request_data['price'])
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'name' in request_data:
      update_val['name'] = request_data['name']
   if 'description' in request_data:
      update_val['description'] = request_data['description']
   if 'categoryId' in request_data:
      update_val['category_id'] = request_data['categoryId']
   if 'noPrice' in request_data:
      update_val['no_price'] = request_data['noPrice']
   if 'inventoryPrerequisite' in request_data:
      update_val['inventory_prerequisite'] = request_data['inventoryPrerequisite']
   if 'sku' in request_data:
      update_val['sku'] = request_data['sku']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = products.update_one(filter, new_val)
   if res.modified_count > 0:
      logger.insert_one(AuditLog(action=AuditCode.LABTEST_UPDATE, userId=g.user_id, data=request_data))

      return {
         'message': 'product update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'unable to update product',
         'code': 16
      }


