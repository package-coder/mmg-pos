
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, request

from app.database.config import product_categories

update_product_category = Blueprint("/product/category/edit", __name__)

@update_product_category.route('/product/category/edit', methods=['POST'])
def _update_product_category():
   request_data = request.get_json()
   update_val = {}
   id = request_data['id']

   try:
        ObjectId(id)
        if 'isActive' in request_data:
            update_val['isActive'] = bool(request_data['isActive'])
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200

   if 'name' in request_data:
      update_val['name'] = request_data['name']
   if 'description' in request_data:
      update_val['description'] = request_data['description']
   
   if not update_val:
        return {
            'message': 'atleast one field is required when updating a user',
            'code': 25
        }, 200
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }
   #array_filt = {"arrayFilters": [{'[0].id': '1'}]}

   print(new_val)
   res = product_categories.update_one(filter, new_val)
   if res.modified_count > 0:
      return {
         'message': 'Product category update success',
         'code': 18
      }, 200
   else:
      return {
         'message': 'Unable to update product category',
         'code': 16
      }


