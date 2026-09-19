from pymongo import ASCENDING, DESCENDING


def ensure_indexes(db):
    # sales — queried by branch+date in report generation and cashier sales reports
    db.sales.create_index([("branch", ASCENDING), ("date", ASCENDING)])
    db.sales.create_index([("cashierId", ASCENDING), ("date", ASCENDING)])

    # cashier_reports — queried by branchId+date in generate_branch_report aggregation
    db.cashier_reports.create_index([("branchId", ASCENDING), ("date", ASCENDING)])

    # transactions — queried by status+cashierId+date for active transaction lookup
    db.transactions.create_index([("status", ASCENDING), ("cashierId", ASCENDING), ("date", ASCENDING)])
    db.transactions.create_index([("branchId", ASCENDING), ("date", ASCENDING)])

    # branch_reports — queried by branchId+date to check for existing daily report
    db.branch_reports.create_index([("branchId", ASCENDING), ("date", ASCENDING)])

    # audit_logs — typically queried by userId and datetime range
    db.audit_logs.create_index([("userId", ASCENDING)])
    db.audit_logs.create_index([("datetime", DESCENDING)])

    # _sync.status — queried every 20s by sync/app.py's upstream push, on every
    # collection behind BackupRepository (new_transactions, cashier_reports,
    # branch_reports, audit_logs, settings, report_cash_count). A partial
    # index (only "pending" docs) keeps this cheap as synced history grows —
    # most docs settle into "synced" and never need to be found by this query
    # again.
    for collection_name in ['new_transactions', 'cashier_reports', 'branch_reports', 'audit_logs', 'settings', 'report_cash_count']:
        db[collection_name].create_index(
            [("_sync.status", ASCENDING), ("_sync.last_attempt_at", ASCENDING)],
            partialFilterExpression={"_sync.status": "pending"},
        )

    # _sync.stamp_id — queried every 3min by sync/app.py's downstream pull,
    # on this instance's copy of every lookup/master-data collection (this
    # matters most on the central/admin instance, where branches actually
    # pull from; harmless to also have it on a branch's own local copy).
    # Not a partial index like the one above — every branch needs to sort
    # by this across the whole collection each cycle, not just a "pending"
    # subset (downstream has no per-document status field at all; see
    # sync/app.py:pull_pending for why).
    for collection_name in ['branches', 'users', 'customers', 'discounts', 'doctors', 'corporates', 'roles', 'items', 'audit_logs_lookup', 'products', 'packages', 'product_categories']:
        db[collection_name].create_index([("_sync.stamp_id", ASCENDING)])
