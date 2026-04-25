from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from flask import Blueprint, g, request
from app.config import IS_INTERNAL_PRODUCTION

from app.database.config import discounts
from app.new_models.Discount import Discount, DiscountType, MemberType
from app.utils.utils import getLocalTime

get_discounts = Blueprint("/discounts", __name__)

@get_discounts.route('/discounts', methods=['GET'])
def _get_discounts():
  res = list(discounts.find().sort({ 'created_at': -1 }))

  initialDiscounts = [
    Discount(memberType=MemberType.SENIOR_CITIZEN, name="Senior Citizen Member 20%", type=DiscountType.PERCENTAGE, value=20),
    Discount(memberType=MemberType.PWD, name="PWD Member 20%", type=DiscountType.PERCENTAGE, value=20),
    Discount(memberType=MemberType.SOLO_PARENT, name="Solo Parent Member 20%", type=DiscountType.PERCENTAGE, value=20),
    Discount(memberType=MemberType.NAAC, name="NAAC Member 20%", type=DiscountType.PERCENTAGE, value=20),
  ]

  if(IS_INTERNAL_PRODUCTION):
    initialDiscounts = []

  if(len(res) == 0 or len(list(filter(lambda i: i.get('memberType') is not None, res))) == 0):
    discounts.insert_many(map(
      lambda i: { 
        **i.model_dump(exclude_none=True), 
        'created_by': g.user_id,
        'created_at': getLocalTime()
      }, 
      initialDiscounts
    ))
    res = list(discounts.find().sort({ 'created_at': -1 }))

  data = list(map(lambda i: { **i, "_id": str(i['_id']) }, res))
  return { 'data': data }, 200
  ret = []
  for record in res:
    ret.append({
      "_id": str(record["_id"]),
      "name": record["name"],
      "description": record.get("description"),
      "value": record["value"],
      "type": record["type"],
    })
  return {
    'data': ret,
  }, 200

