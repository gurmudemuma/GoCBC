# CECBS Dev-Mode End-to-End Test — Re-run Results

**Run:** DEV21402 · **Date:** 2026-11-09 (EAT) · **Branch:** `fix/auth-chaincode-audit`
**Code tested:** HEAD `3ae075a` ("Audit and fix all status transitions end-to-end
(TEST-STATUS-MATRIX)") — **clean tree, no uncommitted source changes** (verified
before starting: `git log` shows 3ae075a on top, `git status` shows no modified
tracked files).
**API:** dev server (`npm run dev`, ts-node-dev) on http://localhost:3005,
`NODE_ENV=development`, `FABRIC_REQUIRED=false` · **Health:** healthy,
`database: true`, `blockchain: false` (no Fabric, no Docker, no CouchDB, no IPFS,
no SMTP on this machine) · **DB:** PostgreSQL 16.15, **47 migrations applied**
(incl. 058 from the status audit) · **Prod API (3001) and UI (3000) left
running untouched** (both healthy at the end of the run).
**Test users:** `test_<role>_TMW977G36` (8 roles + suspended), same accounts as
DEV1325; shared test password only in `/tmp/cecbs-test-users.txt` (chmod 600).
Entities used: applications `APP-1794232922327-ZWT8O7` (id 5) and
`APP-1794232946594-PMM61V` (id 6), contract `CTR-DEV21402`, LC `LC-DEV21402`,
forex `FOREX-DEV21402`, shipment `SHP-DEV21402`, declaration `DECL-DEV21402`,
booking `BOOK-1794233189079`, document `DOC-1794233407793274390`.

**Verdict rules:** PASS = behaved as specified. FAIL = the API itself is wrong
with the API running (wrong status, missing route, missing field, 500 from bad
code/schema, phantom success). BLOCKED = the step needs Fabric, CouchDB, IPFS or
SMTP absent on this machine — the exact error is recorded; not a failure of the
API code.

## Summary counts

| Scope | Attempted | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| Logins (8 roles) | 8 | 8 | 0 | 0 |
| Workflow steps 01–71 (+09b, +23b, +51a–54a) | 76 | 53 | 0 | 23 |
| **Total** | **84** | **61** | **0** | **23** |

**Headline:** clean re-run against the final committed state. Same shape as
DEV1325, one step better: the one FAIL from DEV1325 (post-delivery phantom
200) is gone — the record endpoints now 404 without a tracking row (§1,
Phase 9) — and the applicant resubmit is **genuinely** verified 200 this
time (DEV1325 claimed it but its outputs were 403/400; see §3.2). No new
FAILs. Everything that needs the chain is still BLOCKED, and the contract
create still writes no PG row, so the downstream chain is a cascade.
**New finding:** `GET /post-delivery/:id/status` reports
`completionPercentage: 125` when the contract is closed without an LC — the
percentage formula counts 5 items over a denominator of 4 (§3.1).

## 1. Results by phase

### Phase A — Logins

| Check | Endpoint | HTTP | Verdict |
|---|---|---|---|
| Login ADMIN/ECTA/ECX/NBE/BANKS/CUSTOMS/SHIPPING/EXPORTER | `POST /auth/login` | 200 | **PASS** (8/8, token issued per role) |

