from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.SalesInvoice import SalesInvoice
from app.database.config import sales_invoices
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/sale'
sales_invoice_bp = Blueprint('sales_invoices', __name__)

@sales_invoice_bp.get(api + 's-invoice/history')
@authorized
def get_sales_invoices(user_id):
    ret = []
    try:

        data = sales_invoices.find()
        for item in data: 
          ret.append(SalesInvoice.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

@sales_invoice_bp.get(api + '/<id>')
@authorized
def get_sale_invoice(user_id, id):

    try:
        data = sales_invoices.find_one({ '_id': ObjectId(id) })
        if data is not None: 
           
            return {'data': SalesInvoice.fromDict(data).toDict() }
        return {'message': 'Unable to find supplier.'}
    except Exception as e:
        return {'message': repr(e) }, 500
    
@sales_invoice_bp.post(api + '/create')
@authorized
def create_accounts_group(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('sales_invoices', filterValues(SalesInvoice.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'SalesInvoice successfully created.'}
        else:
            return {'message': 'Unable to create SalesInvoice.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

@sales_invoice_bp.post(api + '/edit')
@authorized
def edit_sales_invoice(user_id):
    request_data = request.get_json()
    id = request_data['id']

    try:
      item = SalesInvoice.fromDict(request_data)
   
   
      filter = { '_id': ObjectId(id) }
      new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

      res = sales_invoices.update_one(filter, new_val)

      if res.modified_count > 0:
        return { 'message': 'Sales Invoice successfully updated.' }
      else:
        return { 'message': 'Unable to update Sales Invoice.' }, 400
    except Exception as e:
      print (e)
      return { 'message': 'data format is invalid' }

