from app.new_models.Transaction import TransactionStatus

_ISSUED = (TransactionStatus.COMPLETED, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED)
_VOIDED = (TransactionStatus.CANCELLED, TransactionStatus.REFUNDED)


def summarize_sales(transactions) -> dict:
    """Top-to-bottom sales breakdown for an X/Z reading, one that always foots:

        Gross Sales = VATable + VAT-Exempt + Zero-Rated
        Net Sales   = Gross - Discount - Cancelled - Refunded

    Gross Sales counts every invoice ISSUED in the window, including the ones that were later
    cancelled/refunded (a cancel/refund flips the original to status cancelled/refunded but leaves
    its positive amounts untouched). Discount is the member discount of still-completed sales only:
    a cancelled/refunded sale is taken out at its full GROSS (before discount), so its discount must
    not be deducted a second time. Cancelled/Refunded are the gross of the negative void (mirror)
    documents processed in the window (see v3_cancel_transaction: same document plus negated
    totals and a serialNumber). Because a void is reported in the window where it is
    processed, a shift/day in which more is voided than sold can legitimately go negative.
    """
    summary = {
        'vatableSales': 0.0, 'vatExemptSales': 0.0, 'zeroRatedSales': 0.0,
        'grossSales': 0.0, 'discount': 0.0, 'cancelled': 0.0, 'refunded': 0.0, 'netSales': 0.0,
    }

    for t in transactions:
        status = t.get('status')
        net = t.get('totalNetSales') or 0

        # A void document is recognised by its serialNumber, or (older voids without one) by a
        # voided status with negated amounts.
        if status in _VOIDED and (t.get('serialNumber') is not None or net < 0):
            # void/mirror document (negative amounts)
            key = 'cancelled' if status == TransactionStatus.CANCELLED else 'refunded'
            gross_void = t.get('totalSalesWithoutMemberDiscount')
            summary[key] += abs(gross_void if gross_void is not None else net)
            continue

        if status not in _ISSUED:
            continue

        # A deleted hold (v3_cancel_hold_transaction) is flipped to "cancelled" in place but never
        # got an invoice number, so it was never a sale and has no void document to offset it.
        # Counting it as issued would inflate Gross and Net by its full amount.
        if status in _VOIDED and t.get('invoiceNumber') is None:
            continue

        gross = t.get('totalSalesWithoutMemberDiscount') or 0
        summary['grossSales'] += gross
        if status == TransactionStatus.COMPLETED:
            summary['discount'] += t.get('totalMemberDiscount') or 0

        # Only the post-discount VAT split is persisted on a transaction, so apply each
        # transaction's exempt share of net to its gross. Transactions from before VAT was
        # computed carry no split and are treated as fully exempt, like the receipt does.
        vatable = t.get('vatableAmount') or 0
        exempt = t.get('vatExemptAmount')
        if exempt is None:
            exempt = net if vatable == 0 else 0
        share = min(max(exempt / net, 0), 1) if net else 1
        summary['vatExemptSales'] += gross * share
        summary['vatableSales'] += gross * (1 - share)

    summary['netSales'] = summary['grossSales'] - summary['discount'] - summary['cancelled'] - summary['refunded']
    summary = {k: round(v, 2) for k, v in summary.items()}
    # Keep the three components adding up to Gross to the centavo after rounding.
    summary['vatableSales'] = round(summary['grossSales'] - summary['vatExemptSales'] - summary['zeroRatedSales'], 2)
    return summary
