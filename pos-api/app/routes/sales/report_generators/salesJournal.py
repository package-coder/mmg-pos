# 1. Sales Journal (All Payment Methods) / Cash Receipts Journal (cash tender only)
#
# Ref No. | Date | Customer | Address | Gross Sales | Discount | Discount Type | Net Sales Amount

from app.routes.sales.report_generators._data import (customer_address,
                                                        customer_full_name,
                                                        fetch_completed_transactions,
                                                        fetch_customers_by_id,
                                                        fetch_discounts_by_transaction,
                                                        parse_date)


def getSalesJournal(args, filter):
    branch_ids = args.getlist('branchIds')
    start = parse_date(args.get('min'), '%m/%d/%Y')
    end = parse_date(args.get('max'), '%m/%d/%Y')

    transactions = fetch_completed_transactions(branch_ids, start, end)
    if filter and filter.get('tenderType'):
        wanted = filter['tenderType'].lower()
        transactions = [t for t in transactions if (t.get('tender') or {}).get('type') == wanted]

    customers_by_id = fetch_customers_by_id([t.get('customerId') for t in transactions])
    discounts_by_transaction = fetch_discounts_by_transaction([t['_id'] for t in transactions])

    result = []
    for transaction in transactions:
        customer = customers_by_id.get(transaction.get('customerId'))
        discount_rows = discounts_by_transaction.get(str(transaction['_id']), [])
        discount_type = discount_rows[0].get('name') if discount_rows else None

        result.append({
            'id': str(transaction['_id']),
            'refNo': str(transaction.get('invoiceNumber') or '').zfill(6),
            'date': transaction['transactionDate'],
            'customer': customer_full_name(customer),
            'address': customer_address(customer),
            'grossSales': transaction.get('totalGrossSales') or 0,
            'discount': transaction.get('totalDiscount') or 0,
            'discountType': discount_type,
            'netSales': transaction.get('totalNetSales') or 0,
        })

    return result
