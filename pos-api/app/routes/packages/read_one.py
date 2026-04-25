from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import packages

get_package = Blueprint("/package", __name__)

@get_package.route('/package', methods=['GET'])
def _get_package():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = packages.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "name": record["name"],
            "description": record["description"],
            # "discount": record["discount"],
            # "discountType": record["discount_type"],
            # "applyDiscountBy": record["apply_discount_by"],
            "packageType": record["package_type"],
            "packageForMemberType": record.get('packageForMemberType'),
            "totalPackagePrice": record.get('totalPackagePrice'),
            "totalDiscountedPrice": record.get('totalDiscountedPrice'),
            "labTest": record["lab_test"],
            "discount": record.get('discount')
          },
       }, 200 
   else:
        return {
            'message': 'Branch not found',
            'code': 20
        }, 200
   
