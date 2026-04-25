from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import corporates, customers

get_customer = Blueprint("/customer", __name__)

@get_customer.route('/customer', methods=['GET'])
def _get_customer():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = customers.find_one({"_id": ObjectId(request.args.get('id'))})

   if record: 
       return {
          'data': {
            "_id": str(record["_id"]),
            "firstName": record["first_name"],
            "middleName": record["middle_name"],
            "lastName": record["last_name"],
            "age": record["age"],
            "gender": record["gender"],
            "tinNumber": record.get('tin_number'),
            "contactNumber": record.get('contact_number'),
            "customerTypeId": record.get('customer_type_id'),
            "address": record["address"],
            "customerType": record["customer_type"],
            "birthDate": record["birthDate"],
          },
       }, 200 
   else:
        return {
            'message': 'Customer not found',
            'code': 20
        }, 200
   
