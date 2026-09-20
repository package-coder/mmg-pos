# Seeding the MMG POS database

Seeding puts the starting data (branch, roles, users, discounts, products…) into MongoDB.
Read the one rule first, because everything below follows from it.

> **Central (cloud) is the only place lookup ids are created.**
> A branch must never invent its own branches, roles, users or products. Ids are random
> ObjectIds; seeding a branch on its own gave it different ids than central for the same
> "MMG Albay Main", so sales recorded against the local id never tallied with central and
> disappeared from central reports. Branches therefore **copy** their lookup data from
> central. Only the central server (or a throwaway dev database) seeds from scratch.

Entry point: [seed.py](seed.py). Seeders: [app/seeders/](app/seeders/). Shared logic (also used by the sync
service and the repair tool): [sync/lookup_tally.py](sync/lookup_tally.py).

## Which mode runs

`seed.py` picks a mode by itself:

| Situation | Mode | What happens |
|---|---|---|
| `REMOTE_DATABASE_URL` is set and reachable | **bootstrap** | Lookup collections are copied from central with identical `_id`s. Nothing is created locally. |
| `REMOTE_DATABASE_URL` is empty, or `--standalone` / `SEED_STANDALONE=1` | **standalone** | The seeders below run and create the data (this is how central itself is seeded). |
| Set but **unreachable**, `APP_ENV` is `local-development` or `development` | standalone, with a warning | The ids will NOT match central. Do not use this database for real sales. |
| Set but **unreachable**, any other `APP_ENV` | **refuses** (exit 1) | Fix connectivity, or pass `--standalone` if this really is the central server. |

Bootstrap also stops with an error if central has no branches yet (seed central first).

## Commands

Inside Docker (normal):

```bash
docker-compose exec server python seed.py              # auto mode (see table)
docker-compose exec server python seed.py --standalone # force local seeding (central server)
```

Local dev (from `pos-api/`, venv active):

```bash
python seed.py
python seed.py --standalone
SEED_ADMIN_PASSWORD=mypassword python seed.py --standalone   # override the admin password
```

Every seeder is **idempotent**: it skips anything that already exists, so re-running is safe.

## What the seeders create (standalone mode)

Run in this order by `seed_all()`:

| # | Seeder | Creates | How "already exists" is decided | Ids |
|---|---|---|---|---|
| 1 | `branches_and_roles` | Branch **MMG Albay Main** (TIN `000-000-000-000`, Legazpi City), roles **admin** (all resources, full permissions) and **cashier** (transactions, cashier reports, customers, packages, products, doctors, branches, discounts) | branch by `name`, role by `name` | random |
| 2 | `users` | Users **admin** and **cashier**, both linked to the branch and their role | `username` | random |
| 3 | `discounts` | 4 member discounts, 20% each: Senior Citizen, PWD, Solo Parent, NAAC | `memberType` | random |
| 4 | `product_categories` | 8 categories: Laboratory, ECG & Spirometry, Others, Drug Testing, Professional Fee, Ultrasound, X-Ray, Special Chemistry | `_id` | **fixed** |
| 5 | `products` | 197 products (from a mongodump backup): name, price, sku, category | `_id` | **fixed** |
| 6 | `packages` | 3 packages: Basic Consultation, Full Medical Checkup, Emergency Package (their lab tests are looked up in `products` by name, so this runs after products) | `name` | random |
| 7 | `audit_logs_lookup` | Display names for every audit action code (used by the audit log page) | numeric `code` (a changed display name is updated in place) | random |

**Default logins (change them straight away on anything real):**

| User | Password | Override with |
|---|---|---|
| `admin` | `admin123` | `SEED_ADMIN_PASSWORD` (or `SEED_PASSWORD`) |
| `cashier` | `cashier123` | `SEED_CASHIER_PASSWORD` |

Products and categories use **fixed ids** because each product stores its category's id.
Everything else gets a random id, which is exactly why a second database seeded the same way
ends up with different ids.

