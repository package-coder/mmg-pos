# MMG POS — Working Checklist

Tracks everything found/built/pending across UAT setup, sync rebuild, and
backend hardening. Update checkboxes as items close; add a one-line note
when something is blocked or needs a decision.

## UAT Deployment

- [x] EC2 instance (`mmg-pos-uat`), Elastic IP `3.34.76.195`, security group
      restricted to known IPs
- [x] `docker-compose.uat.yml` — admin instance, `VITE_ROLE=admin`, no `proxy`
      service (pass-through to `server` directly, port 8001)
- [x] `scripts/deploy-uat.sh` (build on box) and
      `scripts/deploy-uat-build-local.sh` (build locally, push, pull) both
      working end to end
- [x] `docs/uat-deployment.md` walkthrough, kept in sync with EC2 (not
      Lightsail — moved after a Lightsail instance became unresponsive with
      no recovery path)
- [x] Frontend role-based routing: `PosGuard` hides POS routes on
      `VITE_ROLE=admin`; `AdminOnlyRoute` hides master-data routes
      (users/roles/branches/doctors/corporates/packages/labtest/discounts)
      on branch deployments
- [ ] Local branch machine's `sync` verified actually reaching UAT's Mongo
      end-to-end (pointed at it via `REMOTE_DATABASE_URL`, not yet confirmed
      with a real round-trip test)

## Timezone

- [x] Root cause found: 40+ frontend `moment()` calls had no explicit
      timezone, defaulting to the *viewer's browser* timezone instead of the
      business's — backend and `pos-helper-app` were already correct
      (explicit `pytz.timezone('Asia/Manila')` everywhere)
- [x] Fixed with one global default: `moment.tz.setDefault('Asia/Manila')`
      in `mmg-app/src/index.jsx`, covers every existing call site with no
      per-file changes needed

## Sync Rebuild (Outbox Pattern)

- [x] `_sync: {status, synced_at, attempts, last_attempt_at, last_error}`
      now stamped on every write through `BackupRepository` (previously 0%
      implemented despite being documented)
- [x] `sync/app.py` upstream half rewritten: queries `_sync.status: pending`
      instead of blindly mirroring whole collections, idempotent
      (upsert-by-`_id`), retries failures with 60s backoff, writes a
      `sync_meta` doc per run for observability
- [x] **Crash-on-unreachable-remote bug found and fixed, verified live.**
      `pymongo.MongoClient(REMOTE_DATABASE_URL)` was called unguarded at the
      top of `downstream_sync_data()`/`upstream_sync_data()`. A malformed or
      unreachable remote (e.g. the placeholder `mongodb+srv://` URL every
      fresh branch ships with) crashed the whole process — and since
      `downstream_sync_data()` ran once, unconditionally, *before* the
      scheduler loop even started, this meant **upstream sync never got a
      chance to run either**, even though it doesn't depend on the remote
      being valid at connection-construction time. Fixed: MongoDB clients
      are now built once, lazily, and cached (`get_client`); a construction
      failure is logged and retried next cycle instead of crashing. Every
      scheduled job now also runs through `run_safely()`, so nothing a job
      does can kill the `while True` loop. Verified directly: replayed the
      exact bad placeholder URL that crashed it before — now logs and skips
      cleanly; confirmed automatic recovery (no restart needed) once the
      URL becomes valid again.
- [x] **Race condition found and fixed via testing, verified against the
      real UAT server.** If the app edits a document (via
      `BackupRepository.update_one`, which resets `_sync` to a fresh
      pending stamp) in the window between sync reading it as pending and
      sync marking it `synced`, the old code would stomp the fresh stamp
      with `synced` — silently losing the newer edit (it would never sync,
      since it now read as already-synced). Fixed with an optimistic-
      concurrency guard: the mark-synced write is now conditioned on `_sync`
      still exactly matching what was read. First fix attempt was
      insufficient and caught by testing before being called done: a fresh
      `_pending_sync()` stamp is structurally identical to any other fresh
      stamp (same `status`/`None`/`0` defaults), so an exact-match guard
      needs a genuinely unique marker to detect "did this change" — added
      `_sync.stamp_id` (a fresh ObjectId per stamp) to make the guard
      actually work. Verified against real UAT Mongo: a concurrent edit
      correctly leaves the doc `pending` (picked up correctly next cycle)
      instead of being wrongly marked `synced`; the normal no-race case
      still marks `synced` correctly.
