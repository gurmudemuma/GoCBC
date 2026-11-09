# Tab-to-Tab and Subtab-to-Subtab Status Transitions — Audit & Fixes

**Branch:** `fix/auth-chaincode-audit` (HEAD was `eccb841` at audit start; this work is the next commit).
**Date:** 2026-11-09. **Scope:** inside-a-portal tab/sub-tab status consistency — the companion
to the portal-to-portal handoff audit (`TEST-PORTAL-HANDOFFS.md` H1–H14, not redone here).
**Method:** read every portal component + tab components in `ui/src/components/portals/*.tsx`
and related tab components; compared every literal filter string, status union and KPI-card
filter value against the API/Postgres/chaincode agreed set in `TEST-STATUS-MATRIX.md`;
live-verified each filter against the local API (port 3001, Postgres, no Fabric) with seeded
rows, then re-ran the headless browser smoke test (Playwright + Chromium headless shell 158)
clicking every tab and every sub-tab/filter.
**Seed namespace:** `TABFIX` (3 applications, 6 contracts, 5 forex allocations, 10 LCs,
16 shipments, 5 declarations, 10 inspections, 5 lots, 2 post-delivery rows, 1 rejected user,
3 LC documents). Seed script: `/tmp/seed-tabfix.sql` (re-runnable, deletes prior TABFIX rows).

## Summary counts

| Scope | Count |
|---|---|
| Top-level tabs checked | **60** (ECTA 10, ECX 4, Exporter 8, Banks 11, Customs 8, NBE 9, Shipping 10) |
| Sub-tab / filter views checked | **22** (ECTA Analytics 3, NBE SWIFT 3, NBE Analytics 3, Banks Analytics 3, NBE Forex 4 KPI filters, Banks child tabs 5, ECTA QC filter buttons, PSI status dropdown) |
| Mismatches found | **58** (51 from the two read-only audits + 7 found during live verification) |
| Mismatches fixed | **58** |
| Mismatches remaining | **0** in the tab-filter class (see §10 for what still needs a live Fabric host) |
| Browser tabs clicked / rendered | **60 / 60**, 0 page errors (`pageerror`) in any portal |
| Live API filter checks | all pass (see §9) |

Verdict key: **MATCH** = the tab's filter can match real data the API returns.
**MISMATCH** = filter on a status the API never returns (wrong string / wrong case /
status nothing produces / synthetic value) or a filter the API's data can never satisfy.

