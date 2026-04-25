
from bson import ObjectId
from datetime import datetime, timedelta

from pydash import omit
import pytz


def ToStringId(data):
    if(data is None): return
    return { **omit(data, '_id'), "id": str(data["_id"]) }

def getTimeZone():
    return pytz.timezone('Asia/Manila')

def getLocalTime():
    return datetime.now(getTimeZone())

def getLocalDateStr():
    return str(getLocalTime().date())

def getLocalTimeStr():
    return getLocalTime().isoformat()


def convert_objectid_to_str(data):
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_objectid_to_str(value) for key, value in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data