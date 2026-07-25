"""Seed packages."""
import datetime
from app.database.config import db


PACKAGES = [
    {"name": "Basic Consultation", "description": "Standard medical consultation", "type": "package"},
    {"name": "Full Medical Checkup", "description": "Comprehensive health screening", "type": "package"},
    {"name": "Emergency Package", "description": "Emergency medical services", "type": "package"},
]


def seed(log_fn):
    """Seed packages."""
    now = datetime.datetime.utcnow()

    for raw in PACKAGES:
        existing = db.packages.find_one({"name": raw["name"]})

        if existing:
            log_fn(f"Package '{raw['name']}' already exists — skipping ({existing['_id']})")
        else:
            doc = {
                **raw,
                "created_by": None,
                "created_at": now,
            }
            result = db.packages.insert_one(doc)
            log_fn(f"Created package: {raw['name']} ({result.inserted_id})")
