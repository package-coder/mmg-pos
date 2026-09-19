"""
Downstream sync (central -> branch) reliability tests.

The critical property here is different from upstream: downstream is
one-to-many (one central instance, potentially many branches), so it must
NOT use a shared pending/synced flag on the source document — the first
branch to pull would mark it synced and every other branch would silently
never receive it. Each branch tracks its own watermark locally instead.
"""
import datetime

import pytest
from bson import ObjectId


def pending_sync():
    return {
        "status": "pending",
        "synced_at": None,
        "attempts": 0,
        "last_attempt_at": None,
        "last_error": None,
        "stamp_id": ObjectId(),
    }


@pytest.fixture
def branch_b_db(local_client):
    """A second, independent 'branch' local database, to prove fan-out
    correctness — pulling from the same central source as `local_db`."""
    import uuid
    name = f"claude_test_{uuid.uuid4().hex[:12]}"
    db = local_client[name]
    yield db
    local_client.drop_database(name)


class TestFanOut:
    def test_two_branches_both_receive_the_same_update(self, sync_module, remote_db, local_db, branch_b_db, monkeypatch):
        """The property that would have broken with a naive pending/synced
        reuse: TWO branches pulling from the same central source must both
        get the update — not just whichever one pulls first."""
        monkeypatch.setattr(sync_module, "lookups", ["packages"])

        remote_db["packages"].insert_one({"name": "Annual Checkup", "_sync": pending_sync()})

        remote_client = remote_db.client
        branch_a_client = local_db.client
        branch_b_client = branch_b_db.client

        # Branch A pulls first.
        sync_module.pull_pending(remote_client, remote_db.name, branch_a_client, local_db.name)
        assert local_db["packages"].find_one({"name": "Annual Checkup"}) is not None

        # Branch B pulls afterward, independently — must ALSO receive it.
        # (This is exactly what a shared synced-flag on the source would break.)
        sync_module.pull_pending(remote_client, remote_db.name, branch_b_client, branch_b_db.name)
        assert branch_b_db["packages"].find_one({"name": "Annual Checkup"}) is not None

        # The central document itself must be untouched — downstream never
        # mutates the source, unlike upstream's mark-as-synced.
        central_doc = remote_db["packages"].find_one({"name": "Annual Checkup"})
        assert central_doc["_sync"]["status"] == "pending"

    def test_watermark_advances_so_a_branch_does_not_repull_old_data(self, sync_module, remote_db, local_db, monkeypatch):
        """Once a branch has pulled a doc, the next cycle shouldn't
        re-fetch it — the local watermark should have advanced."""
        monkeypatch.setattr(sync_module, "lookups", ["packages"])
        remote_client = remote_db.client
        local_client = local_db.client

        remote_db["packages"].insert_one({"name": "Package A", "_sync": pending_sync()})
        sync_module.pull_pending(remote_client, remote_db.name, local_client, local_db.name)

        watermark = local_db["sync_meta"].find_one({"_id": "downstream_watermark_packages"})
        assert watermark is not None
        assert watermark["last_stamp_id"] is not None

        # A second, NEWER doc appears centrally.
        remote_db["packages"].insert_one({"name": "Package B", "_sync": pending_sync()})
        sync_module.pull_pending(remote_client, remote_db.name, local_client, local_db.name)

        assert local_db["packages"].count_documents({}) == 2
        new_watermark = local_db["sync_meta"].find_one({"_id": "downstream_watermark_packages"})
        assert new_watermark["last_stamp_id"] > watermark["last_stamp_id"]

    def test_central_edit_after_initial_pull_is_still_picked_up(self, sync_module, remote_db, local_db, monkeypatch):
        """An edit to an already-pulled document (fresh _sync.stamp_id from
        store.py's update_one) must be picked up on the next cycle, not
        skipped because the document itself already exists locally."""
        monkeypatch.setattr(sync_module, "lookups", ["packages"])
        remote_client = remote_db.client
        local_client = local_db.client

        doc_id = remote_db["packages"].insert_one({"name": "Original Name", "_sync": pending_sync()}).inserted_id
        sync_module.pull_pending(remote_client, remote_db.name, local_client, local_db.name)
        assert local_db["packages"].find_one({"_id": doc_id})["name"] == "Original Name"

        # Central edits it (a fresh stamp_id, as store.py's update_one produces).
        remote_db["packages"].update_one({"_id": doc_id}, {"$set": {"name": "Renamed", "_sync": pending_sync()}})
        sync_module.pull_pending(remote_client, remote_db.name, local_client, local_db.name)

        assert local_db["packages"].find_one({"_id": doc_id})["name"] == "Renamed"
