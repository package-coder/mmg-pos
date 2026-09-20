"""Shared data access for the /reports (General Reports) generators.

All six report types used to query the legacy `transactions` collection with
`status: "Completed"` (capitalized) and an embedded `services` array — a schema
that predates the v3 checkout flow. Real sales are written by
`app/blueprints/transaction.py:v3_create_transaction` to `new_transactions`
(status: "completed", lowercase) with line items in a separate
`transaction_items` collection (joined by `transactionId` == str(transaction
`_id`)). The legacy query never matched anything post-migration, so every
report always rendered zeros. This module centralizes the correct fetch logic
so it isn't re-implemented six times.
"""
from datetime import datetime, timedelta

from bson.objectid import ObjectId

# new_transactions/transaction_items/transaction_discounts aren't exported as module-level
# globals in app.database.config (only the legacy `transactions` collection is) — reached via
# the shared `database` handle instead of adding new globals there.
from app.database.config import branches, customers, database, product_categories

new_transactions = database.new_transactions
transaction_items = database.transaction_items
transaction_discounts = database.transaction_discounts


def parse_date(value, fmt):
    """MM/DD/YYYY or MM/YYYY (as sent by mmg-app's GenReports.jsx) -> date."""
    return datetime.strptime(value, fmt).date()


def _last_day_of_month(any_day):
    if any_day.month == 12:
        next_month = any_day.replace(year=any_day.year + 1, month=1, day=1)
    else:
        next_month = any_day.replace(month=any_day.month + 1, day=1)
    return next_month - timedelta(days=1)


def single_month_bounds(value, fmt='%m/%Y'):
    """'09/2026' -> (2026-09-01, 2026-09-30). Used by comparativeData, which compares
    two individual months rather than a continuous range."""
    start = parse_date(value, fmt).replace(day=1)
    return start, _last_day_of_month(start)


def month_range_to_dates(min_arg, max_arg):
    """comparativeData/packagesReports send whole months (MM/YYYY) — expand to the
    first and last calendar day of each month so callers can reuse date_range_query."""
    start, _ = single_month_bounds(min_arg)
    _, end = single_month_bounds(max_arg)
    return start, end


def fetch_completed_transactions(branch_ids, start_date, end_date):
    """start_date/end_date are date objects; `date` on the document is the
    plain 'YYYY-MM-DD' business-date string (see app/utils/utils.py:getLocalDateStr) —
    comparing it as a string is safe since it's zero-padded and lexicographically
    ordered the same as chronological order."""
    query = {
        'status': 'completed',
        'branchId': {'$in': branch_ids},
        'date': {'$gte': str(start_date), '$lte': str(end_date)},
        # Dev Test Mode transactions (mocked terminal, see app/blueprints/transaction.py
        # _is_dev_test) must never count toward a real sales/income report.
        'isDevTest': {'$ne': True},
    }
    return list(new_transactions.find(query))


def fetch_all_completed_transactions():
    """No branch/date scoping — used by the older, unfiltered mancom/municipality/
    package-monitoring/products reports (not currently linked from mmg-app, but kept working)."""
    return list(new_transactions.find({'status': 'completed', 'isDevTest': {'$ne': True}}))


def fetch_items_by_transaction(transaction_ids):
    """Returns {transactionId: [item, ...]}. transaction_items.transactionId is
    stored as a plain string (see v3_create_transaction), matching str(_id)."""
    items = list(transaction_items.find({'transactionId': {'$in': [str(t) for t in transaction_ids]}}))
    grouped = {}
    for item in items:
        grouped.setdefault(item['transactionId'], []).append(item)
    return grouped


def item_category_id(item):
    """Package-derived items get a flat `categoryId` string (set client-side in
    CreateTransactionV2); a lab test added directly to the cart may instead carry
    the enriched `category: {id, name}` object from the product listing. Neither
    is guaranteed present (categoryId is null for some legacy-shaped rows)."""
    if item.get('categoryId'):
        return item['categoryId']
    category = item.get('category')
    if isinstance(category, dict):
        return category.get('id') or category.get('_id')
    return None


def item_amount(item):
    """transaction_items has no stored `amount` — it's price * quantity at the
    time of sale."""
    return (item.get('price') or 0) * (item.get('quantity') or 1)


def fetch_branches(branch_ids):
    return list(branches.find({'_id': {'$in': [ObjectId(b) for b in branch_ids]}}))


def fetch_categories():
    return list(product_categories.find())


def fetch_discounts_by_transaction(transaction_ids):
    """Returns {transactionId: [discount, ...]} for the transaction_discounts rows created
    alongside a sale (see v3_create_transaction) — transactionId is a plain string there too."""
    docs = transaction_discounts.find({'transactionId': {'$in': [str(t) for t in transaction_ids]}})
    grouped = {}
    for doc in docs:
        grouped.setdefault(doc['transactionId'], []).append(doc)
    return grouped


def fetch_customers_by_id(customer_ids):
    ids = [ObjectId(c) for c in customer_ids if c]
    docs = customers.find({'_id': {'$in': ids}})
    return {str(doc['_id']): doc for doc in docs}


def customer_full_name(customer):
    if not customer:
        return None
    parts = [customer.get('first_name'), customer.get('last_name')]
    return ' '.join(p for p in parts if p)


def customer_address(customer):
    if not customer or not isinstance(customer.get('address'), dict):
        return None
    address = customer['address']
    parts = [address.get('street'), address.get('barangay'), address.get('cityMunicipality'), address.get('province')]
    return ', '.join(p for p in parts if p)