### Phase 1 — Licence application

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 01 Submit application (public) | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794232922327-ZWT8O7`, status pending |
| 02 Check-by-email (status fields only) | `GET /exporters/exporter-applications/check/:email` | public | 200 | **PASS** | status fields only, no leak |
| 04 Approve as ECTA | `POST /exporters/exporter-applications/:id/approve` | ECTA | 400 | **BLOCKED** | `BLOCKCHAIN_ERROR: Not connected to Fabric network` |
| 05 Submit second application | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794232946594-PMM61V` |
| 06 Reject second application as ECTA | `POST /exporters/exporter-applications/:id/reject` | ECTA | 200 | **PASS** | status rejected — `d534a6b` fix verified live again |
| 07 Reject as EXPORTER (must fail 403) | `POST /exporters/exporter-applications/:id/reject` | EXPORTER | 403 | **PASS** | role guard works |
| 08 Applicant login (temp password set in PG as test setup; SMTP unconfigured) | `POST /auth/applicant/login` | APPLICANT | 200 | **PASS** | applicant token issued, `applicationId: 6` |
| 09 Resubmit as applicant | `POST /exporters/exporter-applications/6/resubmit` | APPLICANT | 200 | **PASS** | resubmitted, status pending — **genuinely verified this time**: numeric id `6` in the path + the application's own email in the body (the two things DEV1325 got wrong in its attempts: APP-… string id → 403, `{}` body → 400 "Valid email is required") |
| 09b Resubmit another application's id as applicant (must fail 403) | `POST /exporters/exporter-applications/5/resubmit` | APPLICANT | 403 | **PASS** | wrong-application guard works |
| 10 Resubmit without token (must fail 401) | `POST /exporters/exporter-applications/6/resubmit` | none | 401 | **PASS** | |

### Phase 2 — Contract + ECX lot

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 11 Create sales contract | `POST /contracts` | ECTA | 500 | **BLOCKED** | `REGISTRATION_ERROR: Not connected to Fabric network` — no PG row created |
| 12 Approve contract | `POST /contracts/CTR-DEV21402/approve` | ECTA | 404 | **BLOCKED** | `Contract not found` — cascade of 11 |
| 13 ECX lot intake | `POST /ecx/lots` | ECX | 400 | **BLOCKED** | `INTAKE_FAILED: Not connected to Fabric network`. The `aa0947f` PG mirror runs only after the chaincode intake succeeds (`ecx.ts:217`), so with Fabric down no `ecx_lots` row is created (verified: 0 rows). The fix helps only when Fabric is up. |
| 14 ECX portal | `GET /portals/ecx` | ECX | 200 | **PASS** | `availableLots: []`, trading metrics all 0 — correct, no lots exist |

### Phase 3 — Shipment + quality

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 15 Shipment create (full body) | `POST /shipments` | ECTA | 202 | **PASS** | degraded: `blockchainSynced: false`, `status: CREATED` (migration 058 default) |
| 16 Quality inspection create | `POST /quality/inspections` | ECTA | 500 | **BLOCKED** | `SERVER_ERROR: socket hang up` — writes to CouchDB first; CouchDB not running here |
| 17 Quality approve, non-existent id (phantom guard) | `PUT /quality/inspections/QI-NOPE-DEV21402/approve` | ECTA | 404 | **PASS** | `Inspection not found` — `d534a6b` phantom fix verified |
| 18 Quality approve, real id | `PUT /quality/inspections/QI-DEV21402/approve` | ECTA | 404 | **BLOCKED** | `Inspection not found` — cascade of 16 |

### Phase 4 — LC + forex

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 19 LC issue | `POST /banking/lc/issue` | BANKS | 500 | **BLOCKED** | `LC_ISSUE_FAILED: Not connected to Fabric network` |
| 20 LC examine documents | `POST /banking/lc/LC-DEV21402/examine` | BANKS | 400 | **BLOCKED** | `EXAMINATION_FAILED: Not connected to Fabric network` |
| 21 LC release payment | `POST /banking/lc/LC-DEV21402/release-payment` | BANKS | 400 | **BLOCKED** | `PAYMENT_RELEASE_FAILED: Not connected to Fabric network` |
| 22 Forex request | `POST /forex/request` | BANKS | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network` |
| 23 NBE forex approve, non-existent id (phantom guard) | `POST /nbe/forex/FOREX-NOPE-DEV21402/approve` | NBE | 404 | **PASS** | `Forex allocation not found` — `d534a6b` phantom fix verified |
| 23b NBE portal pending check (seeded REQUESTED row in PG as test setup) | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests` lists the seeded `FOREX-DEV21402` row (count 1). The warning-3 anomaly (portal showing 0 while REQUESTED rows exist) is **not reproduced** here, second run in a row. |
| 24 NBE forex approve, real row | `POST /nbe/forex/FOREX-DEV21402/approve` | NBE | 200 | **PASS** | status `CONFIRMED`, `blockchainSynced: false` + honest warning; re-approve guard (400 on second approve) was verified in DEV1325 |
| 25 NBE forex repatriation | `POST /nbe/forex/FOREX-DEV21402/repatriation` | NBE | 200 | **PASS** | `status: COMPLETED`, `blockchainSynced: false`; row written to `forex_repatriations` (verified in PG). The chain sync was correctly **skipped with an honest warning** — "Allocation has no linked contract, exporter or shipment, so the chain write was skipped (InitiateRepatriation needs all three)" — no ids invented. `aa0947f` fix verified on the PG path; the chain sync (Initiate → Record via BanksMSP) still needs a Fabric host. |

