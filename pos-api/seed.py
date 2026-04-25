"""
Seed script — inserts default branch, roles, users, and discounts.
Idempotent: skips any record that already exists.

Usage (inside Docker):
    docker-compose exec server python seed.py

Usage (local dev):
    source .venv/Scripts/activate
    python seed.py

Override default passwords:
    SEED_ADMIN_PASSWORD=mypassword SEED_CASHIER_PASSWORD=mypassword python seed.py
"""

import datetime
import os
import sys

import bcrypt
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pydantic import ValidationError

load_dotenv()

# ── Connection ────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("LOCAL_DATABASE_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE", "pos")

client = MongoClient(DATABASE_URL)
db = client[DATABASE_NAME]

# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # stored as "<hash> <salt>" — auth.py splits on space
    return hashed.decode("utf-8") + " " + salt.decode("utf-8")


def log(msg: str):
    print(f"  {msg}")


# ── Seed data ─────────────────────────────────────────────────────────────────

BRANCH = {
    "name": "MMG Albay Main",
    "tin": "000-000-000-000",
    "city": "Legazpi City",
    "state": "Albay",
    "postalCode": "4500",
    "contactNumber": "09000000000",
    "emailAddress": "mmgalbay@email.com",
    "streetAddress": "Rizal St., Legazpi City, Albay",
    "isActive": True,
    "created_by": None,
}

# All API resources defined in app/routes/roles/read_resources.py
RESOURCES = [
    "/resource",
    "/branch/create",
    "/branch/edit",
    "/branch",
    "/branches",
    "/corporate",
    "/customer",
    "/doctor",
    "/package",
    "/product",
    "/product/category/create",
    "/product/category/edit",
    "/product/category",
    "/product/categories",
    "/user/register",
    "/user/edit",
    "/user",
    "/users",
    "/transaction/edit",
    "/transaction/create",
    "/transaction",
    "/transactions",
    "/sales-deposits",
    "/cashier-reports",
]

ADMIN_ROLE = {
    # Must match Role.ADMIN in mmg-app/src/utils/Role.js (case-insensitive)
    "name": "admin",
    "authorizations": {r: ["read", "create", "update", "delete"] for r in RESOURCES},
}

# Cashier role — transaction and cashier-report access only
CASHIER_RESOURCES = [
    "/transaction/create",
    "/transaction/edit",
    "/transaction",
    "/transactions",
    "/cashier-reports",
    "/customer",
    "/package",
    "/product",
    "/product/categories",
    "/doctor",
    "/branches",
    "/branch",
    "/discounts",
]
CASHIER_ROLE = {
    # Must match Role.CASHIER in mmg-app/src/utils/Role.js (case-insensitive)
    "name": "cashier",
    "authorizations": {r: ["read", "create", "update"] for r in CASHIER_RESOURCES},
}

DEFAULT_DISCOUNTS = [
    {"name": "Senior Citizen Member 20%", "type": "percentage", "value": 20, "memberType": "senior_citizen"},
    {"name": "PWD Member 20%",            "type": "percentage", "value": 20, "memberType": "pwd"},
    {"name": "Solo Parent Member 20%",    "type": "percentage", "value": 20, "memberType": "solo_parent"},
    {"name": "NAAC Member 20%",           "type": "percentage", "value": 20, "memberType": "naac"},
]

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", os.getenv("SEED_PASSWORD", "admin123"))

CASHIER_USERNAME = "cashier"
CASHIER_PASSWORD = os.getenv("SEED_CASHIER_PASSWORD", "cashier123")

# ── Run ───────────────────────────────────────────────────────────────────────

def seed():
    print("\nSeeding database...")

    # Branch
    existing_branch = db.branches.find_one({"name": BRANCH["name"]})
    if existing_branch:
        branch_id = existing_branch["_id"]
        log(f"Branch already exists — skipping ({branch_id})")
    else:
        result = db.branches.insert_one(BRANCH)
        branch_id = result.inserted_id
        log(f"Created branch: {BRANCH['name']} ({branch_id})")

    # Admin role
    existing_admin_role = db.roles.find_one({"name": ADMIN_ROLE["name"]})
    if existing_admin_role:
        admin_role_id = existing_admin_role["_id"]
        log(f"Role 'admin' already exists — skipping ({admin_role_id})")
    else:
        result = db.roles.insert_one(ADMIN_ROLE)
        admin_role_id = result.inserted_id
        log(f"Created role: admin ({admin_role_id})")

    # Cashier role
    existing_cashier_role = db.roles.find_one({"name": CASHIER_ROLE["name"]})
    if existing_cashier_role:
        cashier_role_id = existing_cashier_role["_id"]
        log(f"Role 'cashier' already exists — skipping ({cashier_role_id})")
    else:
        result = db.roles.insert_one(CASHIER_ROLE)
        cashier_role_id = result.inserted_id
        log(f"Created role: cashier ({cashier_role_id})")

    # Admin user
    if db.users.find_one({"username": ADMIN_USERNAME}):
        log(f"User '{ADMIN_USERNAME}' already exists — skipping")
    else:
        db.users.insert_one({
            "username": ADMIN_USERNAME,
            "password": hash_password(ADMIN_PASSWORD),
            "first_name": "Admin",
            "last_name": "User",
            "role": str(admin_role_id),
            "branches": [str(branch_id)],
            "is_active": True,
            "created_by": None,
            "created_at": datetime.datetime.utcnow(),
        })
        log(f"Created user: {ADMIN_USERNAME} (password: {ADMIN_PASSWORD})")

    # Cashier user
    if db.users.find_one({"username": CASHIER_USERNAME}):
        log(f"User '{CASHIER_USERNAME}' already exists — skipping")
    else:
        db.users.insert_one({
            "username": CASHIER_USERNAME,
            "password": hash_password(CASHIER_PASSWORD),
            "first_name": "Cashier",
            "last_name": "User",
            "role": str(cashier_role_id),
            "branches": [str(branch_id)],
            "is_active": True,
            "created_by": None,
            "created_at": datetime.datetime.utcnow(),
        })
        log(f"Created user: {CASHIER_USERNAME} (password: {CASHIER_PASSWORD})")

    # Discounts
    seed_discounts()

    print("\nDone.\n")


def seed_discounts():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from app.new_models.Discount import Discount

    now = datetime.datetime.utcnow()

    for raw in DEFAULT_DISCOUNTS:
        # Validate via Pydantic model before touching the DB
        try:
            discount = Discount(**raw)
        except ValidationError as e:
            log(f"Invalid discount data for '{raw.get('name')}' — skipping: {e}")
            continue

        member_type = discount.memberType.value if discount.memberType else None

        existing = db.discounts.find_one({"memberType": member_type}) if member_type else \
                   db.discounts.find_one({"name": discount.name})

        if existing:
            log(f"Discount '{discount.name}' already exists — skipping ({existing['_id']})")
        else:
            doc = {
                **discount.model_dump(exclude={"id"}, exclude_none=True),
                "memberType": member_type,
                "type": discount.type.value,
                "created_by": None,
                "created_at": now,
            }
            result = db.discounts.insert_one(doc)
            log(f"Created discount: {discount.name} ({result.inserted_id})")


if __name__ == "__main__":
    seed()
