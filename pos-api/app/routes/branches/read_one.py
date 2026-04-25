from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request
from pydash import omit

from app.database.config import branches
from app.models.Branch import Branch

get_branch = Blueprint("/branch", __name__)

@get_branch.route('/branch', methods=['GET'])
def _get_branch():
   try: 
        ObjectId(request.args.get('id'))
   except:
        return {
            'message': 'data format is invalid',
            'code': 23
        }, 401

   branch = branches.find_one({"_id": ObjectId(request.args.get('id'))})

   if branch: 
       return { 'data': { **omit(branch, '_id'), "id": str(branch["_id"]) } }, 200 
   else:
        return {
            'message': 'Branch not found',
            'code': 20
        }, 200
   
