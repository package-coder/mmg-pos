import copy

from app.database.config import customers as customers_collection
from app.routes.sales.report_generators._data import (fetch_branches,
                                                        fetch_completed_transactions,
                                                        fetch_customers_by_id,
                                                        parse_date)


def typesOfClient(args):
    branch_ids = args.getlist('branchIds')
    start = parse_date(args.get('min'), '%m/%d/%Y')
    end = parse_date(args.get('max'), '%m/%d/%Y')

    transactions = fetch_completed_transactions(branch_ids, start, end)
    customers_by_id = fetch_customers_by_id([t.get('customerId') for t in transactions])

    customer_types = customers_collection.distinct('customer_type')
    type_template = [{'name': t, 'count': 0, 'amount': 0} for t in customer_types if t]
    type_template.append({'name': 'NO. OF CLIENTS', 'count': 0, 'amount': 0})

    result_branches = []
    for branch in fetch_branches(branch_ids):
        result_branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'types': copy.deepcopy(type_template),
        })
    by_branch_id = {b['id']: b for b in result_branches}

    for transaction in transactions:
        branch = by_branch_id.get(transaction['branchId'])
        if not branch:
            continue

        amount = transaction.get('totalNetSales') or 0
        customer = customers_by_id.get(transaction.get('customerId'))
        customer_type = customer.get('customer_type') if customer else None

        for entry in branch['types']:
            if entry['name'] == customer_type:
                entry['count'] += 1
                entry['amount'] += amount

        totals_entry = branch['types'][-1]
        totals_entry['count'] += 1
        totals_entry['amount'] += amount

    return result_branches
