

from functools import wraps
import os
from flask import jsonify, make_response, request
from jwt.api_jwt import decode

from app.config import JWT_SECRET_KEY



def authorized(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]

        if not token:
            return make_response(jsonify({'message': 'Unauthorized'}), 401)

        try:
            data = decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = data['user_id']
        except Exception as e:
            return make_response(jsonify({'message': 'Invalid Token'}), 401)

        return f(user_id, *args, **kwargs)
    return decorated_function