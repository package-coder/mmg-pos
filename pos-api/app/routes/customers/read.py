from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import corporates, customers

get_customers = Blueprint("/customers", __name__)

@get_customers.route('/customers', methods=['GET'])
def _get_customers():

   res = customers.find()

   ret = []
   for record in res:
       corporate = None
       try: 
           corp_record = corporates.find_one({"_id": ObjectId(record["corporate_id"])})
           if corp_record: 
               corporate = {
                   "id": str(corp_record['_id']),
                   "name": corp_record['name']
                }
       except: 
         corporate = None
       ret.append({
            "_id": str(record["_id"]),
            "firstName": record["first_name"],
            "middleName": record["middle_name"],
            "lastName": record["last_name"],
            "age": record["age"],
            "gender": record["gender"],
            "address": record["address"],
            "tinNumber": record.get('tin_number'),
            "contactNumber": record.get('contact_number'),
            "customerType": record["customer_type"],
            "customerTypeId": record.get('customer_type_id'),
            "birthDate": record["birthDate"],
          })
   return {
       'data': ret,
    }, 200
              
