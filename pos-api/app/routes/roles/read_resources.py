from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, request

from app.database.config import roles

apis = ['/resource',
         '/branch/create', 
         '/branch/edit', 
         '/branch', 
         '/branches', 
         '/corporate', 
         '/customer', 
         '/doctor' , 
         '/package', 
         '/product', 
         '/product', 
         '/product', 
         '/product/', 
         '/product/category/create',
         '/product/category/edit',
         '/product/category',
         '/product/categories', 
         '/user/register',
         '/user/edit',
         '/user',
         '/users',
         '/transaction/edit',
         '/transaction/create',
         '/transaction',
         '/transactions',
         '/sales-deposits',
         '/cashier-reports'
         ]

permission = ['update', 'read', 'create', 'delete']

get_resources = Blueprint("/resources", __name__)

@get_resources.route('/resources', methods=['GET'])
def _get_resources():

   return {
          'data': apis,
        }, 200
      
