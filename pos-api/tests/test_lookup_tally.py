"""
Branch <-> central lookup tally tests.

The bug these guard against: each database was seeded on its own, so the same
branch/role/user existed under different ObjectIds. Sync merges by `_id`, so a
branch ended up with two "MMG Albay Main" records and sales pointing at a
branch id central did not have — those sales vanished from central reports.

Both "central" and "branch" here are disposable databases on the LOCAL Mongo
instance (never the real `pos` database, never the UAT server).
"""
import uuid

import pytest
from bson import ObjectId


@pytest.fixture
def tally():
    import importlib.util
    import os
    path = os.path.join(os.path.dirname(__file__), "..", "sync", "lookup_tally.py")
    spec = importlib.util.spec_from_file_location("lookup_tally", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def central_db(local_client):
    name = f"claude_test_{uuid.uuid4().hex[:12]}"
    yield local_client[name]
    local_client.drop_database(name)


def _seed_central(central):
    branch_id, role_id = ObjectId(), ObjectId()
    central["branches"].insert_one({"_id": branch_id, "name": "MMG Albay Main", "tin": "000-000-000-000"})
    central["roles"].insert_one({"_id": role_id, "name": "cashier"})
    central["users"].insert_one({"_id": ObjectId(), "username": "cashier", "role": str(role_id), "branches": [str(branch_id)]})
    return branch_id, role_id


def _seed_branch_the_old_way(local):
    """What `seed.py` used to do on a branch: mint its own ids."""
    branch_id, role_id, user_id = ObjectId(), ObjectId(), ObjectId()
    local["branches"].insert_one({"_id": branch_id, "name": "MMG Albay Main", "tin": "000-000-000-000"})
    local["roles"].insert_one({"_id": role_id, "name": "cashier"})
    local["users"].insert_one({"_id": user_id, "username": "cashier", "role": str(role_id), "branches": [str(branch_id)]})
    local["new_transactions"].insert_one({"_id": ObjectId(), "invoiceNumber": 1, "branchId": str(branch_id), "cashierId": str(user_id)})
    local["transaction_items"].insert_one({"_id": ObjectId(), "branchId": str(branch_id), "name": "CBC"})
    return branch_id, role_id, user_id


class TestBootstrap:
    def test_copies_lookups_with_identical_ids(self, tally, central_db, local_db):
        branch_id, role_id = _seed_central(central_db)

        counts = tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)

        assert counts["branches"] == 1
        assert local_db["branches"].find_one({"_id": branch_id}) is not None
        assert local_db["roles"].find_one({"_id": role_id}) is not None
        assert local_db["users"].count_documents({}) == 1

    def test_rerun_is_idempotent_and_never_duplicates(self, tally, central_db, local_db):
        _seed_central(central_db)
        tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)
        tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)
        assert local_db["branches"].count_documents({}) == 1

    def test_never_writes_to_central(self, tally, central_db, local_db):
        _seed_central(central_db)
        before = {n: central_db[n].count_documents({}) for n in ("branches", "roles", "users")}
        tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)
        assert before == {n: central_db[n].count_documents({}) for n in ("branches", "roles", "users")}


class TestMirrorUnstamped:
    def test_pulls_central_docs_that_have_no_stamp(self, tally, central_db, local_db):
        """The downstream watermark only sees stamped docs; a seeder-written
        central doc has no stamp and must still arrive."""
        central_db["branches"].insert_one({"name": "Unstamped Branch"})
        assert tally.mirror_unstamped(central_db, local_db, "branches") == 1
        assert local_db["branches"].find_one({"name": "Unstamped Branch"}) is not None

    def test_second_run_writes_nothing(self, tally, central_db, local_db):
        central_db["branches"].insert_one({"name": "Unstamped Branch"})
        tally.mirror_unstamped(central_db, local_db, "branches")
        assert tally.mirror_unstamped(central_db, local_db, "branches") == 0

    def test_central_edit_reaches_the_branch(self, tally, central_db, local_db):
        branch_id = central_db["branches"].insert_one({"name": "Old Name"}).inserted_id
        tally.mirror_unstamped(central_db, local_db, "branches")
        central_db["branches"].update_one({"_id": branch_id}, {"$set": {"name": "New Name"}})
        tally.mirror_unstamped(central_db, local_db, "branches")
        assert local_db["branches"].find_one({"_id": branch_id})["name"] == "New Name"


