"""
Master seeder — orchestrates all database initialization.
Runs all sub-seeders in order: branches, roles, users, discounts, categories, packages, products.
Idempotent: skips any record that already exists.

Usage (inside Docker):
    docker-compose exec server python seed.py

Usage (local dev):
    source .venv/Scripts/activate
    python seed.py
"""

import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

# Force unbuffered output
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 0) if hasattr(os, 'fdopen') else sys.stdout

# Import all seeders
from app.seeders import branches_and_roles, users, discounts, product_categories, packages, products

load_dotenv()

DATABASE_URL = os.getenv("LOCAL_DATABASE_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE", "pos")

client = MongoClient(DATABASE_URL)
db = client[DATABASE_NAME]


def log(msg: str):
    print(f"  {msg}")


def seed_all():
    """Run all seeders in order."""
    print("\nSeeding database...\n")
    sys.stdout.flush()

    try:
        # 1. Branches and Roles (required by users)
        print("━━ Branches & Roles ━━")
        sys.stdout.flush()
        branch_id, admin_role_id, cashier_role_id = branches_and_roles.seed(log)

        # 2. Users (depends on branch and role IDs)
        print("\n━━ Users ━━")
        users.seed(log, branch_id, admin_role_id, cashier_role_id)

        # 3. Discounts
        print("\n━━ Discounts ━━")
        discounts.seed(log)

        # 4. Product Categories
        print("\n━━ Product Categories ━━")
        sys.stdout.flush()
        product_categories.seed(log)

        # 5. Packages
        print("\n━━ Packages ━━")
        sys.stdout.flush()
        packages.seed(log)

        # 6. Products (depends on categories existing)
        print("\n━━ Products ━━")
        sys.stdout.flush()
        products.seed(log)

        print("\n✓ All seeding complete.\n")
        sys.stdout.flush()
    except Exception as e:
        print(f"\n✗ Seeding failed at this step: {e}\n")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    try:
        seed_all()
    except Exception as e:
        print(f"\n✗ Seeding failed: {e}\n")
        sys.exit(1)
