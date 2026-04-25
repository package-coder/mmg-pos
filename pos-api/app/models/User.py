from datetime import datetime

from bson import ObjectId

from app.database.config import users
from app.database.store import insert_one
from app.utils.utils import getLocalTime


class User:
   def __init__(self, username, password, first_name, last_name, role, branch_id, is_active, created_by):
        self.username = username
        self.password = password
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.branch_id = branch_id
        self.is_active = is_active
        self.created_by = created_by
        
   def save(self):
        created_at = getLocalTime()
        return insert_one('users', {
            "username": self.username,
            "password": self.password,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role,
            "branch_id": self.branch_id,
            "is_active": self.is_active,
            "created_by": self.created_by,
            "created_at": created_at,
            "updated_at": created_at
        })
   
   def update(self, id, obj = {}):
        obj['updated_at'] = getLocalTime()
        filter = { '_id': ObjectId(id) }
        new_val = { "$set": obj }
        return users.update_one(filter, new_val)
   
   def find_one(self, obj):
        return users.find_one(obj)
   
   def find(self, obj):
        return list(users.find(obj))