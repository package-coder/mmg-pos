from bson import ObjectId
from flask import Blueprint, jsonify, request
from pydash import omit

from app.cas_app.models.JournalEntry import JournalEntry
from app.database.config import journal_entries
from app.database.store import insert_one
from app.middlewares.authorized_attribute import authorized
from app.utils.filter_values import filterValues

api = '/api/cas/journal-entry'
journal_entry_bp = Blueprint('journal_entries', __name__)

@journal_entry_bp.get(api.replace('entry', 'entries'))
@authorized
def get_journal_entries(user_id):
    ret = []
    try:

        data = journal_entries.find()
        for item in data: 
          ret.append(JournalEntry.fromDict(item).toDict())
            
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

@journal_entry_bp.post(api + '/create')
@authorized
def create_journal_entry(user_id):
    request_data = request.get_json()
    
    try:
        doc = insert_one('journal_entries', filterValues(JournalEntry.fromDict(request_data).toDict()))
        if doc.inserted_id:
            return {'message': 'JournalEntry successfully created.'}
        else:
            return {'message': 'Unable to create JournalEntry.'}, 500
    except Exception as e:
        return {'message': repr(e)}, 500
    

    
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
