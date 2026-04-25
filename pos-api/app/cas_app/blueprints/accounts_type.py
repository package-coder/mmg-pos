from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from pydash import omit

from app.cas_app.models.AccountsType import AccountsType
from app.cas_app.models.new_models.AccountType import EditAccountType
from app.database.config import accountstype
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.repositories.account_type import AccountTypeRepository
from app.utils.filter_values import filterValues

api = '/api/cas/accountstype'
accounts_type_bp = Blueprint('accountstype', __name__)
repository = AccountTypeRepository()

@accounts_type_bp.get(api + 's')
@authorized
def get_account_type(user_id):
    ret = []
    try:

        data = accountstype.find()
        for item in data: 
          ret.append(AccountsType.fromDict(item).toDict())
            
        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500

    
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

@accounts_type_bp.post(api + '/create')
@authorized
def create_accounts_type(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('accountstype', filterValues(AccountsType.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'AccountsType successfully created.'}
        else:
            return {'message': 'Unable to create AccountsType.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

@accounts_type_bp.post(api + '/<id>/edit')
@authorized
def edit_account_type(user_id, id):
  request_data = request.get_json()
  try:

    document = repository.update_one(
      { '_id': ObjectId(id) },
      EditAccountType(**request_data)
    )

    return { 'message': 'Edit account type successfully.', 'data': document }
  except ValidationError as e:
      return jsonify({'message': 'Unable to process data', 'error': e.errors(include_input=False)}), 500
  except Exception as e:
      return jsonify({'message': 'Unable to edit account type', 'error': repr(e)}), 500
    
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
