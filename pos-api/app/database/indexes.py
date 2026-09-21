from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure


def _create_or_replace_index(collection, keys, **kwargs):
    """create_index with an existing name but a changed spec raises IndexOptionsConflict
    instead of updating it in place — needed here because unique_invoice_number_per_terminal's
    partialFilterExpression changed after it first shipped (see comment below). Self-healing:
    installs that already have the old spec get it dropped and recreated once; everyone else
    (fresh installs, or a server that already picked up the new spec) just succeeds normally.

    Gunicorn boots several worker processes at once, each calling this at import time, so the
    drop/recreate below can race across workers (one drops it out from under another, or two try
    to create it back to back) — both drop and the retry are individually best-effort so a race
    fails that one worker's attempt instead of crashing it; whichever worker wins leaves the
    collection with the correct index, which is all that actually matters.
    """
    try:
        collection.create_index(keys, **kwargs)
    except OperationFailure:
        try:
            collection.drop_index(kwargs['name'])
        except OperationFailure:
            pass
        try:
            collection.create_index(keys, **kwargs)
        except OperationFailure:
            pass


def ensure_indexes(db):
    # sales — queried by branch+date in report generation and cashier sales reports
    db.sales.create_index([("branch", ASCENDING), ("date", ASCENDING)])
    db.sales.create_index([("cashierId", ASCENDING), ("date", ASCENDING)])

    # cashier_reports — queried by branchId+date in generate_branch_report aggregation
    db.cashier_reports.create_index([("branchId", ASCENDING), ("date", ASCENDING)])

    # cashier_reports — a cashier can have multiple shifts per branch per day (e.g. time out at
    # lunch, then time back in later), but at most one ACTIVE one (timeOut still null) per branch
    # per day at a time — this partial unique index enforces exactly that. Without it,
    # time_in_report's "is there already an open shift?" check is a plain find-then-insert with a
    # race window: a reload/double-click, two browser tabs, or a retried request can both pass the
    # check before either write lands, producing two simultaneously-open shifts. Each independently
    # $lookups the same day's transactions in CashierReportRepository.find, and branch-level
    # Z-report generation sums `withdraw` across every cashier_reports doc for a branch+date with
    # no per-cashier grouping — so a duplicate *open* shift would silently double-count that
    # cashier's withdraw in the Z-report. Partial (only `timeOut: null` rows), so any number of
    # already-closed shifts for the same cashier+branch+day can coexist without colliding — the
    # insert in time_in_report only needs to be atomic against a second concurrently-open shift,
    # not against shift history. Previously a plain (non-partial) unique index named
    # unique_cashier_report_per_day capped a cashier at one shift EVER per branch per day; explicitly
    # drop that by name first since a partialFilterExpression can't be added to an existing index in
    # place (create_index alone would raise IndexOptionsConflict — see _create_or_replace_index above).
    try:
        db.cashier_reports.drop_index("unique_cashier_report_per_day")
    except OperationFailure:
        pass
    _create_or_replace_index(
        db.cashier_reports,
        [("cashierId", ASCENDING), ("branchId", ASCENDING), ("date", ASCENDING)],
        unique=True,
        partialFilterExpression={"timeOut": None},
        name="unique_active_cashier_report_per_day",
    )

    # transactions — queried by status+cashierId+date for active transaction lookup
    db.transactions.create_index([("status", ASCENDING), ("cashierId", ASCENDING), ("date", ASCENDING)])
    db.transactions.create_index([("branchId", ASCENDING), ("date", ASCENDING)])

    # branch_reports — one Z-Report per branch per day. Previously a plain, non-unique index;
    # generate_reports() had no existence check at all, so generating twice for the same
    # branch/date silently inserted two documents, double-counting that day in every downstream
    # aggregate that sums over branch_reports. Explicitly drop the old auto-named index first —
    # create_index alone won't convert it to unique in place since the names differ.
    try:
        db.branch_reports.drop_index("branchId_1_date_1")
    except OperationFailure:
        pass
    _create_or_replace_index(
        db.branch_reports,
        [("branchId", ASCENDING), ("date", ASCENDING)],
        unique=True,
        name="unique_branch_report_per_day",
    )

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
    for collection_name in ['branches', 'users', 'customers', 'discounts', 'doctors', 'corporates', 'roles', 'items', 'audit_logs_lookup', 'products', 'packages', 'product_categories', 'payment_methods']:
        db[collection_name].create_index([("_sync.stamp_id", ASCENDING)])

    # customers — one person, one record. `identityKey` is computed by sync/customer_identity.py
    # (ID number if present, else first+middle+last name and birth date). The unique index makes
    # the API's own duplicate check race-proof when two cashiers save the same person at once.
    # Partial, so legacy customers with no key are unaffected. Best-effort: legacy databases that
    # already hold duplicates cannot build a unique index, and that must not stop the server booting.
    _create_or_replace_index(
        db.customers,
        [("identityKey", ASCENDING)],
        unique=True,
        partialFilterExpression={"identityKey": {"$type": "string"}},
        name="unique_customer_identity",
    )

    # payment_methods — one row per method `code` (the value stored on every transaction's tender),
    # so a sync/pull or two admins can never create two methods with the same code.
    _create_or_replace_index(
        db.payment_methods,
        [("code", ASCENDING)],
        unique=True,
        partialFilterExpression={"code": {"$type": "string"}},
        name="unique_payment_method_code",
    )

    # new_transactions — BIR compliance guardrail: invoice numbers (and cancel/refund serial
    # numbers) must be unique per accredited terminal (PTU), not per branch or per cashier — see
    # "Invoice Number" in CLAUDE.md. The atomic counter in `counters` already prevents duplicates
    # from ever being *generated*; these indexes are the defense-in-depth backstop that makes it
    # impossible to *write* a duplicate to the database, even via a future bug, a manual edit, or
    # a code path that bypasses the counter entirely. Partial, because hold/draft transactions
    # have no real invoiceNumber/serialNumber yet and must not collide with each other.
    #
    # IMPORTANT: `invoiceNumber` is a declared pydantic field (`invoiceNumber: int = None` on
    # BaseTransaction), so model_dump() always includes the key — hold transactions get
    # `invoiceNumber: null`, not an absent field. `{"$exists": True}` matches null values too, so
    # it would wrongly pull every hold transaction into this unique constraint and make the
    # *second* hold ever created collide with the first. `{"$type": "number"}` correctly matches
    # only real invoice numbers. serialNumber has no such trap — it's never a declared model
    # field, only ever set as a raw dict key with a real value in the cancel/refund flow — but
    # $type is used there too for consistency and to stay safe if that ever changes.
    #
    # Scoped to status="completed": v3_cancel_transaction deliberately clones a cancelled/
    # refunded transaction keeping the SAME invoiceNumber (a cancel/refund is a negative mirror
    # of the original invoice, not a new one — see CLAUDE.md "Invoice Number"), on the same
    # ptuNumber whenever the void happens on the terminal that issued it. Without this scoping
    # that insert collides with the very index meant to protect invoice numbers, since one
    # (ptuNumber, invoiceNumber) pair would then exist on two documents. Only one COMPLETED
    # transaction may ever hold a given (ptuNumber, invoiceNumber) — that's the actual BIR
    # requirement — while its cancelled/refunded mirrors are free to share it.
    _create_or_replace_index(
        db.new_transactions,
        [("ptuNumber", ASCENDING), ("invoiceNumber", ASCENDING)],
        unique=True,
        partialFilterExpression={"invoiceNumber": {"$type": "number"}, "status": "completed"},
        name="unique_invoice_number_per_terminal",
    )
    db.new_transactions.create_index(
        [("ptuNumber", ASCENDING), ("serialNumber", ASCENDING)],
        unique=True,
        partialFilterExpression={"serialNumber": {"$type": "number"}},
        name="unique_serial_number_per_terminal",
    )

    # new_transactions — double-submit guard. mmg-app sends one client-generated idempotencyKey
    # per Pay/Hold click; this index is the authoritative backstop that rejects a second insert
    # with the same key (a double-click that slipped past the frontend's own click-guard, or a
    # retried request after a dropped response) with a DuplicateKeyError, which
    # v3_create_transaction catches and turns into "return the transaction already created"
    # instead of a second transaction / a second invoice number. Partial, since most transactions
    # (legacy /transaction/create, holds created without a key) have no idempotencyKey at all.
    db.new_transactions.create_index(
        [("idempotencyKey", ASCENDING)],
        unique=True,
        partialFilterExpression={"idempotencyKey": {"$type": "string"}},
        name="unique_idempotency_key",
    )

    # counters — prevents the sequence generator itself from ever splitting into two documents
    # for the same logical counter (which would silently defeat the atomic $inc guarantee that
    # _get_next_sequence relies on). One index covers every counter shape in this collection —
    # {type, ptuNumber} for INVOICE_NUMBER/CANCEL_NUMBER/REFUND_NUMBER, {type, cashierId} for
    # TRANSACTION_NUMBER, {type, branchId} for Z_COUNTER — since `type` alone keeps the different
    # shapes from ever colliding. branchId must be part of this compound index (not just a bare
    # {type, branchId} lookup left to collide on the others): a document missing a field indexes
    # as null, so without branchId here every branch's Z_COUNTER counter would share the same
    # (Z_COUNTER, null, null) key and collide with each other on the very first Z-Report generated
    # by a second branch.
    _create_or_replace_index(
        db.counters,
        [("type", ASCENDING), ("ptuNumber", ASCENDING), ("cashierId", ASCENDING), ("branchId", ASCENDING)],
        unique=True,
        name="unique_counter_key",
    )
