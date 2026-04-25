
import os
from datetime import datetime
from operator import itemgetter

import bcrypt
import jwt
from flask import Blueprint, g, request

from app.database.config import packages
from app.database.store import insert_one
from app.utils.utils import getLocalTime

create_package = Blueprint("/package/create", __name__)

@create_package.route('/package/create', methods=['POST'])
def _create_package():
   request_data = request.get_json()
   name, desc, package_type, lab_test = request_data['name'], request_data['description'], request_data['packageType'], request_data['labTest']
   discount = request_data['discount']
   packageForMemberType = request_data['packageForMemberType']
   totalPackagePrice = request_data['totalPackagePrice']
   totalDiscountedPrice = request_data['totalDiscountedPrice']
   created_by = g.user_id
   created_at = getLocalTime()


   doc = insert_one('packages', {
      "name": name,
      "description": desc,
      "discount": discount,
      # "discount_type": discount_type,
      # "apply_discount_by": apply_discount_by,
      "packageForMemberType": packageForMemberType,
      "package_type": package_type,
      "lab_test": lab_test,
      "totalPackagePrice": totalPackagePrice,
      "totalDiscountedPrice": totalDiscountedPrice,
      "created_by": created_by,
      "created_at": created_at
   })
   
   if doc.inserted_id:
      return {
         'message': 'Package successfully created',
         'code': 15,
      }, 200
   else:
      return {
         'message': 'Unable to add package.',
         'code': 30,
      }, 200


