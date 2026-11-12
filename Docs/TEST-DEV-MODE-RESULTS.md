# CECBS Dev-Mode End-to-End Test — Results

**Run:** DEV1325 · **Date:** 2026-11-09 (EAT) · **Branch:** `fix/auth-chaincode-audit`
**Code tested:** HEAD `aa0947f` ("Fix the 6 warnings from the manual Docker test run")
**plus uncommitted edits** in progress during the run (see §5 — another agent was
editing `contracts/customs/ecx/nbe/payments/permits/phytosanitary/portals/quality/
shipments.ts`, `customsService/forexService/postDeliveryWorkflowService.ts`,
`statusManager.ts`, `chaincodes/coffee/{banking,payment}.go`, UI portal components,
and a new untracked migration `058_fix_status_defaults.sql`).
**API:** dev server (`npm run dev`, ts-node-dev) on http://localhost:3005,
`NODE_ENV=development`, `FABRIC_REQUIRED=false` · **Health:** healthy,
`database: true`, `blockchain: false` (no Fabric, no Docker, no CouchDB, no IPFS,
no SMTP on this machine) · **DB:** fresh PostgreSQL 16.15, 46 migrations applied
**Test users:** `test_<role>_TMW977G36` (8 roles + suspended), recreated with new
bcrypt hashes; shared test password only in `/tmp/cecbs-test-users.txt` (chmod 600).
Entities used: application `APP-1794230732205-7KCUTL` (+ `APP-1794230756457-OMT2E3`),
contract `CTR-DEV1325`, LC `LC-DEV1325`, forex `FOREX-DEV1325`,
shipment `SHP-DEV1325` (+ `SHP-DEV1325-B`), declaration `DECL-DEV1325`
(+ `DECL-DEV1325-B`), booking `BOOK-1794231047240`, document
`DOC-1794231261909553295`.

**Verdict rules:** PASS = behaved as specified. FAIL = the API itself is wrong
with the API running (wrong status, missing route, missing field, 500 from bad
code/schema, phantom success). BLOCKED = the step needs Fabric, CouchDB, IPFS or
SMTP absent on this machine — the exact error is recorded; not a failure of the
API code. INVALID-TEST = a harness mistake (wrong body/id/slug); every one was
re-tested correctly in the follow-ups and the corrected verdict is shown.

## Summary counts

| Scope | Attempted | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| Logins (8 roles) | 8 | 8 | 0 | 0 |
| Workflow steps 01–71 (+23b) | 72 | 48 | 1 | 23 |
| Extra guard checks (follow-ups) | 4 | 4 | 0 | 0 |
| **Total** | **84** | **60** | **1** | **23** |

**Headline:** dev mode runs the same shape as the earlier live run (TMW977G36):
everything that needs the chain is BLOCKED, and the contract create writes no PG
row so the downstream chain is a cascade. What works without Fabric: licence
application submit/check/reject/resubmit, shipment create (degraded 202),
shipping bookings + lifecycle, customs submit/review/inspect/clear (PG paths),
NBE forex approve + repatriation (PG paths, `blockchainSynced: false`),
post-delivery once a tracking row exists, document upload/list/download,
retention-policy fallback, status endpoints, all portal dashboards.
**One new real bug found:** the post-delivery `record*` endpoints return 200
when no tracking row exists (silent no-op UPDATE, no row-count check) — a
phantom success of the same class fixed in `d534a6b` (§3.1). Document signing
is honestly blocked in dev mode (503, Fabric needed to confirm the hash).

## 1. Results by phase

### Phase A — Logins

| Check | Endpoint | HTTP | Verdict |
|---|---|---|---|
| Login ADMIN/ECTA/ECX/NBE/BANKS/CUSTOMS/SHIPPING/EXPORTER | `POST /auth/login` | 200 | **PASS** (8/8, token issued per role) |