- [x] **End-to-end offline→online cycle verified against the real UAT
      server**: created a "sale" while pointed at a genuinely unreachable
      remote → confirmed it stays local, flagged pending, attempt counted,
      no crash → simulated connectivity returning (pointed at
      `3.34.76.195`) → confirmed automatic sync with no manual restart,
      `_sync` metadata correctly stripped from the pushed copy, and a
      second run produces no duplicate.
- [x] Partial index on `_sync.status`/`_sync.last_attempt_at` added for the
      six affected collections
- [x] **Downstream sync rebuilt — but deliberately NOT the same pattern as
      upstream.** Upstream is one branch → one central, so "mark synced
      after pushing" is correct. Downstream is one central → potentially
      MANY branches — reusing the pending/synced flag would have meant the
      first branch to pull an update marks it `synced` centrally, and every
      OTHER branch would then see it as already-synced and silently never
      receive it. Caught this during design, before writing code, not via a
      failing test. Fixed: each branch now tracks its own watermark locally
      (`sync_meta._id: downstream_watermark_<collection>`, storing the
      newest `_sync.stamp_id` pulled) and the source is never mutated.
      `_sync` stamping added to `store.py:insert_one` (existing choke
      point) and a new `store.py:update_one` helper, with all ~10 route
      files (packages/discounts/users/doctors/corporates/roles/products/
      product_categories/customers/branches) migrated to it — the shared
      `_sync` shape itself lives in one place now (`app/utils/sync.py`)
      so upstream and downstream can't silently drift into incompatible
      shapes, which is exactly how two earlier bugs this session happened.
- [x] Upstream end-to-end offline→online reliability verified against the
      real UAT server (see "Bugs Found This Session" for detail) — no data
      loss, no duplication, automatic recovery, race condition covered
- [x] Downstream fan-out correctness verified with a real test: two
      independent local databases both pulling from the same central test
      database both receive the same update; the central document is
      confirmed untouched (still `pending` — proving downstream never
      mutates the source); an edit to an already-pulled document is
      correctly picked up on a later cycle via its fresh `stamp_id`.
- [x] Volume safety: added `BATCH_SIZE = 200` cap on docs-per-cycle for
      upstream push — a branch recovering from a long outage with a large
      backlog now drains it over several cycles instead of one
      unbounded-duration cycle. Verified with a test asserting a 12-doc
      backlog against `BATCH_SIZE=5` processes exactly 5 per cycle, leaves
      7 correctly queued.
- [x] Index added for downstream's query shape too: `_sync.stamp_id`
      (non-partial, since downstream has no per-doc status field) on all
      eleven lookup collections.

## Bugs Found This Session

- [x] **CLEANED UP (not a crash bug — corrected after live testing)** —
      `BackupRepository.insert_one` wrapped every write in
      `start_session()`/`start_transaction()`, but never passed `session=`
      to the actual `insert_one()` call, so the write was never really
      associated with the transaction. Initially misdiagnosed this as a
      showstopper (standalone MongoDB rejects real transactions), but
      verified directly against UAT's live Mongo that the *exact* original
      code succeeds — the transaction was empty/no-op, so it never actually
      threw in production. Still simplified it to match the honest,
      already-working pattern in `app/database/store.py:insert_one`
      (primary write always happens, backup write is best-effort) since the
      old code provided zero real atomicity despite looking like it did —
      a clarity fix, not an emergency one.
- [ ] **Unresolved — invoice numbering is not scoped correctly.** Invoice
      numbers are generated via `_get_next_sequence({"type":
      "INVOICE_NUMBER", "cashierId": user_id})` — scoped by **cashier**, not
      by physical terminal. If two cashiers rotate shifts on the same
      BIR-registered terminal, their invoice sequences interleave instead of
      being one continuous sequence, which is what BIR requires
      (sequential, non-resettable, per terminal). Root blocker: the backend
      receives **no terminal/machine identifier at all** in the transaction
      payload today (`MIN`/`SN`/`PTU` live only in `pos-helper-app`'s local
      `config.json`, never sent to `pos-api`). Needs a decision: add a
      terminal-id field to the transaction payload and re-scope the counter
      by it, or scope by `branchId` as a lesser fix if a branch never has
      more than one physical terminal (unconfirmed assumption — don't pick
      this silently).
