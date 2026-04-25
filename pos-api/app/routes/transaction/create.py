
import os
import uuid
from datetime import date, datetime
from operator import itemgetter

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, g, request

from app.database.config import transactions
from app.database.store import insert_one
from app.models.Transaction import Transaction
from app.routes.transaction.read_active import get_pending_transaction
from app.utils.filter_values import filterValues
from app.utils.utils import getLocalTime

create_transaction = Blueprint("/transaction/create", __name__)

@create_transaction.route('/transaction/create', methods=['POST'])
def _create_transaction():
   request_data = request.get_json()

   pending_record = get_pending_transaction()
   if pending_record:
      return { 
         'data': pending_record[0], 
         'message': 'Returned active transaction' 
      }, 200

   try:
      transaction = Transaction()
      transaction.transaction_no = str(uuid.uuid4())
      transaction.status = 'active'
      transaction.transaction_date = getLocalTime().isoformat()
      transaction.date = getLocalTime()
      transaction.create_by = g.user_id
      transaction.branch_id = request_data['branchId']
      
   except: 
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 401

   

   doc = insert_one('transactions', filterValues(transaction.toDict()))

   if doc.inserted_id:
      transaction.id = doc.inserted_id
      return { 'data': transaction.toDict(), 'code': 15 }, 200
   else:
      return {
         'message': 'Unable to create transaction',
         'code': 30,
      }, 200