### Phase 1 — Licence application

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 01 Submit application (public) | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794230732205-7KCUTL`, status pending |
| 02 Check-by-email (status fields only) | `GET /exporters/exporter-applications/check/:email` | public | 200 | **PASS** | status fields only, no leak |
| 04 Approve as ECTA | `POST /exporters/exporter-applications/:id/approve` | ECTA | 400 | **BLOCKED** | `BLOCKCHAIN_ERROR: Not connected to Fabric network` |
| 05 Submit second application | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794230756457-OMT2E3` |
| 06 Reject second application as ECTA | `POST /exporters/exporter-applications/:id/reject` | ECTA | 200 | **PASS** | status rejected — `d534a6b` fix verified live |
| 07 Reject as EXPORTER (must fail 403) | `POST /exporters/exporter-applications/:id/reject` | EXPORTER | 403 | **PASS** | role guard works |
| 08 Applicant login (temp password set in PG as test setup; SMTP unconfigured so the emailed temp password is unobtainable) | `POST /auth/applicant/login` | APPLICANT | 200 | **PASS** | applicant token issued, `applicationId: 2` |
| 09 Resubmit as applicant | `POST /exporters/exporter-applications/2/resubmit` | APPLICANT | 200 | **PASS** | resubmitted, status pending — `d534a6b` fix verified. NOTE: the first attempt used the `APP-…` string id and got 403, then a missing-email body got 400. The guard compares the token's numeric `applicationId` to the route param, and the body must include a valid `email`. The applicant must therefore use the numeric id + email, not the `APP-…` id. |
| 09b Resubmit another application's id as applicant (must fail 403) | `POST /exporters/exporter-applications/1/resubmit` | APPLICANT | 403 | **PASS** | wrong-application guard works |
| 10 Resubmit without token (must fail 401) | `POST /exporters/exporter-applications/:id/resubmit` | none | 401 | **PASS** | |

### Phase 2 — Contract + ECX lot

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 11 Create sales contract | `POST /contracts` | ECTA | 500 | **BLOCKED** | `REGISTRATION_ERROR: Not connected to Fabric network` — no PG row created |
| 12 Approve contract | `POST /contracts/CTR-DEV1325/approve` | ECTA | 404 | **BLOCKED** | `Contract not found` — cascade of 11 |
| 13 ECX lot intake | `POST /ecx/lots` | ECX | 400 | **BLOCKED** | `INTAKE_FAILED: Not connected to Fabric network`. The `aa0947f` PG mirror runs only after the chaincode intake succeeds (`ecx.ts:217`), so with Fabric down no `ecx_lots` row is created (verified: 0 rows). The fix helps only when Fabric is up. |
| 14 ECX portal | `GET /portals/ecx` | ECX | 200 | **PASS** | `availableLots: []`, trading metrics all 0 — correct, no lots exist |

### Phase 3 — Shipment + quality

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 15 Shipment create (full body) | `POST /shipments` | ECTA | 202 | **PASS** | degraded: `blockchainSynced: false`, `status: pending` |
| 16 Quality inspection create | `POST /quality/inspections` | ECTA | 500 | **BLOCKED** | `SERVER_ERROR: socket hang up` — writes to CouchDB first; CouchDB not running here |
| 17 Quality approve, non-existent id (phantom guard) | `PUT /quality/inspections/QI-NOPE-DEV1325/approve` | ECTA | 404 | **PASS** | `Inspection not found` — `d534a6b` phantom fix verified |
| 18 Quality approve, real id | `PUT /quality/inspections/QI-DEV1325/approve` | ECTA | 404 | **BLOCKED** | `Inspection not found` — cascade of 16 |

