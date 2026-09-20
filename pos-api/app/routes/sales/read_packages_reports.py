from flask import Blueprint

from app.database.config import packages
from app.routes.sales.report_generators._data import (fetch_all_completed_transactions,
                                                        fetch_items_by_transaction,
                                                        item_amount)

get_packages_reports = Blueprint("/sales", __name__)


@get_packages_reports.route('/reports/package-monitoring', methods=['GET'])
def _get_packages_reports():
    transactions = fetch_all_completed_transactions()
    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])

    ret = [{'id': str(p['_id']), 'name': p['name'], 'qty': 0, 'amount': 0} for p in packages.find()]
    by_package_id = {p['id']: p for p in ret}

    total = 0
    for transaction in transactions:
        # A package/promo sale is spread across one transaction_items row per lab test, all
        # sharing the same embedded `package` object — count the package itself once per sale.
        seen_packages = set()
        for item in items_by_transaction.get(str(transaction['_id']), []):
            package_info = item.get('package')
            if not package_info:
                continue
            package = by_package_id.get(package_info.get('id'))
            if not package:
                continue

            amount = item_amount(item)
            package['amount'] += amount
            total += amount
            if package_info.get('id') not in seen_packages:
                package['qty'] += 1
                seen_packages.add(package_info.get('id'))

    return {'data': {'cols': ret, 'total': total}}, 200
