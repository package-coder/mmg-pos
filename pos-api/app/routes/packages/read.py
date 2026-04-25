from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import packages

get_packages = Blueprint("/packages", __name__)

@get_packages.route('/packages', methods=['GET'])
def _get_packages():

   res = packages.find()

   ret = []
   for record in res:

         ret.append({
            "_id": str(record["_id"]),
            "name": record["name"],
            "description": record["description"],
            # "discount": record["discount"],
            # "discountType": record["discount_type"],
            # "applyDiscountBy": record["apply_discount_by"],
            "packageForMemberType": record.get('packageForMemberType'),
            "totalPackagePrice": record.get('totalPackagePrice'),
            "totalDiscountedPrice": record.get('totalDiscountedPrice'),
            "packageType": record["package_type"],
            "labTest": record["lab_test"],
            "discount": record.get('discount')
          })
   return {
          'data': ret,
        }, 200
      