## Collections owned by central

These are copied from central to every branch (the "lookups" list in `sync/lookup_tally.py`):
`branches`, `users`, `customers`, `discounts`, `doctors`, `corporates`, `roles`, `items`,
`audit_logs_lookup`, `products`, `packages`, `product_categories`.
The sync service keeps them up to date afterwards. Anything in this list that exists only on a
branch is reported in the sync log as a warning.

## Starting over (dev / test machines only)

```bash
python seed.py --reset          # shows what would be wiped, changes nothing
python seed.py --reset --yes    # backs up, empties, then re-seeds (bootstrap from central)
```

- The whole database is first copied to `<database>_backup_<timestamp>` on the same server.
- Collections are emptied, not dropped, so indexes survive.
- Invoice counters are wiped too, so numbering restarts at 1.
- **Refuses** if any sale has not uploaded to central yet (`--discard-unsynced` to override).
- **Refuses** unless `APP_ENV` is `local-development` or `development` (`--force-production` to override).
- Afterwards: sign out and back in, and clear the browser's `devPtuNo` local-storage key so the restarted
  invoice numbering does not reuse a PTU that central already has invoices for.

## Repairing a database that was seeded the old way

Symptoms: two "MMG Albay Main" branches, duplicate users or discounts, sales missing from cloud reports.

```bash
python sync/reconcile.py            # dry run: prints the plan, writes nothing
python sync/reconcile.py --apply    # remaps references, backs up and removes duplicates
python sync/reconcile.py --verify   # read-only check, exit code 1 on any mismatch
python sync/reconcile.py --status   # when the sync last pushed / pulled (Manila time), what is waiting or rejected
```

`--status` reads only the local database, so it works even when the cloud is unreachable. "Last push" and
"last pull" move only when something really went up or came down; "last successful check" moves every
cycle in which the cloud answered, and a failed cycle is shown with its error.

It only ever writes to the local database. Needs `LOCAL_DATABASE_URL` and `REMOTE_DATABASE_URL`
(inside the stack: `docker-compose exec sync python reconcile.py`).

## Setting up a new branch (checklist)

1. Make sure central is seeded and reachable, and that `REMOTE_DATABASE_URL` in `pos-api/.env` is correct.
2. `docker-compose up --build`
3. `docker-compose exec server python seed.py` — should print *Bootstrapping lookup data from central*.
4. `docker-compose exec sync python reconcile.py --verify` — should end with `TALLY OK`.
5. Install the helper on each cashier PC (`install.bat`) so each terminal has its own real PTU.

## Known issues (found while writing this, not fixed)

- **(Fixed) Packages used to be seeded before products**, so a fresh standalone seed gave every package an
  empty `lab_test` list and a price of 0. The order is now products, then packages. A database seeded before
  this fix still has empty packages; the seeder skips packages that already exist, so they must be fixed by hand.
- **Central's category ids don't match the products.** In the current central database (and so on every
  branch bootstrapped from it) the categories are Consultation, Diagnostic, Medication, Supplies, while all
  197 products point at the *other* set of ids defined in `product_categories.py`. As a result, all 197
  products reference a category that does not exist. Central was evidently seeded with an older
  version of the category seeder. Needs a decision on which set is correct, then a fix on central.
- **(Fixed) Customers created at a branch used to stay there.** A sale to such a customer disappeared from the
  cloud transactions page (the list joins each sale to its customer). Customers now upload like sales do, and
  reach every other branch through the normal pull. One person is one record: the rule is in
  `sync/customer_identity.py` (an ID number if present, otherwise first + middle + last name + birthday,
  ignoring case, spacing and accents). The API refuses a duplicate with HTTP 409, a unique index on
  `identityKey` backs that up when two branches save the same person at once (the second upload is parked as
  a `conflict`), and `python sync/reconcile.py` merges duplicates that already exist. Customers are not seeded.
