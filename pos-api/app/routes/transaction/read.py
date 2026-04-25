import pymongo
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request
from pydash import merge, omit

from app.database.config import branches, doctors, transactions, users
from app.models.Transaction import Transaction

get_transactions = Blueprint("/transactions", __name__)

@get_transactions.route('/transactions', methods=['GET'])
def _get_transactions():

   data = transactions.find().sort({"transaction_date":-1})

   transaction_list = []
   for transaction in data:
         user_branch = None
         
         create_by_user = None
         try: 
               user = users.find_one({"_id": ObjectId(transaction["createBy"])})

               if user:
                    create_by_user = {
                         "_id": str(user["_id"]),
                         "username": user["username"],
                         "firstName": user["first_name"],
                         "lastName": user["last_name"],
                         "isActive": user["is_active"],
                    }
         except:
               print('testset')
               create_by_user = None
         try: 
            branch = branches.find_one({"_id": ObjectId(transaction["branchId"])})
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
         except Exception as e:
              user_branch = None

         referred_by = None
         requested_by = None
         try: 
                         doctor = doctors.find_one({"_id": ObjectId(transaction["referredBy"])})
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
                              doctor = doctors.find_one({"_id": ObjectId(transaction["requestedBy"])})
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
     
         new_transaction = merge(
             omit(transaction, '_id', 'customerId', 'branchId', 'requestedBy', 'referredBy', 'createBy'),
             { 
               "id": str(transaction['_id']),
               "branch": user_branch,
               "requestedBy": requested_by,
               "referredBy": referred_by,
               "createdBy": create_by_user
             },
          )
         transaction_list.append(new_transaction)
   return {
          'data': transaction_list,
        }, 200
      