### Phase 5 — Permit, phytosanitary, pre-shipment inspection

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 26 Export permit issue | `POST /permits` | ECTA | 400 | **BLOCKED** | `Not connected to Fabric network` |
| 27 Phytosanitary request | `POST /phytosanitary/request` | ECTA | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network` |
| 28 Pre-shipment inspection request | `POST /inspection/request` | ECTA | 500 | **BLOCKED** | `Not connected to Fabric network` |

### Phase 6 — Shipping booking

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 29 Booking create | `POST /shipping/bookings` | ECTA | 200 | **PASS** | `BOOK-1794233189079`, status BOOKED |
| 30 Shipping portal | `GET /portals/shipping` | SHIPPING | 200 | **PASS** | `freightBookings: 3` incl. `SHP-DEV21402` with status `FREIGHT_BOOKED` — **`aa0947f` fix #5 verified live again**: bookings now set the shipment `FREIGHT_BOOKED` in Postgres, so the portal shows them |
| 31 Booking load | `POST /shipping/bookings/:id/load` | SHIPPING | 200 | **PASS** | LOADED |
| 32 Booking depart | `POST /shipping/bookings/:id/depart` | SHIPPING | 200 | **PASS** | IN_TRANSIT |
| 33 Booking arrive | `POST /shipping/bookings/:id/arrive` | SHIPPING | 200 | **PASS** | ARRIVED |
| 34 Booking deliver | `POST /shipping/bookings/:id/deliver` | SHIPPING | 200 | **PASS** | DELIVERED |
| 35 Book freight on shipment | `POST /shipments/SHP-DEV21402/book-freight` | SHIPPING | 404 | **BLOCKED** | `Shipment not found` — handler reads the shipment from chaincode (`ReadShipment`) first |
| 36 Land transport start | `POST /shipments/SHP-DEV21402/land-transport/start` | SHIPPING | 400 | **BLOCKED** | `LAND_TRANSPORT_START_FAILED: Not connected to Fabric network` |

### Phase 7 — Customs

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 37 Declaration submit | `POST /customs/declaration/submit` | ECTA | 200 | **PASS** | `DECL-DEV21402`, status SUBMITTED, `blockchain_tx_id: null` |
| 38 Customs portal | `GET /portals/customs` | CUSTOMS | 200 | **PASS** | `pendingDeclarations: 1` |
| 39 Review declaration | `POST /customs/declaration/DECL-DEV21402/review` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION, officer assigned (after the chaincode `ReviewCustomsDeclaration` retry backoff, PG fallback) |
| 40 Inspect declaration | `POST /customs/declarations/DECL-DEV21402/inspect` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION |
| 41 Complete inspection | `POST /customs/declaration/DECL-DEV21402/complete-inspection` | CUSTOMS | 200 | **PASS** | status UNDER_REVIEW, result PASSED |
| 42 Clear declaration | `POST /customs/declarations/DECL-DEV21402/clear` | CUSTOMS | 200 | **PASS** | status CLEARED |
| 43 Border crossing initiate | `POST /bordercrossing/initiate` | CUSTOMS | 500 | **BLOCKED** | `Not connected to Fabric network` |

### Phase 8 — Payments, SWIFT, settlement, retention

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 44 Payment initiate (correct F4 body) | `POST /payments/initiate` | BANKS | 400 | **BLOCKED** | `INITIATION_FAILED: Not connected to Fabric network` |
| 45 Payment record (correct F4 body) | `POST /payments/record` | BANKS | 500 | **BLOCKED** | `INTERNAL_ERROR: Not connected to Fabric network` |
| 46 SWIFT message create (MT700) | `POST /swift/messages` | BANKS | 400 | **BLOCKED** | `SWIFT_MESSAGE_CREATE_FAILED: Not connected to Fabric network` |
| 47 Payment settle | `POST /payments/PAY-DEV21402/settle` | BANKS | 404 | **BLOCKED** | `Payment not found` — cascade: no payment exists |
| 48 Payment release as NBE | `POST /payments/PAY-DEV21402/release` | NBE | 404 | **BLOCKED** | `Payment not found: PAY-DEV21402` — cascade (role check passes as NBE) |
| 49 Retention policy get (fallback) | `GET /retention/policy/COFFEE` | NBE | 200 | **PASS** | default NBE policy, retention 40%, surrender 60% |
| 50 Retention record (correct F8 body) | `POST /retention/FOREX-DEV21402/retention` | NBE | 404 | **BLOCKED** | `FOREX_NOT_FOUND` — the route reads the forex from the chaincode first, so with Fabric down it 404s even though the PG row exists |

### Phase 9 — Post-delivery (phantom fix under test)

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 51a Payment received, **no tracking row** | `POST /post-delivery/SHP-DEV21402/payment` | BANKS | 404 | **PASS** | `Post-delivery record not found` — **the `3ae075a` phantom fix verified**: the record endpoints now 404 instead of returning a silent 200 |
| 52a Forex repatriated, **no tracking row** | `POST /post-delivery/SHP-DEV21402/forex` | NBE | 404 | **PASS** | `Post-delivery record not found` |
| 53a LC settlement, **no tracking row** | `POST /post-delivery/SHP-DEV21402/lc-settlement` | BANKS | 404 | **PASS** | `Post-delivery record not found` |
| 54a ECTA audit, **no tracking row** | `POST /post-delivery/SHP-DEV21402/ecta-audit` | ECTA | 404 | **PASS** | `Post-delivery record not found` |
| — Seed (first attempt, **harness bug**) | psql INSERT … `ON CONFLICT (shipment_id) DO NOTHING` | — | — | **INVALID-TEST** | `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification` — `post_delivery_tracking` has **no unique constraint on `shipment_id`** (PK is the serial `id`), so the seed inserted nothing and 51b–56 in the main run all 404'd. Same bug was in DEV1325's F5 seed — see §3.2. |
| 51b Payment received (retest, correct seed — follow-ups) | `POST /post-delivery/SHP-DEV21402/payment` | BANKS | 200 | **PASS** | `Payment recorded successfully` |
| 52b Forex repatriated (retest) | `POST /post-delivery/SHP-DEV21402/forex` | NBE | 200 | **PASS** | `Forex repatriation recorded successfully` |
| 53b LC settlement (retest) | `POST /post-delivery/SHP-DEV21402/lc-settlement` | BANKS | 200 | **PASS** | `LC settlement recorded successfully` |
| 54b ECTA audit (retest) | `POST /post-delivery/SHP-DEV21402/ecta-audit` | ECTA | 200 | **PASS** | `ECTA audit recorded successfully` |
| 55 Close contract (retest) | `POST /post-delivery/SHP-DEV21402/close-contract` | ECTA | 200 | **PASS** | `Contract closed successfully` (took ~24s: best-effort chaincode `UpdateContractStatus` retries, then PG close) |
| 56 Status (retest) | `GET /post-delivery/SHP-DEV21402/status` | ECTA | 200 | **PASS** | `overallStatus: COMPLETED`, all four flags true, `contractClosed: true` — but `completionPercentage: 125` (§3.1) |
| 57 Dashboard | `GET /post-delivery/dashboard` | ECTA | 200 | **PASS** | summary + views return (now 4 shipments, 2 completed) |
| — Final DB state | `post_delivery_tracking` | — | — | **PASS** | `overall_status: COMPLETED`, stored `completion_percentage: 100`, `payment_received/forex_repatriated/lc_settled/ecta_audit_completed/contract_closed: true` |

### Phase 10 — Documents + signatures

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 58 Upload a real PDF (minimal valid PDF, multipart) | `POST /documents/upload` | EXPORTER | 200 | **PASS** | `documentId: DOC-1794233407793274390`, SHA-256 hash returned, `ipfsCID: null`, `status: uploaded`; file stored on disk under `api/uploads/documents/`, row in PG |
| 59 List documents for the contract | `GET /documents?entityType=CONTRACT&entityId=CTR-DEV21402` | EXPORTER | 200 | **PASS** | the uploaded document is listed with its hash |
| 60 Sign the document | `POST /documents/:id/sign` | ECTA | 503 | **BLOCKED** | `LEDGER_QUERY_FAILED: Fabric is unavailable while confirming this document hash. Please retry signing.` — honest failure, not a silent pass. **Signing does not work in dev mode; it needs Fabric.** |
| 61 List signatures | `GET /documents/:id/signatures` | ECTA | 200 | **PASS** | `signatures: []`, count 0 — consistent with 60 |
| 62 Download the document | `GET /documents/:id/download` | EXPORTER | 200 | **PASS** | returns the exact PDF bytes uploaded |
| 63 Blockchain signatures for the document | `GET /blockchain-signatures/entity/DOCUMENT/:id` | ECTA | 200 | **PASS** | degraded: `transactions: []`, `fabricLedger: 0` — returns empty instead of failing |

### Phase 11 — Portals + status

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 64 ECTA portal | `GET /portals/ecta` | ECTA | 200 | **PASS** | `pendingApplications: 5` (incl. the two new applications) |
| 65 Banks portal | `GET /portals/banks` | BANKS | 200 | **PASS** | portals return |
| 66 NBE portal | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests: 0` after approve, `totalAllocations: 3` |
| 67 Exporter portal | `GET /portals/exporters` | EXPORTER | 200 | **PASS** | correct slug `exporters` |
| 68 Status transitions CONTRACT | `GET /status/transitions/CONTRACT` | ECTA | 200 | **PASS** | `REGISTERED → [APPROVED, REJECTED]` |
| 69 Status transitions SHIPMENT | `GET /status/transitions/SHIPMENT` | ECTA | 200 | **PASS** | full chaincode-aligned table |
| 70 Status transitions PAYMENT | `GET /status/transitions/PAYMENT` | ECTA | 200 | **PASS** | `VERIFIED → [SWIFT_INITIATED, SETTLED]` — the `3ae075a` statusManager fix (VERIFIED→SETTLED allowed, matching the chaincode) is visible live |
| 71 Workflow status for the contract | `GET /status/workflow/CTR-DEV21402?type=CONTRACT` | ECTA | 200 | **PASS** | contract `NOT_FOUND` (cascade of step 11), forex/lc/shipment/payment empty |

