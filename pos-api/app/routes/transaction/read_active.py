from datetime import date
import sys

from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, g, request

from app.database.config import branches, doctors, transactions, users

get_active_transaction = Blueprint("/transaction/active", __name__)

def get_pending_transaction():
     record = transactions.find_one({
          "status": "active",
          "created_by": g.user_id,
          # "date": str(date.today())
     })

     if record is None:
        return None
   

     create_by_user = None
     try: 
          user = users.find_one({"_id": ObjectId(record["createBy"])})

          if branch:
               create_by_user = {
                    "_id": str(user["_id"]),
                    "username": user["username"],
                    "firstName": user["first_name"],
                    "lastName": user["last_name"],
                    "isActive": user["is_active"],
               }
     except:
          create_by_user = None

     user_branch = None
     try: 
          branch = branches.find_one({"_id": ObjectId(record["branchId"])})

          if branch:
               user_branch = {
                    "_id": str(branch["_id"]),
                    "name": branch["name"],
                    "streetAddress": branch["street_address"],
                    "city": branch["city"],
                    "state": branch["state"],
                    'tin': branch.get('tin'),
                    "postalCode": branch["postal_code"],
                    "contactNumber": branch["contact_number"],
                    "emailAddress": branch["email_address"],
                    "isActive": branch["is_active"]
               }
     except:
          user_branch = None
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
    
     return {
          "id": str(record["_id"]),
          "transactionNo": record["transactionNo"],
          "transactionDate": record["transactionDate"],
          "status": record["status"],
          "branch": user_branch,
          "services": record.get('services'),
          "requestedBy": requested_by,
          "referredBy": referred_by,
          "reason": record.get('reason'),
          "createdBy": create_by_user,
          "customerData": record.get('customerData'),
          "paymentDetails": record.get('paymentDetails')
     },

@get_active_transaction.route('/transaction/active', methods=['GET'])
def _get_active_transaction():
   record = get_pending_transaction()

   if record:
     return { 'data': record }, 200
   else:
     return {
          'data': None,
          'message': 'No active transaction found',
          'code': 20
     }, 200