- [x] **RESOLVED — mixed timestamp storage does NOT cause a display bug,
      verified with the real library.** Earlier flagged a concern: fields
      like `users.created_at`/`products.created_at`/`doctors.created_at`
      are stored as native BSON datetimes (via plain `getLocalTime()`, not
      `getLocalTimeStr()`), which pymongo normalizes to naive UTC — feared
      this would be misinterpreted as already-Manila-time by
      `moment.tz.setDefault('Asia/Manila')`. Checked what actually reaches
      the frontend: Flask's default JSON encoder formats a raw datetime as
      an RFC 1123 string with an explicit **"GMT"** suffix (confirmed live:
      `/users` returns `"createdAt":"Sat, 19 Sep 2026 15:05:43 GMT"`), which
      is an unambiguous, standard timezone marker. Verified with the actual
      `moment-timezone` package (not just reasoning about it) that
      `moment('...GMT')` under `setDefault('Asia/Manila')` converts and
      displays it correctly. No fix needed — the theoretical risk doesn't
      materialize given how Flask actually serializes these fields.
- [x] **FIXED** — `/v3/transactions` 500s when `discounts` is omitted from
      the request body: `model.discounts` defaults to `None`, and
      `list(map(..., model.discounts))` crashes on `None` instead of `[]`.
      Confirmed via a live request against UAT.
- [ ] Minor — `/customer/create`'s `request_validator` requires `middleName`
      even though the route handler treats it as optional
      (`request_data.get('middleName')`); low priority, just noting it since
      it surfaced during testing.
- [ ] Minor — Pydantic validation errors on `/v3/transactions` return HTTP
      500 instead of 400; a client-input mistake shouldn't read as a server
      fault.
- [ ] Dual transaction-creation paths confirmed intentional, not a bug:
      `/transaction/create` → legacy `transactions` collection (on-hold/
      draft carts) vs. `/v3/transactions` → `TransactionRepository` →
      `new_transactions` (finalized sales). No action needed, documented
      here so it isn't re-investigated from scratch later.

## Security — Server-Side Authorization

- [ ] **No server-side role/permission enforcement exists anywhere.** Any
      valid JWT can hit any endpoint regardless of role — create/edit
      users, roles, discounts; cancel/refund transactions; read audit logs.
      `app/middlewares/authorization_validator.py` exists but is dead code
      (imported, never called), and its logic is buggy even if wired up
      (substring path match, ignores HTTP method entirely).
- [ ] `roles.authorizations` field has **three incompatible shapes** across
      the codebase today (seeder: dict-of-arrays; create/update endpoints:
      accept anything unvalidated; dead validator: list-of-dicts) — need to
      pick one canonical shape before building real enforcement.
- [ ] The `apis` resource list (`app/routes/roles/read_resources.py`) is
      incomplete — missing `/roles` itself, `/discount*`, audit logs,
      reports, and the whole `cas_app` accounting sub-app. Plan: derive the
      resource list from Flask's `url_map` instead of hand-maintaining a
      second list that drifts (this is the third time this session a
      hand-maintained duplicate list has silently gone stale).
- [ ] `user.role` (ObjectId reference into `roles`) is never validated to
      actually exist at registration time.
- [ ] Frontend `Role.js` hardcoded enum (`ADMIN`/`CASHIER`/`MANAGER`) is
      disconnected from actual seeded role names (`admin`/`cashier`,
      lowercase) and from the `authorizations` payload already returned at
      login — separate follow-up, not blocking the backend work.

## Testing

