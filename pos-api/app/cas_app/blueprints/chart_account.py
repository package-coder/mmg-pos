from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from pydash import merge, omit
from pymongo import ReturnDocument

from app.cas_app.models.AccountsGroup import AccountsGroup
from app.cas_app.models.AccountsType import AccountsType
from app.cas_app.models.ChartAccount import ChartAccount
from app.cas_app.models.new_models.ChartAccount import EditChartAccount
from app.database.config import accountsgroup, accountstype, chart_of_accounts
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.repositories.chart_account import ChartAccountRepository
from app.utils.filter_values import filterValues

api = '/api/cas/chart-of-account'
chart_of_accounts_bp = Blueprint('chart_of_accounts', __name__)
repository = ChartAccountRepository()

@chart_of_accounts_bp.get(api + 's')
@authorized
def get_chart_of_accounts(user_id):
    query = request.args.to_dict()
    
    try:
      items = repository.find(query)
      return { 'data': items }
    except Exception as e:
        return jsonify({'message': 'Unable to get all coas', 'error': repr(e)}), 500
    # try:

    #     data = list(chart_of_accounts.find())
    #     for item in data: 
    #       chartaccount = ChartAccount.fromDict(item).toDict()
    #       # chartaccount = omit(chartaccount, 'accountType', 'accountGroup')
    #       # if chartaccount.get('accountType') != 'none' and chartaccount.get('accountType') is not None and chartaccount.get('accountType') != "":
    #       #   _accountstype = accountstype.find_one({'_id': ObjectId(chartaccount['accountType']) }) 
    #       #   chartaccount['accountType'] = AccountsType.fromDict(_accountstype).toDict()
            
    #       # if chartaccount.get('accountGroup') != 'none' and chartaccount.get('accountGroup') is not None and chartaccount.get('accountGroup') != "":
    #       #   _accountsgroup = accountsgroup.find_one({'_id': ObjectId(chartaccount['accountGroup']) }) 
    #       #   chartaccount['accountGroup'] = AccountsType.fromDict(_accountsgroup).toDict()
                
    #       ret.append(chartaccount)
            
    #     return {'data': ret }

    # except Exception as e:
    #     return {'message': repr(e) }, 500

    
# @accounts_type_bp.get(api + '/<id>')
# @authorized
# def get_category(user_id, id):

#     try:
#         data = categories.find_one({ '_id': ObjectId(id) })

#         if data is not None: 
           
#             return {'data': Category.fromDict(data).toDict() }
#         return {'message': 'Unable to find supplier.'}

#     except Exception as e:
#         return {'message': repr(e) }, 500

@chart_of_accounts_bp.post(api + '/create')
@authorized
def create_chart_of_account(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('chart_of_accounts', filterValues(ChartAccount.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'ChartAccount successfully created.'}
        else:
            return {'message': 'Unable to create ChartAccount.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

@chart_of_accounts_bp.post(api + '/<id>/edit')
@authorized
def edit_chart_account(user_id, id):
  request_data = request.get_json()
  
  try:
    document = repository.update_one(
      { '_id': ObjectId(id) }, 
      EditChartAccount(**request_data)
    )

    return { 'message': 'Edit chart account successfully.', 'data': document }
  except ValidationError as e:
      return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
  except Exception as e:
      return jsonify({'message': 'Unable to edit chart account', 'error': repr(e)}), 500

# @accounts_type_bp.post(api + '/edit')
# @authorized
# def edit_category(user_id):
#     request_data = request.get_json()
#     id = request_data['id']

#     try:
#       item = Category.fromDict(request_data)
   
    
#       filter = { '_id': ObjectId(id) }
#       new_val = { "$set": filterValues(omit(item.toDict(), 'id')) }

#       res = categories.update_one(filter, new_val)

#       if res.modified_count > 0:
#         return { 'message': 'Category successfully updated.' }
#       else:
#         return { 'message': 'Unable to update categories.' }, 400
#     except Exception as e:
#       print (e)
#       return { 'message': 'data format is invalid' }
