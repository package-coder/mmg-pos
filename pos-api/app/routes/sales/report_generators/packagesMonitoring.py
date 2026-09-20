import copy
from datetime import date

from app.database.config import packages as packages_collection
from app.routes.sales.report_generators._data import (fetch_branches,
                                                        fetch_completed_transactions,
                                                        fetch_items_by_transaction,
                                                        item_amount,
                                                        month_range_to_dates,
                                                        parse_date)

MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def getMonthList(min_date, max_date):
    months = []
    cursor = min_date.replace(day=1)
    end = max_date.replace(day=1)
    while cursor <= end:
        months.append(f'{MONTH_NAMES[cursor.month - 1]} {cursor.year}')
        cursor = date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1)
    return months


def generatePackagesReports(args):
    branch_ids = args.getlist('branchIds')
    min_date = parse_date(args.get('min'), '%m/%Y')
    max_date = parse_date(args.get('max'), '%m/%Y')
    month_list = getMonthList(min_date, max_date)

    start, end = month_range_to_dates(args.get('min'), args.get('max'))
    transactions = fetch_completed_transactions(branch_ids, start, end, include_dev_test=args.get('includeDevTest') == 'true')
    items_by_transaction = fetch_items_by_transaction([t['_id'] for t in transactions])

    package_template = [{'id': str(p['_id']), 'name': p['name'], 'count': 0, 'amount': 0} for p in packages_collection.find()]
    table_template = {month: {'packages': copy.deepcopy(package_template), 'total': 0} for month in month_list}

    result_branches = []
    for branch in fetch_branches(branch_ids):
        result_branches.append({
            'id': str(branch['_id']),
            'name': branch['name'],
            'table': copy.deepcopy(table_template),
            'total': 0,
        })
    by_branch_id = {b['id']: b for b in result_branches}

    for transaction in transactions:
        branch = by_branch_id.get(transaction['branchId'])
        if not branch:
            continue
        transaction_date = parse_date(transaction['date'], '%Y-%m-%d')
        month_key = f'{MONTH_NAMES[transaction_date.month - 1]} {transaction_date.year}'
        month_table = branch['table'].get(month_key)
        if not month_table:
            continue

        # A package/promo sale is spread across one transaction_items row per lab test, all
        # sharing the same embedded `package` object — group them back into one package count.
        seen_packages_this_transaction = set()
        for item in items_by_transaction.get(str(transaction['_id']), []):
            package_info = item.get('package')
            if not package_info:
                continue
            package_id = package_info.get('id')
            package_entry = next((p for p in month_table['packages'] if p['id'] == package_id), None)
            if not package_entry:
                continue

            amount = item_amount(item)
            package_entry['amount'] += amount
            month_table['total'] += amount
            branch['total'] += amount
            if package_id not in seen_packages_this_transaction:
                package_entry['count'] += 1
                seen_packages_this_transaction.add(package_id)

    return result_branches