## 1. ECTA Portal — 10 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Pending Applications | `pending` / `approved` / `rejected` (lowercase) | `GET /exporters/exporter-applications?status=` | `pending`, `approved`, `rejected` | MATCH | — |
| Approved Exporters (F1) | every row hardcoded `<StatusChip status="approved" label="ACTIVE" />` | `GET /exporters` (chain) + PG licence data | `PENDING`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `REVOKED` | MISMATCH — real licence status never displayed | Render real licence status via `getLicenseStatus()` (chain `licenseStatus`, expiry-date fallback → `EXPIRED`, else `ACTIVE`); dead `exporterColumns` deleted |
| Sales Contracts (F2) | KPI cards `'' / REGISTERED / APPROVED / REJECTED` only | `GET /contracts` | `PENDING`, `REGISTERED`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED` | MISMATCH — `PENDING`, `CANCELLED`, `COMPLETED` unreachable | Added `PENDING` / `CANCELLED` / `COMPLETED` cards. `DRAFT` was added by the same fix and then **removed again** during live verification (§8 #1): nothing writes `DRAFT` (create writes `REGISTERED`; the old `draft` default was removed by migration 058 and `chk_contracts_status` excludes it) |
| Sales Contracts (F3) | Breakdown log counted `PENDING_APPROVAL` | `GET /contracts` | (as above) | MISMATCH — dead value, always 0 | Count `PENDING` |
| Quality Control (F4) | shipment filter included `QUALITY_APPROVED` and `REGISTERED` | `GET /quality/inspections`, `GET /shipments` | QualityInspection: `PENDING`, `SAMPLE_COLLECTED`, `INSPECTED`, `APPROVED`, `REJECTED`, `PERMIT_ISSUED`, `COMPLETED`; shipments never `QUALITY_APPROVED`; `REGISTERED` is a contract status | MISMATCH | Filter now `CREATED / INSPECTION_PENDING / INSPECTED` |
| Quality Control (F5/F6) | "In Progress" KPI = `REQUESTED \|\| IN_PROGRESS`; "Completed" = `COMPLETED \|\| QUALITY_APPROVED` | `GET /quality/inspections` | `IN_PROGRESS` never assigned; `QUALITY_APPROVED` never produced | MISMATCH (×2) | "In Progress" = `INSPECTED`; "Completed" = `COMPLETED` only |
| Quality Control (F7) | table relabelled `PENDING` QualityInspection rows as `REQUESTED` | `GET /quality/inspections` | `PENDING` is the real state | MISMATCH — conflated with the separate PreShipmentInspection entity | Show `PENDING` |
| Quality Control (F8) | `inspectionFilterTab` state declared, never wired to any UI | `GET /quality/inspections` | (as above) | MISMATCH — dead filter state | Wired filter buttons `All / PENDING / REQUESTED / INSPECTED / APPROVED / REJECTED / PERMIT_ISSUED` (default `ALL`) |
| Quality Control — label | tab label counted pending shipments with `(i.shipmentID \|\| i.ShipmentID)` | `GET /quality/inspections` (rows carry `shipment_id`) | — | MISMATCH — label said 12, table has 11 (see §8 #6) | Label check now also reads `i.shipment_id` |
| Pre-shipment Inspection (F9/F10) | dropdown `ALL / REQUESTED / SCHEDULED / IN_PROGRESS / COMPLETED / PASSED / FAILED` | `GET /inspection` (chain-only) + `GET /quality/inspections` | `PASSED`/`FAILED` never assigned (`RecordInspectionResults` sets `COMPLETED` for PASS/CONDITIONAL_PASS/FAIL alike); `IN_PROGRESS` comment-only; `APPROVED`/`REJECTED` exist but had no option | MISMATCH | Filter set `REQUESTED / SCHEDULED / COMPLETED / APPROVED / REJECTED`; pass/fail derived from `overallResult` (`PASS`/`FAIL`/`CONDITIONAL_PASS`, `CONDITIONAL_PASS` counts as passed); View Report gate now `COMPLETED` |
| License Renewals | expiry-date based, no status filter | `GET /exporters` | `ACTIVE`, `EXPIRED` | MATCH | — |
| Analytics — Overview / Trends / Breakdown | Breakdown rendered only if `kpis.paymentMethods` exists | `GET /analytics/dashboard` | ECTA payload had no `paymentMethods` | MISMATCH — Breakdown never rendered for ECTA | `getECTAKPIs` now returns `paymentMethods` (same audit-trail query/shape as the NBE path) |
| User Management (F11) | status filter lacked `rejected` | `GET /users` | `active`, `suspended`, `inactive`, `rejected` | MISMATCH | Added `rejected` option |
| Audit Trail | no status filter (entity/action filters) | `GET /audit/portal/recent` | — | MATCH | — |
| Post-Delivery Audits (F12) | `deliveredShipments` filter `DELIVERED \|\| COMPLETED` | `GET /shipments`, `GET /post-delivery/:id/status` | `COMPLETED` is never a `shipments.status` | MISMATCH | Dropped `COMPLETED` |

**Browser (seeded):** Pending Applications 1 row, Approved Exporters 1, Sales Contracts 6
(one per status incl. `CANCELLED`/`COMPLETED` after §8 #3), QC 10 rows with all 7 filter
buttons returning the exact subset (`Pending 1`, `Requested 1`, `Inspected 1`, `Approved 3`,
`Rejected 1`, `Permit Issued 1`, `All 10`), User Management shows the seeded rejected user,
Post-Delivery shows the `TABFIX-SHP-DELIV` card, Analytics Breakdown renders payment methods.
Pre-shipment Inspection shows 0 rows in the browser: its data source `GET /inspection` is
chain-only (500 without Fabric) — filter verified by code only, §10.

## 2. ECX Portal — 4 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Coffee Lots (F13/F14) | `handleKPIFilter` never called (KPI cards had no `onClick`); no `REJECTED` branch; `stats.rejected` computed but no REJECTED card rendered | `GET /ecx/lots` | `WAREHOUSED`, `GRADED`, `ASSIGNED`, `RELEASED`, `REJECTED` | MISMATCH (×2) + API gap: `GET /ecx/lots` never read PG, so mirrored lots never appeared without Fabric | KPI cards wired to `handleKPIFilter`; REJECTED branch + card added; `GET /ecx/lots` now falls back to PG `ecx_lots` (also mirrors `grade`/`qualityScore`/`contractId`, which were never mirrored — found while verifying) |
| Market Prices | no status filter (static data); `OPEN` | `GET /ecx/market` | `marketStatus: "OPEN"` | MATCH | — |
| Grading Standards | no status filter (static reference table) | — | — | MATCH (no filter to mismatch) | — |
| User Management | org-scoped user list | `GET /users` | `active`, `suspended`, `inactive`, `rejected` | MATCH | — |

**Browser (seeded):** Coffee Lots 5 rows, KPI cards `Warehoused 1`, `Graded 1`, `Assigned 1`,
`Released 1`, `Rejected 1`. Note: the REJECTED KPI/filter may stay at 0 in production until
a lot-reject path exists — the grade route 400s on moisture > 12 before invoking
`GradeECXLot`, whose `REJECTED` branch therefore never runs, and no lot-reject endpoint
exists (§10).

## 3. Exporter Portal — 8 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Dashboard | `contractsActive = 'ACTIVE'` | `GET /contracts` | No `ACTIVE` contract status | MISMATCH — always 0 (F15) | Deleted; shared `isContractApproved(c)` helper (APPROVED only) |
| Dashboard / Contracts / Forex (F16) | `'NBE_APPROVED'` arms everywhere (12 sites) | `GET /contracts` | No `NBE_APPROVED` contract status | MISMATCH | All deleted; `isContractApproved(c)` + `hasIssuedLC()` helper drive the "Bank LC Issued" timeline step |
| Shipments (F17) | `shipmentsInTransit` included `'SHIPPED'` | `GET /shipments` | `SHIPPED` never returned | MISMATCH | Removed from the set |
| Shipments (F18) | `customsCleared` proxy `DEPARTED / IN_TRANSIT / SHIPPED`, missed `CUSTOMS_CLEARED` itself | `GET /shipments`, `GET /customs/declarations` | `CUSTOMS_CLEARED` (shipment) / `CLEARED` (declaration) | MISMATCH | `declarationsByShipment` map + `isShipmentCustomsCleared()` (cleared = `CUSTOMS_CLEARED` OR joined declaration `CLEARED`) |
| Forex & Banking (F19) | payment KPIs read `paymentTrackingStatus`, but the payment mapper never set that field | `GET /payments` (chain-only) | tracking-machine statuses | MISMATCH — KPIs always 0 | Mapper now populates `paymentTrackingStatus` from the chaincode payment's status, with a PG fallback and a guard to `PENDING` |
| Shipments (F20) | `shipmentsBooked = 'BOOKED' \| 'LOADED'` | `GET /shipments` | `LOADED` is a lifecycle state, not a booking | MISMATCH | Booking = `FREIGHT_BOOKED` |
| Forex & Banking (F21) | synthetic row `status: 'PENDING_LC'` | — | No such status | MISMATCH | Keep real contract status `APPROVED` with a separate boolean/flag |
| Shipments / Booking (F22/F23) | booking action did `PUT /shipments/:id/status {status: 'SHIPPED'}`; client rewrite `CREATED → 'SHIPPED'`; check `i.status === 'APPROVED' \|\| 'SHIPPED'` | `POST /shipping/bookings` | `SHIPPED` is in no machine (absent from statusManager, shipments CHECK, chaincode lifecycle) | MISMATCH (×3) — fail-open validator + unguarded chaincode setter let it through; PG CHECK then silently dropped the mirror | Booking now calls `POST /shipping/bookings` (`FREIGHT_BOOKED` flow); `CREATED → 'SHIPPED'` rewrite and the dead quality-inspections fetch deleted; `SHIPPED` removed from both shipment status unions |
| Customs (F24) | never read `declaration.status`; derived `customsStatus` from shipment sets with the same wrong cleared proxy | `GET /customs/declarations` | `CLEARED` | MISMATCH | Join declarations by `shipmentId`; cleared = `status === 'CLEARED'` |
| LC & Payments (F25/F26) | filter options `all / ISSUED / DOCUMENTS_SUBMITTED / SETTLED` | `GET /banking/lc` | `DOCUMENTS_SUBMITTED` is a payment status, never an LC status | MISMATCH | Filter set is now the 10 real LC statuses (`REQUESTED`, `APPROVED`, `ISSUED`, `FOREX_ALLOCATED`, `AMENDED`, `UTILIZED`, `PAYMENT_RELEASED`, `SETTLED`, `REJECTED`, `EXPIRED`); `DOCUMENTS_SUBMITTED`/`UNDER_REVIEW`/`CLOSED` dropped from the LC colour map |

**Browser (seeded):** LC & Payments 10 rows (all 10 LC statuses render). Other tabs show 0
rows for the test exporter user: the portal filters by the logged-in exporter's ID and the
test user owns no entities — consistent with the API for this user, not a status mismatch.

## 4. Banks Portal — 11 tabs (4 parent + 5 child + All LCs + Payment Methods)

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| All tabs (B1) | shared `filterStatus` state leaked across tabs — a Forex value persisted into the SWIFT tab (0 rows) and vice versa | `GET /forex`, `GET /swift/messages`, `GET /banking/lc` | different value domains per tab | MISMATCH | `useEffect` on `activeTab` resets shared `filterStatus` to `'ALL'` (covers parent- and child-tab switches) |
| Forex & Settlements (B2) | dropdown offered `EXPIRED` | `GET /forex` | forex `EXPIRED` never assigned | MISMATCH — dead option | Removed |
| Forex & Settlements (B3) | `CONFIRMED_OR_ALLOCATED` labelled "Approved" | `GET /forex` | `CONFIRMED`, `ALLOCATED` | MISMATCH — label only | Dropdown option and KPI card both relabelled "Confirmed / Allocated"; bucket logic untouched |
| Document Examination (B4) | queue `lcsForExamination` = `['APPROVED','FOREX_ALLOCATED','UTILIZED']` | `GET /banking/lc` (+ `documents`) | chaincode `ExamineLCDocuments` accepts exactly `{ISSUED, FOREX_ALLOCATED}`; `APPROVED` is rejected on-chain | MISMATCH — wrong both ways | Queue is now `['ISSUED','FOREX_ALLOCATED']` |
| Document Examination (B5) | `UTILIZED` LCs stayed in the pending exam queue (appeared under both sub-filters) | `GET /banking/lc` | `UTILIZED` = already examined | MISMATCH | Pending base explicitly excludes `UTILIZED` (verified bucket stays `lc.status === 'UTILIZED'`) |
| Payment Release (B6) | queue included `FOREX_ALLOCATED` | `GET /banking/lc` | chaincode `ReleaseLCPayment` requires `UTILIZED` only | MISMATCH | Queue is `UTILIZED` only; the `FOREX_ALLOCATED` "temporary" acceptance and its log line removed. Verified-docs and customs-`CLEARED` gates untouched |
| SWIFT (B7) | dropdown missed `APPROVED`, `PROCESSING`, `NBE_APPROVED` | `GET /swift/messages` (chain-only) | `swift.go:50-63` real states | MISMATCH | Added the three (`IN_TRANSIT`/`CANCELLED`/`FAILED` not added — matrix §10 says they are dead constants) |
| LC Settlements (B8) | `delivered` filter `DELIVERED \|\| COMPLETED` | `GET /shipments` | `COMPLETED` is not a shipment status | MISMATCH | Dropped `COMPLETED`; LC side (`PAYMENT_RELEASED ‖ SETTLED`) untouched |
| UnifiedPaymentWorkflow (B9) | LC step map missing `FOREX_ALLOCATED`, `AMENDED`, `PAYMENT_RELEASED`, `REJECTED` (fell through to step 0) | `GET /banking/lc` | all four real | MISMATCH | Added `FOREX_ALLOCATED:3`, `AMENDED:2`, `PAYMENT_RELEASED:5`, `REJECTED:5` |
| LC Discrepancies (B10) | dropdown `UNDER_REVIEW / RESOLUTION_AGREED / REJECTED` | `GET /lc-discrepancies` | only `REPORTED` / `RESOLVED` / `WAIVED` can match | MISMATCH | Dropdown now `REPORTED / RESOLVED / WAIVED` only; stats counts, status-chip map and the Resolve-action gate aligned to the same three states (`OPEN → REPORTED` mapping kept) |
| Issue LC / contracts (B11) | dead branches `lc.status === 'ACTIVE'`; contract `PENDING` / `NBE_APPROVED` | `GET /banking/lc`, `GET /contracts` | no `ACTIVE` LC status; `PENDING`/`NBE_APPROVED` are not contract statuses | MISMATCH | Removed from the issue-LC guard and contract branches (incl. the same dead `NBE_APPROVED` disjunct found while grepping) |
| All LCs (B12) | no filter UI at all | `GET /banking/lc` | 10 chaincode LC states + `PENDING` | MISMATCH — unfilterable | Status dropdown with the 11 real LC statuses, driven by new tab-local `allLcFilterStatus` (not the shared `filterStatus`); rows, header count and pagination all use `getFilteredAllLCs()`; chip colours extended for `SETTLED`/`REJECTED`/`EXPIRED` |
| — (B13) | dead helpers `getFilteredPayments`, `getFilteredContracts` | — | — | MISMATCH (dead code) | Deleted (zero callers verified first) |
| Document Examination / Payment Release — API gap | queues gate on `lc.documents` (must be non-empty) and, for payment release, verified documents + customs `CLEARED` | `GET /banking/lc` | PG fallback hardcoded `documents: []` and never set `customsClearanceStatus`/`customsCleared` | MISMATCH — queues could never fill in dev mode (see §8 #5) | PG list handler now populates `documents` per LC (active `LC` documents by `lc_id`/`lc_number`, incl. `verificationStatus`) and sets `customsClearanceStatus`/`customsCleared` from `CLEARED` declarations on the LC's contract |
| Dead `bank/` SWIFT files | `SWIFTDashboard`, `SWIFTMessageDetail`, `SWIFTNotifications`, `SWIFTStatistics`, `SWIFTDashboardWrapper` imported by nothing; `SWIFTNotifications.tsx:74` called `/swift/messages?status=RECEIVED,PENDING_APPROVAL` (comma lists unsupported; `PENDING_APPROVAL` never assigned) | — | — | MISMATCH (dead + wrong) | All five files deleted (verified unimported first) |
| `swiftApi.ts:231` | `getHighValueTransactions` queried `status: 'PENDING_APPROVAL'` | `GET /swift/messages` | `PENDING_APPROVAL` is a chaincode constant only, never assigned | MISMATCH (latent; service currently unimported) | Now queries `DRAFT` (the awaiting-approval SWIFT state) |

**Browser (seeded):** Forex KPI cards `Total Forex Requests 6`, `Pending Allocation 1`,
`Confirmed / Allocated 2`, `Total Requested 1` (pagination totals); Document Examination
pending queue 2 rows (`TABFIX-LC-ISS`, `TABFIX-LC-FXAL`, heading "(2)"); Payment Release
1 row (`TABFIX-LC-UTIL`); All LCs total 10 with all 11 dropdown options returning the exact
subset (`Issued 1`, `Forex Allocated 1`, `Utilized 1`, `Settled 1`, `Rejected 1`,
`Requested 1`, `Pending 0`, `Expired 1`, `Amended 1`, `Approved 1`, `Payment Released 1`).
SWIFT tab: chain-only 500, 0 rows — filter verified by code only, §10.

## 5. Customs Portal — 8 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Submitted (C1) | `d.status !== 'DRAFT'` — showed every non-draft declaration | `GET /customs/declarations` | `SUBMITTED`, `UNDER_INSPECTION`, `UNDER_REVIEW`, `CLEARED`, `REJECTED` | MISMATCH | Now `d.status === 'SUBMITTED'` |
| Inspecting (C2) | cumulative list `['UNDER_INSPECTION','UNDER_REVIEW','CLEARED','REJECTED']` | `GET /customs/declarations` | (as above) | MISMATCH | Now `d.status === 'UNDER_INSPECTION'` |
| Under Review (C3) | cumulative list `['UNDER_REVIEW','CLEARED','REJECTED']` | `GET /customs/declarations` | (as above) | MISMATCH | Now `d.status === 'UNDER_REVIEW'` |
| Cleared / Rejected | exact-equality filters | `GET /customs/declarations` | `CLEARED`, `REJECTED` | MATCH | — |
| Border Crossing (C4) | union/dropdown/chip map/action gating missed `CLEARED_EXIT`, `IN_TRANSIT`, `CROSSED`, `ARRIVED` — rows in those states rendered a wrong "Pending" chip | `GET /bordercrossing` (chain-only) | all four real per `bordercrossing.go`, matrix §14 | MISMATCH | Union, dropdown and chip map gained the four; action gating via `handleAdvance` on the existing routes: `CLEARED_EXIT → POST /:id/departure`, `IN_TRANSIT → POST /:id/crossing`, `CROSSED → POST /:id/arrival`. `ARRIVED` is terminal (no next action, correct chip) |
| — (C5) | dead `statusFilter` state + `getFilteredDeclarations()`; dead `permitReadyShipments` state + loader | — | — | MISMATCH (dead code) | Deleted (incl. the second `loadPermitReadyShipments` call site in the declaration-submit handler, which was breaking `tsc`) |
| — | `DRAFT` in the declaration union | — | UI-only pre-submit state | MATCH (deliberate, untouched) | — |

**Browser (seeded):** `Submitted 1`, `Inspecting 1`, `Under Review 1`, `Cleared 1`,
`Rejected 1` (DataGrid rows). Border Crossing tab renders but its data call
`GET /bordercrossing` 500s without Fabric — the four new states are verified by code
only, §10.

## 6. NBE Portal — 9 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Forex Monitoring (N1) | "Expired" sub-tab (comment claimed `forexSubTab` 3) | `GET /forex` | forex `EXPIRED` never assigned; no `setForexSubTab(3)` call; no `=== 3` KPI branch | MISMATCH — dead three ways | Removed; sub-tabs All / Allocated / Requested only |
| Forex Monitoring (N2) | grid `rows={forexAllocations}` unfiltered — sub-tabs only swapped KPI cards | `GET /portals/nbe`, `GET /forex` | `ALLOCATED`, `REQUESTED`, … | MISMATCH | Grid now filters by sub-tab: 0 → all, 1 → `ALLOCATED`, 2 → `REQUESTED` |
| Forex Monitoring (N3) | `ForexAllocation` status union contained `'APPROVED'` | `GET /forex` | legacy; new writes are `CONFIRMED` | MISMATCH | Removed from the union |
| SWIFT Monitoring (N4) | "Under Review" KPI counted `m.status === 'PENDING'` | `GET /swift/messages` (chain-only) | no such SWIFT status, always 0 | MISMATCH | Now counts `DRAFT ‖ NBE_APPROVED` |
| SWIFT Monitoring (N5) | `PENDING_APPROVAL` at 5 sites (stats count, high-value alert rule, chip colour, Approve button/modal gating) | `GET /swift/messages` (chain-only) | chaincode never assigns it | MISMATCH | Stats count, alert rule and chip colour use `DRAFT ‖ NBE_APPROVED`; Approve button/modal gating uses `DRAFT` only (the `nbe-approve` endpoint, chaincode `DRAFT → NBE_APPROVED`, rejects anything else — offering "Approve" on an already-`NBE_APPROVED` row would fail server-side) |
| LC Monitoring (N6) | "Active LCs" KPI counted only `ISSUED` | `GET /nbe/lc-monitoring` | `ISSUED`, `FOREX_ALLOCATED`, `UTILIZED`, `AMENDED` are all active | MISMATCH | Now counts `['ISSUED','FOREX_ALLOCATED','UTILIZED','AMENDED']` |
| SWIFT Monitoring (N7) | dead `swiftStatusFilter` plumbing | — | — | MISMATCH (dead code) | Deleted the state and the `statusFilter={swiftStatusFilter}` prop (wrapper defaults to `null`, table unfiltered as before) |
| Exchange Rates | `500 /forex/rates` (Fabric) | `GET /forex/rates` | — | BLOCKED (Fabric) | — |
| Forex Repatriation | `500 /repatriation` (Fabric) | `GET /repatriation` | — | BLOCKED (Fabric) | — |
| Analytics / User Management / Audit Trail | no status filters (or org-scoped lists) | — | — | MATCH | — |

**Browser (seeded):** Forex KPI cards `Allocated 1`, `Requested 1`, `Back to All 5`
(grid filters by sub-tab as fixed). `pendingForexRequests` = 1, `totalAllocations` = 6 via
`GET /portals/nbe` — the warning-3 anomaly (pending 0 despite `REQUESTED` allocations)
did **not** reproduce in dev mode. SWIFT/LC Monitoring/Repatriation render with 0 rows —
chain-only data, §10.

## 7. Shipping Portal — 10 tabs

| Tab / sub-tab | Status filter(s) used | API endpoint | Statuses the API returns | Verdict | Fix applied |
|---|---|---|---|---|---|
| Destination Arrived (S1) | `ARRIVED` had no mapper branch → fell through to `UNMAPPED STATUS — SKIPPING`; shipment vanished from all nine lifecycle tabs between arrival and delivery | `GET /shipments` | `ARRIVED` is real (booking mirror writes it) | MISMATCH | Mapper keeps `ARRIVED` as its own bucket; added `ARRIVED: 95` / `#3f51b5` to progress/colour maps; Destination Arrived filter set `['DESTINATION_ARRIVED','ARRIVED']`. Deliberately **not** mapped `ARRIVED → DESTINATION_ARRIVED`: that would offer "Complete Delivery" on booking-flow rows whose chain state is `ARRIVED`, which `CompleteDelivery` (guard: `DESTINATION_ARRIVED`) would reject |
| Vessel Loading (S2) | `LOADED` folded to `CUSTOMS_CLEARED` in the mapper; "Issue Bill of Lading" button offered on `PORT_ARRIVED` rows (sent the shipment backwards) | `GET /shipments` | `LOADED` is real (`RecordBillOfLading` sets it, matrix §6) | MISMATCH | Mapper keeps `LOADED` as its own bucket at the vessel-loaded stage (progress 70, `#4caf50`); BOL button moved from the `PORT_ARRIVED` block to the `VESSEL_LOADED` block in the detail dialog. `LOADED` rows appear in the Vessel Loading tab; no departure button is offered on them (`DepartFromPort` requires `VESSEL_LOADED` on-chain) |
| Clearance (S3) | `FREIGHT_BOOKED` omitted from `hasShippingStatus` and the mapper — a customs-cleared shipment disappeared from the Clearance tab the moment it was booked | `GET /shipments` | `FREIGHT_BOOKED` is real (booking flow) | MISMATCH | `FREIGHT_BOOKED` added to `hasShippingStatus`, the mapper (own bucket), the union, progress/colour maps (10 / `#ff9800`), and the Clearance tab's filter set `['CUSTOMS_CLEARED','FREIGHT_BOOKED']` |
| — (S4) | union members `BOOKED` / `SHIPPED` / `CONFIRMED` could never be displayed; `CREATED` silently skipped | `GET /shipments` | `BOOKED`/`SHIPPED`/`CONFIRMED` are not shipment statuses; `CREATED` is real but pre-clearance | MISMATCH | Dropped unwired `BOOKED` / `SHIPPED` / `CONFIRMED` from the union; `CREATED` handled explicitly in the mapper — deliberately excluded with a comment (pre-clearance, not in the shipping workflow) instead of falling through to a console error. Cumulative KPI lists and per-tab KPI cards updated so `ARRIVED` counts at destination-arrival, `LOADED` at vessel-loaded, `FREIGHT_BOOKED` at clearance |
| — (S5) | `shouldShowInStage()` dead | — | — | MISMATCH (dead code) | Deleted (zero callers verified) |
| Destination Arrived — gate | `ARRIVED` missing from the `hasShippingStatus` gate list, so `ARRIVED` rows never reached the mapper at all (the S1 fix's bucket existed but was unreachable) | `GET /shipments` | `ARRIVED` | MISMATCH (found during live verification, §8 #4) | Added `status === 'ARRIVED'` to the gate list |
| Other lifecycle tabs (Land Transport, Port Arrival, Container Stuffing, Departed, In Transit, Delivered) | exact-equality filter strings | `GET /shipments` | `LAND_TRANSPORT`, `PORT_ARRIVED`, `CONTAINER_STUFFED`, `DEPARTED`, `IN_TRANSIT`, `DELIVERED` | MATCH | — |

**Browser (seeded):** `Clearance 2` (`CUSTOMS_CLEARED` + `FREIGHT_BOOKED`), `Land Transport 1`,
`Port Arrival 1`, `Container Stuffing 1`, `Vessel Loading 2` (`VESSEL_LOADED` + `LOADED`),
`Departed 1`, `In Transit 1`, `Destination Arrived 2` (`DESTINATION_ARRIVED` + `ARRIVED`),
`Delivered 1`. Note: `ARRIVED`/`LOADED` rows offer no next-action button in the grid (their
next chaincode steps require `DESTINATION_ARRIVED` / `VESSEL_LOADED` respectively);
booking-flow delivery/departure for those rows goes through the booking handlers.

## 8. Integration findings — found during live verification (7)

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | ECTA contracts filter over-add: `DRAFT` is not a contract status | `contractService.ts` writes `REGISTERED` on create; no writer sets `DRAFT` anywhere; the old `draft` column default was removed by migration 058 and `chk_contracts_status` excludes it. The F2 fix had added a `DRAFT` KPI card that could never match | `DRAFT` card removed from `ECTAPortal.tsx`; filter comment documents why |
| 2 | `chk_quality_inspections_status` (migration 059) omits `SCHEDULED` | Chaincode `inspection.go:196/215` guard `REQUESTED → SCHEDULED`; `qualityService.ts:97` mirrors `SCHEDULED` into PG on schedule — the CHECK would have broken the schedule action's PG mirror | New migration `061_extend_quality_check.sql` adds `SCHEDULED` (applied live, 50 migrations). `IN_PROGRESS` deliberately **not** added: comment-only, never assigned |
| 3 | `GET /contracts` SQL excluded `CANCELLED`/`COMPLETED` | Seeded `CANCELLED`/`COMPLETED` contracts never returned, so the ECTA filter cards for them could never match | `contracts.ts:641` `WHERE` now includes `'cancelled','completed'` |
| 4 | Shipping `ARRIVED` gate (see §7) | Destination Arrived tab showed 1 row instead of 2; `hasShippingStatus` list omitted `ARRIVED` | Added to the gate list |
| 5 | `GET /banking/lc` PG fallback hardcoded `documents: []` and never set `customsClearanceStatus` | Banks Document Examination and Payment Release queues gate on `lc.documents` (non-empty) and, for release, verified docs + customs `CLEARED` — both could never fill in dev mode | List handler now populates `documents` per LC and `customsClearanceStatus`/`customsCleared` from `CLEARED` declarations on the LC's contract (`banking.ts`) |
| 6 | ECTA QC tab label off by one (12 vs 11) | Label's pending-shipment check read `(i.shipmentID \|\| i.ShipmentID)`; PG rows carry `shipment_id`, so `TABFIX-SHP-CREATED` counted as pending despite having 3 inspections | Label check now also reads `i.shipment_id` |
| 7 | `swiftApi.ts:231` queried `PENDING_APPROVAL` | Chaincode constant only, never assigned (§4) | Now queries `DRAFT` |

Also established during verification (not a mismatch): the `GET /contracts` and `GET /shipments`
list endpoints drop rows that fail `isValidContract` / `isValidShipment`
(`api/src/utils/dataFilters.ts` — e.g. a contract without `buyerCountry`/`coffeeType`, a
shipment without `buyerId`/`origin`/`quantity`). The seed was enriched accordingly; the
one pre-existing row dropped is `BOOK-1794237720836` (booking-flow row, no `buyer_id`/`quantity`)
— the gate working as designed, not a status bug.

## 9. Live verification

**API (curl, fresh logins, seeded data):**
- Applications `pending/approved/rejected` → 1 row each; contracts 6 rows, all 6 statuses;
  forex 6 rows, all 5 statuses; LCs 10 rows, all 10 statuses; declarations 5 rows, all 5
  statuses (with `?status=` filters returning exactly 1 each); inspections 11 rows;
  `ecx/lots` PG fallback 5 rows, all 5 statuses; `portals/nbe` `pendingForexRequests` 1,
  `totalAllocations` 6; `portals/shipping` `freightBookings` 1 (`FREIGHT_BOOKED`);
  shipments `?status=` returns the right row for `ARRIVED`, `FREIGHT_BOOKED`, `LOADED`,
  `CUSTOMS_CLEARED`, `IN_TRANSIT`, `DELIVERED`; post-delivery status `50 IN_PROGRESS`
  (125% fix holds); ECTA analytics payload contains `paymentMethods`.
- LC documents: `TABFIX-LC-ISS`/`FXAL`/`UTIL` each return 1 document with
  `customsClearanceStatus: 'CLEARED'`.

**Browser (Playwright + Chromium headless shell 158, fresh logins, seeded data):**
- All 60 top-level tabs clicked and rendered; 0 `pageerror` in any portal.
- Filter checks passed: ECTA contracts KPI 6/6, ECTA QC filter buttons 7/7, ECX Lots KPI 5/5,
  Customs declaration tabs 5/5, Shipping lifecycle tabs 9/9, NBE Forex KPI cards
  (`Allocated 1`, `Requested 1`, `Back to All 5`), Banks Forex KPI cards with pagination
  totals (`Total 6`, `Pending Allocation 1`, `Confirmed / Allocated 2`, `Total Requested 1`),
  Banks Document Examination 2, Banks Payment Release 1, Banks All LCs total 10 with all 11
  dropdown options returning the exact subset, Exporter LC & Payments 10, ECTA User Management
  rejected row, ECTA Post-Delivery card, ECTA Analytics Breakdown.
- Failed API calls observed in the browser are the known Fabric/missing-route set, unchanged
  from the earlier smoke test: 500s on `/payments`, `/swift/messages*`, `/forex/rates`,
  `/repatriation`, `/bordercrossing`, `/inspection`, `/exporters`; 404s on
  `/forex/retention-policy/COFFEE` and `/analytics/banking`. No new failed calls.
- Tab-count notes: Banks tables paginate at 5 rows/page (totals read from TablePagination);
  ECTA/ECX User Management grids are org-scoped (ECTA sees 2 users, ECX 1); Exporter tabs
  are exporter-scoped (test user owns nothing, so 0 rows — consistent, not a mismatch).
- Harness lesson recorded: several portal lists render as MUI DataGrid (no `<table>`), so
  row counting must include `.MuiDataGrid-row`; Banks "dropdowns" are KPI cards and MUI
  `TextField select` controls, not native selects.

**Builds:** `api npx tsc --noEmit` clean, `npm run build` passes; `ui npx tsc --noEmit`
clean, `next build` passes (20/20 routes); API restarted with `/tmp/cecbs-api.env`,
`/health` 200; UI on 3000 serves 200.

## 10. Remaining — not tab-filter mismatches

- **REJECTED lots unreachable via the API:** the REJECTED KPI card/filter exist and are
  correct, but no lot can reach `REJECTED` today — the grade route 400s on moisture > 12
  before invoking `GradeECXLot`, whose `REJECTED` branch therefore never runs, and no
  lot-reject endpoint exists. Needs a reject path, not a filter change.
- **Fabric-blocked in the browser (verified by code + API where a PG path exists):**
  ECTA Pre-shipment Inspection (`GET /inspection` 500), NBE LC Monitoring / SWIFT
  Monitoring / Forex Repatriation / Exchange Rates, Banks SWIFT tab, Exporter payment
  KPIs (`GET /payments` 500), Customs Border Crossing data (`GET /bordercrossing` 500).
  Their filters were fixed against the chaincode machines in the matrix; the live proof
  needs a Fabric host.
- **Chaincode side:** the 9 functions added in the handoff audit (incl. `RejectForex`,
  `ConfirmSettlement`, `RecordForexRepatriation`, `NBEApproveSWIFTMessage`) and the
  payment/banking validator rewrites still need re-package + redeploy as chaincode
  v2.3/seq 22 on the Fabric host. The `SWIFT_STATUS_PENDING_APPROVAL` constant
  (`swift.go:51`) is defined but never assigned — left as-is (chaincode change out of
  scope for this task).
- **Display-only dead arms left deliberately:** `ExporterPortal` shipment label/colour
  maps and the `:305` union still list `QUALITY_APPROVED`/`QUALITY_PENDING`/
  `QUALITY_REJECTED` (rendered only if a row ever carried them; `QUALITY_PENDING` does
  have a writer in `shipmentService.ts`); ECTA `normalizeInspectionStatus` still maps
  legacy `QUALITY_APPROVED`/`CERTIFIED → APPROVED` as a defensive alias, not a filter.
- **Earlier standing items (unchanged):** secrets in tracked `api/.env.blockchain` files
  still need rotating; the user's Docker host still runs unfixed `features` `042b8b7`;
  this branch is local only — do not push without the user's choice.
