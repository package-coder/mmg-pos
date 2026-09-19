"""
Shared shape for the `_sync` outbox field, used by both directions:
- upstream (branch -> central): app/repositories/base.py:BackupRepository
- downstream (central -> branch): app/database/store.py

Kept in one place so the two directions can never silently drift into
incompatible shapes — this repo has already hit that exact failure mode
more than once (the `apis` resource list, the transactions/new_transactions
naming split) with independently-maintained duplicates.
"""
from bson import ObjectId


def pending_sync():
    """A fresh, never-synced `_sync` stamp. `stamp_id` is a new ObjectId on
    every call — sync/app.py's optimistic-concurrency guard depends on two
    independently-created "fresh pending" stamps being distinguishable, and
    every other field here defaults to the same None/0 values regardless of
    when it's called, so without a genuinely unique marker the guard can't
    tell "unchanged since I read it" from "changed to another fresh pending
    stamp" — this was found and fixed via a failing test, not by inspection.
    """
    return {
        "status": "pending",
        "synced_at": None,
        "attempts": 0,
        "last_attempt_at": None,
        "last_error": None,
        "stamp_id": ObjectId(),
    }
