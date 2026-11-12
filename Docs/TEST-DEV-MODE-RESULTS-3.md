# CECBS Dev-Mode End-to-End Test — Regression Run Results (Slice 9)

**Run:** DEV32000 · **Date:** 2026-11-09 (EAT) · **Branch:** `features`
**Code tested:** HEAD `b2e7ccb` ("Start API/UI manually: comment out the
auto-start calls in start-all.sh") — **working tree was already dirty when
this run started** (uncommitted changes from concurrent slices; verified via
`git status` before starting). This run modified **no tracked source files**:
only untracked harness/output files were added, and the chaincode binary
rebuilt by `go build` was restored with `git checkout` (md5 back to
`df729488779a1b7e802443c2cb8c7c03`).
**API:** dev server (`npm run dev`, ts-node-dev) on http://localhost:3005,
`NODE_ENV=development`, `FABRIC_REQUIRED=false`, `FABRIC_ENABLED=false` ·
**Health:** healthy, `database: true`, `blockchain: false` (no Fabric, no
Docker, no CouchDB, no IPFS, no SMTP on this machine) · **DB:** PostgreSQL
16.15, **53 migration files found, all up to date**; 54 rows in
`_schema_migrations` (the extra row is `062_create_shipping_bookings`,
applied earlier — its file is now `064_create_shipping_bookings.sql` after
the booking-table unification; no file is unapplied).
**Prod API (3001) restarted from the rebuilt dist and UI (3000) restarted
from the fresh production build** (see §0); both healthy at the end of the
run. The dev server on 3005 was stopped at the end of this run.
**Test users:** `test_<role>_RBAC1` (8 roles + suspended) — the harness's
`TMW977G36` usernames no longer exist (DB rebuilt in ENVIRONMENT INCIDENT
#3); shared test password only in `/tmp/cecbs-test-users.txt` (chmod 600).
Entities used: applications `APP-1794254442547-EJEST1` (id 1) and
`APP-1794254466820-EFDAVK` (id 2), contract `CTR-DEV32000`, LC `LC-DEV32000`,
forex `FOREX-DEV32000`, shipment `SHP-DEV32000`, declaration `DECL-DEV32000`,
booking `BOOK-1794254709120`, document `DOC-1794255071095672264`.

**Verdict rules:** PASS = behaved as specified. FAIL = the API itself is
wrong with the API running (wrong status, missing route, missing field, 500
from bad code/schema, phantom success). BLOCKED = the step needs Fabric,
CouchDB, IPFS or SMTP absent on this machine — the exact error is recorded;
not a failure of the API code.

## Summary counts

| Scope | Attempted | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| Logins (8 roles) | 8 | 8 | 0 | 0 |
| Workflow steps 01–71 (+09b, +23b, +51a–54a) | 76 | 54 | 0 | 22 |
| **Total** | **84** | **62** | **0** | **22** |

**Headline:** clean regression run against HEAD `b2e7ccb`, one net PASS better
than DEV21402 (62 vs 61 PASS, 22 vs 23 BLOCKED, 0 FAIL). Three verdicts
changed (§3): step 16 BLOCKED→PASS (the best-effort CouchDB fix from the
handoff audit, intended), step 18 BLOCKED→PASS (the approve guard is correct
and the full perform→approve path was probed live, intended), step 42
PASS→BLOCKED (the plural clear route was deliberately removed in `e6f2a82`;
the canonical singular route needs Fabric — see §4). The DEV21402
`completionPercentage: 125` bug is fixed: step 56 now reports **100**
(`099d125` verified live). No new FAILs. Zero `000` responses — no restarts
interrupted this run.

## 0. Builds + restarts (Task 1)

All commands run 2026-11-09 ~19:57–20:00 EAT, exit codes recorded exactly.

| Check | Command | Exit |
|---|---|---|
| API typecheck | `cd api && npx tsc --noEmit` | **0** (clean) |
| API build | `cd api && npm run build` (`tsc && node scripts/copy-migrations.js`) | **0** |
| UI typecheck | `cd ui && npx tsc --noEmit` | **0** (clean) |
| UI build | `cd ui && npm run build` | **0** — **20/20 routes** (`/` `/_app` `/404` `/500` `/admin` `/admin/risk-rules` `/application-status` `/login` `/login-new` `/portals/analytics` `/portals/banks` `/portals/customs` `/portals/ecta` `/portals/ecx` `/portals/exporter` `/portals/nbe` `/portals/shipping` `/profile` `/register-exporter` `/resubmit-application` `/unauthorized`) |
| Chaincode vet | `cd chaincodes/coffee && ~/go1.22.2/bin/go vet ./...` (Go 1.22.2, `go` is at `~/go1.22.2/bin/go`, not on PATH) | **0** (clean) |
| Chaincode build | `cd chaincodes/coffee && ~/go1.22.2/bin/go build ./...` | **0** — the tracked `coffee` binary was rebuilt (md5 changed) and **restored** via `git checkout -- chaincodes/coffee/coffee` (md5 back to `df729488…`, `git status` clean for it) |

Restarts (clean PID kills, never `pkill -f`):
- Prod API 3001: old PID 11928 (`node dist/server.js`) SIGTERM'd, port
  confirmed free, restarted from the rebuilt dist with env from
  `/tmp/cecbs-api.env` → new PID 12953. `/health` 200:
  `{"status":"healthy","services":{"database":true,"blockchain":false,
  "email":{"configured":false,"ready":false,"state":"unconfigured"}}}`.
  Startup log: "Found 53 migration file(s)", "All migrations up to date".
- UI 3000: was down; started `next start -p 3000` from the fresh build →
  PID 13007. `/` 200, `/login` 200, `/portals/ecx` 200, `/portals/nbe` 200,
  `/portals/ecta` 200 (HTML shell returned for each portal route).
- Dev API 3005: started `PORT=3005 npm run dev` with env from
  `/tmp/cecbs-api.env` → PID 13062. `/health` 200 (version `1.2.0`),
  "Environment validated (NODE_ENV=development, JWT_EXPIRY=8h,
  FABRIC_REQUIRED=false)", "Found 53 migration file(s)", "All migrations up
  to date", "Server confirmed listening on 0.0.0.0:3005". Stopped at the end
  of the run; prod 3001 + UI 3000 left running healthy.

## 1. Results by phase

### Phase A — Logins

| Check | Endpoint | HTTP | Verdict |
|---|---|---|---|
| Login ADMIN/ECTA/ECX/NBE/BANKS/CUSTOMS/SHIPPING/EXPORTER | `POST /auth/login` | 200 | **PASS** (8/8, token issued per role; `test_<role>_RBAC1`) |

### Phase 1 — Licence application

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 01 Submit application (public) | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794254442547-EJEST1`, status pending |
| 02 Check-by-email (status fields only) | `GET /exporters/exporter-applications/check/:email` | public | 200 | **PASS** | status fields only, no leak |
| 04 Approve as ECTA | `POST /exporters/exporter-applications/:id/approve` | ECTA | 400 | **BLOCKED** | `BLOCKCHAIN_ERROR: Blockchain registration failed: Not connected to Fabric network. Fabric rejected the proposal before ordering; no ledger transaction was created.` |
| 05 Submit second application | `POST /exporters/exporter-applications` | public | 201 | **PASS** | `APP-1794254466820-EFDAVK` |
| 06 Reject second application as ECTA | `POST /exporters/exporter-applications/:id/reject` | ECTA | 200 | **PASS** | status rejected — `d534a6b` fix verified live again |
| 07 Reject as EXPORTER (must fail 403) | `POST /exporters/exporter-applications/:id/reject` | EXPORTER | 403 | **PASS** | role guard works (`Insufficient privileges. Required role: ECTA or ECTA_ADMIN`) |
| 08 Applicant login (temp password set in PG as test setup; SMTP unconfigured) | `POST /auth/applicant/login` | APPLICANT | 200 | **PASS** | applicant token issued, `applicationId: 2` |
| 09 Resubmit as applicant | `POST /exporters/exporter-applications/2/resubmit` | APPLICANT | 200 | **PASS** | resubmitted, status pending (numeric id + own email in body) |
| 09b Resubmit another application's id as applicant (must fail 403) | `POST /exporters/exporter-applications/1/resubmit` | APPLICANT | 403 | **PASS** | wrong-application guard works |
| 10 Resubmit without token (must fail 401) | `POST /exporters/exporter-applications/2/resubmit` | none | 401 | **PASS** | |

### Phase 2 — Contract + ECX lot

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 11 Create sales contract | `POST /contracts` | ECTA | 500 | **BLOCKED** | `REGISTRATION_ERROR: Not connected to Fabric network. Fabric rejected the proposal before ordering; …` — no PG row created |
| 12 Approve contract | `POST /contracts/CTR-DEV32000/approve` | ECTA | 404 | **BLOCKED** | `Contract not found` — cascade of 11 |
| 13 ECX lot intake | `POST /ecx/lots` | ECX | 400 | **BLOCKED** | `INTAKE_FAILED: Not connected to Fabric network. Fabric rejected the proposal before ordering; …`. PG mirror runs only after chaincode intake, so 0 `ecx_lots` rows (verified) |
| 14 ECX portal | `GET /portals/ecx` | ECX | 200 | **PASS** | `availableLots: []`, trading metrics all 0 — correct, no lots exist |

### Phase 3 — Shipment + quality

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 15 Shipment create (full body) | `POST /shipments` | ECTA | 202 | **PASS** | degraded: `blockchainSynced: false`, `status: CREATED` |
| 16 Quality inspection create | `POST /quality/inspections` | ECTA | 200 | **PASS** | **verdict changed, intended (§3.1)**: `inspectionID: QI-DEV32000`, `status: PENDING`, `couchdbSynced: false`, `couchdbWarning: "CouchDB write failed (ECONNRESET); inspection saved to Postgres only and will need a CouchDB sync on the Fabric host."` Row verified in PG (`QI-DEV32000 \| PENDING`). CouchDB is down on this machine (nothing on 5984, no `COUCHDB_URL`) — pre-existing environment, not a regression |
| 17 Quality approve, non-existent id (phantom guard) | `PUT /quality/inspections/QI-NOPE-DEV32000/approve` | ECTA | 404 | **PASS** | `Inspection not found` — `d534a6b` phantom fix verified |
| 18 Quality approve, real id | `PUT /quality/inspections/QI-DEV32000/approve` | ECTA | 400 | **PASS** | **verdict changed, intended (§3.2)**: `INVALID_STATUS: "Cannot approve inspection. Current status: PENDING. Must be 'INSPECTED' first."` — the guard is correct per the status machine. Full path probed live after the run: `POST …/perform` → 200 `INSPECTED` (PG row confirmed), then approve → 200 `APPROVED` (`blockchainSynced: false` + honest warning, PG row confirmed), re-approve → 400 `INVALID_STATUS` |

### Phase 4 — LC + forex

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 19 LC issue | `POST /banking/lc/issue` | BANKS | 500 | **BLOCKED** | `LC_ISSUE_FAILED: Not connected to Fabric network. Fabric rejected the proposal before ordering; …` |
| 20 LC examine documents | `POST /banking/lc/LC-DEV32000/examine` | BANKS | 400 | **BLOCKED** | `EXAMINATION_FAILED: Not connected to Fabric network. …` |
| 21 LC release payment | `POST /banking/lc/LC-DEV32000/release-payment` | BANKS | 400 | **BLOCKED** | `PAYMENT_RELEASE_FAILED: Not connected to Fabric network. …` |
| 22 Forex request | `POST /forex/request` | BANKS | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network. …` |
| 23 NBE forex approve, non-existent id (phantom guard) | `POST /nbe/forex/FOREX-NOPE-DEV32000/approve` | NBE | 404 | **PASS** | `Forex allocation not found` — `d534a6b` phantom fix verified |
| 23b NBE portal pending check (seeded REQUESTED row in PG as test setup) | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests` lists the seeded `FOREX-DEV32000` row (count 2: mine + a leftover `G1XCAC363-FX1` REQUESTED row from another slice's run in the shared DB — data noise, not code). Warning-3 anomaly **not reproduced** a third run in a row: the seeded REQUESTED row is listed |
| 24 NBE forex approve, real row | `POST /nbe/forex/FOREX-DEV32000/approve` | NBE | 200 | **PASS** | status `CONFIRMED`, `blockchainSynced: false` + honest warning |
| 25 NBE forex repatriation | `POST /nbe/forex/FOREX-DEV32000/repatriation` | NBE | 200 | **PASS** | `status: COMPLETED`, `blockchainSynced: false`; row verified in PG (`forex_repatriations`: `FOREX-DEV32000 \| 55000.00 \| COMPLETED \| blockchain_synced=false`) |

### Phase 5 — Permit, phytosanitary, pre-shipment inspection

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 26 Export permit issue | `POST /permits` | BANKS | 400 | **BLOCKED** | `Not connected to Fabric network. Fabric rejected the proposal before ordering; no ledger transaction was created.` — harness now uses a BANKS token (permits requires BANKS/BANK_ADMIN; the ECTA call 403s). Same BLOCKED verdict as DEV21402, via the correct role |
| 27 Phytosanitary request | `POST /phytosanitary/request` | ECTA | 400 | **BLOCKED** | `REQUEST_FAILED: Not connected to Fabric network. …` |
| 28 Pre-shipment inspection request | `POST /inspection/request` | ECTA | 500 | **BLOCKED** | `Not connected to Fabric network. …` |

### Phase 6 — Shipping booking

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 29 Booking create | `POST /shipping/bookings` | ECTA | 200 | **PASS** | `BOOK-1794254709120`, status BOOKED |
| 30 Shipping portal | `GET /portals/shipping` | SHIPPING | 200 | **PASS** | `freightBookings: 1` — `SHP-DEV32000` with status `FREIGHT_BOOKED` — `aa0947f` fix #5 verified live again |
| 31 Booking load | `POST /shipping/bookings/:id/load` | SHIPPING | 200 | **PASS** | LOADED |
| 32 Booking depart | `POST /shipping/bookings/:id/depart` | SHIPPING | 200 | **PASS** | IN_TRANSIT |
| 33 Booking arrive | `POST /shipping/bookings/:id/arrive` | SHIPPING | 200 | **PASS** | ARRIVED |
| 34 Booking deliver | `POST /shipping/bookings/:id/deliver` | SHIPPING | 200 | **PASS** | DELIVERED (shipment row in PG now `DELIVERED` — booking mirror works) |
| 35 Book freight on shipment | `POST /shipments/SHP-DEV32000/book-freight` | SHIPPING | 404 | **BLOCKED** | `Shipment not found` — handler reads the shipment from chaincode (`ReadShipment`) first |
| 36 Land transport start | `POST /shipments/SHP-DEV32000/land-transport/start` | SHIPPING | 400 | **BLOCKED** | `LAND_TRANSPORT_START_FAILED: Not connected to Fabric network. …` |

### Phase 7 — Customs

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 37 Declaration submit | `POST /customs/declaration/submit` | ECTA | 200 | **PASS** | `DECL-DEV32000`, status SUBMITTED, `blockchain_tx_id: null` |
| 38 Customs portal | `GET /portals/customs` | CUSTOMS | 200 | **PASS** | `pendingDeclarations` includes `DECL-DEV32000` (counts include other slices' rows in the shared DB) |
| 39 Review declaration | `POST /customs/declaration/DECL-DEV32000/review` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION, officer assigned (PG fallback after chaincode retry backoff) |
| 40 Inspect declaration | `POST /customs/declarations/DECL-DEV32000/inspect` | CUSTOMS | 200 | **PASS** | status UNDER_INSPECTION |
| 41 Complete inspection | `POST /customs/declaration/DECL-DEV32000/complete-inspection` | CUSTOMS | 200 | **PASS** | status UNDER_REVIEW, result PASSED |
| 42 Clear declaration | `POST /customs/declarations/DECL-DEV32000/clear` | CUSTOMS | 404 | **BLOCKED** | **verdict changed (§3.3 / §4)**: `Route /api/v1/customs/declarations/DECL-DEV32000/clear not found` — the plural route was deliberately removed in `e6f2a82` (TEST-STATUS-MATRIX §17 #14). The canonical singular route was probed live: `POST /customs/declaration/DECL-DEV32000/clear` → 500 `SERVER_ERROR: Not connected to Fabric network. …`, declaration stays `UNDER_REVIEW` in PG. No dev-mode path to CLEARED remains |
| 43 Border crossing initiate | `POST /bordercrossing/initiate` | CUSTOMS | 500 | **BLOCKED** | `Not connected to Fabric network. …` |

### Phase 8 — Payments, SWIFT, settlement, retention

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 44 Payment initiate (correct F4 body) | `POST /payments/initiate` | BANKS | 400 | **BLOCKED** | `INITIATION_FAILED: Not connected to Fabric network. …` |
| 45 Payment record (correct F4 body) | `POST /payments/record` | BANKS | 500 | **BLOCKED** | `INTERNAL_ERROR: Not connected to Fabric network. …` |
| 46 SWIFT message create (MT700) | `POST /swift/messages` | BANKS | 400 | **BLOCKED** | `SWIFT_MESSAGE_CREATE_FAILED: Not connected to Fabric network. …` |
| 47 Payment settle | `POST /payments/PAY-DEV32000/settle` | BANKS | 404 | **BLOCKED** | `Payment not found` — cascade: no payment exists |
| 48 Payment release as NBE | `POST /payments/PAY-DEV32000/release` | NBE | 404 | **BLOCKED** | `Payment not found: PAY-DEV32000` — cascade (role check passes as NBE) |
| 49 Retention policy get (fallback) | `GET /retention/policy/COFFEE` | NBE | 200 | **PASS** | default NBE policy, retention 40%, surrender 60% |
| 50 Retention record (correct F8 body) | `POST /retention/FOREX-DEV32000/retention` | NBE | 404 | **BLOCKED** | `FOREX_NOT_FOUND` — the route reads the forex from the chaincode first, so with Fabric down it 404s even though the PG row exists |

### Phase 9 — Post-delivery (phantom fix under test)

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 51a Payment received, **no tracking row** | `POST /post-delivery/SHP-DEV32000/payment` | BANKS | 404 | **PASS** | `Post-delivery record not found` — `3ae075a` phantom fix holds |
| 52a Forex repatriated, **no tracking row** | `POST /post-delivery/SHP-DEV32000/forex` | NBE | 404 | **PASS** | `Post-delivery record not found` |
| 53a LC settlement, **no tracking row** | `POST /post-delivery/SHP-DEV32000/lc-settlement` | BANKS | 404 | **PASS** | `Post-delivery record not found` |
| 54a ECTA audit, **no tracking row** | `POST /post-delivery/SHP-DEV32000/ecta-audit` | ECTA | 404 | **PASS** | `Post-delivery record not found` |
| — Seed (plain INSERT, harness fixed — the old `ON CONFLICT (shipment_id)` seed errored, see §5) | psql INSERT into `post_delivery_tracking` | — | — | **PASS** | `INSERT 0 1`, 1 row for `SHP-DEV32000` |
| 51b Payment received | `POST /post-delivery/SHP-DEV32000/payment` | BANKS | 200 | **PASS** | `Payment recorded successfully` |
| 52b Forex repatriated | `POST /post-delivery/SHP-DEV32000/forex` | NBE | 200 | **PASS** | `Forex repatriation recorded successfully` |
| 53b LC settlement | `POST /post-delivery/SHP-DEV32000/lc-settlement` | BANKS | 200 | **PASS** | `LC settlement recorded successfully` |
| 54b ECTA audit | `POST /post-delivery/SHP-DEV32000/ecta-audit` | ECTA | 200 | **PASS** | `ECTA audit recorded successfully` |
| 55 Close contract | `POST /post-delivery/SHP-DEV32000/close-contract` | ECTA | 200 | **PASS** | `Contract closed successfully` (`blockchainSynced: false`, chaincode `UpdateContractStatus` did not complete — honest) |
| 56 Status | `GET /post-delivery/SHP-DEV32000/status` | ECTA | 200 | **PASS** | `overallStatus: COMPLETED`, all four flags true, `contractClosed: true`, **`completionPercentage: 100`** — the DEV21402 125% bug is fixed (`099d125` verified live) |
| 57 Dashboard | `GET /post-delivery/dashboard` | ECTA | 200 | **PASS** | summary + views return (1 shipment, 1 completed) |
| — Final DB state | `post_delivery_tracking` | — | — | **PASS** | `overall_status: COMPLETED`, stored `completion_percentage: 100`, all five flags true |

### Phase 10 — Documents + signatures

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 58 Upload a real PDF (minimal valid PDF, multipart) | `POST /documents/upload` | EXPORTER | 200 | **PASS** | `documentId: DOC-1794255071095672264`, SHA-256 hash returned, `ipfsCID: null`, `status: uploaded`; file stored on disk under `api/uploads/documents/`, row in PG (`active`) |
| 59 List documents for the contract | `GET /documents?entityType=CONTRACT&entityId=CTR-DEV32000` | EXPORTER | 200 | **PASS** | the uploaded document is listed with its hash |
| 60 Sign the document | `POST /documents/:id/sign` | ECTA | 503 | **BLOCKED** | `LEDGER_QUERY_FAILED: Fabric is unavailable while confirming this document hash. Please retry signing.` — honest failure, not a silent pass. **Signing does not work in dev mode; it needs Fabric.** |
| 61 List signatures | `GET /documents/:id/signatures` | ECTA | 200 | **PASS** | `signatures: []`, count 0 — consistent with 60 |
| 62 Download the document | `GET /documents/:id/download` | EXPORTER | 200 | **PASS** | returns the exact PDF bytes uploaded |
| 63 Blockchain signatures for the document | `GET /blockchain-signatures/entity/DOCUMENT/:id` | ECTA | 200 | **PASS** | degraded: `transactions: []`, `fabricLedger: 0` — returns empty instead of failing |

### Phase 11 — Portals + status

| Step | Endpoint | Role | HTTP | Verdict | Result / error |
|---|---|---|---|---|---|
| 64 ECTA portal | `GET /portals/ecta` | ECTA | 200 | **PASS** | `pendingApplications: 2` (the two new applications; shared DB was rebuilt, so no older rows) |
| 65 Banks portal | `GET /portals/banks` | BANKS | 200 | **PASS** | portals return |
| 66 NBE portal | `GET /portals/nbe` | NBE | 200 | **PASS** | `pendingForexRequests` no longer lists `FOREX-DEV32000` after approve (only the leftover `G1XCAC363-FX1` remains). Note: `totalAllocations` moved — it is now under `forexStatistics` (`"totalAllocations": "2"`), not top-level as in DEV21402 |
| 67 Exporter portal | `GET /portals/exporters` | EXPORTER | 200 | **PASS** | correct slug `exporters` |
| 68 Status transitions CONTRACT | `GET /status/transitions/CONTRACT` | ECTA | 200 | **PASS** | `REGISTERED → [APPROVED, REJECTED, CANCELLED]`, `APPROVED → [CANCELLED, COMPLETED]`, `REJECTED → [REGISTERED]` — CANCELLED paths added since DEV21402 (status-matrix work), table still coherent |
| 69 Status transitions SHIPMENT | `GET /status/transitions/SHIPMENT` | ECTA | 200 | **PASS** | full chaincode-aligned table |
| 70 Status transitions PAYMENT | `GET /status/transitions/PAYMENT` | ECTA | 200 | **PASS** | `VERIFIED → [SWIFT_INITIATED, SETTLED]` — the `3ae075a` statusManager fix still visible live |
| 71 Workflow status for the contract | `GET /status/workflow/CTR-DEV32000?type=CONTRACT` | ECTA | 200 | **PASS** | contract `NOT_FOUND` (cascade of step 11), forex/lc/shipment/payment empty |

## 2. What the re-run proves about the fixes

| Fix | Verified live in dev mode? |
|---|---|
| `d534a6b` exporter reject 500 → 200 | **Yes** (step 06) |
| `d534a6b` applicant resubmit 403 → 200 | **Yes** (step 09) |
| `d534a6b` phantom approves → 404 | **Yes** (steps 17, 23) |
| `d534a6b` post-delivery schema (migration 054) | **Yes** (steps 51b–57 work once a tracking row exists) |
| `aa0947f` shipping booking → portal `freightBookings` | **Yes** (steps 29–30) |
| `aa0947f` NBE repatriation PG path + `blockchainSynced: false` | **Yes** (step 25; `forex_repatriations` row verified in PG) |
| `aa0947f` ECX lot PG mirror | **No — by design**: the mirror runs only after a successful chaincode intake, so in dev mode intake stays BLOCKED and nothing is mirrored |
| `aa0947f` / `3ae075a` statusManager PAYMENT VERIFIED → SETTLED | **Yes, in the transitions table** (step 70); the settle route itself is untestable without a payment, which needs Fabric |
| `3ae075a` post-delivery phantom 200 → 404 | **Yes** (steps 51a–54a) |
| `3ae075a` status defaults (migration 058) | **Yes** (shipment create returns `CREATED`) |
| `eccb841` quality-create best-effort CouchDB (was 500, now saves to PG) | **Yes, new in this run** (step 16: 200, `couchdbSynced: false` + warning, PG row verified) |
| `099d125` post-delivery `completionPercentage` 125 → 100 | **Yes, new in this run** (step 56: 100; stored row 100) |
| `e6f2a82` plural customs-clear removal (§17 #14) | **Yes — as a behaviour change** (step 42: 404 on the removed route; canonical singular route probed → 500 Fabric, §4) |
| `aa0947f` chain-side parts (lot mirror, booking mirror, repatriation Initiate → Record, settle) | **Not provable here** — need a Fabric host running this branch |

## 3. Verdict changes vs DEV21402 (61 PASS / 0 FAIL / 23 BLOCKED → 62 / 0 / 22)

| Check | DEV21402 | This run | Raw evidence | Intended or regression |
|---|---|---|---|---|
| 16 quality-create | BLOCKED (500 `SERVER_ERROR: socket hang up`) | **PASS (200)** | `{"inspectionID":"QI-DEV32000","status":"PENDING","couchdbSynced":false,"couchdbWarning":"CouchDB write failed (ECONNRESET); inspection saved to Postgres only …"}`; PG row `QI-DEV32000 \| PENDING` | **Intended** — the handoff audit (`eccb841`) made the CouchDB write best-effort so a down CouchDB no longer fails the create. CouchDB is down on this machine (pre-existing environment) |
| 18 quality-approve, real id | BLOCKED (404, cascade of 16) | **PASS (400 guard-correct)** | `400 INVALID_STATUS: "Cannot approve inspection. Current status: PENDING. Must be 'INSPECTED' first."` Probed live: perform → 200 `INSPECTED` (PG confirmed), approve → 200 `APPROVED` (`blockchainSynced: false` + honest warning, PG confirmed), re-approve → 400 `INVALID_STATUS` | **Intended** — consequence of 16: the inspection now exists, so the status-machine guard answers instead of a 404. The harness should add a `perform` call before approve (harness improvement, not a code issue) |
| 42 customs-clear | PASS (200 CLEARED) | **BLOCKED (404 on the harness route)** | Harness route `POST /customs/declarations/DECL-DEV32000/clear` → `404 Route … not found`. Canonical singular route probed: `POST /customs/declaration/DECL-DEV32000/clear` → `500 SERVER_ERROR: Not connected to Fabric network. …`; PG row stays `UNDER_REVIEW` | **Intended removal, but a dev-mode capability loss — see §4.** The plural route was deliberately removed in `e6f2a82` (TEST-STATUS-MATRIX §17 #14: no callers, unguarded, never called chaincode, wrote directly to CouchDB). The remaining route is Fabric-only |

Same-verdict value changes worth recording (not verdict changes):
- **56 completionPercentage 125 → 100** (both runs 200 PASS; the value is now
  correct — `099d125` verified live, stored row also 100).
- **68 CONTRACT transitions** gained `CANCELLED` paths (`REGISTERED →
  [APPROVED, REJECTED, CANCELLED]`, `APPROVED → [CANCELLED, COMPLETED]`,
  `REJECTED → [REGISTERED]`) vs DEV21402's `REGISTERED → [APPROVED,
  REJECTED]` — status-matrix evolution, still PASS.
- **66 NBE portal**: `totalAllocations` moved from top-level into
  `forexStatistics` (`"totalAllocations": "2"`); pending lists still correct.
- **Fabric error strings** are longer in this run (see §5); verdicts
  unaffected.
- Counts that differ for **data** reasons only (shared DB was rebuilt, other
  slices' rows present): 23b pending count 2 (mine + leftover `G1XCAC363-FX1`)
  vs 1; 30 `freightBookings` 1 vs 3; 64 `pendingApplications` 2 vs 5.

## 4. New finding — no dev-mode path to CLEARED for customs declarations

Step 42's old route returned 200 CLEARED in DEV21402 because it skipped the
chain and wrote to CouchDB. That route is gone by design (`e6f2a82`). The
canonical singular clear route goes through
`customsService.clearDeclaration` (`ClearCustomsDeclaration` on-chain + PG
update) and fails hard — 500 `SERVER_ERROR` — when Fabric is down, with no
PG fallback. Its sibling steps (submit 37, review 39, complete-inspection
41) all record the PG progression best-effort when the chain is down, so the
declaration reaches UNDER_REVIEW in dev mode but can never reach CLEARED
here. This is **not counted as a FAIL** (the step needs Fabric, which is
absent), but it is a real dev-mode capability regression vs DEV21402 and an
inconsistency with the neighbouring handlers. Suggested follow-up (not done
here — out of this slice's scope): give the singular clear route the same
best-effort PG fallback as submit/review/complete-inspection, and update the
harness step 42 to call the singular route. Proving the on-chain clear still
needs a Fabric host.

## 5. Harness fixes applied + run configuration

New harness (untracked working files, no tracked source touched):
`~/workspace/GoCBC/.devrun/run-dev-e2e-3.sh` (copied from
`run-dev-e2e-2.sh`, diff verified), results in
`~/workspace/GoCBC/.devrun/out-run3/`, log `run3.log`, env `run3.env`.
Four changes vs run 2:
1. **Step 26 permits: ECTA token → BANKS token** (the known issue in the
   task: permits now requires BANKS/BANK_ADMIN; the ECTA call 403s).
2. **Login usernames `TMW977G36` → `RBAC1`** (required: the `TMW977G36`
   accounts no longer exist after the DB rebuild in ENVIRONMENT INCIDENT
   #3 — verified: `test_admin_TMW977G36` login returns
   `INVALID_CREDENTIALS`, `test_admin_RBAC1` returns a token).
3. **Phase 9 seed: `ON CONFLICT (shipment_id) DO NOTHING` → plain INSERT**
   (the old seed errored — `post_delivery_tracking` has no unique
   constraint on `shipment_id` — which is why DEV21402's main-run 51b–56
   404'd and needed followups; in this run the seed works in the main run:
   `INSERT 0 1`, 1 row, 51b–56 all 200, no followups needed).
4. **Namespace `DEV2…` → `DEV3…`** (run namespace convention; this run
   `DEV32000`) and output dir `out2` → `out-run3` (so DEV21402's `out2`
   evidence is untouched; `out3/` already holds another slice's outputs).

Configuration used for this run (differs from DEV21402 — judged
accordingly):
- `/tmp/cecbs-api.env`: `NODE_ENV=development`, `PORT=3001`,
  `JWT_EXPIRY=8h`, **`FABRIC_ENABLED=false`**, `FABRIC_REQUIRED=false`,
  `FABRIC_AS_LOCALHOST=true`, channel `coffeechannel`, chaincode `coffee`,
  MSP `ECTAMSP`. DEV21402's report says its health also showed
  `blockchain: false`, but its Fabric errors were the bare
  `Not connected to Fabric network`; in this run, with
  `FABRIC_ENABLED=false`, the gateway is not initialised at all and the same
  failures carry the longer suffix `Fabric rejected the proposal before
  ordering; no ledger transaction was created.` The underlying cause is
  identical (no Fabric) and **no verdict depends on the string** — every
  Fabric-blocked step has the same status code and the same BLOCKED verdict
  as DEV21402, except steps 16/18/42 which are explained in §3.
- CouchDB down (nothing on 5984, no `COUCHDB_URL`): step 16 now passes
  best-effort instead of 500ing; step 60 still honestly 503s on Fabric.
- Branch `features` HEAD `b2e7ccb` (DEV21402 was `fix/auth-chaincode-audit`
  HEAD `3ae075a`); the fix branch has since been merged into `features`.

## 6. Run conditions

- No dev-server restarts interrupted this run (zero `000` responses).
- The dev server on 3005 was stopped at the end of this run. The prod API
  on 3001 (rebuilt dist, PID 12953) and the UI on 3000 (fresh production
  build, PID 13007) were restarted by this slice and are healthy at the end.
  Postgres stays online.
- Raw per-step JSON responses in
  `~/workspace/GoCBC/.devrun/out-run3/`, run log
  `~/workspace/GoCBC/.devrun/run3.log`, env
  `~/workspace/GoCBC/.devrun/run3.env`, server logs
  `api-dev-3005-run3.log` / `api-prod-3001-run3.log` / `ui-3000-run3.log`.
- **Task 3 (ECX portal REJECTED filter browser re-click): NOT DONE — no live
  browser is available in this subagent session.** Subagents cannot operate
  a live browser; this must be done by an agent with browser access. Do not
  read this report as claiming a browser check.
- Still BLOCKED, with dependency named (22): 04, 11, 12, 13, 19, 20, 21, 22,
  26, 27, 28, 35, 36, 43, 44, 45, 46, 47, 48, 50 — **Fabric** (no network on
  this machine); 42 — **Fabric** (canonical clear route, §4); 60 —
  **Fabric** (signing needs the ledger). Step 16's CouchDB dependency is now
  best-effort and no longer blocks. Nothing in this run is FAIL.