### Phase 4 — LC + forex

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 19 LC issue | `POST /banking/lc/issue` | BANKS | 500 | **BLOCKED** | `LC_ISSUE_FAILED: Not connected to Fabric network` |
| 20 LC examine documents | `POST /banking/lc/LC-DEV1325/examine` | BANKS | 400 | **BLOCKED** | `EXAMINATION_FAILED: Not connected to Fabric network` |
| 21 LC release payment | `POST /banking/lc/LC-DEV1325/release-payment` | BANKS | 400 | **BLOCKED** | `PAYMENT_RELEASE_FAILED: Not connected to Fabric network` |
| 22 Forex request | `POST /forex/request` | BANKS | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network` |
| 23 NBE forex approve, non-existent id (phantom guard) | `POST /nbe/forex/FOREX-NOPE-DEV1325/approve` | NBE | 404 | **PASS** | `Forex allocation not found` — `d534a6b` phantom fix verified |
| 23b NBE portal pending check (seeded REQUESTED row in PG as test setup) | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests` lists the seeded `FOREX-DEV1325` row (count 1). The warning-3 anomaly (portal showing 0 while REQUESTED rows exist) is **not reproduced** here. |
| 24 NBE forex approve, real row | `POST /nbe/forex/FOREX-DEV1325/approve` | NBE | 200 | **PASS** | (first attempt killed by a dev-server restart, retested) status `CONFIRMED` — new state-machine-aligned handler: best-effort `ConfirmForex` on-chain, `blockchainSynced: false` + honest warning when Fabric is down; PG record is what the portal reads. Re-approve correctly 400 `INVALID_STATUS: Current status: CONFIRMED`. |
| 25 NBE forex repatriation | `POST /nbe/forex/FOREX-DEV1325/repatriation` | NBE | 200 | **PASS** | `status: COMPLETED`, `blockchainSynced: false`; row written to `forex_repatriations` (verified in PG). `aa0947f` fix verified on the PG path; the chain sync (Initiate → Record via BanksMSP) still needs a Fabric host. |