class TestReconcile:
    def test_matches_local_duplicates_to_central_twins(self, tally, central_db, local_db):
        central_branch, central_role = _seed_central(central_db)
        local_branch, local_role, _ = _seed_branch_the_old_way(local_db)

        id_map, unmatched, ambiguous = tally.build_id_map(central_db, local_db)

        assert id_map[str(local_branch)] == str(central_branch)
        assert id_map[str(local_role)] == str(central_role)
        assert not ambiguous

    def test_ambiguous_match_is_reported_not_guessed(self, tally, central_db, local_db):
        central_db["roles"].insert_many([{"name": "cashier"}, {"name": "cashier"}])
        local_db["roles"].insert_one({"name": "cashier"})
        id_map, _, ambiguous = tally.build_id_map(central_db, local_db)
        assert id_map == {}
        assert "roles" in ambiguous

    def test_unmatched_record_is_left_alone(self, tally, central_db, local_db):
        local_db["roles"].insert_one({"name": "only-here"})
        id_map, unmatched, _ = tally.build_id_map(central_db, local_db)
        assert id_map == {} and "roles" in unmatched

    def test_dry_run_changes_nothing(self, tally, central_db, local_db):
        _seed_central(central_db)
        local_branch, _, user_id = _seed_branch_the_old_way(local_db)
        id_map, _, _ = tally.build_id_map(central_db, local_db)

        tally.rewrite_references(local_db, id_map, apply=False)
        tally.backup_and_remove_strays(local_db, id_map, list(tally.NATURAL_KEYS), apply=False)

        assert local_db["new_transactions"].find_one()["branchId"] == str(local_branch)
        assert local_db["branches"].count_documents({}) == 1

    def test_apply_repoints_sales_and_removes_duplicates(self, tally, central_db, local_db):
        central_branch, _ = _seed_central(central_db)
        _, _, user_id = _seed_branch_the_old_way(local_db)
        id_map, _, _ = tally.build_id_map(central_db, local_db)

        changed = tally.rewrite_references(local_db, id_map, apply=True)
        removed = tally.backup_and_remove_strays(local_db, id_map, list(tally.NATURAL_KEYS), apply=True)

        tx = local_db["new_transactions"].find_one()
        assert tx["branchId"] == str(central_branch)
        assert changed["new_transactions"] == 1 and changed["transaction_items"] == 1
        # the corrected sale must be re-flagged so it uploads with the right branch
        assert tx["_sync"]["status"] == "pending"
        # duplicates gone, and kept in a backup collection
        assert local_db["branches"].count_documents({"_id": {"$ne": central_branch}}) == 0
        assert removed["branches"] == 1
        assert any(n.startswith("_reconcile_backup_branches_") for n in local_db.list_collection_names())

    def test_reference_type_is_preserved(self, tally, central_db, local_db):
        """ObjectId refs stay ObjectId and string refs stay string — a type
        change would silently break `$toObjectId` joins in the reports."""
        central_branch, _ = _seed_central(central_db)
        local_branch, _, _ = _seed_branch_the_old_way(local_db)
        local_db["cashier_reports"].insert_one({"branchId": local_branch})  # ObjectId-typed
        id_map, _, _ = tally.build_id_map(central_db, local_db)

        tally.rewrite_references(local_db, id_map, apply=True)

        assert local_db["cashier_reports"].find_one()["branchId"] == central_branch
        assert isinstance(local_db["new_transactions"].find_one()["branchId"], str)

    def test_apply_is_idempotent(self, tally, central_db, local_db):
        _seed_central(central_db)
        _seed_branch_the_old_way(local_db)
        id_map, _, _ = tally.build_id_map(central_db, local_db)
        tally.rewrite_references(local_db, id_map, apply=True)
        tally.backup_and_remove_strays(local_db, id_map, list(tally.NATURAL_KEYS), apply=True)

        id_map2, _, _ = tally.build_id_map(central_db, local_db)
        assert id_map2 == {}
        assert tally.rewrite_references(local_db, id_map2, apply=True) == {}

    def test_counters_are_never_touched(self, tally, central_db, local_db):
        _seed_central(central_db)
        _, _, user_id = _seed_branch_the_old_way(local_db)
        local_db["counters"].insert_one({"type": "INVOICE_NUMBER", "cashierId": str(user_id), "seq": 41})
        id_map, _, _ = tally.build_id_map(central_db, local_db)

        tally.rewrite_references(local_db, id_map, apply=True)

        assert local_db["counters"].find_one()["cashierId"] == str(user_id)
        assert local_db["counters"].find_one()["seq"] == 41


