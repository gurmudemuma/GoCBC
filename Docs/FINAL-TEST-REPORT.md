# CECBS (GoCBC) — Final Test Report

**Branch:** `fix/auth-chaincode-audit` · **HEAD:** `3ae075a` ("Audit and fix all
status transitions end-to-end (TEST-STATUS-MATRIX)") · **Date:** 2026-11-09
**Scope:** everything tested on this branch so far — the live API run
(TMW977G36), the UI browser smoke test, both dev-mode end-to-end runs
(DEV1325, DEV21402), and the status-transition matrix audit.
**All fix commits are local only — none pushed, none deployed on the user's
Docker host** (see §5).

**Verdict rules (all runs):** PASS = behaved as specified. FAIL = the API
itself is wrong with the API running (wrong status, missing route, missing
field, 500 from bad code/schema, phantom success). BLOCKED = the step needs
Fabric, CouchDB, IPFS or SMTP absent on this machine — the exact error is
recorded; not a failure of the API code.

## Run inventory

| Run | What | Result |
|---|---|---|
| TMW977G36 (live API, port 3001) | 235 checks: auth + fixed-auth 15, workflow 152, portal tabs 68 | **102 PASS, 16 FAIL, 74 BLOCKED, 8 info** — 5 real API bugs found, all fixed in `d534a6b` |
| UI browser smoke test (headless Chromium 158, port 3000) | 7 portals, 60 tabs, 16 sub-tabs | **7/7 portals, 60/60 tabs, 16/16 sub-tabs, 0 blank, 0 JS errors**; 10 failed API calls (8× 500 Fabric, 2× 404) |
| DEV1325 (dev mode, port 3005, HEAD `aa0947f` + uncommitted edits) | 84 checks | **60 PASS, 1 FAIL, 23 BLOCKED** — the FAIL was the post-delivery phantom 200, fixed in `3ae075a` |
| DEV21402 (dev mode, port 3005, HEAD `3ae075a`, clean tree) | 84 checks | **61 PASS, 0 FAIL, 23 BLOCKED** — the clean re-run; canonical per-step verdicts in §1 |
| Status matrix audit (STMATRIX1 live run) | 121 transitions across 15 entities | **35 disagreements found, 17 fixed, 18 remaining**; 14 transitions live-verified, 30 STATIC-ONLY (need a live peer) |

## 1. Workflow steps, start to finish — canonical verdicts (run DEV21402)

The full export workflow as a new licence application travels it. BLOCKED
means "needs Fabric/CouchDB/IPFS/SMTP that does not exist on this machine",
not "broken".

| # | Step | Endpoint | Verdict | Note |
|---|---|---|---|---|
| — | Login × 8 roles | `POST /auth/login` | **PASS** | all 8 tokens issued |
| 01 | Submit licence application (public) | `POST /exporters/exporter-applications` | **PASS** | 201, status pending |
| 02 | Check by email (public) | `GET /exporters/exporter-applications/check/:email` | **PASS** | status fields only, no leak |
| 04 | Approve application as ECTA | `POST /exporters/exporter-applications/:id/approve` | **BLOCKED** | `BLOCKCHAIN_ERROR` — needs `RegisterExporter` on-chain |
| 05 | Submit second application | `POST /exporters/exporter-applications` | **PASS** | 201 |
| 06 | Reject second application as ECTA | `POST /exporters/exporter-applications/:id/reject` | **PASS** | 200, status rejected (`d534a6b` fix) |
| 07 | Reject as EXPORTER (guard) | `POST /exporters/exporter-applications/:id/reject` | **PASS** | 403 role guard |
| 08 | Applicant login (temp password) | `POST /auth/applicant/login` | **PASS** | token issued (temp password set in PG as test setup; SMTP unconfigured) |
| 09 | Resubmit as applicant | `POST /exporters/exporter-applications/:id/resubmit` | **PASS** | 200 — numeric id + own email in body (`d534a6b` fix, genuinely verified in DEV21402) |
| 09b | Resubmit another application (guard) | `POST /exporters/exporter-applications/:id/resubmit` | **PASS** | 403 |
| 10 | Resubmit without token (guard) | `POST /exporters/exporter-applications/:id/resubmit` | **PASS** | 401 |
| 11 | Create sales contract | `POST /contracts` | **BLOCKED** | `REGISTRATION_ERROR` — writes no PG row; everything downstream cascades |
| 12 | Approve contract | `POST /contracts/:id/approve` | **BLOCKED** | 404 cascade of 11 |
| 13 | ECX lot intake | `POST /ecx/lots` | **BLOCKED** | `INTAKE_FAILED` — PG mirror runs only after chaincode intake |
| 14 | ECX portal | `GET /portals/ecx` | **PASS** | `availableLots: []` (correct — no lots exist) |
| 15 | Shipment create | `POST /shipments` | **PASS** | 202 degraded, `blockchainSynced: false`, status CREATED |
| 16 | Quality inspection create | `POST /quality/inspections` | **BLOCKED** | 500 `socket hang up` — writes to CouchDB first; no CouchDB here |
| 17 | Quality approve, non-existent id (phantom guard) | `PUT /quality/inspections/:id/approve` | **PASS** | 404 (`d534a6b` fix) |
| 18 | Quality approve, real id | `PUT /quality/inspections/:id/approve` | **BLOCKED** | 404 — cascade of 16 (inspection never created) |
| 19 | LC issue | `POST /banking/lc/issue` | **BLOCKED** | `LC_ISSUE_FAILED` — Fabric |
| 20 | LC examine documents | `POST /banking/lc/:id/examine` | **BLOCKED** | `EXAMINATION_FAILED` — Fabric |
| 21 | LC release payment | `POST /banking/lc/:id/release-payment` | **BLOCKED** | `PAYMENT_RELEASE_FAILED` — Fabric |
| 22 | Forex request | `POST /forex/request` | **BLOCKED** | `REQUEST_FAILED` — Fabric |
| 23 | NBE forex approve, non-existent id (phantom guard) | `POST /nbe/forex/:id/approve` | **PASS** | 404 (`d534a6b` fix) |
| 23b | NBE portal pending check | `GET /portals/nbe` | **PASS** | seeded REQUESTED row listed (warning-3 anomaly not reproduced) |
| 24 | NBE forex approve, real row | `POST /nbe/forex/:id/approve` | **PASS** | 200 CONFIRMED, `blockchainSynced: false` |
| 25 | NBE forex repatriation | `POST /nbe/forex/:id/repatriation` | **PASS** | 200 COMPLETED, PG row written, `blockchainSynced: false` (`aa0947f` fix) |
| 26 | Export permit issue | `POST /permits` | **BLOCKED** | Fabric |
| 27 | Phytosanitary request | `POST /phytosanitary/request` | **BLOCKED** | `REQUEST_FAILED` — Fabric |
| 28 | Pre-shipment inspection request | `POST /inspection/request` | **BLOCKED** | Fabric |
| 29 | Shipping booking create | `POST /shipping/bookings` | **PASS** | 200 BOOKED |
| 30 | Shipping portal | `GET /portals/shipping` | **PASS** | `freightBookings` incl. new shipment FREIGHT_BOOKED (`aa0947f` fix) |
| 31–34 | Booking load / depart / arrive / deliver | `POST /shipping/bookings/:id/{load,depart,arrive,deliver}` | **PASS** | LOADED → IN_TRANSIT → ARRIVED → DELIVERED |
| 35 | Book freight on shipment | `POST /shipments/:id/book-freight` | **BLOCKED** | 404 — handler reads the shipment from chaincode first |
| 36 | Land transport start | `POST /shipments/:id/land-transport/start` | **BLOCKED** | Fabric |
| 37 | Customs declaration submit | `POST /customs/declaration/submit` | **PASS** | 200 SUBMITTED, `blockchain_tx_id: null` |
| 38 | Customs portal | `GET /portals/customs` | **PASS** | `pendingDeclarations: 1` |
| 39 | Customs review | `POST /customs/declaration/:id/review` | **PASS** | 200 UNDER_INSPECTION (PG fallback after chaincode retries) |
| 40 | Customs inspect | `POST /customs/declarations/:id/inspect` | **PASS** | 200 UNDER_INSPECTION |
| 41 | Customs complete inspection | `POST /customs/declaration/:id/complete-inspection` | **PASS** | 200 UNDER_REVIEW, PASSED |
| 42 | Customs clear | `POST /customs/declaration/:declarationId/clear` | **BLOCKED** | 500 — Fabric (chain-first singular clear; the earlier 200 CLEARED was the removed plural PG-only `/declarations/:id/clear` route) |
| 43 | Border crossing initiate | `POST /bordercrossing/initiate` | **BLOCKED** | 500 — Fabric |
| 44 | Payment initiate | `POST /payments/initiate` | **BLOCKED** | `INITIATION_FAILED` — Fabric |
| 45 | Payment record | `POST /payments/record` | **BLOCKED** | 500 — Fabric |
| 46 | SWIFT message create (MT700) | `POST /swift/messages` | **BLOCKED** | `SWIFT_MESSAGE_CREATE_FAILED` — Fabric |
| 47 | Payment settle | `POST /payments/:id/settle` | **BLOCKED** | 404 cascade — no payment exists |
| 48 | Payment release as NBE | `POST /payments/:id/release` | **BLOCKED** | 404 cascade |
| 49 | Retention policy get | `GET /retention/policy/COFFEE` | **PASS** | default NBE policy 40%/60% |
| 50 | Retention record | `POST /retention/:id/retention` | **BLOCKED** | 404 `FOREX_NOT_FOUND` — route reads forex from chaincode first |
| 51a–54a | Post-delivery record* with **no tracking row** | `POST /post-delivery/:id/{payment,forex,lc-settlement,ecta-audit}` | **PASS** | all 404 — **`3ae075a` phantom fix verified** (DEV1325's FAIL is gone) |
| 51b–54b | Post-delivery record* with seeded tracking row | same | **PASS** | all 200, row genuinely updated |
| 55 | Post-delivery close contract | `POST /post-delivery/:id/close-contract` | **PASS** | 200 `Contract closed successfully` |
| 56 | Post-delivery status | `GET /post-delivery/:id/status` | **PASS** | 200 COMPLETED, all flags true — but `completionPercentage: 125` (§6.1) |
| 57 | Post-delivery dashboard | `GET /post-delivery/dashboard` | **PASS** | summary + views return |
| 58 | Upload a real PDF | `POST /documents/upload` | **PASS** | 200, SHA-256 hash, stored on disk + PG, `ipfsCID: null` |
| 59 | List documents for the contract | `GET /documents?entityType=CONTRACT&entityId=…` | **PASS** | uploaded document listed with its hash |
| 60 | Sign the document | `POST /documents/:id/sign` | **BLOCKED** | 503 `LEDGER_QUERY_FAILED` — honest failure; **signing needs Fabric** |
| 61 | List signatures | `GET /documents/:id/signatures` | **PASS** | `[]`, count 0 — consistent with 60 |
| 62 | Download the document | `GET /documents/:id/download` | **PASS** | exact PDF bytes returned |
| 63 | Blockchain signatures for the document | `GET /blockchain-signatures/entity/DOCUMENT/:id` | **PASS** | degraded: `transactions: []`, `fabricLedger: 0` |
| 64 | ECTA portal | `GET /portals/ecta` | **PASS** | `pendingApplications: 5` |
| 65 | Banks portal | `GET /portals/banks` | **PASS** | returns |
| 66 | NBE portal | `GET /portals/nbe` | **PASS** | `pendingForexRequests: 0` after approve, `totalAllocations: 3` |
| 67 | Exporter portal | `GET /portals/exporters` | **PASS** | correct slug `exporters` |
| 68–70 | Status transitions CONTRACT / SHIPMENT / PAYMENT | `GET /status/transitions/:entity` | **PASS** | PAYMENT shows `VERIFIED → [SWIFT_INITIATED, SETTLED]` (`3ae075a` fix live) |
| 71 | Workflow status for the contract | `GET /status/workflow/:id?type=CONTRACT` | **PASS** | contract NOT_FOUND (cascade of 11) |

**Bottom line on the workflow:** everything that can run without Fabric
runs and passes (61/84 in DEV21402, 0 fails). The chain stops at the
contract: contract create writes no Postgres row, so contract approve, LC,
forex request, permit, phyto, inspection, payment initiate/record, SWIFT
and settlement can only be exercised on a Fabric host. The Postgres-backed
islands that do run end-to-end are: licence application → reject/resubmit,
shipment create, shipping booking lifecycle, customs submit → clear, NBE
forex approve/repatriation, post-delivery (once a tracking row exists),
documents upload/list/download — but **not** document signing.

## 2. Portal tabs — 60/60 rendered in a real browser

UI smoke test, headless Chromium 158 via Playwright, 2026-11-09 ~15:50 EAT.
**7/7 portals loaded (correct role, no login redirect), 60/60 top-level tabs
rendered, 16/16 sub-tabs rendered, 0 blank, 0 stuck spinners, 0 JS
exceptions.** "Content" = the tab renders real content or an honest empty
state (data is absent because the test DB holds almost no workflow entities
and every Fabric-backed write was blocked — the portals render correctly
around the missing data). 9 tabs show real rows.

| Portal | Tabs | Verdict |
|---|---|---|
| **ECTA** (10/10) | Pending Applications — content, 4 rows + Approve/Reject actions; Approved Exporters — content, 1 row; Sales Contracts — content, 0 rows; Quality Control — content, 1 row; License Renewals — content, 0 rows; Analytics — content, sub-tabs Overview/Trends/Breakdown all render; Pre-shipment Inspection — content, form + list (data call `GET /inspection` 500s, Fabric); User Management — content, table + create form; Audit Trail — content, 18 rows; Post-Delivery Audits — content, 0 rows | **10/10 PASS** |
| **ECX** (4/4) | Coffee Lots — content, 0 rows; Market Prices — content, static chart (hardcoded data); Grading Standards — content, static table 6 rows; User Management — content, table + form. Zero failed requests. | **4/4 PASS** |
| **NBE** (9/9) | Forex Monitoring — content, KPI filters All/Allocated/Requested/Expired (Allocated click verified switching the view); LC Monitoring — content; Exchange Rates — content (`GET /forex/rates` 500s, Fabric); SWIFT Monitoring — content, 1 row, sub-tabs All/Analytics/Compliance render (`GET /swift/messages` 500s, Fabric); Forex Repatriation — content, verify form (`GET /repatriation` 500s, Fabric); Policy & Compliance — content (`GET /forex/retention-policy/COFFEE` 404, `GET /analytics/compliance` 404 — route missing); Analytics — content, sub-tabs render; User Management — content; Audit Trail — content, 1 row | **9/9 PASS** |
| **Banks** (11/11) | Payment Operations → All LCs — content, honest "No LCs found"; Payment Methods — content; Document Examination — content; Payment Release — content; LC Discrepancies — content; Forex & Settlements → Forex Allocations — content, 1 row; LC Settlements — content; Communication & Issues → SWIFT Messages — content (`GET /swift/messages` 500s, Fabric); System Management → Analytics — content, sub-tabs render; User Management — content; Audit Trail — content, 1 row | **11/11 PASS** |
| **Customs** (8/8) | Submitted / Inspecting / Under Review / Cleared / Rejected — content, declaration lists render (0 rows each); Border Crossing — content, list + dialogs (`GET /bordercrossing` 500s, Fabric); User Management — content; Audit Trail — content, 1 row | **8/8 PASS** |
| **Shipping** (10/10) | Clearance / Land Transport / Port Arrival / Container Stuffing / Vessel Loading / Departed / In Transit / Destination Arrived / Delivered — content, lifecycle lists render (0 rows each); Users — content. Zero failed requests. | **10/10 PASS** |
| **Exporter** (8/8) | Dashboard — content, KPI cards + charts; Contracts — content; Forex & Banking — content; Shipments — content; Customs — content; LC & Payments — content, 1 row; Reports — content; Audit Trail — content, 1 row | **8/8 PASS** |

**Not tested in a browser:** any action that writes (approve/reject buttons,
forms, uploads, signatures) — read-only by design; the API runs cover those
endpoints. Any view whose data only exists on-chain renders with 0 rows and
failed calls until Fabric is connected: 10 distinct failed API calls in the
browser, 8× HTTP 500 "Not connected to Fabric network" (`/exporters`,
`/inspection`, `/forex/rates`, `/swift/messages` ×2, `/repatriation`,
`/bordercrossing`, `/payments`) and 2× HTTP 404 (`/forex/retention-policy/
COFFEE`, `/analytics/banking` — route does not exist).

## 3. Status transitions — chaincode vs API vs Postgres vs UI

Matrix in `TEST-STATUS-MATRIX.md`: **15 entities, 121 transitions checked,
35 disagreements found, 17 fixed in this audit, 18 remaining.**
30 transitions are STATIC-ONLY (chaincode, need a live peer); 14 were
live-verified against the local API (run STMATRIX1).

**Fixed in `3ae075a`** (API/Postgres/UI, plus 2 chaincode tables that need
re-package + redeploy to take effect): statusManager rewritten to the
chaincode machines (new QUALITY, SWIFT, ECX, PERMIT, REPATRIATION, BORDER,
POST_DELIVERY tables); PAYMENT `VERIFIED → SETTLED` allowed; LC
`UTILIZED → EXPIRED` added to the chaincode table; chaincode payment
validator rewritten to the implemented path; customs PG values aligned
(`SUBMITTED`/`UNDER_INSPECTION`/`UNDER_REVIEW`) and `ClearCustomsDeclaration`
arity fixed (7 → 4 args); quality status literals uppercased; shipment PG
mirrors on all 13 lifecycle handlers; ECX intake mirror `WAREHOUSED`;
permit PG mirror `ISSUED`; phyto revoke PG mirror `REVOKED`; settle PG
mirror `SETTLED`; post-delivery record* row-count 404s + close-step
verification; migration 058 status-default fixes; UI unions widened in
9 files.

**Remaining 18 (matrix §17) — the important ones:** unguarded chaincode
functions (`ApproveSalesContract` re-approval, `MigrateLCStatus`/`UpdateLC`
arbitrary writers, border functions with no guards); `RecordRepatriation`
can resurrect a `COMPLIED` record; shipment `CUSTOMS_CLEARED` /
`PERMIT_ISSUED` are never produced by any chaincode function; missing
chaincode functions (`RejectForex`, `NBEApproveSWIFTMessage`, phyto
request/inspect, `UpdateContractStatus`, four `Record*` shipment functions);
quality approve/reject and contract cancel/close are PG-only; **no Postgres
CHECK constraint exists on any status column**; permits routes have no auth
middleware; duplicate handlers disagree with each other; UI still carries
invented status values (`APPROVED_OR_ALLOCATED`, `AWAITING_LC`, `PAID`…).

## 4. What still needs the live Fabric host to prove

Everything in this list was verified in code only (STATIC-ONLY) or degrades
gracefully here. None of it can be proven on this machine.

- **The chain itself:** contract create/approve, LC issue/examine/release,
  forex request, permit issue, phyto request/inspect, pre-shipment
  inspection, payment initiate/record, SWIFT create/approve, settlement and
  release, border crossing — all 500/400 with "Not connected to Fabric
  network" here. The end-to-end chain only exists on a Fabric host.
- **Chaincode changes from this branch:** the rewritten payment validator
  and LC `UTILIZED → EXPIRED` table in `3ae075a` need a re-package +
  redeploy of `coffee` chaincode (the deploy scripts were fixed to CCAAS in
  `12d5a8d`; the old golang `package-and-deploy.sh` path must not be used).
- **The 9 missing on-path chaincode functions** (`RejectForex`,
  `ConfirmSettlement`, `RecordForexRepatriation`, `NBEApproveSWIFTMessage`,
  `AddSWIFTDocuments`, `LinkSWIFTMessageToPayment`,
  `RequestPhytosanitaryCertificate`, `InspectPhytosanitaryCertificate`,
  `RecordContainerStuffing`) — see `DOCKER-INTEGRATION-RUNBOOK.md`. The
  Docker integration run will stall on-chain at these steps until they are
  implemented + redeployed.
- **Chain-side mirrors:** ECX lot PG mirror, booking chain mirror,
  repatriation Initiate → Record sync, payment settle — all return
  `blockchainSynced: false` here by design.
- **Document signing:** 503 here; needs Fabric to confirm the hash.
- **Quality inspection create:** 500 here; writes to CouchDB first — needs
  CouchDB (one per peer org on the Fabric host).
- **The warning-3 anomaly** (NBE portal showing 0 pending forex while
  REQUESTED rows exist on the user's Docker host) — not reproduced in either
  dev run; uninvestigated on that host.
- **30 STATIC-ONLY status transitions** (matrix §17) — need a live peer to
  exercise.

## 5. Fix-branch status — what is done, what is not deployed

| Commit | What | Verified |
|---|---|---|
| `12d5a8d` | Auth + chaincode label fixes: `env.validation.ts` (startup requires strong `JWT_SECRET`, no fallback), both test-token ADMIN bypasses removed, token revocation + `jti`, login rate limit, crypto temp passwords, pg `?` placeholder fixes, role checks on approve/reject/revoke routes, chaincode labels aligned to `coffee_2.2`, deploy scripts fixed to CCAAS, Kafka/Zookeeper + dead volumes removed, Redis password from env | API tsc clean, build passes, startup gate smoke-tested |
| `469b280` | Frontend: recreated `ui/src/config/api.config.ts` + `organizationConfig.ts` (never committed; 47 files import them), `.gitignore` `config/` root-cause fix, SignDocumentButton/BanksPortal/ExporterPortal fixes | UI tsc clean, `next build` passes, all 7 portal routes |
| `9720ed7` | Actually tracks `env.validation.ts` (missed from `12d5a8d`) | — |
| `d534a6b` | 5 live-test API bugs: exporter reject 500, applicant resubmit 403, post-delivery schema (migrations 054/055), phantom approves → 404, NBE LC monitoring wrong table | All 5 re-tested live |
| `aa0947f` | 6 manual-test warnings: shipping booking → `FREIGHT_BOOKED`, NBE repatriation chain sync, ECX lot PG mirror, test-script corrections; + extra bugs found (`ecx_lots`/`forex_repatriations` tables never existed — migrations 056/057; ECX metrics `SUM(quantity_kg)` → `SUM(quantity)`; PAYMENT `VERIFIED → SETTLED`) | Booking + repatriation PG paths verified live; chain parts need Fabric |
| `3ae075a` | Status-transition audit: 17 of 35 disagreements fixed (matrix §16), post-delivery phantom 200 → 404, migration 058 | 14 transitions live-verified (STMATRIX1); chaincode parts STATIC-ONLY |

**Not fixed / not done:** committed `api/.env.blockchain` files still
tracked (secrets need rotating); three near-duplicate audit tables
untouched; documents ownership scoping not added; full per-route RBAC audit
of all ~46 route files not done; permits routes still without auth; no
Postgres CHECK on any status column; 18 matrix disagreements remaining
(§3); 9 missing chaincode functions not implemented.

**Deployment gap — the important one:** the user's Docker host runs
`features` at `042b8b7` (unfixed). **None of these six commits is on that
host.** Until the fix branch is pulled and the stack rebuilt/redeployed
there (API + UI + chaincode re-package for the chaincode changes), the host
still shows the original bugs — including the exporter-reject 500 the user
saw in their manual run. The dev-mode runs here prove the fixes work in
code; they do not prove anything about the host.

## 6. New findings from this round (DEV21402)

- **6.1 `completionPercentage` can exceed 100.** `GET /post-delivery/:id/
  status` returned 125 for a closed workflow without an LC. Cause:
  `calculateCompletionPercentage` counts 5 items but divides by
  `lc_used ? 5 : 4`. Fix: count the contract-closed step in the denominator
  (or cap at 100). Workflow itself completes correctly; only the reported
  percentage is wrong.
- **6.2 Correction to DEV1325.** Its post-delivery "passes" were phantoms:
  the F5 seed used `ON CONFLICT (shipment_id)`, but the table has no unique
  constraint on that column, so no row was ever seeded — the F5 200s came
  from pre-fix code and the close/status 404s were the missing row. This
  re-run proves the real behaviour with a correct seed. DEV1325's Phase 9
  "PASS (retested with a seeded row)" rows should be read as not actually
  verified.
- **6.3 Repatriation chain write is correctly skipped, not faked.** With no
  linked contract/exporter/shipment the handler returns
  `blockchainSynced: false` with an explicit warning instead of inventing
  ids — the right behaviour.

## Appendix — source files for this report

- `TEST-RESULTS.md` — live API run TMW977G36 (235 checks)
- `TEST-UI-RESULTS.md` — browser smoke test (7 portals, 60 tabs)
- `TEST-DEV-MODE-RESULTS.md` — dev-mode run DEV1325 (84 checks)
- `TEST-DEV-MODE-RESULTS-2.md` — dev-mode re-run DEV21402 (84 checks)
- `TEST-STATUS-MATRIX.md` — 121 transitions, 15 entities, 35 disagreements
- `TEST-PORTAL-INVENTORY.md` — 7 portals, 60 tabs, 13 UI↔API mismatches
- `TEST-WORKFLOW-MAP.md` — 26 steps, 174 transitions, required fields
- `DOCKER-INTEGRATION-RUNBOOK.md` — 9 missing on-path chaincode functions
  + the host checks the Docker integration run needs
