"""Seed product categories."""
import datetime
from app.database.config import product_categories as categories_collection


PRODUCT_CATEGORIES = [
    {"name": "Consultation", "description": "Medical consultation services", "isActive": True},
    {"name": "Diagnostic", "description": "Laboratory and diagnostic tests", "isActive": True},
    {"name": "Medication", "description": "Pharmaceutical products", "isActive": True},
    {"name": "Supplies", "description": "Medical supplies and equipment", "isActive": True},
]


def seed(log_fn):
    """Seed product categories."""
    now = datetime.datetime.utcnow()

    for raw in PRODUCT_CATEGORIES:
        existing = categories_collection.find_one({"name": raw["name"]})

        if existing:
            log_fn(f"Product category '{raw['name']}' already exists — skipping ({existing['_id']})")
        else:
            doc = {
                **raw,
                "created_by": None,
                "created_at": now,
            }
            result = categories_collection.insert_one(doc)
            log_fn(f"Created product category: {raw['name']} ({result.inserted_id})")
