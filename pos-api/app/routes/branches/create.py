
import os
from datetime import datetime
from operator import itemgetter

import bcrypt
import jwt
from flask import Blueprint, g, request
from pydash import omit

from app.database.config import branches
from app.database.store import insert_one
from app.models.Branch import Branch
from app.utils.utils import getLocalTime

create_branch = Blueprint("/branch/create", __name__)

@create_branch.route('/branch/create', methods=['POST'])
def _create_branch():
   request_data = request.get_json()
  
   branch = Branch.fromDict(request_data)
   branch.created_at = getLocalTime()
   branch.created_by = g.user_id
   
   doc = insert_one('branches', omit(branch.toDict(), 'id'))
   
   if doc.inserted_id:
      return {
         'message': 'Branch successfully created',
         'code': 15,
      }, 200
   else:
      return {
         'message': 'Unable to add branch.',
         'code': 30,
      }, 200


