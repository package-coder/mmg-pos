
import json
import os

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS, cross_origin

from app.blueprints.audit_log import audit_log_bp
from app.blueprints.reports import discount_reports_bp
from app.blueprints.cashier_report import cashier_report_bp
from app.blueprints.branch_report import branch_report_bp
from app.blueprints.branch import branch_bp
from app.blueprints.category import category_bp as category_pos_bp
from app.blueprints.transaction import transaction_bp
from app.cas_app.blueprints.accounts_group import accounts_group_bp
from app.cas_app.blueprints.accounts_type import accounts_type_bp
from app.cas_app.blueprints.category import category_bp
from app.cas_app.blueprints.chart_account import chart_of_accounts_bp
from app.cas_app.blueprints.goods_receipt import goods_receipt_bp
from app.cas_app.blueprints.inventory import inventory_bp
from app.cas_app.blueprints.item import item_bp
from app.cas_app.blueprints.journal_entries import journal_entry_bp
from app.cas_app.blueprints.payments import payment_bp
from app.cas_app.blueprints.purchase_invoice import purchase_invoice_bp
from app.cas_app.blueprints.purchase_orders import purchase_order_bp
from app.cas_app.blueprints.purchaseOrderReceipt import \
    purchase_order_receipt_bp
from app.cas_app.blueprints.receipts import receipts_bp
from app.cas_app.blueprints.reports import reports_bp
from app.cas_app.blueprints.sales_invoices import sales_invoice_bp
from app.cas_app.blueprints.supplier import supplier_bp
from app.config import IS_DEVELOPMENT
from app.utils.utils import getLocalTime

load_dotenv(override=True)


from datetime import datetime

from bson import ObjectId

from app.database.config import bookings
from app.middlewares.authorization_validator import authorization_validator
from app.middlewares.request_validator import request_validator
from app.middlewares.token_validator import token_validator
from app.routes.branch_reports.create import create_branch_reports
from app.routes.branch_reports.read import get_branch_reports
from app.routes.branch_reports.read_generated import \
    get_generated_branch_reports
from app.routes.branches.create import create_branch
from app.routes.branches.read import get_branches
from app.routes.branches.read_one import get_branch
from app.routes.branches.update import update_branch
from app.routes.cashier_reports.read import get_cashier_reports
from app.routes.cashier_reports.read_today import get_cashier_report_today
from app.routes.cashier_reports.time_in import time_in_cashier_report
from app.routes.cashier_reports.time_out import time_out_cashier_report
from app.routes.corporates.create import create_company
from app.routes.corporates.read import get_companies
from app.routes.corporates.read_one import get_company
from app.routes.corporates.update import update_company
from app.routes.customers.create import create_customer
from app.routes.customers.read import get_customers
from app.routes.customers.read_one import get_customer
from app.routes.customers.update import update_customer
from app.routes.discounts.create import create_discount
from app.routes.discounts.read import get_discounts
from app.routes.discounts.read_one import get_discount
from app.routes.discounts.update import update_discount
from app.routes.doctors.create import create_doctor
from app.routes.doctors.read import get_doctors
from app.routes.doctors.read_one import get_doctor
from app.routes.doctors.update import update_doctor
from app.routes.packages.create import create_package
from app.routes.packages.read import get_packages
from app.routes.packages.read_one import get_package
from app.routes.packages.update import update_package
from app.routes.product_categories.create import create_product_category
from app.routes.product_categories.read import get_product_categories
from app.routes.product_categories.read_one import get_product_category
from app.routes.product_categories.update import update_product_category
from app.routes.products.create import create_product
from app.routes.products.read import get_products
from app.routes.products.read_one import get_product
from app.routes.products.update import update_product
from app.routes.roles.create import create_role
from app.routes.roles.read import get_roles
from app.routes.roles.read_one import get_role
from app.routes.roles.read_resources import get_resources
from app.routes.roles.update import update_role
from app.routes.sales.read_betalife_reports import get_betalife_reports
from app.routes.sales.read_monthly_report_mancom import get_mancom
from app.routes.sales.read_municipality_reports import get_municipality_reports
from app.routes.sales.read_no_of_patients_per_services import \
    get_products_reports
