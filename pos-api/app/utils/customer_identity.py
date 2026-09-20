"""Re-exports sync/customer_identity.py so the API and the sync service share ONE definition of
"the same customer". That file lives in sync/ because the sync container image contains only
that folder. APPEND to sys.path, never insert: sync/ has an app.py that would shadow this
package."""
import os
import sys

_SYNC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'sync')
if _SYNC_DIR not in sys.path:
    sys.path.append(_SYNC_DIR)

from customer_identity import identity_key, identity_key_from_fields  # noqa: E402,F401

# create.py calls this name with the snake_case document it is about to insert.
customer_identity_key = identity_key
