

from bson import ObjectId
from flask import Blueprint, request, g
from pydantic import ValidationError
from pydash import omit

from app.database.config import (doctors, product_categories, products, transactions)
from app.database.store import insert_one
from app.models.Transaction import Transaction
from app.new_models.AuditLog import AuditCode, AuditLog
from app.new_models.Discount import Discount
from app.repositories.audit_log import AuditLogRepository
from app.repositories.transaction import TransactionRepository
from app.utils.filter_values import filterValues
from app.utils.utils import ToStringId, getLocalDateStr, getLocalTimeStr

logger = AuditLogRepository()
update_transaction = Blueprint("/transaction/edit", __name__)
repository = TransactionRepository()

@update_transaction.route('/transaction/edit', methods=['POST'])
def _update_transaction():
   request_data = request.get_json()
   id = request_data['id']

   try:
      transaction = Transaction.fromDict(request_data)
   except Exception as e:
      print (e)
      return {
         'message': 'data format is invalid',
         'code': 23
   }, 200
   transaction_dict = transaction.toDict()
   
   totalMemberDiscount = 0.0
   packages = list(filter(
      lambda i: i['source'] == 'package' and i['packageForMemberType'] == 'seniorcitizenpwd', 
      transaction.services
   ))
   memberPackage = next(packages) if len(packages) > 0 else None

   #TODO make sure that the package discount or package should be 0 or 1 only   
   if(memberPackage != None):
      try:
         memberDiscount = Discount(**memberPackage['discount'])
         totalMemberDiscount = memberDiscount.calculateTotalDiscount(memberPackage['totalPackagePrice'])
      except Exception as e:
         # print(f'Error {e}')
         totalMemberDiscount = 0.0
   
   transaction_dict['totalMemberDiscount'] = totalMemberDiscount
   transaction_dict['invoiceNumber'] = repository._get_next_sequence()
   
   query = { '_id': ObjectId(id) }
   new_val = { "$set": filterValues(omit(transaction_dict, 'id')) }

   res = transactions.update_one(query, new_val)
   if res.modified_count > 0:
      updated_trans = transactions.find_one({"_id": ObjectId(id)})
      # FOR REFACTORING
      if transaction_dict['status'].lower() == 'completed':
         categories = product_categories.find()
         services = updated_trans.get('services') or []
         invoiceNumber = updated_trans.get('invoiceNumber')
         paymentDetails = updated_trans.get('paymentDetails')
         amount = paymentDetails.get('paymentDue')
         branch = updated_trans.get('branchId')
         discount = 0
         applied = updated_trans.get('discountApplied')

         if applied:    
            discount = applied['totalDiscount']
         doctor_full_name = ''
         _categories = [{
            'id': None,
            'name': 'Package',
            'price': 0
         }] 
         for category in categories:
             _categories.append({
               'id': str(category.get('_id')), 
               'name': category.get('name'),
               'price': 0
             })
             
         if updated_trans.get('referredBy'):
            doctor = doctors.find_one({"_id": ObjectId(updated_trans.get('referredBy'))})
            if doctor:
               doctor_full_name = doctor["firstName"] + " " + doctor["middleName"] + " " + doctor["lastName"]
         name = []


         # for service in services: 
         #    if service['source'] == "package": 
         #       for item in service['labTest']:
         #          name.append(item['name'])
         #          product_filter = { '_id': ObjectId(item['_id'])  }
         #          product_new_val = { "$inc": { 'transaction_count': 1 } }
         #          res = products.update_one(product_filter, product_new_val)
         #    else:
         #       name.append(service['name'])  
         #       product_filter = { '_id': ObjectId(service['_id'])  }
         #       product_new_val = { "$inc": { 'transaction_count': 1 } }
         #       res = products.update_one(product_filter, product_new_val)

         # for service in services:
         #    if service['source'] == "package":  
         #          for category in _categories:  
         #             if category['name'].lower() == 'package':
         #                for item in service['items']:
         #                   category['price'] +=  item['amount']
         #    else:
         #          for category in _categories:
         #             if category['id'] == service['category']['id']:
         #                category['price'] += service['amount']

         sale = insert_one('sales', {
            'customerData': updated_trans.get('customerData'),
            'labExams': ', '.join(name),
            'invoiceNumber': invoiceNumber,
            'amount': amount,
            'paymentDetails': paymentDetails,
            'categories': _categories,
            'discount': discount,
            'referrer': doctor_full_name,
            'branch': branch,
            # 'cashierId': updated_trans['cashierId'],
            'transactionId': str(updated_trans['_id']),
            'date': getLocalDateStr(),
            'created_at': getLocalTimeStr(),
         })   
         
         if sale.inserted_id is None:
            logger.insert_one(AuditLog(action=AuditCode.TRANSACTION_CREATE_ERR_SALES, userId=g.user_id, data=updated_trans, error='Unable to create sale'))

            return {
               'message': 'Unable to create sale',
               'code': 16
            }, 500
         
         logger.insert_one(AuditLog(action=AuditCode.TRANSACTION_CREATE, userId=g.user_id, data=updated_trans))
      return {
         'message': 'Transaction update success',
         'code': 18,
         'data': ToStringId(updated_trans)
      }, 200
   else:

      logger.insert_one(
         AuditLog(
            action=AuditCode.TRANSACTION_CREATE_ERR, 
            userId=g.user_id,
            error='Unable to update transaction'
         )
      )
      return {
         'message': 'Unable to update transaction',
         'code': 16
      }, 500


