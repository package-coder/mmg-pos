from app.routes.sales.report_generators._data import (fetch_categories,
                                                        fetch_completed_transactions,
                                                        fetch_items_by_transaction,
                                                        item_amount,
                                                        item_category_id,
                                                        single_month_bounds)


def comparativeData(args):
    branch_ids = args.getlist('branchIds')
    include_dev_test = args.get('includeDevTest') == 'true'
    year1 = generateYearReport(branch_ids, args.get('min'), include_dev_test)
    year2 = generateYearReport(branch_ids, args.get('max'), include_dev_test)

    categories = [{'id': c['id'], 'name': c['name'], '% INCREASE/DECREASE': 0} for c in year1]

    # (current - previous) / current * 100 — matches the original formula (not a standard
    # increase/decrease calc, but kept as-is since that's the figure this report has always shown).
    for i, x in enumerate(year1):
        if x['revenue'] <= 0:
            categories[i]['% INCREASE/DECREASE'] = 100 if year2[i]['revenue'] > 0 else 0
            continue
        categories[i]['% INCREASE/DECREASE'] = abs(x['revenue'] - year2[i]['revenue']) / x['revenue'] * 100

    return {
        'diff': categories,
        args.get('min'): year1,
        args.get('max'): year2,
    }


def generateYearReport(branch_ids, month_str, include_dev_test=False):
    """Despite the name (kept from the legacy version), this reports on a single
    calendar month — comparativeData calls it once for `min` and once for `max`."""
    start, end = single_month_bounds(month_str)
    transactions = fetch_completed_transactions(branch_ids, start, end, include_dev_test=include_dev_test)

    categories = [{'id': str(c['_id']), 'name': c['name'], 'count': 0, 'revenue': 0} for c in fetch_categories()]
    by_category_id = {c['id']: c for c in categories}

    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])
    total_revenue = 0

    for transaction in transactions:
        for item in items_by_transaction.get(str(transaction['_id']), []):
            category = by_category_id.get(item_category_id(item))
            amount = item_amount(item)
            total_revenue += amount
            if category:
                category['count'] += 1
                category['revenue'] += amount

    categories.append({
        'id': None,
        'name': 'NO. OF CLIENTS',
        'count': len(transactions),
        'revenue': total_revenue,
    })
    return categories