### Phase 5 — Permit, phytosanitary, pre-shipment inspection

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 26 Export permit issue | `POST /permits` | ECTA | 400 | **BLOCKED** | `Not connected to Fabric network` |
| 27 Phytosanitary request | `POST /phytosanitary/request` | ECTA | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network` |
| 28 Pre-shipment inspection request | `POST /inspection/request` | ECTA | 500 | **BLOCKED** | `Not connected to Fabric network` |

### Phase 6 — Shipping booking

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 29 Booking create | `POST /shipping/bookings` | ECTA | 200 | **PASS** | `BOOK-1794231047240`, status BOOKED |
| 30 Shipping portal | `GET /portals/shipping` | SHIPPING | 200 | **PASS** | `freightBookings: 1` (shipment `SHP-DEV1325`) — **`aa0947f` fix #5 verified live**: bookings now set the shipment `FREIGHT_BOOKED` in Postgres, so the portal shows them |
| 31 Booking load | `POST /shipping/bookings/:id/load` | SHIPPING | 200 | **PASS** | LOADED |
| 32 Booking depart | `POST /shipping/bookings/:id/depart` | SHIPPING | 200 | **PASS** | IN_TRANSIT |
| 33 Booking arrive | `POST /shipping/bookings/:id/arrive` | SHIPPING | 200 | **PASS** | ARRIVED |
| 34 Booking deliver | `POST /shipping/bookings/:id/deliver` | SHIPPING | 200 | **PASS** | DELIVERED |
| 35 Book freight on shipment | `POST /shipments/SHP-DEV1325/book-freight` | SHIPPING | 404 | **BLOCKED** | `Shipment not found` — handler reads the shipment from chaincode (`ReadShipment`) first |
| 36 Land transport start | `POST /shipments/SHP-DEV1325/land-transport/start` | SHIPPING | 400 | **BLOCKED** | `LAND_TRANSPORT_START_FAILED: Not connected to Fabric network` |

### Phase 7 — Customs

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 37 Declaration submit | `POST /customs/declaration/submit` | ECTA | 200 | **PASS** | `DECL-DEV1325`, status SUBMITTED, `blockchain_tx_id: null` |
| 38 Customs portal | `GET /portals/customs` | CUSTOMS | 200 | **PASS** | `pendingDeclarations: 1` |
| 39 Review declaration (fresh `DECL-DEV1325-B` on second shipment; first attempt killed by a restart) | `POST /customs/declaration/:id/review` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION, officer assigned |
| 40 Inspect declaration | `POST /customs/declarations/DECL-DEV1325/inspect` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION |
| 41 Complete inspection | `POST /customs/declaration/DECL-DEV1325/complete-inspection` | CUSTOMS | 200 | **PASS** | status UNDER_REVIEW, result PASSED |
| 42 Clear declaration | `POST /customs/declarations/DECL-DEV1325/clear` | CUSTOMS | 200 | **PASS** | status CLEARED |
| 43 Border crossing initiate | `POST /bordercrossing/initiate` | CUSTOMS | 500 | **BLOCKED** | `Not connected to Fabric network` |

### Phase 8 — Payments, SWIFT, settlement, retention

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 44 Payment initiate (correct body) | `POST /payments/initiate` | BANKS | 400 | **BLOCKED** | `INITIATION_FAILED: Not connected to Fabric network` |
| 45 Payment record (correct body) | `POST /payments/record` | BANKS | 500 | **BLOCKED** | `INTERNAL_ERROR: Not connected to Fabric network` |
| 46 SWIFT message create (MT700) | `POST /swift/messages` | BANKS | 400 | **BLOCKED** | `SWIFT_MESSAGE_CREATE_FAILED: Not connected to Fabric network` |
| 47 Payment settle | `POST /payments/PAY-DEV1325/settle` | BANKS | 404 | **BLOCKED** | `Payment not found` — cascade: no payment exists |
| 48 Payment release as NBE | `POST /payments/PAY-DEV1325/release` | NBE | 404 | **BLOCKED** | `Payment not found: PAY-DEV1325` — cascade (role check passes as NBE) |
| 49 Retention policy get (fallback) | `GET /retention/policy/COFFEE` | NBE | 200 | **PASS** | default NBE policy, retention 40%, surrender 60% |
| 50 Retention record | `POST /retention/FOREX-DEV1325/retention` | NBE | 404 | **BLOCKED** | `FOREX_NOT_FOUND` — the route reads the forex from the chaincode first, so with Fabric down it 404s even though the PG row exists |

### Phase 9 — Post-delivery (schema fixed by migration 054)

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 51 Payment received | `POST /post-delivery/SHP-DEV1325/payment` | BANKS | 200 | **FAIL** (first attempt) / **PASS** (retest) | First attempt returned 200 with **no tracking row in the DB** — see §3.1. Retested after seeding the tracking row in PG (test setup): 200 and the row genuinely updated. |
| 52 Forex repatriated | `POST /post-delivery/SHP-DEV1325/forex` | NBE | 200 | **PASS** | (retested with correct body `forexAmount`/`forexRate` and a seeded row) |
| 53 LC settlement | `POST /post-delivery/SHP-DEV1325/lc-settlement` | BANKS | 200 | **PASS** | (retested with `lcReference` and a seeded row) |
| 54 ECTA audit | `POST /post-delivery/SHP-DEV1325/ecta-audit` | ECTA | 200 | **PASS** | (retested with `auditResult: PASSED` and a seeded row) |
| 55 Close contract | `POST /post-delivery/SHP-DEV1325/close-contract` | ECTA | 200 | **PASS** | (retested with a seeded row) `Contract closed successfully` |
| 56 Status | `GET /post-delivery/SHP-DEV1325/status` | ECTA | 200 | **PASS** | (retested with a seeded row) |
| 57 Dashboard | `GET /post-delivery/dashboard` | ECTA | 200 | **PASS** | summary + views all return (zeros before the row existed) |
| — Final DB state | `post_delivery_tracking` | — | — | **PASS** | `overall_status: COMPLETED`, `completion_percentage: 100`, `payment_received/forex_repatriated/lc_settled/ecta_audit_completed: true` |

### Phase 10 — Documents + signatures

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 58 Upload a real PDF (minimal valid PDF, multipart) | `POST /documents/upload` | EXPORTER | 200 | **PASS** | `documentId: DOC-1794231261909553295`, SHA-256 hash returned, `ipfsCID: null`, `status: uploaded`; file stored on disk under `api/uploads/documents/`, row in PG |
| 59 List documents for the contract | `GET /documents?entityType=CONTRACT&entityId=CTR-DEV1325` | EXPORTER | 200 | **PASS** | (first attempt killed by a restart, retested) the uploaded document is listed with its hash |
| 60 Sign the document | `POST /documents/:id/sign` | ECTA | 503 | **BLOCKED** | `LEDGER_QUERY_FAILED: Fabric is unavailable while confirming this document hash. Please retry signing.` — honest failure, not a silent pass. **Signing does not work in dev mode; it needs Fabric.** |
| 61 List signatures | `GET /documents/:id/signatures` | ECTA | 200 | **PASS** | `signatures: []`, count 0 — consistent with 60 |
| 62 Download the document | `GET /documents/:id/download` | EXPORTER | 200 | **PASS** | returns the exact PDF bytes uploaded |
| 63 Blockchain signatures for the document | `GET /blockchain-signatures/entity/DOCUMENT/:id` | ECTA | 200 | **PASS** | degraded: `transactions: []`, `fabricLedger: 0` — returns empty instead of failing |

### Phase 11 — Portals + status

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 64 ECTA portal | `GET /portals/ecta` | ECTA | 200 | **PASS** | `pendingApplications: 1` (the new application) |
| 65 Banks portal | `GET /portals/banks` | BANKS | 200 | **PASS** | `forexAllocations: 1` |
| 66 NBE portal | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests: 1` before approve, `0` after (row moved to CONFIRMED) |
| 67 Exporter portal | `GET /portals/exporters` | EXPORTER | 200 | **PASS** | (correct slug is `exporters`, not `exporter`) portal returns |
| 68 Status transitions CONTRACT | `GET /status/transitions/CONTRACT` | ECTA | 200 | **PASS** | |
| 69 Status transitions SHIPMENT | `GET /status/transitions/SHIPMENT` | ECTA | 200 | **PASS** | |
| 70 Status transitions PAYMENT | `GET /status/transitions/PAYMENT` | ECTA | 200 | **PASS** | `VERIFIED → [SWIFT_INITIATED, SETTLED]` — the `statusManager` fix (VERIFIED→SETTLED allowed, matching the chaincode) is visible live |
| 71 Workflow status for the contract | `GET /status/workflow/CTR-DEV1325?type=CONTRACT` | ECTA | 200 | **PASS** | contract `NOT_FOUND` (cascade of step 11), forex/lc/shipment/payment empty |

