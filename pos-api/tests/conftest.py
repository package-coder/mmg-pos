"""
Shared fixtures for the sync test suite.

Tests run against real MongoDB — local (this machine's branch stack, port
8003) and the real UAT server (3.34.76.195:8003) — not mongomock, because
BackupRepository/sync's actual failure modes (transaction semantics on a
standalone instance, real network unreachability) don't reproduce
faithfully against an in-memory fake. Every test gets its own uniquely
named, disposable database (never the real `pos` database) that's dropped
automatically in teardown, whether the test passes or fails.
"""
import importlib.util
import os
import uuid

import pymongo
import pytest

LOCAL_MONGO_URL = os.getenv("TEST_LOCAL_MONGO_URL", "mongodb://localhost:8003")
REMOTE_MONGO_URL = os.getenv("TEST_REMOTE_MONGO_URL", "mongodb://3.34.76.195:8003")

SYNC_APP_PATH = os.path.join(os.path.dirname(__file__), "..", "sync", "app.py")


@pytest.fixture(scope="session")
def sync_module():
    """Imports sync/app.py as a module. Safe now that the scheduler loop is
    guarded behind `if __name__ == '__main__'` — importing no longer runs
    an infinite loop."""
    spec = importlib.util.spec_from_file_location("sync_app", SYNC_APP_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def local_client():
    client = pymongo.MongoClient(LOCAL_MONGO_URL, serverSelectionTimeoutMS=5000)
    yield client
    client.close()


@pytest.fixture
def remote_client():
    client = pymongo.MongoClient(REMOTE_MONGO_URL, serverSelectionTimeoutMS=5000)
    yield client
    client.close()


def _disposable_db_name():
    return f"claude_test_{uuid.uuid4().hex[:12]}"


@pytest.fixture
def local_db(local_client):
    name = _disposable_db_name()
    db = local_client[name]
    yield db
    local_client.drop_database(name)


@pytest.fixture
def remote_db(remote_client):
    """A disposable database on the REAL UAT server — never the real `pos`
    database. Dropped automatically after the test, pass or fail."""
    name = _disposable_db_name()
    db = remote_client[name]
    yield db
    remote_client.drop_database(name)


@pytest.fixture
def unreachable_client():
    """A MongoClient pointed at a non-routable address — genuinely
    unreachable, not just a wrong port, with a short timeout so tests fail
    fast instead of hanging."""
    client = pymongo.MongoClient("mongodb://10.255.255.1:27017", serverSelectionTimeoutMS=2000)
    yield client
    client.close()
