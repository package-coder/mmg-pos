"""Seed default discounts."""
import datetime
from pydantic import ValidationError
from app.database.config import db
from app.new_models.Discount import Discount


DEFAULT_DISCOUNTS = [
    {"name": "Senior Citizen Member 20%", "type": "percentage", "value": 20, "memberType": "senior_citizen"},
    {"name": "PWD Member 20%",            "type": "percentage", "value": 20, "memberType": "pwd"},
    {"name": "Solo Parent Member 20%",    "type": "percentage", "value": 20, "memberType": "solo_parent"},
    {"name": "NAAC Member 20%",           "type": "percentage", "value": 20, "memberType": "naac"},
]


def seed(log_fn):
    """Seed default discounts."""
    now = datetime.datetime.utcnow()

    for raw in DEFAULT_DISCOUNTS:
        try:
            discount = Discount(**raw)
        except ValidationError as e:
            log_fn(f"Invalid discount data for '{raw.get('name')}' — skipping: {e}")
            continue

        member_type = discount.memberType.value if discount.memberType else None

        existing = db.discounts.find_one({"memberType": member_type}) if member_type else \
                   db.discounts.find_one({"name": discount.name})

        if existing:
            log_fn(f"Discount '{discount.name}' already exists — skipping ({existing['_id']})")
        else:
            doc = {
                **discount.model_dump(exclude={"id"}, exclude_none=True),
                "memberType": member_type,
                "type": discount.type.value,
                "created_by": None,
                "created_at": now,
            }
            result = db.discounts.insert_one(doc)
            log_fn(f"Created discount: {discount.name} ({result.inserted_id})")