## 2. What the dev-mode run proves about the fixes

| Fix | Verified live in dev mode? |
|---|---|
| `d534a6b` exporter reject 500 → 200 | **Yes** (step 06) |
| `d534a6b` applicant resubmit 403 → 200 | **Yes** (step 09, numeric id + email body) |
| `d534a6b` phantom approves → 404 | **Yes** (steps 17, 23) |
| `d534a6b` post-delivery schema (migration 054) | **Yes** (steps 51–57 work once a tracking row exists) |
| `aa0947f` shipping booking → portal `freightBookings` | **Yes** (steps 29–30) |
| `aa0947f` NBE repatriation PG path + `blockchainSynced: false` | **Yes** (step 25) |
| `aa0947f` ECX lot PG mirror | **No — by design**: the mirror runs only after a successful chaincode intake, so in dev mode intake stays BLOCKED and nothing is mirrored |
| `aa0947f` / statusManager PAYMENT VERIFIED → SETTLED | **Yes, in the transitions table** (step 70); the settle route itself is untestable without a payment, which needs Fabric |
| `aa0947f` chain-side parts (lot mirror, booking mirror, repatriation Initiate → Record, settle) | **Not provable here** — need a Fabric host running this branch |

## 3. New findings

### 3.1 FAIL — Post-delivery `record*` endpoints return 200 when no tracking row exists (phantom success)
`POST /post-delivery/:shipmentId/{payment,forex,lc-settlement,ecta-audit}`
call `PostDeliveryWorkflowService.record*`, which run a bare
`UPDATE post_delivery_tracking … WHERE shipment_id = $1` and return
`{ success: true }` without checking the affected row count. With no row,
the endpoint reports success and records nothing — steps 51–54 first returned
200 while `GET /post-delivery/:id/status` then 404'd and `close-contract`
400'd with "Post-delivery record not found". Same phantom class as the
approve bugs fixed in `d534a6b` (which fixed the approve handlers, not these).
The tracking row is only created by `initializePostDeliveryWorkflow`, which is
only called from the shipment delivery-complete handler (`shipments.ts:2510`)
after a chaincode `ReadShipment` — so in dev mode the row can never be created
through the API, and every post-delivery record call is a silent no-op.
Fix: check the UPDATE row count and return 404 when no tracking row exists
(or auto-create the row on first record).

