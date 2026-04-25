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
