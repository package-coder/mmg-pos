"""
A cashier's X-report must attribute each sale to exactly one shift. Shifts of the same cashier at
the same branch can be back-to-back (time out, time straight back in), so a sale stamped with a
shift id must count only in that shift, and unstamped legacy sales must still fall back to the
[timeIn, timeOut] window.

Runs CashierReportRepository.find() itself against a disposable real MongoDB.
"""
from bson import ObjectId

from app.repositories.cashier_report import CashierReportRepository


def _repo(db):
    repo = CashierReportRepository.__new__(CashierReportRepository)  # skip the app-DB connect
    repo._db = db
    return repo


def _seed(db):
    cashier = ObjectId()
    branch = ObjectId()
    db.users.insert_one({"_id": cashier, "first_name": "Ana", "last_name": "Cruz"})
    db.branches.insert_one({"_id": branch, "name": "Main"})
    shift1, shift2 = ObjectId(), ObjectId()
    common = {"cashierId": str(cashier), "branchId": str(branch), "date": "2026-09-22", "withdraw": 0}
    db.cashier_reports.insert_many([
        {"_id": shift1, **common, "timeIn": "2026-09-22T08:00:00+08:00", "timeOut": "2026-09-22T12:00:00+08:00"},
        {"_id": shift2, **common, "timeIn": "2026-09-22T12:00:00+08:00", "timeOut": None},
    ])
    return cashier, branch, shift1, shift2


def _sale(db, cashier, branch, when, net, shift_id=None):
    doc = {
        "cashierId": str(cashier), "branchId": str(branch), "transactionDate": when,
        "status": "completed", "totalNetSales": net, "totalGrossSales": net,
        "totalDiscount": 0, "totalSalesWithoutMemberDiscount": net, "totalMemberDiscount": 0,
        "tender": {"type": "cash", "amount": net},
    }
    if shift_id is not None:
        doc["shiftId"] = str(shift_id)
    db[CashierReportRepository._transaction_collection].insert_one(doc)


def _net_by_shift(db):
    reports = _repo(db).find({})
    return {r["_id"]: (r.get("sales") or {}).get("totalNetSales", 0) for r in reports}


class TestShiftAttribution:
    def test_boundary_sale_counts_in_only_its_own_shift(self, local_db):
        cashier, branch, s1, s2 = _seed(local_db)
        # Same instant as shift 1's timeOut AND shift 2's timeIn — the window alone would count
        # it in both. Stamped, it belongs to shift 1 only.
        _sale(local_db, cashier, branch, "2026-09-22T12:00:00+08:00", 100, shift_id=s1)
        totals = _net_by_shift(local_db)
        assert totals[str(s1)] == 100
        assert totals[str(s2)] == 0

    def test_unstamped_legacy_sale_falls_back_to_window(self, local_db):
        cashier, branch, s1, s2 = _seed(local_db)
        _sale(local_db, cashier, branch, "2026-09-22T09:30:00+08:00", 40)
        _sale(local_db, cashier, branch, "2026-09-22T13:30:00+08:00", 60)
        totals = _net_by_shift(local_db)
        assert totals[str(s1)] == 40
        assert totals[str(s2)] == 60

    def test_stamped_sale_ignores_window(self, local_db):
        cashier, branch, s1, s2 = _seed(local_db)
        # Timestamp falls inside shift 1's window but it was stamped to shift 2.
        _sale(local_db, cashier, branch, "2026-09-22T10:00:00+08:00", 75, shift_id=s2)
        totals = _net_by_shift(local_db)
        assert totals[str(s1)] == 0
        assert totals[str(s2)] == 75

