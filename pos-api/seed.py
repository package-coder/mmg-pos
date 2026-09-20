"""
Master seeder — orchestrates all database initialization.
Runs all sub-seeders in order: branches, roles, users, discounts, categories, packages, products.
Idempotent: skips any record that already exists.

Central is the only place lookup ids (branches, roles, users, products...) may
be created. Seeding those locally gave every install its own random ObjectIds,
so the same "MMG Albay Main" existed under different ids in each database and
sales recorded against the local id never tallied with central. So:

  * REMOTE_DATABASE_URL configured and reachable -> BOOTSTRAP: copy the lookup
    collections from central verbatim (same _ids). Nothing is minted locally.
  * REMOTE_DATABASE_URL empty, or --standalone / SEED_STANDALONE=1 -> the
    original seeders run. Use this for the central server itself and for
    throwaway dev databases.
  * REMOTE_DATABASE_URL configured but unreachable -> local/dev environments
    fall back to standalone with a warning; every other APP_ENV refuses to
    guess and exits, because seeding then would recreate the id split.

Already seeded a branch the old way? Run `python sync/reconcile.py` to repair it.

Usage (inside Docker):
    docker-compose exec server python seed.py [--standalone]

Usage (local dev):
    source .venv/Scripts/activate
    python seed.py [--standalone]
"""

import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync"))
import lookup_tally

# Import all seeders
from app.seeders import branches_and_roles, users, discounts, product_categories, packages, products, audit_logs_lookup

load_dotenv()

DATABASE_URL = os.getenv("LOCAL_DATABASE_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE", "pos")

client = MongoClient(DATABASE_URL)
db = client[DATABASE_NAME]


def log(msg: str):
    print(f"  {msg}")


_DEV_ENVS = ("local-development", "development")


def choose_mode(standalone: bool):
    """Returns ("standalone" | "bootstrap", remote_db_or_None)."""
    if standalone or os.getenv("SEED_STANDALONE") == "1":
        print("  --standalone: seeding lookup data locally (this database becomes a source of ids).")
        return "standalone", None

    remote_url = (os.getenv("REMOTE_DATABASE_URL") or "").strip()
    if not remote_url or remote_url == DATABASE_URL:
        print("  No central database configured: seeding lookup data locally.")
        return "standalone", None

    try:
        remote_client = MongoClient(remote_url, serverSelectionTimeoutMS=8000)
        remote_client.admin.command("ping")
        return "bootstrap", remote_client[DATABASE_NAME]
    except Exception as e:
        if os.getenv("APP_ENV", "local-development") in _DEV_ENVS:
            print(f"  WARNING: central database unreachable ({type(e).__name__}); falling back to standalone seeding.")
            print("  Ids created now will NOT match central. Do not use this database for real sales.")
            return "standalone", None
        print(f"\n✗ Central database is configured but unreachable ({type(e).__name__}).")
        print("  Refusing to seed lookup data locally: it would get ids central does not have,")
        print("  and every sale recorded against them would fail to tally in central reports.")
        print("  Fix connectivity and re-run, or pass --standalone if this really is the central server.")
        sys.exit(1)


def bootstrap_from_central(remote_db):
    """Copy lookup collections from central verbatim. Never writes to central."""
    print("\nBootstrapping lookup data from central (same _ids, nothing minted locally)...\n", flush=True)
    counts = lookup_tally.bootstrap_from_central(remote_db, db, lookup_tally.LOOKUPS)
    for name, n in counts.items():
        log(f"{name}: {n} record(s)")
    if not counts.get("branches"):
        print("\n✗ Central has no branches yet. Seed the central server first (python seed.py --standalone there).")
        sys.exit(1)

    stray = {name: len(ids) for name in lookup_tally.LOOKUPS
             if (ids := lookup_tally.local_only_ids(remote_db, db, name))}
    if stray:
        print(f"\n  WARNING: this database already holds records central does not have: {stray}")
        print("  It was seeded the old way. Run `python sync/reconcile.py` (dry run) to repair it.")
    print("\n✓ Bootstrap complete.\n", flush=True)


def seed_all():
    """Run all seeders in order."""
    print("\nSeeding database...\n", flush=True)

    try:
        # 1. Branches and Roles (required by users)
        print("━━ Branches & Roles ━━", flush=True)
        branch_id, admin_role_id, cashier_role_id = branches_and_roles.seed(log)

        # 2. Users (depends on branch and role IDs)
        print("\n━━ Users ━━", flush=True)
        users.seed(log, branch_id, admin_role_id, cashier_role_id)

        # 3. Discounts
        print("\n━━ Discounts ━━", flush=True)
        discounts.seed(log)

        # 4. Product Categories
        print("\n━━ Product Categories ━━", flush=True)
        product_categories.seed(log)

        # 5. Packages
        print("\n━━ Packages ━━", flush=True)
        packages.seed(log)

        # 6. Products (depends on categories existing)
        print("\n━━ Products ━━", flush=True)
        products.seed(log)

        # 7. Audit log action display names
        print("\n━━ Audit Log Lookup ━━", flush=True)
        audit_logs_lookup.seed(log)

        print("\n✓ All seeding complete.\n", flush=True)
    except Exception as e:
        print(f"\n✗ Seeding failed at this step: {e}\n")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    try:
        mode, remote_db = choose_mode("--standalone" in sys.argv[1:])
        if mode == "bootstrap":
            bootstrap_from_central(remote_db)
        else:
            seed_all()
    except Exception as e:
        print(f"\n✗ Seeding failed: {e}\n")
        sys.exit(1)
