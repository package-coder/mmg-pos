import copy

from app.routes.sales.report_generators._data import (fetch_branches,
                                                        fetch_categories,
                                                        fetch_completed_transactions,
                                                        fetch_items_by_transaction,
                                                        item_amount,
                                                        item_category_id,
                                                        parse_date)


def getMancomPaymentType(args):
    branch_ids = args.getlist('branchIds')
    start = parse_date(args.get('min'), '%m/%d/%Y')
    end = parse_date(args.get('max'), '%m/%d/%Y')

    transactions = fetch_completed_transactions(branch_ids, start, end, include_dev_test=args.get('includeDevTest') == 'true')
    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])

    category_template = [{'id': str(c['_id']), 'name': c['name'], 'Cash': 0, 'AR': 0, 'Count': 0} for c in fetch_categories()]

    result_branches = []
    for branch in fetch_branches(branch_ids):
        result_branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'categories': copy.deepcopy(category_template),
            'totalCash': 0,
            'totalAr': 0,
        })
    by_branch_id = {b['id']: b for b in result_branches}

    for transaction in transactions:
        branch = by_branch_id.get(transaction['branchId'])
        if not branch:
            continue
        by_category_id = {c['id']: c for c in branch['categories']}
        # Non-cash tender (cheque) is treated as Account Receivable, matching the same
        # cash-vs-charge split used in the Summary Income report.
        is_cash = (transaction.get('tender') or {}).get('type') == 'cash'

        for item in items_by_transaction.get(str(transaction['_id']), []):
            category = by_category_id.get(item_category_id(item))
            if not category:
                continue
            amount = item_amount(item)
            category['Count'] += 1
            if is_cash:
                category['Cash'] += amount
                branch['totalCash'] += amount
            else:
                category['AR'] += amount
                branch['totalAr'] += amount

    return result_branches