class TestBackfillAndVerify:
    def test_backfill_flags_docs_written_before_stamping_existed(self, tally, local_db):
        local_db["new_transactions"].insert_one({"invoiceNumber": 1})
        flagged = tally.backfill_upstream_stamps(local_db)
        assert flagged == {"new_transactions": 1}
        assert local_db["new_transactions"].find_one()["_sync"]["status"] == "pending"

    def test_backfill_does_not_reset_docs_already_synced(self, tally, local_db):
        local_db["new_transactions"].insert_one({"invoiceNumber": 1, "_sync": {"status": "synced"}})
        assert tally.backfill_upstream_stamps(local_db) == {}
        assert local_db["new_transactions"].find_one()["_sync"]["status"] == "synced"

    def test_verify_reports_a_mismatch_then_clean_after_reconcile(self, tally, central_db, local_db):
        _seed_central(central_db)
        _seed_branch_the_old_way(local_db)

        before = tally.verify(central_db, local_db, tally.LOOKUPS)
        assert before["local_only_lookups"] and before["orphan_references"]

        id_map, _, _ = tally.build_id_map(central_db, local_db)
        tally.rewrite_references(local_db, id_map, apply=True)
        tally.backup_and_remove_strays(local_db, id_map, list(tally.NATURAL_KEYS), apply=True)
        tally.backfill_upstream_stamps(local_db)

        after = tally.verify(central_db, local_db, tally.LOOKUPS)
        assert after == {"local_only_lookups": {}, "orphan_references": {}, "unstamped_upstream": {}, "sync_conflicts": {}}


class TestDownstreamPullIntegration:
    def test_pull_delivers_unstamped_central_docs(self, sync_module, central_db, local_db, monkeypatch):
        """End to end through the real pull_pending: a seeder-written central
        branch (no `_sync`) reaches the branch instead of being skipped."""
        monkeypatch.setattr(sync_module, "lookups", ["branches"])
        central_db["branches"].insert_one({"name": "Seeded Centrally"})

        sync_module.pull_pending(central_db.client, central_db.name, local_db.client, local_db.name)

        assert local_db["branches"].find_one({"name": "Seeded Centrally"}) is not None

    def test_pull_warns_about_local_only_lookups(self, sync_module, central_db, local_db, monkeypatch, capsys):
        monkeypatch.setattr(sync_module, "lookups", ["branches"])
        central_db["branches"].insert_one({"name": "Central Branch"})
        local_db["branches"].insert_one({"name": "Locally Minted Branch"})

        sync_module.pull_pending(central_db.client, central_db.name, local_db.client, local_db.name)

        assert "local-only record" in capsys.readouterr().out

    def test_connection_strings_are_redacted_in_logs(self, sync_module):
        assert "hunter2" not in sync_module._redact("mongodb://admin:hunter2@host:27017/pos")
        assert sync_module._redact("mongodb://localhost:27017") == "mongodb://localhost:27017"