- [x] Permanent pytest suite at `pos-api/tests/` (12 tests, all passing) —
      not throwaway scripts. Runs against real MongoDB (local port 8003 +
      the real UAT server) rather than `mongomock`, because the actual
      failure modes tested (standalone-Mongo transaction semantics, real
      network unreachability) don't reproduce faithfully against an
      in-memory fake. Every test gets a uniquely-named disposable database,
      auto-dropped in teardown whether the test passes or fails — verified
      empirically that no test data is left behind on either local or UAT
      after a full run.
  - `tests/test_upstream_sync.py` — connection resilience (malformed/
    unreachable remote doesn't crash, recovers automatically), full
    offline→online lifecycle, idempotency, the race-condition guard (and a
    regression test for the flaw found in the first fix attempt), batch
    limiting
  - `tests/test_downstream_sync.py` — fan-out correctness (two branches
    both receive the same central update), watermark advancement, edits to
    already-pulled documents being picked up
  - `sync/app.py`'s scheduler loop is now guarded behind
    `if __name__ == '__main__'` specifically so it can be imported by tests
    without triggering the infinite loop — a small structural fix, correct
    regardless of testing
- [x] Retry/backoff under unreachable remote — tested
- [x] Idempotency — tested, both directions
- [x] Timezone consistency — investigated and resolved (see "Bugs Found
      This Session"); not a dedicated automated test since it turned out to
      depend on Flask's serialization format, not a Python-side check
- [ ] Invoice number uniqueness per machine/terminal — still blocked on the
      terminal-vs-branch scoping decision, not yet tested or fixed
- [ ] Basic speed/throughput benchmark for the sync push loop — not done;
      batch limiting was addressed instead (arguably the more important
      volume-safety property), but no raw throughput numbers measured

## Live UAT Test Data (flagged, needs cleanup before real use)

Created directly on `http://3.34.76.195` per instruction to test against the
real cloud server, with every record clearly flagged so it's identifiable:

- [ ] Customer `CLAUDE-TEST SAFE-TO-DELETE` (`_id: 6aaece4eb816ac9a8ad562d2`,
      address `TEST-DO-NOT-USE`) — delete before any real UAT walkthrough
- [ ] Several `audit_logs` entries from repeated test logins as `admin`
      (harmless, but noisy — fine to leave or clear)
- [x] `pos_test_probe` and all `claude_test_*` databases from the sync
      testing pass — confirmed dropped from both UAT and local; the pytest
      suite's fixtures now do this automatically going forward
- [ ] Transaction creation test was not completed — got as far as fixing the
      `discounts: None` crash, ran out of turn budget before creating an
      actual flagged test transaction to check invoice-number scoping
      end-to-end. **Invoice number scoping is still unverified live** —
      only reasoned about from reading the code.

## Notes on Scope Widening (not problems, just worth knowing)

- `store.py:insert_one`'s new `_sync` stamping applies to every collection
  routed through it — which turns out to be broader than just the ~10
  lookup collections: it also covers `transactions` (legacy on-hold carts),
  `sales`, `sales_deposits`, and the entire `cas_app` accounting sub-app
  (receipts, journal entries, payments, invoices, etc.). Harmless (pure
  addition, nothing reads `_sync` on those collections yet), but worth
  knowing it's not scoped as narrowly as originally planned.
- `app/database/config.py` connects to MongoDB and calls `ensure_indexes()`
  as a module-level side effect on import — makes anything that imports
  `app.database` hard to unit test in isolation (had to import
  `app/database/indexes.py` directly by file path to test it standalone).
  Not fixed — real architectural smell, but out of scope for this pass.

## Deferred / Not Started

- [ ] Centralized report generation (parallel branch reports + scheduled
      rollup job on the UAT/admin instance) — blocked on downstream sync
      being trustworthy first, per earlier sequencing decision
- [ ] Supervisor-override / step-up auth for post-print voids and discount
      overrides (BIR accreditation consideration)
- [ ] Real GitHub Actions CI/CD (currently manual SSH deploy scripts, which
      work but aren't the "planned CI/CD" CLAUDE.md originally noted)
- [ ] Confirm `chrisn0tdev/*` Docker Hub repos are set to **private**
- [ ] Move print/display logic off `proxy` so branches can eventually
      retire that service too (UAT already did, via the direct-to-`server`
      change)