### 3.2 Resubmit needs the numeric application id, not the `APP-…` id
The resubmit guard (`exporters.ts`) compares the token's numeric
`applicationId` to the route param, and the body must contain a valid
`email`. Calling with the `APP-…` string id 403s even for the rightful
applicant. Works as designed, but the applicant has no way to learn their
numeric id from the public check endpoint (which returns the `APP-…` id).
Worth aligning the guard to accept either id.

### 3.3 Applicant temp password is email-only
The submit and reject responses do not include the temporary password; it is
sent by email only, and SMTP is unconfigured here (`emailDelivery: failed`),
so an applicant cannot log in in dev mode without test setup (the harness
set the bcrypt hash directly in PG). Not a code bug, but it blocks the
applicant flow end-to-end in any environment without working email.

### 3.4 Observations (not failures)
- The dev server logged a `webhooks` table error at startup (`relation
  "webhooks" does not exist`); the webhook service logs and continues. No
  migration creates a `webhooks` table.
- `POST /documents/upload` works fully offline (disk + PG, `ipfsCID: null`).
- `GET /blockchain-signatures/entity/…` degrades gracefully to empty
  results instead of failing when Fabric is down.

## 4. Environment incident during this run (must be known before re-running)

The VM was **replaced mid-run** (~13:14 EAT). `/tmp` was wiped and all
system-installed packages were gone: PostgreSQL 16, the prod API on port
3001, the UI on port 3000, and the dev server on 3005 all died, along with
`/tmp/cecbs-api.env` (JWT secret), `/tmp/cecbs-test-users.txt` (test
password), and the first dev run's outputs (run 1, namespace DEV1309, steps
1–28 observed: same shape as run 2 — logins OK, submit 201, reject 200,
approve BLOCKED, contract/lot/LC/forex BLOCKED, shipment 202, quality
CouchDB-blocked, approve guards 404).
The environment was rebuilt for run 2: PostgreSQL 16.15 reinstalled from
apt, cluster `16/main` restarted, fresh `cecbs` DB, all 46 migrations applied
by the dev server on startup, a **new JWT secret** and **new test-user
password** (both only in `/tmp`, chmod 600), test users recreated.
Consequences:
- **The prod API (3001) and UI (3000) are still down.** They were not
  restarted (out of scope for this task); restarting them needs a decision,
  because the old JWT secret is lost — all previously issued tokens
  (including `.test-tokens-TMW977G36.json`) are invalid under the new secret.
- The dev server on 3005 was stopped at the end of this run, as tasked.
  Postgres stays online.
- Run 2 used namespace DEV1325 on the fresh DB; all artefacts are in the
  fresh `cecbs` database. The old TMW977G36 test data is gone with the old DB.

## 5. Run conditions

- The dev server restarted **12 times** during run 2 because another agent
  was editing source files on this branch concurrently (ts-node-dev
  `--respawn`). Three steps first returned `000` (server down mid-request)
  and were retested with retries: NBE forex approve (24), customs review
  (39), document list/sign (59/60).
- Code under test: HEAD `aa0947f` plus the uncommitted edits listed at the
  top. A re-run after the working tree settles (or is committed) is advised
  before treating these results as final for the branch.
- Harness scripts (persistent, in the repo working tree, untracked):
  `~/workspace/GoCBC/.devrun/run-dev-e2e.sh`,
  `~/workspace/GoCBC/.devrun/run-followups.sh`; raw per-step JSON responses
  in `~/workspace/GoCBC/.devrun/out/`, run logs `run.log` / `followups.log`.
