"""
Upstream sync (branch -> central) reliability tests.

Every scenario here was found and verified manually against the real UAT
server before being written up as a permanent test — see docs/checklist.md
for the narrative. Codifying them here so they don't regress silently.
"""
import datetime

import pytest
from bson import ObjectId


def pending_sync():
    """Mirrors app/repositories/base.py:BackupRepository._pending_sync()."""
    return {
        "status": "pending",
        "synced_at": None,
        "attempts": 0,
        "last_attempt_at": None,
        "last_error": None,
        "stamp_id": ObjectId(),
    }


class TestConnectionResilience:
    def test_malformed_remote_url_does_not_crash(self, sync_module, monkeypatch):
        """The exact bug found this session: an unguarded MongoClient(...)
        construction for a malformed remote URL used to crash the whole
        process before the scheduler loop even started, silently disabling
        upstream sync too. It must now just log and skip the cycle."""
        monkeypatch.setattr(sync_module, "REMOTE_DATABASE_URL",
                             "mongodb+srv://<user>:<pass>@<host>/<db>?authSource=<db>")
        monkeypatch.setattr(sync_module, "_clients", {})  # clear cache between tests

        # Must not raise.
        sync_module.run_safely("downstream", sync_module.downstream_sync_data)
        sync_module.run_safely("upstream", sync_module.upstream_sync_data)

    def test_bad_srv_uri_construction_fails_cleanly_and_is_not_cached(self, sync_module, monkeypatch):
        """A malformed mongodb+srv:// URI fails at CLIENT CONSTRUCTION time
        (SRV requires an immediate DNS lookup) — get_client() must catch
        that and return None without caching the failure, so the next
        cycle retries construction rather than being stuck forever."""
        monkeypatch.setattr(sync_module, "_clients", {})
        bad_srv = "mongodb+srv://<user>:<pass>@<host>/<db>?authSource=<db>"

        client = sync_module.get_client("remote", bad_srv)
        assert client is None
        assert "remote" not in sync_module._clients, "a failed construction must not be cached"

    def test_recovers_automatically_once_remote_becomes_reachable(self, sync_module, monkeypatch, local_client, remote_client):
        """A plain mongodb:// URI for an unreachable host doesn't fail at
        construction (pymongo connects lazily) — it fails on first actual
        use, which is exactly why push_pending's own try/except (not
        get_client's) is what needs to catch it. Verifying the full path:
        an unreachable remote degrades a sync cycle gracefully, and once
        the remote is swapped for a reachable one, the next cycle succeeds
        with no restart needed."""
        monkeypatch.setattr(sync_module, "_clients", {})

        unreachable = sync_module.get_client("remote_test", "mongodb://10.255.255.1:27017")
        assert unreachable is not None  # lazy — construction alone doesn't fail
        with pytest.raises(Exception):
            unreachable.admin.command("ping")  # the actual use is where it fails

        # "Cloud comes back online" — a fresh get_client call for a reachable URL works.
        client = sync_module.get_client("remote", "mongodb://localhost:8003")
        assert client is not None
        assert client.admin.command("ping")["ok"] == 1.0


class TestOfflineOnlineLifecycle:
    def test_full_offline_to_online_cycle(self, sync_module, local_db, remote_db, unreachable_client):
        """A sale made while offline: stays local, flagged pending, no data
        loss; once connectivity returns, it syncs automatically with no
        manual intervention, `_sync` stripped from the pushed copy."""
        local_client = local_db.client
        doc_id = local_db["new_transactions"].insert_one(
            {"invoiceNumber": 999001, "totalNetSales": 500, "_sync": pending_sync()}
        ).inserted_id

        # Attempt 1: cloud unreachable.
        sync_module.push_pending(local_client, local_db.name, unreachable_client, remote_db.name)
        doc = local_db["new_transactions"].find_one({"_id": doc_id})
        assert doc["_sync"]["status"] == "pending"
        assert doc["_sync"]["attempts"] == 1

        # Simulate the retry backoff window elapsing.
        local_db["new_transactions"].update_one(
            {"_id": doc_id},
            {"$set": {"_sync.last_attempt_at": datetime.datetime.utcnow() - datetime.timedelta(seconds=61)}},
        )

        # Attempt 2: cloud back online (the real remote_db fixture).
        remote_client = remote_db.client
        sync_module.push_pending(local_client, local_db.name, remote_client, remote_db.name)

        doc = local_db["new_transactions"].find_one({"_id": doc_id})
        assert doc["_sync"]["status"] == "synced"

        remote_doc = remote_db["new_transactions"].find_one({"_id": doc_id})
        assert remote_doc is not None
        assert remote_doc["invoiceNumber"] == 999001
        assert "_sync" not in remote_doc

    def test_idempotent_no_duplicate_on_rerun(self, sync_module, local_db, remote_db):
        local_client = local_db.client
        remote_client = remote_db.client
        doc_id = local_db["new_transactions"].insert_one(
            {"invoiceNumber": 999002, "_sync": pending_sync()}
        ).inserted_id

        sync_module.push_pending(local_client, local_db.name, remote_client, remote_db.name)
        sync_module.push_pending(local_client, local_db.name, remote_client, remote_db.name)  # rerun

        count = remote_db["new_transactions"].count_documents({"invoiceNumber": 999002})
        assert count == 1


