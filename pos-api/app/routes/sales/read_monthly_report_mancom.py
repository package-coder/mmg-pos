from flask import Blueprint

from app.database.config import product_categories
from app.routes.sales.report_generators._data import (fetch_all_completed_transactions,
                                                        fetch_items_by_transaction,
                                                        item_amount, item_category_id)

get_mancom = Blueprint("/reports/mancom", __name__)


@get_mancom.route('/reports/mancom', methods=['GET'])
def _get_mancom():
    transactions = fetch_all_completed_transactions()
    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])

    ret = [{'id': str(c['_id']), 'name': c['name'], 'qty': 0, 'total': 0} for c in product_categories.find()]
    by_category_id = {c['id']: c for c in ret}

    total = 0
    for transaction in transactions:
        for item in items_by_transaction.get(str(transaction['_id']), []):
            # Standalone lab tests only — matches the original's `source == 'labTest'` filter,
            # i.e. items sold outside a package/promo bundle.
            if item.get('package'):
                continue
            category = by_category_id.get(item_category_id(item))
            amount = item_amount(item)
            total += amount
            if category:
                category['qty'] += item.get('quantity') or 1
                category['total'] += amount

    return {'data': {'cols': ret, 'total': total}}, 200
