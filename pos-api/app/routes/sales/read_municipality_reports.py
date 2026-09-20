from flask import Blueprint

from app.database.config import customers
from app.routes.sales.report_generators._data import (fetch_all_completed_transactions,
                                                        fetch_customers_by_id)

get_municipality_reports = Blueprint("/reports/municipality", __name__)


@get_municipality_reports.route('/reports/municipality', methods=['GET'])
def _get_municipality_reports():
    transactions = fetch_all_completed_transactions()
    customers_by_id = fetch_customers_by_id([t.get('customerId') for t in transactions])

    ret = {}
    for customer in customers.find():
        municipality = (customer.get('address') or {}).get('cityMunicipality')
        if municipality:
            ret.setdefault(municipality, 0)

    for transaction in transactions:
        customer = customers_by_id.get(transaction.get('customerId'))
        municipality = (customer.get('address') or {}).get('cityMunicipality') if customer else None
        if municipality in ret:
            ret[municipality] += 1

    return {'data': {'cols': ret, 'total': len(transactions)}}, 200