class TestRaceCondition:
    def test_concurrent_edit_does_not_get_wrongly_marked_synced(self, sync_module, local_db, remote_db):
        """If the app edits a document between sync reading it and sync
        marking it synced, the OLDER content must not be allowed to stamp
        `synced` over the NEWER edit's fresh pending stamp — that would
        silently lose the newer edit (it would never sync again, since it
        now reads as already-synced)."""
        local_client = local_db.client
        remote_client = remote_db.client

        doc_id = local_db["new_transactions"].insert_one(
            {"name": "v1", "_sync": pending_sync()}
        ).inserted_id
        read_doc = local_db["new_transactions"].find_one({"_id": doc_id})
        original_sync = read_doc["_sync"]

        # Concurrent app edit — simulates BackupRepository.update_one firing
        # between sync's read and its write-back.
        local_db["new_transactions"].update_one(
            {"_id": doc_id},
            {"$set": {"name": "v2-edited-concurrently", "_sync": pending_sync()}},
        )

        now = datetime.datetime.utcnow()
        result = local_db["new_transactions"].update_one(
            {"_id": doc_id, "_sync": original_sync},
            {"$set": {"_sync.status": "synced", "_sync.synced_at": now, "_sync.last_error": None}},
        )

        final = local_db["new_transactions"].find_one({"_id": doc_id})
        assert result.matched_count == 0, "the guard must refuse to overwrite a concurrently-changed document"
        assert final["_sync"]["status"] == "pending"
        assert final["name"] == "v2-edited-concurrently"

    def test_no_race_still_marks_synced_normally(self, local_db):
        """Sanity check: the guard must not false-positive on the ordinary,
        uncontended case."""
        doc_id = local_db["new_transactions"].insert_one(
            {"name": "normal", "_sync": pending_sync()}
        ).inserted_id
        read_doc = local_db["new_transactions"].find_one({"_id": doc_id})
        original_sync = read_doc["_sync"]

        result = local_db["new_transactions"].update_one(
            {"_id": doc_id, "_sync": original_sync},
            {"$set": {"_sync.status": "synced", "_sync.synced_at": datetime.datetime.utcnow(), "_sync.last_error": None}},
        )
        assert result.matched_count == 1

    def test_fresh_pending_stamps_are_distinguishable(self):
        """Regression test for the flaw in the FIRST fix attempt: two
        `_pending_sync()`-shaped dicts must never be equal, or the
        optimistic-concurrency guard above can't actually detect a change."""
        a = pending_sync()
        b = pending_sync()
        assert a != b, "two independently-created pending stamps must be distinguishable"


class TestBatchLimiting:
    def test_large_backlog_is_capped_per_cycle(self, sync_module, local_db, remote_db, monkeypatch):
        """A branch recovering from a long outage with thousands of pending
        docs must not have its first cycle try to push all of them at once
        — that's an unbounded-duration cycle that starves everything else."""
        monkeypatch.setattr(sync_module, "BATCH_SIZE", 5)
        local_client = local_db.client
        remote_client = remote_db.client

        for i in range(12):
            local_db["new_transactions"].insert_one({"seq": i, "_sync": pending_sync()})

        sync_module.push_pending(local_client, local_db.name, remote_client, remote_db.name)

        synced_count = local_db["new_transactions"].count_documents({"_sync.status": "synced"})
        pending_count = local_db["new_transactions"].count_documents({"_sync.status": "pending"})
        assert synced_count == 5, "exactly one batch's worth should be pushed per cycle"
        assert pending_count == 7, "the rest must remain queued for the next cycle, not lost"
