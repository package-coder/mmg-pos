"""Seed default users (admin, cashier)."""
import datetime
import bcrypt
import os
from app.database.config import users as users_collection


def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8") + " " + salt.decode("utf-8")


ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", os.getenv("SEED_PASSWORD", "admin123"))

CASHIER_USERNAME = "cashier"
CASHIER_PASSWORD = os.getenv("SEED_CASHIER_PASSWORD", "cashier123")


def seed(log_fn, branch_id, admin_role_id, cashier_role_id):
    """Seed default users."""
    # Admin user
    if users_collection.find_one({"username": ADMIN_USERNAME}):
        log_fn(f"User '{ADMIN_USERNAME}' already exists — skipping")
    else:
        users_collection.insert_one({
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
        log_fn(f"Created user: {ADMIN_USERNAME} (password: {ADMIN_PASSWORD})")

    # Cashier user
    if users_collection.find_one({"username": CASHIER_USERNAME}):
        log_fn(f"User '{CASHIER_USERNAME}' already exists — skipping")
    else:
        users_collection.insert_one({
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
        log_fn(f"Created user: {CASHIER_USERNAME} (password: {CASHIER_PASSWORD})")