class TestUniqueIndexConflict:
    """Two dev stacks sharing one fake PTU both issued invoice 1. Central's unique
    (ptuNumber, invoiceNumber) index rejected the second machine's sale, and the
    sync retried it every minute forever while its log claimed only 'failed'."""

    @pytest.fixture
    def dest_with_unique_invoice(self, central_db):
        central_db["new_transactions"].create_index(
            [("ptuNumber", 1), ("invoiceNumber", 1)], unique=True, name="unique_invoice_number_per_terminal")
        return central_db

    def _pending(self):
        from bson import ObjectId as O
        return {"status": "pending", "synced_at": None, "attempts": 0, "last_attempt_at": None, "last_error": None, "stamp_id": O()}

    def test_conflicting_sale_is_parked_not_retried_forever(self, sync_module, dest_with_unique_invoice, local_db):
        dest_with_unique_invoice["new_transactions"].insert_one({"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1})
        local_db["new_transactions"].insert_one({"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1, "_sync": self._pending()})

        sync_module.push_pending(local_db.client, local_db.name, dest_with_unique_invoice.client, dest_with_unique_invoice.name)

        doc = local_db["new_transactions"].find_one()
        assert doc["_sync"]["status"] == "conflict"
        assert "DuplicateKeyError" in doc["_sync"]["last_error"]
        # a second cycle must not touch it again
        sync_module.push_pending(local_db.client, local_db.name, dest_with_unique_invoice.client, dest_with_unique_invoice.name)
        assert local_db["new_transactions"].find_one()["_sync"]["attempts"] == 0

    def test_one_conflict_does_not_block_the_rest(self, sync_module, dest_with_unique_invoice, local_db):
        dest_with_unique_invoice["new_transactions"].insert_one({"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1})
        local_db["new_transactions"].insert_many([
            {"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1, "_sync": self._pending()},
            {"ptuNumber": "DEV-PTU-OTHER", "invoiceNumber": 1, "_sync": self._pending()},
        ])

        sync_module.push_pending(local_db.client, local_db.name, dest_with_unique_invoice.client, dest_with_unique_invoice.name)

        assert dest_with_unique_invoice["new_transactions"].count_documents({"ptuNumber": "DEV-PTU-OTHER"}) == 1
        assert local_db["new_transactions"].count_documents({"_sync.status": "conflict"}) == 1

    def test_conflict_can_be_requeued_after_the_cause_is_fixed(self, sync_module, dest_with_unique_invoice, local_db):
        dest_with_unique_invoice["new_transactions"].insert_one({"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1})
        local_db["new_transactions"].insert_one({"ptuNumber": "DEV-PTU-LOCAL", "invoiceNumber": 1, "_sync": self._pending()})
        sync_module.push_pending(local_db.client, local_db.name, dest_with_unique_invoice.client, dest_with_unique_invoice.name)

        local_db["new_transactions"].update_one({}, {"$set": {"ptuNumber": "DEV-PTU-FIXED", "_sync": self._pending()}})
        sync_module.push_pending(local_db.client, local_db.name, dest_with_unique_invoice.client, dest_with_unique_invoice.name)

        assert dest_with_unique_invoice["new_transactions"].count_documents({"ptuNumber": "DEV-PTU-FIXED"}) == 1
        assert local_db["new_transactions"].find_one()["_sync"]["status"] == "synced"

    def test_verify_reports_conflicts(self, tally, central_db, local_db):
        local_db["new_transactions"].insert_one({"_sync": {"status": "conflict"}})
        assert tally.verify(central_db, local_db, tally.LOOKUPS)["sync_conflicts"] == {"new_transactions": 1}


class TestReset:
    def test_backs_up_then_empties_but_keeps_indexes(self, tally, local_db):
        local_db["new_transactions"].create_index("invoiceNumber", unique=True, name="uq_invoice")
        local_db["new_transactions"].insert_one({"invoiceNumber": 1})
        local_db["counters"].insert_one({"type": "INVOICE_NUMBER", "seq": 1})

        backup_name, removed = tally.reset_database(local_db)
        try:
            assert local_db["new_transactions"].count_documents({}) == 0
            assert local_db["counters"].count_documents({}) == 0
            assert "uq_invoice" in local_db["new_transactions"].index_information()
            assert removed == {"new_transactions": 1, "counters": 1}
            assert local_db.client[backup_name]["new_transactions"].count_documents({}) == 1
        finally:
            local_db.client.drop_database(backup_name)

    def test_pending_uploads_are_reported_so_reset_can_refuse(self, tally, local_db):
        local_db["new_transactions"].insert_one({"_sync": {"status": "pending"}})
        local_db["new_transactions"].insert_one({"_sync": {"status": "conflict"}})
        local_db["new_transactions"].insert_one({"_sync": {"status": "synced"}})
        assert tally.pending_upload_count(local_db) == {"new_transactions": 2}

    def test_nothing_pending_when_everything_synced(self, tally, local_db):
        local_db["new_transactions"].insert_one({"_sync": {"status": "synced"}})
        assert tally.pending_upload_count(local_db) == {}

    def test_fresh_database_can_be_rebootstrapped_from_central(self, tally, central_db, local_db):
        branch_id, _ = _seed_central(central_db)
        _seed_branch_the_old_way(local_db)

        backup_name, _ = tally.reset_database(local_db)
        try:
            tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)
        finally:
            local_db.client.drop_database(backup_name)

        assert [d["_id"] for d in local_db["branches"].find()] == [branch_id]
        assert tally.verify(central_db, local_db, tally.LOOKUPS)["local_only_lookups"] == {}


class TestLocalFixSurvivesMirror:
    """A deliberate local fix to a central-owned record must not be reverted every
    cycle, but a real central edit must still win."""

    def test_local_fix_is_kept_while_central_is_unchanged(self, tally, central_db, local_db):
        pkg_id = central_db["packages"].insert_one({"name": "Full Checkup", "lab_test": []}).inserted_id
        tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)

        local_db["packages"].update_one({"_id": pkg_id}, {"$set": {"lab_test": [{"name": "CBC"}]}})
        tally.mirror_unstamped(central_db, local_db, "packages")

        assert local_db["packages"].find_one({"_id": pkg_id})["lab_test"] == [{"name": "CBC"}]

    def test_central_edit_still_overwrites_the_local_fix(self, tally, central_db, local_db):
        pkg_id = central_db["packages"].insert_one({"name": "Full Checkup", "lab_test": []}).inserted_id
        tally.bootstrap_from_central(central_db, local_db, tally.LOOKUPS)
        local_db["packages"].update_one({"_id": pkg_id}, {"$set": {"lab_test": [{"name": "CBC"}]}})

        central_db["packages"].update_one({"_id": pkg_id}, {"$set": {"name": "Full Checkup v2"}})
        tally.mirror_unstamped(central_db, local_db, "packages")

        doc = local_db["packages"].find_one({"_id": pkg_id})
        assert doc["name"] == "Full Checkup v2" and doc["lab_test"] == []
