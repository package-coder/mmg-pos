
import os
from datetime import datetime
from operator import itemgetter

import bcrypt
import jwt
from flask import Blueprint, g, request

from app.database.config import product_categories
from app.database.store import insert_one
from app.utils.utils import getLocalTime

create_product_category = Blueprint("/product/category/create", __name__)

@create_product_category.route('/product/category/create', methods=['POST'])
def _create_product_category():
   request_data = request.get_json()
   name, desc = request_data['name'], request_data['description']
   created_by = g.user_id
   created_at = getLocalTime()
   
   doc = insert_one('product_categories', {
      "name": name,
      "description": desc,
      "isActive": True,
      "created_by": created_by,
      "created_at": created_at
   })
   
   if doc.inserted_id:
      return {
         'message': 'Product category successfully created',
         'code': 15,
      }, 200
   else:
      return {
         'message': 'Unable to add product category.',
         'code': 30,
      }, 200


