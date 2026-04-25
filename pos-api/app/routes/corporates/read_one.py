from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import corporates

get_company = Blueprint("/corporate", __name__)

@get_company.route('/corporate', methods=['GET'])
def _get_company():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = corporates.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "streetAddress": record["street_address"],
            "city": record["city"],
            "state": record["state"],
            "postalCode": record["postal_code"],
            "contactNumber": record["contact_number"],
            "emailAddress": record["email_address"],
            "promoDiscount": record.get("promoDiscount"),
            "name": record["name"],
            "tinId": record["tin_id"],
          },
       }, 200 
   else:
        return {
            'message': 'Corporate not found',
            'code': 20
        }, 200
   