from app.routes.sales.read_packages_reports import get_packages_reports
from app.routes.sales.read_reports import get_reports
from app.routes.sales.read_sales_reports import get_sales
from app.routes.sales.read_summary_income import get_summary_income
from app.routes.sales_deposit.create import create_sales_deposit
from app.routes.sales_deposit.read import get_sales_deposits
from app.routes.transaction.create import create_transaction
from app.routes.transaction.read import get_transactions
from app.routes.transaction.read_active import get_active_transaction
from app.routes.transaction.read_one import get_transaction
from app.routes.transaction.update import update_transaction
from app.routes.users.auth import login
from app.routes.users.read import get_users
from app.routes.users.read_one import get_user
from app.routes.users.register import register
from app.routes.users.update import update_user

PORT = os.getenv('PORT')
HOST = os.getenv('HOST')
JWT_SECRET = os.getenv('JWT_SECRET_KEY')

app = Flask(__name__)


cors = CORS(app, origins=["*", "*"])
app.register_blueprint(discount_reports_bp)
app.register_blueprint(cashier_report_bp)
app.register_blueprint(branch_report_bp)
app.register_blueprint(branch_bp)
app.register_blueprint(transaction_bp)
app.register_blueprint(item_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(category_pos_bp)
app.register_blueprint(category_bp)
app.register_blueprint(supplier_bp)
app.register_blueprint(audit_log_bp)
app.register_blueprint(purchase_order_bp)
app.register_blueprint(goods_receipt_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(accounts_type_bp)
app.register_blueprint(accounts_group_bp)
app.register_blueprint(chart_of_accounts_bp)
app.register_blueprint(receipts_bp)
app.register_blueprint(sales_invoice_bp)
app.register_blueprint(purchase_order_receipt_bp)
app.register_blueprint(purchase_invoice_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(journal_entry_bp)

@app.before_request
def hook():
   
   if request.method.lower() == 'options':
      return Response()
   token_validator_result = token_validator()
   if token_validator_result is not None:
      return token_validator_result
   request_validator_result = request_validator()
   if request_validator_result is not None:
      return request_validator_result
   
@app.route('/', methods=['GET'])
def home():
  return 'hello world'


@app.route('/booking/confirm', methods=['POST'])
def _confirm_booking():
   request_data = request.get_json()
   id = request_data['id']
   update_val = {}
   try: 
      ObjectId(id)
   except:
    return {
      'message': 'data format is invalid',
      'code': 23
    }, 401
   
   update_val['isConfirmed'] = True
   
   filter = { '_id': ObjectId(id) }
   new_val = { "$set": update_val }

   res = bookings.update_one(filter, new_val)
   if res.modified_count > 0:
      return {
         'message': 'Booking confirmed',
      }, 200 
   else:
      return {
         'message': 'Unable to confirm booking',
         'code': 200
      }


@app.route('/booking', methods=['GET'])
def _get_booking():
   booking = bookings.find_one({"_id": ObjectId(request.args.get('id'))})

   if booking:
         return {
            'data': {
               'id': str(booking.get('_id')),
               'firstName': booking.get('firstName'),
               'middleName': booking.get('middleName'),
               'lastName': booking.get('lastName'),
               'mobileNumber': booking.get('mobileNumber'),
               'emailAddress': booking.get('emailAddress'),
               'address': booking.get('address'),
               'referral': booking.get('referral'),
               'receiveType': booking.get('receiveType'),
               'schedule': booking.get('schedule'),
               'note': booking.get('note'),
               'branchId': booking.get('branchId'),
               'create_at': booking.get('create_at'),
               'is_confirmed': booking.get('isConfirmed')
            }
         }
   return {
      "message": "Booking not found.",
   }

@app.route('/bookings', methods=['GET'])
def _get_bookings():
   res = bookings.find()
   ret = []
   if res:
      for booking in res:
         ret.append({
            'id': str(booking.get('_id')),
            'firstName': booking.get('firstName'),
            'middleName': booking.get('middleName'),
            'lastName': booking.get('lastName'),
            'mobileNumber': booking.get('mobileNumber'),
            'emailAddress': booking.get('emailAddress'),
            'address': booking.get('address'),
            'referral': booking.get('referral'),
            'receiveType': booking.get('receiveType'),
            'schedule': booking.get('schedule'),
            'note': booking.get('note'),
            'branchId': booking.get('branchId'),
            'create_at': booking.get('create_at'),
            'is_confirmed': booking.get('isConfirmed')
         })
   return {
      "data": ret,
   }

@app.route('/booking/create', methods=['POST'])
def _create_booking():
  request_data = request.get_json()
  doc = bookings.insert_one({
     'firstName': request_data.get('firstName'),
     'middleName': request_data.get('middleName'),
     'lastName': request_data.get('lastName'),
     'mobileNumber': request_data.get('mobileNumber'),
     'emailAddress': request_data.get('emailAddress'),
     'address': request_data.get('address'),
     'referral': request_data.get('referral'),
     'receiveType': request_data.get('receiveType'),
     'schedule': request_data.get('schedule'),
     'note': request_data.get('note'),
     'branchId': request_data.get('branchId'),
     'isConfirmed': False,
     'create_at': getLocalTime()
  })
  if doc.inserted_id:
     return {
        'message': 'Booking successfully created'
     }
  return {
     'message': 'Unable to create booking'
  }
@app.route('/appointments', methods=['GET'])
def _get_appointments():
  
  #restructure when theres database. 7-10am available only as per requirements
  return {
   "data": [{
     "day": "2024/08/02",
     "timeslot": [
        {
         "shift": "AM",
         "time": "7",
         "endShift": "AM",
         "endTime": "8"
        },
        {
         "shift": "AM",
         "time": "8",
         "endShift": "AM",
         "endTime": "9"
        },
        {
         "shift": "AM",
         "time": "9",
         "endShift": "AM",
         "endTime": "10"
        },
        {
         "shift": "AM",
         "time": "10",
         "endShift": "AM",
         "endTime": "11"
        },
     ]
     
  },
  {
     "day": "2024/08/03",
     "timeslot": [
        {
         "shift": "AM",
         "time": "7",
         "endShift": "AM",
         "endTime": "8"
        },
        {
         "shift": "AM",
         "time": "8",
         "endShift": "AM",
         "endTime": "9"
        },
        {
         "shift": "AM",
         "time": "9",
         "endShift": "AM",
         "endTime": "10"
        },
        {
         "shift": "AM",
         "time": "10",
         "endShift": "AM",
         "endTime": "11"
        },
     ]
     
  }
  
  
  ]}, 200

app.register_blueprint(login)
app.register_blueprint(register)
app.register_blueprint(get_users)
app.register_blueprint(create_product)
app.register_blueprint(update_product)
app.register_blueprint(get_products)
app.register_blueprint(get_product)
app.register_blueprint(get_user)
app.register_blueprint(get_roles)
app.register_blueprint(create_doctor)
app.register_blueprint(get_doctor)
app.register_blueprint(get_doctors)
app.register_blueprint(update_doctor)
app.register_blueprint(create_product_category)
app.register_blueprint(get_product_category)
app.register_blueprint(get_product_categories)
app.register_blueprint(update_product_category)
app.register_blueprint(create_branch)
app.register_blueprint(get_branch)
app.register_blueprint(get_branches)
app.register_blueprint(update_branch)
app.register_blueprint(get_companies)
app.register_blueprint(get_company)
app.register_blueprint(create_company)
app.register_blueprint(update_company)
app.register_blueprint(create_customer)
app.register_blueprint(get_customer)
app.register_blueprint(get_customers)
app.register_blueprint(update_customer)
app.register_blueprint(create_package)
app.register_blueprint(get_package)
app.register_blueprint(get_packages)
app.register_blueprint(update_package)
app.register_blueprint(create_role)
app.register_blueprint(get_role)
app.register_blueprint(update_role)
app.register_blueprint(update_user)
app.register_blueprint(get_resources)
app.register_blueprint(create_transaction)
app.register_blueprint(get_transaction)
app.register_blueprint(get_active_transaction)
app.register_blueprint(get_transactions)
app.register_blueprint(update_transaction)

app.register_blueprint(create_discount)
app.register_blueprint(get_discount)
app.register_blueprint(get_discounts)
app.register_blueprint(update_discount)

app.register_blueprint(get_sales)
app.register_blueprint(get_packages_reports)

app.register_blueprint(time_in_cashier_report)
app.register_blueprint(time_out_cashier_report)
app.register_blueprint(get_cashier_report_today)
app.register_blueprint(get_cashier_reports)

app.register_blueprint(create_sales_deposit)
app.register_blueprint(get_sales_deposits)

app.register_blueprint(get_generated_branch_reports)
app.register_blueprint(create_branch_reports)
app.register_blueprint(get_branch_reports)

app.register_blueprint(get_mancom)
app.register_blueprint(get_products_reports)
app.register_blueprint(get_municipality_reports)
app.register_blueprint(get_summary_income)
app.register_blueprint(get_betalife_reports)
app.register_blueprint(get_reports)


if __name__ == '__main__':
   port = int(os.environ.get("PORT", 5000))
   app.run(host="0.0.0.0", port=port, debug=IS_DEVELOPMENT)
   