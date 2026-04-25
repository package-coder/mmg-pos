from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import (branches, customers, doctors, transactions,
                                 users)

get_transaction = Blueprint("/transaction", __name__)

@get_transaction.route('/transaction', methods=['GET'])
def _get_transaction():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   record = transactions.find_one({"_id": ObjectId(request.args.get('id'))})
   user_branch = None
   
   transaction_customer = None
   referred_by = None
   requested_by = None
   try: 
          doctor = doctors.find_one({"_id": ObjectId(record["referredBy"])})
          if doctor:
               referred_by = {
                    "_id": str(doctor["_id"]),
                    "firstName": doctor["firstName"],
                    "middleName": doctor["middleName"],
                    "lastName": doctor["lastName"],
                    "age": doctor["age"],
                    "gender": doctor["gender"],
                    "address": doctor["address"],
                    "isMember": doctor["isMember"],
                    "created_by": doctor["created_by"],
                    "created_at": doctor["created_at"]
               }
   except Exception as e: 
          referred_by = None
   try: 
          doctor = doctors.find_one({"_id": ObjectId(record["requestedBy"])})
          if doctor:
               requested_by = {
                    "_id": str(doctor["_id"]),
                    "firstName": doctor["firstName"],
                    "middleName": doctor["middleName"],
                    "lastName": doctor["lastName"],
                    "age": doctor["age"],
                    "gender": doctor["gender"],
                    "address": doctor["address"],
                    "isMember": doctor["isMember"],
                    "created_by": doctor["created_by"],
                    "created_at": doctor["created_at"]
               }
   except Exception as e: 
          requested_by = None
   try: 
      branch = branches.find_one({"_id": ObjectId(record["branchId"])})

      if branch:
        user_branch = {
                    "_id": str(branch["_id"]),
                    "name": branch["name"],
                    "streetAddress": branch["streetAddress"],
                    "city": branch["city"],
                    "state": branch["state"],
                    'tin': branch.get('tin'),
                    "postalCode": branch["postalCode"],
                    "contactNumber": branch["contactNumber"],
                    "emailAddress": branch["emailAddress"],
                    "isActive": branch["isActive"]
     }
   except:
        user_branch = None
   _user = None
   try: 
     user = users.find_one({"_id": ObjectId(record.get('createBy'))}) 

     if user:
        _user = {
            "_id": str(user["_id"]),
            "username": user["username"],
            "firstName": user["first_name"],
            "lastName": user["last_name"],
          }
   except:
        _user = None
   if record:
          
       return {
          'data': {
            "_id": str(record["_id"]),
            "transactionNo": record["transactionNo"],
            "transactionDate": record["transactionDate"],
            "status": record["status"],
            "branch": user_branch,
            "services": record.get('services'),
            "requestedBy": requested_by,
            "referredBy": referred_by,
            "invoiceNo": record.get('invoiceNo'),
            "discountApplied": record.get('discountApplied'),
            "createdBy": _user,
            "reason": record.get('reason'),
            "customerData": record.get('customerData'),
            "paymentDetails": record.get('paymentDetails')
          },
       }, 200 
   else:
        return {
            'message': 'Branch not found',
            'code': 20
        }, 200
   
