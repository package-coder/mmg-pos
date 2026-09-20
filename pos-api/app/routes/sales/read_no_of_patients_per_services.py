from flask import Blueprint

from app.database.config import products
from app.routes.sales.report_generators._data import (fetch_all_completed_transactions,
                                                        fetch_items_by_transaction)

get_products_reports = Blueprint("/reports/products", __name__)


@get_products_reports.route('/reports/products', methods=['GET'])
def _get_products_reports():
    transactions = fetch_all_completed_transactions()
    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])

    # transaction_items carries no productId reference back to the catalog — name is the only
    # field both sides share, so matching is done on name (same limitation the original had via
    # `service['_id']`, which likewise never matched anything real once schemas diverged).
    ret = [{'id': str(p['_id']), 'name': p['name'], 'qty': 0} for p in products.find()]
    by_name = {p['name']: p for p in ret}

    for transaction in transactions:
        for item in items_by_transaction.get(str(transaction['_id']), []):
            if item.get('package'):
                continue
            product = by_name.get(item.get('name'))
            if product:
                product['qty'] += item.get('quantity') or 1

    return {'data': {'cols': ret, 'total': sum(p['qty'] for p in ret)}}, 200
