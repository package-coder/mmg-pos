
import os
from datetime import datetime
from operator import itemgetter

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, g, request

from app.database.config import discounts
from app.database.store import insert_one
from app.utils.utils import getLocalTime

create_discount = Blueprint("/discount/create", __name__)

@create_discount.route('/discount/create', methods=['POST'])
def _create_discount():
   request_data = request.get_json()
   name, description, value, type = request_data['name'], request_data['description'], request_data['value'], request_data['type']

   created_by = g.user_id
   created_at = getLocalTime()
   
   try:
        float(value)
   except:
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200
   doc = insert_one('discounts', {
      "name": name,
      "description": description,
      "value": float(value),
      "type": type,
      "created_by": created_by,
      "created_at": created_at
   })
   
   if doc.inserted_id:
      return {
         'message': 'Discount successfully created',
         'code': 15,
      }, 200
   else:
      return {
         'message': 'Unable to add discount.',
         'code': 30,
      }, 200


