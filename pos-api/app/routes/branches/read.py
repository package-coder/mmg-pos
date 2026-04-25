from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request
from pydash import omit

from app.database.config import branches
from app.models.Branch import Branch

get_branches = Blueprint("/branches", __name__)

@get_branches.route('/branches', methods=['GET'])
def _get_branches():

   data = branches.find()

   branch_list = []
   for branch in data:
      branch_list.append({ **omit(branch, '_id'), "id": str(branch["_id"]) })

   return { 'data': branch_list, }, 200
      
