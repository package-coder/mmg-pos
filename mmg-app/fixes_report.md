# Fixes and Changes Report
**Date:** 2026-01-20
**Status:** Completed
**Tested:** Yes (Manual Verification)
**Working:** Yes

## Summary
Implemented "Solo Parent" customer support, allowing the capture of child details (Name, Birthdate, Age) and ID Number.

## Components

### Frontend (`mmg-app` / React)
**Status:** Updated & Verified
**File:** `src/views/pages/CustomerPage/components/CustomerForm.jsx`

*   **Logic Updates:**
    *   Added `solo-parent` to "Customer Type" dropdown.
    *   Implemented Conditional Logic:
        *   If `Solo Parent`, show "Solo Parent ID No.", "Child Name", "Child Birthdate", "Child Age".
    *   **Validation Fix:** Updated `Yup` validation schema to use v1.0+ syntax (`(schema) => schema.required()`) to fix "branch is not a function" error.
    *   **Auto-Calculation:** Added logic to auto-calculate "Child Age" from "Child Birthdate".
    *   **UX Improvement:** Form now correctly closes/navigates back to the dashboard immediately upon successful creation/update.

### Backend (`pos-api` / Flask)
**Status:** Updated & Verified
**Files:** `app/routes/customers/create.py`, `app/routes/customers/update.py`, `app/database/store.py`

*   **API Updates:**
    *   Updated `create` and `update` endpoints to accept and save:
        *   `child_name`
        *   `child_birth_date`
        *   `child_age`
*   **Bug Fix:**
    *   Fixed `DuplicateKeyError` (500 Internal Server Error) in `app/database/store.py` caused by the backup database insertion logic when running in `internal-production` mode (where primary and backup DBs were identical). Added error handling to gracefully ignore duplicate key errors during backup.

### Helper App (`pos-helper-app`)
**Status:** No Changes Required
*   This feature was isolated to the main POS application (Frontend & Backend) and did not require changes to the helper application.

## Verification
*   **Manual Test:** Confirmed that a new "Solo Parent" customer can be created with all child fields.
*   **Error Check:** Confirmed that the "branch is not a function" error is resolved.
*   **Database Check:** Confirmed that data is persisting to the backend without 500 errors.