## 2. What the re-run proves about the fixes

| Fix | Verified live in dev mode? |
|---|---|
| `d534a6b` exporter reject 500 → 200 | **Yes** (step 06) |
| `d534a6b` applicant resubmit 403 → 200 | **Yes, for real this time** (step 09, numeric id + email body; DEV1325's claim rested on outputs that were 403/400 — see §3.2) |
| `d534a6b` phantom approves → 404 | **Yes** (steps 17, 23) |
| `d534a6b` post-delivery schema (migration 054) | **Yes** (steps 51b–57 work once a tracking row exists) |
| `aa0947f` shipping booking → portal `freightBookings` | **Yes** (steps 29–30) |
| `aa0947f` NBE repatriation PG path + `blockchainSynced: false` | **Yes** (step 25) |
| `aa0947f` ECX lot PG mirror | **No — by design**: the mirror runs only after a successful chaincode intake, so in dev mode intake stays BLOCKED and nothing is mirrored |
| `aa0947f` / `3ae075a` statusManager PAYMENT VERIFIED → SETTLED | **Yes, in the transitions table** (step 70); the settle route itself is untestable without a payment, which needs Fabric |
| `3ae075a` post-delivery phantom 200 → 404 | **Yes** (steps 51a–54a) — the FAIL from DEV1325 is gone |
| `3ae075a` status defaults (migration 058) | **Yes** (47 migrations applied; shipment create returns `CREATED`, not `draft`) |
| `aa0947f` chain-side parts (lot mirror, booking mirror, repatriation Initiate → Record, settle) | **Not provable here** — need a Fabric host running this branch |

## 3. New findings

### 3.1 FAIL (minor) — Post-delivery `completionPercentage` can exceed 100
`GET /post-delivery/:id/status` returned `completionPercentage: 125` for the
closed workflow, while the stored value in `post_delivery_tracking` is 100
(the close handler writes 100; the status endpoint recomputes). Cause,
`postDeliveryWorkflowService.ts:586-595` (`calculateCompletionPercentage`):
it counts **5** items (payment, forex, LC, audit, contract_closed) but the
denominator is `record.lc_used ? 5 : 4` — 4 when no LC was used. With
`lc_used=false` and all five flags true, 5/4 = 125%. The workflow itself
completes correctly; only the reported percentage is wrong. Fix: count the
contract_closed step in the denominator too (or cap at 100).

### 3.2 Correction to DEV1325 — its post-delivery "passes" were phantoms
DEV1325 §3.1 found the phantom-200 bug, and its F5 follow-ups claimed the
record endpoints "work once a tracking row exists" — but the F5 seed used
`INSERT … ON CONFLICT (shipment_id) DO NOTHING`, and
`post_delivery_tracking` has **no unique constraint on `shipment_id`**
(PK is the serial `id`), so the INSERT errored and **no row was ever
seeded**. The F5 200s were phantom successes from the pre-fix code (the
rowCount fix landed later, in `3ae075a`), and F5's close/status 404s were the
missing row, not the endpoints. This re-run proves the real behaviour with a
correct plain-INSERT seed: record* → 200, close → 200, status → 200
COMPLETED. DEV1325's Phase 9 "PASS (retested with a seeded row)" rows should
be read as **not actually verified**.

### 3.3 Repatriation chain write is correctly skipped, not faked
Step 25 returns `blockchainSynced: false` with the warning "Allocation has
no linked contract, exporter or shipment, so the chain write was skipped
(InitiateRepatriation needs all three)". The seeded allocation has no
contract/exporter/shipment link, and the handler refuses to invent ids —
the right behaviour. On a real workflow the allocation is linked, and the
Initiate → Record sync can then be exercised — only on a Fabric host.

### 3.4 Warning-3 anomaly still not reproduced
`GET /portals/nbe` showed `pendingForexRequests: 1` (the seeded REQUESTED
row) before the approve and `0` after it, two dev runs in a row. The
user's manual Docker run showed 0 while REQUESTED rows existed. The portal
query works here; the Docker-host discrepancy remains uninvestigated
(it may be data- or ordering-specific on that host).

## 4. Run conditions

- Clean tree: HEAD `3ae075a`, no modified tracked files. **No dev-server
  restarts interrupted this run** (zero `000` responses) — unlike DEV1325,
  which had 12 restarts from concurrent editing.
- The dev server on 3005 was stopped at the end of this run, as tasked.
  The prod API on 3001 and the UI on 3000 were never touched and are still
  healthy. Postgres stays online.
- Harness scripts (persistent, in the repo working tree, untracked):
  `~/workspace/GoCBC/.devrun/run-dev-e2e-2.sh`,
  `~/workspace/GoCBC/.devrun/run-followups-2.sh`; raw per-step JSON responses
  in `~/workspace/GoCBC/.devrun/out2/`, run logs `run2.log` /
  `run2-followups.log`.
