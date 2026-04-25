
import os
from datetime import datetime

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, g, request

from app.database.config import products
from app.database.store import insert_one
from app.utils.utils import getLocalTime

create_product = Blueprint("/product/create", __name__)

@create_product.route('/product/create', methods=['POST'])
def _create_product():
   request_data = request.get_json()
   name = request_data['name']
   desc = request_data.get('description')
   price = request_data['price']
   category_id = request_data['categoryId']
   inventory_prerequisite = request_data['inventoryPrerequisite']
   sku = request_data.get('sku')
   created_by = g.user_id
   transaction_count = 0
   no_price = False 
   if request_data.get('noPrice'):
       no_price = request_data.get('noPrice')
   create_at = getLocalTime()

   try:
        float(price)
        ObjectId(category_id)
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 200
   
   if sku is not None and len(sku) > 0:
         
      doc = list(products.find({"sku": sku}))

      if len(doc) > 0:
         return {
            'message': 'Duplicate SKU is not allowed',
            'code': 17
         }, 200
    
   
   doc = insert_one('products', {
      "name": name,
      "description": desc,
      "category_id": category_id,
      "inventory_prerequisite": inventory_prerequisite,
      "price": float(price),
      "sku": sku,
      "created_by": created_by,
      "created_at": create_at,
      "no_price": no_price,
      "transaction_count": transaction_count
   })
   
   if doc.inserted_id:
      return {
         'message': 'Product successfully added.',
         'code': 15,
      }, 200
   else:
      return {
         'message': 'Unable to add product',
         'code': 16,
      }, 200


