# UI Portal Inventory — GoCBC Frontend (`ui/src`)

**Scope:** static inventory of the Next.js frontend at `~/workspace/GoCBC/ui/src`, branch `features`.
**Method:** read each portal component plus the sub-components it imports, and verified every
endpoint claim against `api/src/routes/*.ts` and every status value against `chaincodes/coffee/*.go`.
No file was edited except this report; nothing was run in a browser.
**Note on paths:** the task brief cites `ui/src/app/portals/` — that directory does not exist.
Portal pages live at `ui/src/pages/portals/*.tsx` (thin `ProtectedRoute` wrappers) and portal
components at `ui/src/components/portals/*Portal.tsx`.

## Shared plumbing (all 7 portals)

- **API base:** `ui/src/config/api.config.ts` — `API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1'`.
  `apiFetch(path)` resolves against it and attaches the JWT from `localStorage 'authToken'`.
  `publicApiFetch` is the same without auth. `API_ENDPOINTS` collects the endpoint paths.
- **Axios client:** `ui/src/utils/api.ts` — `api` singleton (axios, same base URL, 120 s timeout,
  request interceptor attaches the token, 401 clears the token and redirects to `/login`).
  Named wrappers used by portals: `getContracts()` → `GET /contracts`, `getShipments()` →
  `GET /shipments`, `getExporters()` → `GET /exporters`, `getInspections()` → `GET /quality/inspections`,
  `approveContract()` → `POST /contracts/:id/approve`, `rejectContract()` → `POST /contracts/:id/reject`,
  `allocateForex()` → `POST /forex/allocate`, `getForexAllocations()` → `GET /forex`,
  `getLettersOfCredit()` → `GET /banking/lc`, `getExchangeRates()` → `GET /forex/rates`,
  `createExchangeRate()` → `POST /forex/rates`, `updateExchangeRate()` → `POST /banking/exchange-rates`
  (**no such route exists** — live trap), `getBankingMetrics()` → `GET /analytics/banking`
  (**no such route exists** — always falls back to zeros), `approveContractForForex()` → deprecated
  `POST /contracts/:id/nbe-approve` (route always returns 400 `ENDPOINT_DEPRECATED`).
  `getAllPages()` fetches list endpoints page by page (100/page) so portal filters see all rows.
- **Status colours:** `getStatusColor()` in `utils/api.ts` — BANKS palette has no entries for
  `REQUESTED/CONFIRMED/ALLOCATED/UTILIZED/DRAFT/NBE_APPROVED/SENT/SETTLED/COMPLIED`, so those chips
  all fall through to one default colour; NBE palette likewise.
- **Workflow gating (client-side only):** `ui/src/utils/workflowEnforcement.ts` defines
  `SHIPMENT_STATUS` (`CREATED, QUALITY_APPROVED, PERMIT_ISSUED, CUSTOMS_CLEARED, BOOKED, LOADED,
  DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED` — note `BOOKED/LOADED/DEPARTED/ARRIVED`, **not** the
  chaincode's `FREIGHT_BOOKED/VESSEL_LOADED`), `CONTRACT_STATUS`, `LC_STATUS`, `PAYMENT_STATUS`
  (`PENDING, DOCUMENTS_SUBMITTED, VERIFIED, SWIFT_INITIATED, SWIFT_RECEIVED, SETTLED`),
  `LICENSE_STATUS`, plus `canCreateContract/canRequestLC/canCreateShipment/canInspectShipment/
  canIssueExportPermit/canClearCustoms/canLoadShipment/canSubmitPaymentDocuments/
  canVerifyPaymentDocuments/canInitiateSWIFT/canSettlePayment` and payment-method helpers
  (`PAYMENT_METHODS`, `getPaymentMethodWorkflow`). **Only `PaymentDocuments.tsx` imports it** —
  no portal enforces these gates; the chaincode is the only real enforcer.
  Its `canCreateShipment` comment even contradicts the chaincode (claims LC is not mandatory;
  chaincode `CreateShipment` requires the LC `FOREX_ALLOCATED` or later).
- **Chaincode reference values** (chaincode `coffee` v2.3, `chaincodes/coffee/`):
  shipment closed set (`main.go:2089-2096`): `CREATED, FREIGHT_BOOKED, PERMIT_ISSUED,
  CUSTOMS_DECLARED, CUSTOMS_CLEARED, CUSTOMS_REJECTED, INSPECTION_PENDING, LAND_TRANSPORT,
  PORT_ARRIVED, CONTAINER_STUFFED, VESSEL_LOADED, DEPARTED, IN_TRANSIT, DESTINATION_ARRIVED,
  DELIVERED, LOADED, CANCELLED, ARRIVED`. LC (`banking.go:25`): `REQUESTED, APPROVED, ISSUED,
  FOREX_ALLOCATED, UTILIZED, AMENDED, REJECTED, EXPIRED, PAYMENT_RELEASED, SHIPPED`.
  Forex (`forex.go:44`): `REQUESTED, CONFIRMED, ALLOCATED, UTILIZED, REJECTED` (legacy `APPROVED`
  never assigned). Payment (`payment.go:28`): `PENDING → DOCUMENTS_SUBMITTED → VERIFIED →
  SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED → CONFIRMED`. ECX lot (`ecx.go:34`):
  `WAREHOUSED, GRADED, ASSIGNED, RELEASED, REJECTED`.
- **Hardcoded-host problem (all portals):** `DocumentManagementPanel.tsx` and
  `BlockchainSignatureVerification.tsx` hardcode `http://localhost:3001/api/v1/...` instead of
  `API_BASE_URL`, so document upload/download/sign and signature verification break on any
  non-localhost deployment. `BlockchainBadge` performs no fetch at all — it is a static label,
  not a verification.
- **Every portal's User Management tab** renders the same generic `UserManagement`
  (`ui/src/components/admin/UserManagement.tsx`): `GET /users`, `POST /users`, `PUT /users/:id`,
  `DELETE /users/:id`, `PUT /users/:id/status`, `POST /users/:id/reset-password` — all exist
  (`users.ts:110, 269, 590, 1500, 899, 1182`). Not repeated per portal below.

---

## 1. ECTA Portal — `ui/src/components/portals/ECTAPortal.tsx` (4,554 lines)

Page `ui/src/pages/portals/ecta.tsx`: `ProtectedRoute` allows `ECTA, ADMIN, Quality Inspector,
Lab Analyst, Phytosanitary Officer, License Officer, Permit Officer, ECTA Officer`.
Shared load on mount (`loadData()`, `:507-649`): `GET /exporters/exporter-applications?status=pending`,
`?status=approved`, `GET /contracts`, `GET /exporters`, `GET /shipments`, `GET /quality/inspections?limit=500`.

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Pending Applications | Application table (ID, company, contact, email, capital ETB, submitted date); statuses `pending/approved/rejected` (lowercase); KPI cards Pending/Approved/Rejected/Total | View (opens `DocumentValidationDialog` w/ prerequisites), Approve & Register, Reject (confirm "Yes, Reject Permanently") | `GET /exporters/exporter-applications?status=pending`; `GET /documents/entity/EXPORTER_APPLICATION/:id`; `POST /exporters/exporter-applications/:id/approve` (`exporters.ts:307`, ECTA-only, needs `exporterId, ectaLicenseNumber, licenseExpiryDate`); `POST /exporters/exporter-applications/:id/reject` (`exporters.ts:560`) | **P6:** Approved/Rejected KPI cards always 0 — `loadData()` fills `allApplications` from the `?status=pending` query only. **P20:** three different capital minima in one flow: registration schema 10M ETB (`:145`), details prerequisite 15M private / 20M company / 10M individual (`:994-1007`), rejection text 50M ETB. |
| 1 Approved Exporters | Exporter ID, company, licence no. chip, type, capital, lab-certified, approved date, expiry, status chip. Licence status via `getLicenseStatus()` (`:1466-1476`): `PENDING/ACTIVE/SUSPENDED/EXPIRED/REVOKED` | View Details, Reset Password, Suspend License, Revoke License | `GET /exporters/exporter-applications?status=approved`; `GET /exporters`; `GET /documents/entity/EXPORTER_APPLICATION/:id`; `POST /users/reset-password-by-identifier` (`users.ts:1037`); `PUT /exporters/:id/status` (`exporters.ts:1806`); `POST /exporters/:id/revoke` (`exporters.ts:1949`) | **P19:** details dialog hardcodes `Status: 'ACTIVE'` (`:2349`); Suspend always sends `SUSPENDED` — no re-activate path in-tab (only in dead `handleSuspendLicense`). **P27:** `getLicenseStatus()` defaults to `ACTIVE` when no on-chain exporter record exists. |
| 2 Sales Contracts | Contract ID, exporter, buyer, coffee type, qty, value, status chip, EUDR flag; clickable KPI filters `REGISTERED/APPROVED/REJECTED/PENDING/CANCELLED/COMPLETED/All` | Details (dialog w/ `DocumentManagementPanel` + `BlockchainSignatureVerification`), Approve, Reject (field select + ≥20-char reason) — only when `REGISTERED` | `GET /contracts`; `GET /documents/entity/CONTRACT/:id`; `POST /contracts/:id/approve` (`contracts.ts:1255`, ECTA-only, server requires signed docs); `POST /contracts/:id/reject` (`contracts.ts:1651`) | **P8:** status chip logic `REGISTERED→pending, APPROVED→approved, else rejected` — `CANCELLED/COMPLETED/PENDING` all render as red "rejected"; `PENDING` is not a contract status at all (`statusManager.ts:46-53` allows only `REGISTERED→APPROVED/REJECTED/CANCELLED`, `APPROVED→CANCELLED/COMPLETED`), so the Pending filter is permanently 0. **P9:** table paginates unfiltered `allContracts` while the count text uses role-filtered `contracts`. **P10:** a debug `<Alert>` with raw counts/filter state is rendered in production (`:2539-2550`). **P28/P30:** table ignores the role filtering the tab badge applies (supervisor/inspector see all contracts). **P29:** approval dialog lists document-review confirmations the UI never checks; failure surfaces only as an error toast. |
| 3 Quality Control | Unified table: `CREATED` shipments w/o inspection (shown `PENDING`) + all `quality_inspections` rows. Statuses rendered: `PENDING, REQUESTED, INSPECTED, APPROVED, REJECTED, PERMIT_ISSUED`; `COMPLETED` relabelled via `passed` flag | Schedule → Inspect → Approve / Reject → Issue Permit (5-stage flow) | `GET /quality/inspections?limit=500`; `GET /shipments`; `POST /quality/inspections` (`quality.ts:364`); `POST /quality/inspections/:id/perform` (`:512`); `POST .../approve` (`:746`); `POST .../reject` (`:1042`); `POST .../issue-permit` (`:1208`) — all exist | **P11:** "Completed" KPI counts `status==='COMPLETED'`, but quality statuses are `PENDING, INSPECTED, APPROVED, REJECTED, REWORK` (`quality.go:70`) + `PERMIT_ISSUED` — always 0; "In Progress" counts only `INSPECTED`. **P12:** load filter keeps `INSPECTED` shipments, which is not a shipment status; tab derivation requires `CREATED` only, so `INSPECTION_PENDING` shipments vanish. **P13:** Schedule sends `scheduledDate`, route reads `requestedDate` — date silently dropped. **P14:** Inspect is a one-click fake — hardcoded inspector `ECTA-01`, moisture 11.2, defect 3, cupping 8/10, overall 87, all lab tests `PASSED`, no form. **P15:** Issue Permit sends `autoCreateCustomsDeclaration: true` but the route has a `TODO` and `// SKIP BLOCKCHAIN` — permit is Postgres-only, `blockchain_tx_id: null`, customs handoff unimplemented. |
| 4 License Renewals | Chaincode exporters with expiry ≤ now+3mo: company, licence no., expiry, days-remaining chip | Process Renewal (`confirm()` + `prompt()` for reason) | `GET /exporters`; `POST /exporters/:id/renew-license` (`exporters.ts:1895`, EXPIRED→ACTIVE) | **P23:** alert counts `stats.expiringSoon` from `approvedApplications` while the table lists chaincode `exporters` — can disagree; filter includes already-expired licences. |
| 5 Analytics | `<AnalyticsDashboard />` KPI cards + time-series chart (metric/period/date selectors) | Refresh, Export CSV / Export JSON | `GET /analytics/dashboard` (`analytics.ts:16`); `GET /analytics/timeseries/:metric` (`:53`); export via hardcoded `fetch('http://localhost:3001/api/v1/analytics/export-report?...')` (`AnalyticsDashboard.tsx:173`) — exists (`analytics.ts:157`) but bypasses `API_BASE_URL` | Hardcoded host on export (see shared section). |
| 6 Pre-shipment Inspection | `<InspectionRequestsTab />`: inspection/shipment/contract/exporter IDs, coffee type, qty, status chip, inspector, dates, grade, moisture, defect %, cert no., `txId`. Statuses `REQUESTED/SCHEDULED/COMPLETED/APPROVED/REJECTED`; pass/fail from `overallResult` (`PASS/FAIL/CONDITIONAL_PASS`). KPI Avg Duration hardcoded `2.5` days (`:175`) | Refresh; `REQUESTED` → Schedule dialog; `SCHEDULED` → Conduct dialog; `COMPLETED` → View Report dialog. **No create, no approve/reject** | `GET /inspection` (`inspection.ts:103`); `PUT /inspection/:id/schedule` (dialog); `POST /quality/inspections/:id/perform` (dialog); report dialog: none | **P1 (broken):** Schedule does `PUT /inspection/:id/schedule` with `{scheduledDate, inspectorId, location, notes}` — backend is `POST /inspection/:id/schedule` (`inspection.ts:291`) expecting `{inspectorName, inspectorLicense, inspectionDate}`. Wrong method + wrong body. **P2 (broken):** Conduct posts to `POST /quality/inspections/:id/perform`, but rows come from `GET /inspection` (pre-shipment entity) — ID not in `quality_inspections` → 404. Correct endpoint `POST /inspection/:id/results` (`inspection.ts:335`) is never called. **P3:** Report dialog `passed = status==='PASSED'` — no pre-shipment inspection ever has status `PASSED` (`inspection.go:58`); "Download Certificate" / "Print Report" have no `onClick`. **P4:** `COMPLETED → APPROVED/REJECTED` exists in chaincode + routes (`inspection.ts:432, 469`) but no button. **P25:** Avg Duration KPI is a placeholder. |
| 7 User Management | Generic `UserManagement` | User CRUD, suspend/activate, reset password | `GET/POST/PUT/DELETE /users`, `PUT /users/:id/status`, `POST /users/:id/reset-password` (all exist) | — |
| 8 Audit Trail | `<AuditTrailTable>` audit-log table, filters, CSV download, cache/blockchain toggle | Filter, refresh (60 s), CSV download | `GET /audit/portal/recent?limit=500&entityType=&action=` (`audit.ts:71`); blockchain view `GET /audit/blockchain/:entityType/:entityId` (`audit.ts:1811`) | **P5:** KPI cards + `loadAuditStats()` are wired to `tabValue===6` (Pre-shipment), not 8 — audit KPIs appear on the wrong tab and never on this one. **P26:** blockchain toggle is a no-op here — `entityId`/`entityTypeFilter` never passed, so it still shows the cached Postgres table. |
| 9 Post-Delivery Audits | One card per `DELIVERED` shipment: `<PostDeliveryWorkflowPanel userRole="ECTA">` — checklist Payment / Forex Repatriated / LC Settlement / ECTA Final Audit / Contract Closure, overall status, completion %, days elapsed | Complete Audit, Close Contract (gated: audit only after `forexRepatriated`; close only after payment + forex + LC-settled-if-used + audit). Record Payment / Record Forex / Record LC Settlement shown but role-gated to BANK/NBE | `GET /post-delivery/:shipmentId/status` (`postDeliveryWorkflow.ts:58`); `POST /post-delivery/:id/ecta-audit` (`:308`, ECTA); `POST /post-delivery/:id/close-contract` (`:368`, ECTA) | **P24:** three checklist actions are displayed as if actionable but are role-gated away from ECTA (by design — but the panel renders them as a checklist ECTA cannot complete). |
| 10 Phytosanitary Certificates | `<PhytosanitaryCertificates />`: cert no./ID, shipment, exporter, inspector, inspection date, botanical name, treatment, origin, destination, qty, packaging, status chip. Chip config defines only `ISSUED/EXPIRED/REVOKED` | Issue Phytosanitary Certificate (one dialog collapses request → inspect → issue), Search by shipment, View, Revoke (only when `ISSUED`) | `GET /phytosanitary` (`phytosanitary.ts:531`); `GET /phytosanitary/shipment/:id` (`:625`); `POST /phytosanitary/request` (`:43`) → `POST /phytosanitary/:id/inspect` (`:173`) → `POST /phytosanitary/:id/issue` (`:297`); `POST /phytosanitary/:id/revoke` (`:667`) — all exist; chaincode `PENDING → INSPECTED → ISSUED` | **P18:** form collects `placeOfOrigin, pointOfEntry, packagingType, numberOfPackages, distinguishingMarks, meansOfConveyance, validityPeriod` — none is sent in the three calls. `PENDING`/`INSPECTED` (the states the flow produces) have no chip styling. No separate request/inspect UI. |

**ECTA-only problems (not in the table):** **P7** — "Register New Coffee Exporter" dialog (`:3307`) + `handleCreateExporter()` (`POST /exporters`, `:686`) are unreachable: nothing ever sets `setDialogOpen(true)`. `handleUpdateLaboratory()` (`:699`) and `handleSuspendLicense()` (`:710`) are likewise never called. **P16** — `QualityInspectionWorkflow` dialog renders only via `?action=quality&shipmentId=…` deep link; its create posts only `{inspectionID, shipmentID, contractID, exporterID, scheduledDate}` to `POST /quality/inspections` — missing required `coffeeType`/`quantity` → 400; fabricates `contractID: 'CONTRACT_' + exporterId`. **P17** — `InspectionManagement` (1,439 lines) is imported (`:79`) but never rendered; its approve/reject/permit flows are dead. **P21** — role mismatch: `getRoleBasedTabs()` grants tabs to `ECTA_SUPERVISOR`, `ECTA_INSPECTOR`, `ECTA Portal Administrator`, none of which is in the page's `ProtectedRoute` list — those users can never load the page. **P22** — hardcoded `http://localhost:3001` in document VIEW (`:3562`, also without an auth token) and in `DocumentManagementPanel`/`BlockchainSignatureVerification` (see shared section).

**Workflow coverage (ECTA):** can act on licence application/approval, licence suspend/revoke/renew,
contract approve/reject + document signing, quality inspection (with fabricated results), export permit
(Postgres-only), phytosanitary, post-delivery audit, contract close. Displays but cannot act on LC,
forex, customs, shipping/BoL, SWIFT/payment, retention, repatriation. **No surface at all for ECX
grading and border crossing.** ECTA never calls any `/banking/*`, `/forex/*`, `/ecx/*`, `/customs/*`,
`/bordercrossing/*`, `/shipping/*`, `/swift/*`, `/retention/*`, `/repatriation/*` endpoint.

---

## 2. ECX Portal — `ui/src/components/portals/ECXPortal.tsx` (969 lines)

Page `ui/src/pages/portals/ecx.tsx`: `ProtectedRoute` allows `ECX, ADMIN, Grading Officer,
Warehouse Officer, Registration Officer, Release Officer, ECX Officer`. No sub-tabs
(`subTabValue` state exists at `:73` but is never read/written). Load on mount: `GET /ecx/lots`
only (`loadData()`, `:131-147`); no pagination, search, refresh button, or single-lot fetch.
`apiFetch` is imported (`:25`) but never called. Status union (`:50`) `WAREHOUSED | GRADED |
ASSIGNED | RELEASED | REJECTED` **exactly matches** chaincode `ecx.go:34` and its transitions
(`WAREHOUSED → GRADED/REJECTED`, `GRADED → ASSIGNED`, `ASSIGNED → RELEASED`).

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Coffee Lots (n) | KPI cards (Total, Warehoused, Graded, Assigned, Released, Rejected — clickable client-side filters); table: ECX Lot #, exporter (ID only), origin+subRegion, qty kg, processing, grade chip, moisture, score, contract, status chip; Lot Detail dialog (fields + `BlockchainBadge` + `BlockchainSignatureVerification` + rejection reason when `REJECTED` + dates) | Details (eye icon); Grade (only `WAREHOUSED`); Reject (only `WAREHOUSED`); Assign (only `GRADED`); Release (only `ASSIGNED`); `REJECTED` rows get display-only "Review required" chip; Audit Trail (in Detail dialog) | `GET /ecx/lots` (`ecx.ts`, chaincode `QueryAllECXLots` w/ PG fallback); `POST /ecx/lots/:lotId/grade` (`GradeECXLot`); `POST /ecx/lots/:lotId/reject` (`RejectECXLot`, v2.3); `POST /ecx/lots/:lotId/assign` (`AssignECXLot`); `POST /ecx/lots/:lotId/release` (`ReleaseECXLot`); `POST /ecx/lots` (intake, `RegisterECXLot`); `POST /ecx/lots/:lotId/auto-release` (exists, `ecx.ts:465`); audit `GET /audit/entity/LOT/:id`, `/audit/verify/:type/:id`, `/audit/compliance-report/:type/:id` (all exist, `audit.ts:545, 1139, 1186`); detail widgets `GET /documents/entity/COFFEE_LOT/:id`, `GET /documents/:id/verify-signatures`, `GET /blockchain-signatures/entity/COFFEE_LOT/:id` | **P1 — CRITICAL: lot intake is unreachable.** `intakeOpen` is only ever set to `false`; zero `setIntakeOpen(true)` calls repo-wide and no "Register Intake" button exists. The intake dialog, `genLotNumber`, and `handleIntake` (`POST /ecx/lots`) are dead code; the empty-state alert even tells the user to "Use 'Register Intake'". **No lot can enter the system through this portal.** **P2:** auto-release (`POST /ecx/lots/:lotId/auto-release`, requires shipment `CUSTOMS_CLEARED` + lot `ASSIGNED`) has no caller anywhere in `ui/src/` — no button, no trigger. **P3:** officer roles (`Grading/Warehouse/Registration/Release/ECX Officer`) pass the page gate and see the buttons, but every ECX mutating route requires `requireRole('ECX','ECX_ADMIN')` — they get 403 `AUTHORIZATION_ERROR` on every action. **P6:** grading a lot `UG` (Under Grade) still sets `GRADED` — chaincode validates only moisture — so a UG lot becomes assignable; Reject is only offered while `WAREHOUSED`, so once graded it is too late. **P7:** cupping score is not required; empty → `NaN` → `null` → route coerces to `0` → a 0-score lot is `GRADED` and assignable. **P8:** Release dialog warns "only release after ECTA permit issued, customs accepted, container booked" but nothing verifies any of it — route + chaincode check only `Status == 'ASSIGNED'`. **P9:** Assign contract ID is free text; UI never calls the available `GET /portals/ecx/active-contracts` or `GET /contracts` — a typo fails only inside the chaincode (`400 ASSIGN_FAILED`). **P10:** all five mutating handlers check `res.data?.success`/`error.code`, but axios rejects on non-2xx, so the server-error branches are unreachable; the user only sees "Request failed with status code 503". **P11:** `REJECTED` is terminal with no re-intake/appeal path (only recovery is a new lot — which per P1 has no button). **P12:** PG-fallback mapper omits `moistureContent, defectCount, pricePerKg, gradingDate, assignmentDate, releaseDate` — table/detail silently lose fields when Fabric is down. **P15:** `loadData` catch sets `lots=[]` with no error UI — a failed load is indistinguishable from "no lots". **P16:** intake sends `status:'WAREHOUSED'`/`warehouseReceiptDate` which the route ignores; `ecxLotNumber` is client-generated with a random 4-digit suffix and no uniqueness check. |
| 1 Market Prices | Hardcoded KPIs (Market Active `OPEN`, Avg Price `150` ETB/kg, Traded Today `0`, Volume `0` tons); hardcoded Jan–Jun 2026 line chart; six hardcoded region cards; static NBE $5.00/kg minimum-price alert. No buttons | None | **None called.** Available but unused: `GET /ecx/market` (`ecx.ts:80`, Grade 1 $8.50 … Grade 5 $5.80, `marketStatus:'OPEN'`), `GET /market/prices`, `GET /market/trends` (`market.ts:53, 152`) | **P13:** tab is a static brochure — "Avg Price 150", "Traded Today 0" are fiction; the trend line never moves; the $5.00/kg alert is a static string, not a fetched rule. |
| 2 Grading Standards | KPI cards computed from loaded lots (Grade 1/2/3-4/5 counts; UG not counted); hardcoded standards table (Grade 1–5 + UG) | None | **None called.** Available but unused: `GET /ecx/grading-standards` (`ecx.ts:104`) | **P5 — values wrong vs API and chaincode:** Grade 1 min score UI `≥80` vs API `85-100`; Grade 2 `≥80` vs API `80-84.9`; Grade 4/5 moisture UI `≤13%` vs API `10-12%`; Grade 5 score UI `≥60` vs API `Below 70`; sample size UI/chaincode per 300 g vs API "350 grams per lot". Chaincode rejects moisture > 12% for **every** grade, so the table's `≤13%` for Grades 4–5 is false. Grade dialog option text repeats the wrong `≥80` for Grade 1. |
| 3 User Management | Generic `UserManagement` (real users); portal's own KPI cards above it hardcode Total/Active/Admins/Inactive all to `0` | User CRUD etc. | `GET/POST/PUT/DELETE /users`, `PUT /users/:id/status`, `POST /users/:id/reset-password` | **P14:** header KPIs say "Total Users 0" above a table full of real users. Also: role `ECX Portal Administrator` is listed for this tab but is **not** in the page's allowed roles, so it can never reach the page. |

**Workflow coverage (ECX):** covers its 5 core lot steps in code (intake, grading, reject, assign,
release) but **intake is unreachable (P1)** and auto-release is dead (P2) — grading / reject /
assign / manual release are the only actually operable actions. Market prices and grading
standards are display-only hardcoded content. Everything outside the lot lifecycle — licence,
contract, LC, forex, inspection, permit, phytosanitary, customs, border crossing, shipping/BoL,
SWIFT/payment, retention, repatriation, contract close — is absent except as unenforced prose
in the Release dialog. Post-delivery audit appears only as a per-lot audit-trail viewer.

---

## 3. Exporter Portal — `ui/src/components/portals/ExporterPortal.tsx` (7,421 lines)

Page `ui/src/pages/portals/exporter.tsx`: `ProtectedRoute` allows `EXPORTER, ADMIN` only.
Tabs are numeric `tabValue` 0–7, no sub-tabs. Shared `loadExporterData()` (`:787-1260`, mount-only,
no Refresh button): `GET /exporters/me/profile` (`exporters.ts:1146`), `GET /contracts`,
`GET /banking/lc`, `GET /forex` (called twice), `GET /shipments`, `GET /payments`,
`GET /quality/inspections?limit=500`, `GET /customs/declarations`, `GET /audit/portal/recent?limit=1000`.
It does **not** import `ExporterTraceability.tsx`, `PaymentDocuments.tsx`, `PaymentMethodTab.tsx`,
`UnifiedPaymentWorkflow.tsx`, or `DocumentUploadDialog.tsx`. Dashboard has no manual refresh.

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Dashboard | 6-month Recharts line chart (contract value/volume, client-side aggregation); summary stats; cards: This Month contracts, Approval Rate (`APPROVED/total`), Active Items (`IN_TRANSIT` shipments + `REGISTERED` contracts). KPI strip (only Dashboard KPIs clickable) | KPI cards navigate to tabs 1/3/2/5 | Shared `loadExporterData()` only | — |
| 1 My Contracts | DataGrid: Contract ID, buyer, country, coffee type, qty kg, value, ECTA Feedback (only when `REJECTED`), status chip. Contract statuses (`:141`) `DRAFT/REGISTERED/APPROVED/COMPLETED/CANCELLED/REJECTED` — matches chaincode. Detail dialog has 4-step tracker: Registered → ECTA Approved → Bank LC Issued → Export Complete | Register New Contract (dialog: buyer/bank/coffee type/qty/price ≥ $5.00/kg/currency/payment method/incoterm/ports/delivery date/EUDR-organic-fairtrade flags; per-category doc upload), Edit (only `REGISTERED`/`APPROVED`), Request LC (only `APPROVED` + no LC), View, Download Contract PDF, "Correct details and register replacement" for rejected contracts (`supersedesContractID`) | `GET /contracts` (client-filtered by JWT exporterId); `POST /contracts` / `PATCH /contracts/:id` (`contracts.ts:326, :68`); `POST /documents/upload` (`documents.ts:497`); `DocumentManagementPanel` entityType `CONTRACT` (required `SALES_CONTRACT, PROFORMA_INVOICE, COMMERCIAL_INVOICE, PACKING_LIST`, upload+sign); `BlockchainSignatureVerification` for approved contracts | **P4:** grid Download icon and detail-dialog **Download PDF** (no `onClick` at all) only show a "Generating…" toast and download nothing. Only real download is "Download Documents", which builds a client-side `.txt` then `alert()`s "In production, this package would include…". **P11:** two different contract-detail dialogs (`contractDialogOpen` vs `contractDetailDialogOpen`) duplicating fields with different actions (first has dead Download PDF; second has Correct/Create Shipment/Request LC; first allows upload+sign, second read-only). |
| 2 Forex & Banking | 4 stacked read-only sections + LC request: (1) Approved Contracts Pending LC; (2) LC Requested (Awaiting Bank Approval); (3) Forex Allocations (`forexId, contractId, allocatedAmount, exchangeRate, retentionRate, expiryDate, status`); (4) Letters of Credit; (5) Payment Status (`paymentId, shipmentId, amount, retainedAmount, convertedAmount, swiftReference, status`). Forex union (`:273`) `REQUESTED/ALLOCATED/UTILIZED/CONFIRMED`; LC union (`:286`) `REQUESTED/APPROVED/ISSUED/UTILIZED/FOREX_ALLOCATED/PAYMENT_RELEASED/SETTLED/REJECTED/EXPIRED` | Request LC per pending contract (dialog: advising bank, beneficiary, amount, currency, validity 90d, latest shipment 60d, transport mode, ports, payment terms, partial/transhipment switches) | `GET /banking/lc` (`banking.ts:1349`); `GET /forex` (`forex.ts:122`); `GET /payments` (`payments.ts:1007`); `POST /banking/lc/request` (`banking.ts:85`, role `EXPORTER` allowed) | **P7:** payment status union is a phantom machine — `PENDING/RECEIVED/SPLIT/RETENTION_CONVERTED/RELEASED/COMPLETED/SETTLED` vs chaincode `PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED → CONFIRMED` (`payment.go:28, 136-149`). `RECEIVED/SPLIT/RETENTION_CONVERTED/RELEASED/COMPLETED` are never a payment's status. **P8:** Payment Status grid's Shipment ID column is always blank — `mappedPayments` never sets `shipmentId` although `GET /payments` returns one. Forex union omits `REJECTED`; LC union omits `AMENDED` (though `hasIssuedLC()` includes it) and `FOREX_REQUESTED`; KPIs count only `REQUESTED/ALLOCATED` forex and `ISSUED/FOREX_ALLOCATED` LCs, so `CONFIRMED` forex and `AMENDED/UTILIZED/PAYMENT_RELEASED/SETTLED` LCs vanish from "LC Issued". LC Requested section fabricates `requestDate: new Date().toISOString()` (today for every row) although the real date is mapped. No forex action for the exporter (correct — `POST /forex/request`, `/forex/allocate` are BANKS/NBE-only). |
| 3 Shipments | DataGrid: Shipment ID, contract ID, buyer (resolved via contract), qty, grade chip (defaults "Grade 1-2" if empty), status chip, transport SEA/AIR, current location (defaults "Warehouse"). Alerts: "N Contract(s) Ready for Shipment" (forex `ALLOCATED`, no shipment), "Quality Inspection Pending" (`CREATED` count). Synthetic pending rows injected for forex-allocated contracts w/o shipment (`PENDING_<contractId>`, status `FOREX_ALLOCATED`) | View (detail dialog), View Post-Delivery Workflow (only `DELIVERED/COMPLETED`), Submit Customs Declaration (only if permit issued + not delivered), Download Shipment Documents, Register New Shipment (only via a pending row, the forex banner, or the contract-detail dialog's Create Shipment — **no top-level button on this tab**). Create dialog: contract (only `APPROVED`; non-`ALLOCATED` disabled), qty ≤ contract qty, origin (8 regions), grade (ECX 1–5), ICO no. (auto `ET-XXXX-XXXXX`), ECX lot no. (required iff ECX channel), union/bond refs, channel, destination (auto-filled, disabled), EUDR switch | `GET /shipments`; `POST /shipments` (`shipments.ts:150`, role `EXPORTER`); permits derived from `GET /quality/inspections?limit=500` | **P6 — status union wrong both ways.** UI (`:303-305`) has 23 values incl. `DRAFT, REGISTERED, QUALITY_PENDING, QUALITY_APPROVED, QUALITY_REJECTED, BOOKED, COMPLETED, CONFIRMED` — none produced by any shipment machine (quality is an *inspection* state; `quality.go` only ever sets shipment status to `INSPECTION_PENDING`). **Missing:** `PERMIT_ISSUED` (the very status the permit flow produces, `permit.go:239`), `CUSTOMS_DECLARED`, `CANCELLED`. `getShipmentStatusLabel()` (`:188-218`) maps only the phantom/legacy values and is dead code (never called); real values render as raw strings. `logisticsStatus` is never populated (`GET /shipments` returns only `status`). **P9:** "has export permit" is inferred from an inspection row with lowercased status `permit_issued` — works by accident, but never calls the permit endpoint `GET /permits/exporter/:exporterId` (`permits.ts:334`); an `APPROVED`-but-not-permit-issued inspection is treated as "no inspection". **P12:** `getRowClassName` tests `params.row.isPending` but pending rows are flagged `_isPending` — highlight CSS never applies. Create success message claims "Quality Inspection Request automatically sent to ECTA" (chaincode side-effect, no separate call). |
| 4 Customs | One row per shipment: Shipment ID, contract, buyer, destination, qty, three derived chips — Quality Inspection, Export Permit (`Not Issued/Issued`), Customs Status (`Not Declared / Ready to Declare / Submitted / Under Inspection / Under Review / Cleared / Rejected`, derived from `declarationsByShipment`, correct vs chaincode `SUBMITTED, UNDER_INSPECTION, UNDER_REVIEW, CLEARED, REJECTED`) | Declare (only when `hasPermit && !hasDeclared && !isCleared`) → customs dialog (read-only summary + 7-document checklist, each with Upload → `POST /documents/upload`; submit **Submit to ECC** disabled until every selected doc reports `success`) | `GET /customs/declarations` (`customs.ts:141`; duplicate handler at `:588` is dead); `POST /customs/declaration/submit` (`customs.ts:676`, role `EXPORTER`) | No amend/cancel/duty/valuation actions (`PUT .../amend`, `DELETE .../cancel`, `POST .../calculate-duty`, `POST .../valuation` all exist, `customs.ts:1058, 1210, 1297, 1482`). **Tab-label bug:** label is `Customs (${shipments.length})` — counts shipments, not declarations. Customs dialog hardcodes Origin `Yirgacheffe`, ICO `ET-2105-34593`, Channel `Direct Export`, and falls back to `$9.25/kg` when the contract price is missing. KPI `stats.customsPermitIssued` actually holds the "Ready to Declare" count. |
| 5 LC & Payments | Entirely `SWIFTMessagesViewWrapper` → `SWIFTMessagesView.tsx` (579 lines): Antd table of LCs (LC no., amount, LC status tag, payment progress %, message count + "Has Discrepancy" if any `MT750`, issued, expires red if <30d). Search by LC no.; status filter `REQUESTED/APPROVED/ISSUED/FOREX_ALLOCATED/AMENDED/UTILIZED/PAYMENT_RELEASED/SETTLED/REJECTED/EXPIRED` (**more correct than the portal's own LC union** — includes `AMENDED`). Detail modal tabs: Overview / SWIFT Messages (n) / Timeline / Documents & Signatures / Blockchain Verification | View Details, Refresh, Close. **No payment action** despite the tab name | Receives `lcStatuses` as props (whose `messages` are `[]` — `GET /banking/lc` returns no messages field), so first paint shows 0 messages / 0% progress; real load (`GET /banking/lc` + per-LC `GET /swift/messages?lcId=`, `swift.ts:972`) runs only on the 60 s interval | **P2:** `handleSubmitLCDocuments()` → `POST /shipments/:shipmentId/lc-documents` (`shipments.ts:2077`) is dead code — zero callers. No UI path to submit LC documents to the bank. SWIFT message types `MT700/MT710/MT750/MT752/MT754/MT103/MT910`; progress stages order MT754 before MT752. |
| 6 Reports | "Generate Report" card (Start `2026-01-01`, End `2026-12-31`, Type `All Activities/Contracts/Financial/Shipments`); "Quick Stats" card — all four values hardcoded **Unavailable** (EUDR Compliance, Customs Rejections, On-Time Delivery, Quality Rating) | **Generate** button (`:5050-5057`) has **no `onClick`** — dead; date/type inputs are uncontrolled (`defaultValue` only) | None | **P3.** |
| 7 Audit Trail | `<AuditTrailTable>` (title "Exporter Portal - Complete Transaction History", auto-refresh 60 s) | Filtering/refresh inside the table; `AuditTrailViewer` from shipment detail | `GET /audit/portal/recent?limit=500…` (`audit.ts:71`); `GET /audit/entity/:type/:id`, `/audit/verify/:type/:id`, `/audit/compliance-report/:type/:id` (all exist) | **P5:** audit-stats effect fires when `tabValue === 6` (Reports) — Audit Trail is 7 — so the Audit KPI cards load on Reports and stay `0` on the Audit tab. |

**Exporter-only problems (not in the table):** **P1 — CRITICAL: Book Shipping and Initiate Payment dialogs are unreachable dead code.**
`bookShippingDialogOpen`/`paymentSettlementDialogOpen` are only ever set to `false`; no
`set…(true)` exists anywhere, and the shipment grid/detail dialog offer no Book/Pay button.
The fully-wired handlers behind them — `handleBookShipping()` → `POST /shipping/bookings`
(`shipping.ts:410`, role `EXPORTER`, moves shipment to `FREIGHT_BOOKED`) and
`handleInitiatePayment()` → `POST /payments/initiate` (`payments.ts:75`, role `EXPORTER`) —
can never run. **An exporter cannot book freight/BoL or initiate payment settlement from any UI
in this portal**, although both dialogs label themselves "Step 10 of 11" / "Step 11 of 11".
**P10:** payment-settlement dialog displays `retainedETB = amountETB × retentionRate / 100` as
"**You will receive: {retainedETB} ETB**" — that is the *retained* portion, not the payout
(exporter receives `amountETB − retainedETB`). **P12 (misc):** shipment-detail and post-delivery
dialogs use a Delete (trash) icon as the close button; client-generated IDs
(`SHIP${Date.now()}`, `LC-<contract>-${Date.now()}`, `PAY-<shipmentId>`, `CD-<shipmentId>`,
`CONTRACT${Date.now()}`) risk collisions, and `PAY-<shipmentId>` / `CD-<shipmentId>` are
deterministic so a retry after a partial failure reuses the same ID; `couchDBService`,
`DocumentValidationDialog`, `useForm`/`Controller` imported and never used; `BankSelect` used
only in the create-contract dialog.

**Workflow coverage (Exporter):** can actually perform 4 of the 20 steps — contract registration,
LC request, customs declaration, shipment registration. Displays but cannot act on forex,
inspection, permit, payment/SWIFT, retention, post-delivery audit, contract close. **No trace of
licence application, ECX grading, phytosanitary, border crossing, or repatriation.** Its two most
downstream actions — freight booking and payment initiation — are fully built but unreachable (P1).

---

## 4. Banks Portal — `ui/src/components/portals/BanksPortal.tsx` (7,182 lines)

Page `ui/src/pages/portals/banks.tsx`: `ProtectedRoute` allows `BANKS, ADMIN, Bank Officer,
Branch Manager, Trade Finance Officer, Credit Analyst, LC Officer`. Two-level navigation
(`:488-600`): 4 parent tabs, 11 children; role-filtered by display-name roles
(`Bank Officer`, `LC Officer`, `Forex Officer`, `SWIFT Officer`, `Document Officer`,
`Payment Officer`; `ADMIN` sees all). **Landing tab is All LCs (tab 10)** — `activeTab`
initialises to `0` but the effect at `:617-633` resets it to the first visible child tab.
Shared `loadBankingData()` (`:728-~1140`, on mount): `GET /contracts` (kept only `APPROVED`),
`GET /banking/lc`, `GET /swift/messages`, `GET /forex` (enriched with buyer from LC;
**synthetic draft rows** `FOREX_<lcId>_PENDING`, `isDraft: true`, `status: 'REQUESTED'` invented
client-side for every `ISSUED` LC with no ledger forex row), `GET /shipments?status=DELIVERED`
(re-filtered to LC `PAYMENT_RELEASED`/`SETTLED`), `GET /stats/documentary-collections`,
`/stats/advance-payments`, `/stats/consignments`, `GET /payments`. All routes exist.

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 10 All LCs (Payment Operations) | Table: LC ID, contract ID, exporter, buyer+country, amount, status chip, request date. Status filter dropdown (11 values incl. `PENDING` — **not** a chaincode state; file's own comment says it is the PG default from migration 058). Status values otherwise match chaincode `banking.go:25, 739-745` | View Details (eye icon → LC Details dialog), Approve LC (check icon, only `REQUESTED`), Clear Filter. Amend + Upload Documents only inside LC Details dialog and only when `ISSUED`. No Issue / Reject buttons here | `POST /banking/lc/:lcId/approve` (`banking.ts`, `requireRole BANKS/BANK_ADMIN`) | **P0:** bulk approve exists but has no UI — `handleBulkApproveLC` (`:1612-1662`) loops `POST /banking/lc/:lcId/approve` per LC, but `selectedLCIds`/`toggleLCSelection`/`toggleAllLCSelection` are defined and **no `Checkbox` is rendered in any table and no "Bulk Approve" button exists**; `getFilteredLCs()` is only called by the dead toggle. **P1:** no KPI branch for `activeTab === 10` — All LCs shows the Payment Release KPIs (Ready for Payment / Released Today / Total Released / Avg Release Time). |
| 0 Payment Methods (Payment Operations) | `<UnifiedPaymentWorkflow>`: four clickable method KPI cards (LC, Documentary Collection, Advance Payment, Consignment); workflow table per method with stepper. LC step map (`UnifiedPaymentWorkflow.tsx:382-402`): `REQUESTED→0, APPROVED→1, ISSUED→2, AMENDED→2, FOREX_ALLOCATED→3, UTILIZED→4, PAYMENT_RELEASED/EXPIRED/SETTLED/REJECTED→5`; steps LC Requested → Approve Request → Issue LC → Awaiting Shipment → Verify Documents → Release Payment; `bankActions: [1,2,4,5]`. Payments table below (`GET /payments` rows: Payment ID, contract, exporter, amount, status chip) | Create First {Method} (only when method has no rows); View Details; per approved-contract row Issue LC / Reject; per-LC-row gold "next step" button when next step is a bank action: Approve Request, Issue LC; **Verify Documents / Release Payment fall through to a `showInfo('Process Step', …)` toast only** (`:3300-3301`) — no API call, user must go to tabs 2/3; same for all non-LC method steps. Issue Letter of Credit (submit in LC form dialog); Upload LC Application Documents; CAD/advance/consignment submit; Payment Details dialog → **Settle Payment** (only `VERIFIED`/`SWIFT_RECEIVED`, dialog fields Exchange Rate, Retention Rate pre-filled `'40'`, Paying Bank, BIC, SWIFT Reference, NBE Approval Reference, all required) | `POST /banking/lc/:id/approve`; `POST /banking/lc/:lcId/issue` (`banking.ts:761`, BANKS); `POST /banking/lc/request` (see P0); `POST /banking/cad`, `POST /banking/payment/initiate`, `POST /banking/consignment/register` (all exist, `banking.ts`, BANKS); `POST /payments/:paymentId/settle` (`payments.ts:761`, BANKS; chaincode accepts exactly `VERIFIED`/`SWIFT_RECEIVED → SETTLED`, gate matches) | **P0 — "Issue LC" will 403 for bank users.** `handleIssueLc` (`:1493-1571`) POSTs to `/banking/lc/request`, but `banking.ts:87` restricts that route to `requireRole(['EXPORTER','ECTA','ECTA_ADMIN','ADMIN'])` — **`BANKS` is not in the list**. Every path into it is bank-facing (LC form dialog, Contract Details dialog, `UnifiedPaymentWorkflow` Issue LC button). Only an `ADMIN` user would succeed. Also misnamed: it only *requests* an LC (`REQUESTED`); success toast says "requested by exporter". (Genuine issue, `POST /banking/lc/:id/issue` for `APPROVED` LCs, is correctly wired.) **P1:** "Create First {Method}" always uses the first contract — `setSelectedContract(contracts[0])` regardless of context. **Verified NOT a problem:** payment status field — portal reads `payment.status` everywhere; `paymentTrackingStatus` appears 0 times in the file. Settle Payment / Record Retention (as a rate on allocate/settle) / Issue Permit buttons all exist. |
| 2 Document Examination (Payment Operations) | LCs pending examination (`lcsForExamination`: `documents.length > 0` + status `ISSUED`/`FOREX_ALLOCATED`) or, with `VERIFIED` filter, `UTILIZED` LCs. Columns: LC ID, exporter, amount, status, Submitted Date (actually `requestDate`). KPIs: Pending Examination, Examined Today, Avg Processing Time (from `documents[].uploadedAt/verifiedAt`), Compliance Rate | Clear Filters; Audit Trail (per row → `AuditTrailViewer` entity `LC`); View Details; Examine Documents (dialog: per-document Approve/Reject, View; footer **Mark LC as Compliant & Ready for Payment** only when every document is `verified`) | `GET /banking/lc/:id` via hardcoded `fetch('http://localhost:3001/api/v1/banking/lc/:id')` (`:1324`, `:5947` — bypasses `NEXT_PUBLIC_API_BASE_URL`); `POST /documents/:documentId/verify` (`documents.ts`, `{verified, remarks}`); `GET /documents/:id/download` (via `NEXT_PUBLIC_API_URL` — a **different env var** from `NEXT_PUBLIC_API_BASE_URL`); `POST /banking/lc/:lcId/examine-documents` (`banking.ts:3270`, BANKS; chaincode `ExamineLCDocuments` accepts exactly `ISSUED`/`FOREX_ALLOCATED → UTILIZED`, matching the filter) | **P1:** `StatusChip` hardcoded `status="pending"` for every row (`:5872`) regardless of `lc.status`. **P1:** "Examined Today" KPI filters `lcsForExamination` for `status==='UTILIZED'`, but that list contains only `ISSUED`/`FOREX_ALLOCATED` — **always 0**. No non-compliant path in this dialog: `handleExamineLCDocuments(lcId, false, …)` is never called; discrepancies must go through Tab 9. Document view uses `alert()` for errors and a "test document" notice. |
| 3 Payment Release (Payment Operations) | LCs in `lcsForPaymentRelease` (`UTILIZED` + all docs verified + customs `CLEARED`/`cleared`/`customsCleared === true`). Columns: LC ID, exporter, amount, status, Verified Date (actually `requestDate`). KPIs: Ready for Payment, Released Today, Total Released, Avg Release Time (**hardcoded `'1.2d'`**, `:2956`) | Clear Filters; Audit Trail; View Details; Release Payment (with `window.confirm`) | `POST /banking/lc/:lcId/release-payment` (`banking.ts:3356`, BANKS; chaincode `ReleaseLCPayment` requires `UTILIZED → PAYMENT_RELEASED`, matching the filter) | **P1:** `StatusChip` hardcoded `status="approved"` (`:6265`). "Released Today" counts **all** `PAYMENT_RELEASED` LCs ever (no date filter); "Total Released" is labelled "This Month" but sums all `PAYMENT_RELEASED` amounts ever. |
| 9 LC Discrepancies (Payment Operations) | Entirely `<LCDiscrepancyTab>` (`ui/src/components/lcdiscrepancy/LCDiscrepancyTab.tsx`); KPIs Total / Open / Resolved / Avg Resolution fed back via `onStatsUpdate` | Report / Resolve / Waive discrepancy; Reject documents | `GET /banking/lc` (options limited to `ISSUED, FOREX_ALLOCATED, UTILIZED, AMENDED`); `GET /banking/lc/:lcId/discrepancies`; `POST /banking/lc/:lcId/discrepancy/report`, `POST …/discrepancy/:id/resolve`, `POST …/discrepancy/:id/waive`, `POST …/documents/reject` (all exist, `banking.ts`, `requireRole BANKS/BANK_ADMIN`). Statuses normalised: `OPEN → REPORTED`, `WAIVED → WAIVED` | — |
| 1 Forex Allocations (Forex & Settlements) | Table: Forex ID, LC Reference, exporter, buyer, Allocated Amount (`REQUESTED`/draft rows show `requestedAmount`), Exchange Rate, Retention (percent; `usdRetention = amount × rate/100`), Conversion to ETB (`amount × (100−rate)/100 × exchangeRate`), Status, Expiry. Filter: `ALL, REQUESTED, ALLOCATED, CONFIRMED_OR_ALLOCATED, UTILIZED`. Summary footer: Total Allocated, USD Retained, Active Allocations. KPIs: Total Forex Requests, Total Requested ($…M), Confirmed/Allocated, Pending Allocation (`REQUESTED` only) | Clear Filters, Export CSV (client-side, works); Forex Management / Repatriation (dialogs); Record Repatriation; per-row View Details (dialog; its `Confirm` button, only when `ALLOCATED`, **only shows a success toast and closes — no API call**, `~:4440-4460`); per-row action button: draft → Request Forex; `REQUESTED` → "Await NBE" (**disabled** — correct: NBE confirm is NBE-only); `CONFIRMED` → Allocate Forex (enabled); `ALLOCATED`/`UTILIZED` → disabled Allocate Forex | `POST /forex/request` (`forex.ts`, BANKS; body `{forexId, lcId, contractId, exporterId, amount, currency}` — route ignores `lcId`); `POST /forex/allocate` (`forex.ts:796`, BANKS; preceded by `GET /forex/rates/:currency/current` + `GET /forex/retention-policy/COFFEE`); `POST /repatriation/initiate` (`repatriation.ts`); `POST /repatriation/:id/record`; `GET /forex/retention-policy/COFFEE`, `GET /forex/rates/:currency/current`, `GET /payments` | **P1:** Forex `StatusChip` (`:3704-3705`) maps `ALLOCATED → 'APPROVED'`, everything else → `'PENDING'` — `CONFIRMED`, `UTILIZED`, `REJECTED` all render as "PENDING". No `REJECTED` filter, no standalone `CONFIRMED` filter. **P1:** user-typed Approval Ref is discarded — `ForexAllocationDialog` requires it, but `handleAllocateForex` hardcodes `approvalRef: \`BANK-${Date.now()}\`` (`~:2127`). **P1:** "Total Requested" KPI's `selected` state is `filterStatus === 'ALLOCATED'` — clicking it filters to ALLOCATED. Amount min/max filters compare against `allocatedAmount`, which is `0` for every `REQUESTED` row — any minimum hides all pending requests. **No standalone "Record Retention" action** — retention is only a rate on allocate/settle payloads (dialog default 40%, matching `forex.ts:816` default and the NBE COFFEE policy). |
| 5 LC Settlements (Forex & Settlements) | One card per delivered shipment (LC `PAYMENT_RELEASED`/`SETTLED`): shipment ID, contract, LC, `Delivered` chip. KPIs: Delivered Shipments, Pending Settlement, Active LCs (`ISSUED/FOREX_ALLOCATED/UTILIZED/PAYMENT_RELEASED`), Completed Settlements (`SETTLED`) | Issue Export Permit (per shipment); `PostDeliveryWorkflowPanel` (`userRole="BANK"`): Record Payment, Record LC Settlement (both gated to `BANK`/`ADMIN` in the panel). Record Forex (NBE-only) and ECTA audit / Close Contract (ECTA-only) visible but not actionable | `POST /permits` (`permits.ts:125`, BANKS; `{shipmentID, contractID, exporterID, lcID, paymentMethod: 'LC'}`); `POST /post-delivery/:shipmentId/payment`; `POST /post-delivery/:shipmentId/lc-settlement` (`postDeliveryWorkflow.ts`); `GET /post-delivery/:shipmentId/status` | **P1:** "Pending Settlement" KPI filter function is `return true` with a comment deferring to the panel — value is always exactly `deliveredShipments.length`, identical to the "Delivered Shipments" KPI. |
| 4 SWIFT Messages (Communication & Issues) | Table: Message ID, Type, SWIFT Reference, Sender/Receiver BIC, Amount, Status, Date. Filter values `DRAFT, NBE_APPROVED, APPROVED, SENT, RECEIVED, PROCESSING, SETTLED, REJECTED` — match chaincode (`swift.go:50-71`) exactly. KPIs: Total Messages, Sent (`SENT`), Received (`RECEIVED`) only | Reset Filters, Export CSV (works); View Details (dialog + `GET /swift/messages/:messageId/ledger-proof` with Fabric history verification); per-row `Send` (disabled, labelled `Sent`, when `SENT`) → pre-fills `SwiftComposeDialog` with the existing message | `GET /swift/messages/:messageId/ledger-proof` (`swift.ts`); `POST /swift/messages` or `POST /swift/messages/mt700` (`swift.ts`, BANKS) — see P1 | **P1 — "Send" creates a duplicate instead of sending.** `handleSendSwiftMessage` (`:2154-2200`) POSTs to `/swift/messages` (create) or `/swift/messages/mt700` — never to the existing-message `POST /swift/messages/:id/send` (`swift.ts:662`). Re-sending a `DRAFT` message re-creates it with the same ID. **No "Compose / New SWIFT Message" button exists** — a new message can only be created by cloning an existing row. None of the lifecycle routes (`approve`, `nbe-approve`, `receive`, `process`, `settle`, `reject`) are called anywhere in the portal. |
| 6 Analytics (System Management) | Entirely `<AnalyticsDashboard />` | Same as ECTA Tab 5 | `GET /analytics/dashboard`, `GET /analytics/timeseries/:metric`, `GET /analytics/export-report` (hardcoded host fetch) | KPI strip for this tab is a single placeholder card "Total Metrics —". |
| 7 User Management (System Management) | Generic `UserManagement`; portal-side stats via `loadUserStats` (`:1148-1184`): Total Users, Active Users, Bank Roles, Administrators | User CRUD etc. | `GET /users` | — |
| 8 Audit Trail (System Management) | Entirely `<AuditTrailTable>` (auto-refresh 60 s) | Filter, refresh, CSV | `GET /audit/portal/recent?limit=1000` (`audit.ts`) | KPIs: Total Activities, Today's Actions, Blockchain Verified (`metadata.blockchainVerified === true`), Organizations Involved. |

**Banks-only problems (not in the table):** **P0 — Document verification flow is dead.**
`DocumentVerificationPanel` is rendered (`:5441`) and `handleDocumentVerification`
(`:1819-1856`, `POST /banking/payment/:paymentID/verify-documents`) is wired to it — but there
is **no `setSelectedPayment(<value>)` and no `setVerificationDialogOpen(true)` anywhere**; the
only writes are `setSelectedPayment(null)`. The payment-documents verify step
(`PENDING → DOCUMENTS_SUBMITTED → VERIFIED`) cannot be performed from this portal.
`pendingDocuments` state (`:244`) is never populated (always `[]` passed to
`UnifiedPaymentWorkflow`); `PaymentDocuments` (`:103`) and `PaymentMethodTab` (`:113`) are
imported but never rendered. **P2 (placeholders/fabricated):** KPI dialog Export CSV button
(`:4248`) → `showSuccess('Export', 'Data export feature coming soon')` — no-op.
`onViewDetails` for non-LC payments (`~:3330-3470`) builds the validation dialog with hardcoded
fake data — fixed 5-document list with invented file sizes and compliance checks that always
read `COMPLIANT` (NBE Directive FXD/01/2021, UCP 600/URC 522, sanctions, AML/CFT, licence
validity), no API call behind any of them. `DocumentValidationDialog` `onApprove` uses
`approveLabel="Approve & Issue LC"` but only approves; issuing is a separate step.
**P2:** `server.ts:246` and `:253` both mount `bankingRoutes` on `/banking` (duplicate
registration). **P2 (role vocabulary, unverified):** page gate/tab lists use display-name roles
(`Bank Officer`, `LC Officer`…) while backend `requireRole` uses `BANKS`/`BANK_ADMIN` (and
`forex.ts` additionally accepts `BANK OFFICER`/`FOREX OFFICER` spellings) — whether a
`Bank Officer`-role user passes API RBAC depends on middleware normalisation, not verified here.
**Verified NOT problems:** no endpoint called by this portal was found missing from the backend —
failures are RBAC (P0), dead wiring (P0), wrong-payload/duplicate-create (P1), not 404s.
`ui/src/components/nbe/SWIFTMonitoring` is **not** imported here.

**Workflow coverage (Banks):** fully owns LC approve/issue/amend/reject, forex request/allocate,
document examination, payment release, settle, repatriation, post-delivery LC settlement.
Displays but cannot act on forex NBE confirmation, SWIFT lifecycle beyond (re-)initiation,
customs clearance, ECTA audit, contract close. **LC-request entry point 403s for BANKS (P0)**
and the payment-document verification flow is dead (P0). No surface for licence, ECX grading,
quality/pre-shipment inspection, phytosanitary, border crossing, shipping/booking/BoL.

---

## 5. Customs Portal — `ui/src/components/portals/CustomsPortal.tsx` (3,797 lines)

Page `ui/src/pages/portals/customs.tsx`: `ProtectedRoute` allows `CUSTOMS, ADMIN, Customs Officer,
Inspection Officer, Clearance Officer, Risk Analyst, ASYCUDA Officer, Duty Assessment Officer`.
**No Dashboard tab** — five clickable KPI cards above the tab bar jump to tabs 0–4. Tabs are
numeric `tabValue`. The portal uses **only** `apiFetch` — the imported `api` client (`:61`) is
never called. Shared `loadData()` (`:996-1094`, on mount): `GET /customs/declarations`
(`customs.ts:141`, PG `customs_declarations`, optional `?status=` filter; a duplicate
`GET /declarations` at `:588` is unreachable), plus per-row enrichment `GET /shipments/:id`
(`shipments.ts:885`) and `GET /contracts/:id` if a contract exists. `loadCustomsOfficers()`
(`:942-960`): `GET /users`, filtered client-side to `status === 'active'` for the clearance-dialog
officer dropdown. Declaration status union (`:86-107`): `DRAFT | SUBMITTED | UNDER_INSPECTION |
UNDER_REVIEW | CLEARED | REJECTED`. Chaincode (`customs.go:43`): `SUBMITTED, UNDER_INSPECTION,
UNDER_REVIEW, CLEARED, HELD, REJECTED` — `DRAFT` is produced by no transition and has no tab;
`HELD` is produced by no transition either (removed from the UI type but still hardcoded in the
dead `statusDistribution`, `Held: 5`).

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Submitted | Rows `status==='SUBMITTED'`; columns Declaration ID, Shipment ID, Exporter, Type chip (`STANDARD/SIMPLIFIED/EUDR_ENHANCED`), Qty kg, Value, Destination, Status chip (`{stageLabel} - Pending`), Actions (icon buttons, tooltips only). Alert "Schedule inspections for SUBMITTED declarations" | View Details (eye icon → detail dialog); Schedule Physical Inspection (shield icon, `SUBMITTED` only) → Inspection dialog → **Schedule Inspection** | `POST /customs/declaration/:id/review` (`customs.ts:1624`, role `CUSTOMS/CUSTOMS_ADMIN`, chaincode `ReviewCustomsDeclaration`, guard `SUBMITTED → UNDER_INSPECTION`, `customs.go:475-485`) with `{inspectorNotes, inspectionType, scheduledDate, priorityLevel, location, assignedInspector}`; enrichment `GET /users/by-exporter/:exporterId` (`users.ts:1948`) + `GET /shipments/:id` | — (this step works) |
| 1 Inspecting | Rows `status==='UNDER_INSPECTION'`; alert "Complete inspections for UNDER_INSPECTION declarations". (Tab comment at `:2105` still says "Inspection Completed"; smart-column stage label is "Inspection Completed".) | View Details; Complete Physical Inspection (check icon, `UNDER_INSPECTION` only) | `POST /customs/declaration/:id/complete-inspection` (`customs.ts:1837`, chaincode `CompleteCustomsInspection`, guard `UNDER_INSPECTION → UNDER_REVIEW`) with **hardcoded** `{inspectionResult: 'PASSED', inspectorComments: 'All requirements met', completedDate: now}` | **P12: there is no way to record a failed inspection** — result/comments are hardcoded to pass. |
| 2 Under Review | Rows `status==='UNDER_REVIEW'`; alert "Clear or reject UNDER_REVIEW declarations" | View Details; Approve & Clear Declaration (check icon) → Clearance dialog → **Authorize Clearance**; Reject Declaration (× icon) → Rejection dialog → **Confirm Rejection** | `POST /customs/declaration/:id/clear` (`customs.ts:2022`, chaincode `ClearCustomsDeclaration`, guard `UNDER_REVIEW → CLEARED`, `customs.go:706-783`) with `{clearanceNumber (client-generated), exportDuty, vatAmount, clearanceType, clearedBy, exitPoint, validityPeriod, clearanceRemarks, officerNotes}`; `POST /customs/declaration/:id/reject` (`customs.ts:1939`, role `CUSTOMS` only, chaincode `RejectCustomsDeclaration`) with `{rejectedBy, rejectionReason, rejectionCategory, severityLevel, appealDeadline}` | **P1 — CRITICAL: Reject can never succeed.** Every field in the Rejection dialog (`:2610-2740`) uses `defaultValue` with **zero `onChange` handlers**; the only `setRejectionForm` call is the reset after a successful reject. `handleRejectDeclaration()` (`:1361-1452`) validates `rejectionForm.detailedReason` non-empty first — always `''` — so "Confirm Rejection" always shows "Detailed rejection reason is required" and returns; the endpoint is never sent. Even if wired, the route only reads `rejectionReason` + `rejectedBy`, silently dropping category/severity/appealDeadline. **P2:** Clearance dialog is half unwired — only Cleared By, Customs Duties, VAT Amount, Validity Period have `value`+`onChange`; Clearance Number/Date/Type, Exit Point, Remarks, Officer Notes are `defaultValue`-only. Handler ignores `clearanceForm.clearanceNumber` (generates its own), ignores date/remarks/notes, and always sends `exitPoint: 'DJIBOUTI'`, `clearanceType: 'FULL'`. |
| 3 Cleared | Rows `status==='CLEARED'`; alert "Completed: All declarations cleared for export (View Only)" | View Details only (terminal state, by design) | — | **P4:** the richer cleared-shipments view (`CustomsClearedShipments.tsx`, incl. "Go to Shipping Portal" handoff via `sessionStorage` + `window.location.href`) is imported but **never rendered**. |
| 4 Rejected | Rows `status==='REJECTED'`; alert "Completed: All declarations rejected (View Only)" | View Details only. No resubmit/appeal action | — | A Rejection Details dialog exists (`:3599-3707`) but is **never opened** (`setRejectionDetailsDialogOpen(true)` called nowhere) and its content is hardcoded text ("Missing phytosanitary certificate…"), not the stored reason (`loadData` maps `rejectionReason` at `:1023`, but the `CustomsDeclaration` interface doesn't even declare the field). |
| 5 Border Crossing | `<BorderCrossingTab>` (`ui/src/components/bordercrossing/BorderCrossingTab.tsx`, 215 lines) + 3 dialogs. KPI cards (Total / Active / Cleared Today / Avg Processing); grid: Crossing ID, Shipment, Vehicle, Border Post, Status, Arrival, Actions. Status union (`:28-34`): `PENDING/INSPECTED/INSPECTION_FAILED/CLEARED/DETAINED/CLEARED_EXIT/IN_TRANSIT/CROSSED/ARRIVED` — matches chaincode functions (struct comment lists only 5, but functions produce the rest) | Refresh; **+ New Crossing** → Initiation dialog → **Initiate Crossing**; Physical Inspection (`PENDING` rows) → **Complete Inspection**; Clear/Detain (`INSPECTED`/`INSPECTION_FAILED` rows) → **Clear Shipment / Detain Shipment**; Record Departure (`CLEARED_EXIT` rows); Record Border Crossing (`IN_TRANSIT` rows); Record Arrival (`CROSSED` rows); View Details (all rows) | `GET /bordercrossing` (`bordercrossing.ts:17`, raw `QueryAllBorderCrossings` rows, no field mapping); `POST /bordercrossing/initiate` (`:148`); `POST /bordercrossing/:id/inspect` (`:545`); `POST .../clear` (`:219`); `POST .../detain` (`:260`); `POST .../departure` (`:341`); `POST .../crossing` (`:379`); `POST .../arrival` (`:503`) — all exist | **P6 — CRITICAL: wrong identifier name breaks every write.** Chaincode field is `crossingId` (`bordercrossing.go:18`) and `GET /bordercrossing` returns raw rows — but the tab reads `crossing.borderCrossingId` everywhere (`:51-78, 134-170`). So `borderCrossingId` is `undefined` for every row: grid row ids are undefined and every action posts to `POST /bordercrossing/undefined/{departure\|crossing\|arrival\|inspect\|clear\|detain}`. The initiate dialog compounds it: it sends `borderCrossingId` while the route reads `crossingId`, plus `contractId, exporterId, borderCountry, crossingType, finalDestination, exitPermitNumber, customsDeclaration, transportMode, sealNumber, cargoWeight, numberOfBags` — all `undefined` from this dialog; chaincode `InitiateBorderCrossing` fails `ValidateID` on empty crossing ID and `parseFloat/parseInt` on `"undefined"` weight/bags. **Net: the tab can list crossings but cannot initiate, inspect, clear, detain, depart, cross, or arrive on any of them.** Secondary: "View Details" is a no-op (only `setSelected(row)`, no dialog rendered); "Upload Photos" button has no `onClick` (`PhysicalInspectionDialog.tsx:55`); "Cleared Today" counts all-time `CLEARED` rows, "Avg Processing" is hardcoded `4.5h`, "Active" counts terminal `ARRIVED`/`CROSSED` rows as active. **Never called from anywhere in the UI:** `POST /bordercrossing/:id/clear-exit` (`:302`, `PENDING → CLEARED_EXIT`), `/verify` (`:609`), `/location` (`:425`), `/delay` (`:464`) — so `CLEARED_EXIT` is unreachable and the tab's own comment ("CLEARED_EXIT -> departure") describes a path the UI cannot produce. BC tab also conflates `CLEARED` (clear dialog) with `CLEARED_EXIT` (exit clearance) — different states. |
| 6 User Management | Generic `UserManagement` | User CRUD etc. | `GET/POST/PUT/DELETE /users`, `PUT /users/:id/status`, `POST /users/:id/reset-password` | — |
| 7 Audit Trail | `<AuditTrailTable>` (auto-refresh 60 s); portal-level stats via `loadAuditStats()` (`:1098`, `GET /audit/portal/recent?limit=1000`); "View Audit Trail" from detail dialog opens `AuditTrailViewer` | Filter, refresh, CSV | `GET /audit/portal/recent?...` (`audit.ts:71`); `GET /audit/verify/:type/:id` (`audit.ts:1139`) | — |

**Customs-only problems (not in the table):** **P3 — "Submit New Declaration" is unreachable.**
The New Declaration dialog (`:3376-3598`, `POST /customs/declaration/submit`, `customs.ts:676`,
chaincode `SubmitCustomsDeclaration`) has no opener: no button calls
`setNewDeclarationDialogOpen(true)` except `handleCreateDeclarationFromPermit()` (`:962-990`),
which is only wired as the `onCreateDeclaration` prop of `CustomsInspection` — which is never
rendered (P4). A customs officer cannot create a declaration from this portal at all.
Additionally, on successful submit the handler does `setTabValue(1)` with the comment "Switch
to Tab 1 (Submitted)" (`:1578-1581`) — index 1 is **Inspecting**; Submitted is index 0.
**P4 — three imported sub-components are dead code:** `CustomsInspection` (`:74`),
`CustomsClearedShipments` (`:75`), `DocumentValidationDialog` (`:77`) have **zero JSX usages**.
That kills the permit-ready inspection list → "Create Declaration" flow
(`CustomsInspection.tsx:299-325, 538-553`) and the cleared-shipments table with "Go to Shipping
Portal". Also dead: hardcoded chart data `clearanceData`, `statusDistribution` (incl. `Held: 5`),
`inspectionData` (`:907-930`), `declarationColumns` (`:1759+`, all tabs use `getSmartColumns`).
**P5 — Duty calculation & valuation: displayed as a workflow step, never performed.**
Nothing in `CustomsPortal.tsx`, `CustomsInspection.tsx`, or `CustomsClearedShipments.tsx` calls
`POST /customs/declaration/:id/calculate-duty` or `POST .../valuation` (both exist,
`customs.ts:1297, 1482`; migration 068 creates `duty_calculations`, `customs_valuations`,
`customs_tariffs`, `trade_preferences`). Instead `autoMapClearanceData()` (`:829-900`) computes
duties **client-side with hardcoded constants**: exchange rate **56.5 ETB/USD**, processing fee
0.5% of FOB + fixed 500 ETB documentation fee, export duty 0% / VAT 0% by comment assumption —
while the API `calculate-duty` uses the tariff table with defaults **10% duty / 15% VAT** and
default FX **125.50**, and writes `duty_calculations` + `customs_declarations.duty_amount`. The
`dutyAmount`/`dutyPaid` fields returned by `GET /customs/declarations` are never read or displayed
anywhere in the portal. The clearance dialog's required `DUTY_ASSESSMENT` document can therefore
never exist from this flow. Also never called by any Customs UI file:
`POST /customs/risk-assessment` (`:235`), `GET /customs/clearance(s)` (`:278, :322`),
`GET /customs/permit-ready` (`:494`), `GET /customs/assessments|document-verification|
risk-assessment|history` (`:2131-2331`), `PUT .../amend` (`:1058`), `DELETE .../cancel` (`:1210`),
both `POST .../inspect` routes (`:1818, :1820`). **P7 — quality-inspection / export-permit gate
reads fields the API never returns.** `handleShipmentIdChange()` (`:351-510`) requires
`inspection.exportPermitNo` and `inspection.certificateNo`; but
`GET /quality/inspections/by-shipment/:id` normalises to `certificationNumber` and returns no
`exportPermitNo`/`certificateNo` keys (`quality.ts:1515-1560`), and the `quality_inspections`
table has **no export-permit column at all**. So `hasPermit`/`hasCertificate` are always false
and a fully approved + permitted shipment triggers the blocking alert "No Export Permit Issued"
(`:499`). The same defect makes the (dead) `CustomsInspection` permit-ready list always empty.
**P8 — status/KPI mismatches:** `getDeclarationStats()` (`:1918-1935`) counts cumulatively via a
hierarchy that scores `REJECTED = 4` (same as `CLEARED`), so the Submitted/Inspecting/Under
Review KPI cards **include rejected declarations**; `getSmartColumns`' "Completed" chip branch
is dead (each tab pre-filters to its own status, so `isCurrentStage` is always true).
**P9 — document wiring mismatches + placeholders:** clearance dialog `DocumentManagementPanel`
gets `entityType="CUSTOMS_DECLARATION"` with `entityId={selectedDeclaration.shipmentId}`
(`:3053-3072`), but declaration documents are keyed by **declarationId** — wrong entity id
(same mismatch in the new-declaration `DocumentUploadDialog`, `entityId` = shipmentId).
`CustomsClearedShipments.tsx` reads `d.clearanceNumber`/`d.clearedBy`, but the
`GET /customs/declarations` mapper selects neither — always `'N/A'`. "Download All Documents as
ZIP" = `alert()` only (`:2493-2504`); "View All Documents" chip → `window.open('/documents/
shipment/{shipmentId}')` — **no such Next.js page exists** (`ui/src/pages/documents/` does not
exist) → 404; "Export Report" and "Download Certificate" (in `CustomsClearedShipments`) = `alert()`
only. Document Viewer dialog (`:3737-3796`): `documentViewerOpen` is never set to `true` — dead UI.
**P10:** `GET /customs/declarations` registered twice (`customs.ts:141` with `?status` filter,
`:588` without); Express serves the first, the second is dead code.

**Workflow coverage (Customs):** of Customs' five core steps, only *schedule inspection*,
*complete inspection (pass-only)*, and *clear* actually work from this portal. *Declaration
submit* is correctly coded but unreachable (P3), *rejection* is unwired and can never fire (P1),
*duty/valuation* is never called — fees are hardcoded client-side (P5) — and *border crossing*
is list-only with every write broken by the `borderCrossingId`/`crossingId` mismatch (P6).
Licence, contract, LC, forex, ECX grading, shipping/booking/BoL, SWIFT/payment, retention,
repatriation, post-delivery audit, contract close are not in this portal (audit trail is view-only).
Quality/pre-shipment inspection and export permit appear only as gates/preconditions the portal
checks (and checks wrongly, P7); phytosanitary appears only as a checklist label.

---

## 6. NBE Portal — `ui/src/components/portals/NBEPortal.tsx` (2,706 lines)

Page `ui/src/pages/portals/nbe.tsx`: `ProtectedRoute` allows `NBE, ADMIN, NBE Officer, Forex
Officer, Screening Officer, Compliance Officer, Exchange Rate Officer, Settlement Officer`.
`ForexAllocationDialog` is **not** imported here (BanksPortal-only); NBE has its own inline
allocate dialog. Global `loadData()` (`:270-440`) fires once on mount and loads **all** tabs' data
up front. **Role-gating hole:** `Screening Officer` passes the page gate but matches **no** tab
role list (`:829-851`) → an empty portal (no tabs, no content, no error); conversely
`NBE Portal Administrator` can see the User Management tab in code but is blocked by the page gate.

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Forex Monitoring | DataGrid (`forexColumns`, `:964-1155`): Forex ID, LC Reference (`-` / "Pending Allocation" when empty on `REQUESTED`), Contract ID, Exporter, Requested, Allocated (`-` if 0), Rate ETB ("Pending" when `REQUESTED`/0), Retention % (`-` when `REQUESTED`/0), Status chip, Request Date. Status union (`:120`): `REQUESTED/CONFIRMED/APPROVED/ALLOCATED/UTILIZED` — **omits `REJECTED`** (chaincode `forex.go:44`: `REQUESTED, CONFIRMED, ALLOCATED, UTILIZED, REJECTED`; `APPROVED` legacy, never assigned). `retentionStatus`: `PENDING/COMPLIED/NON_COMPLIANT` (matches `forex.go:36`). KPIs: Total Forex Requests (all statuses), Requested/`Pending Requests` (`REQUESTED` only), Allocated, Total Value (M USD), `Ready for Approval` (exact duplicate of Requested). Sub-tab `forexSubTab` (0 All / 1 Allocated / 2 Requested) has **no visible sub-tab bar** — switching only via clicking KPI cards | Row "Confirm Forex Request" (only `REQUESTED`); Row "Allocate Forex" (only `CONFIRMED`/legacy `APPROVED`) → Allocate dialog (amount = requested, rate = active `midRate`, retention = live policy rate, read-only) → **Allocate Forex**; Row "Record Retention" (only `ALLOCATED`/`UTILIZED`) → Record Retention dialog → **Record Retention**; Row eye icon "View Forex Details"; `Export Report` | `GET /forex` (`forex.ts:122`, PG `forex_allocations`, `retention_status \|\| 'PENDING'`); `GET /forex/retention-policy/COFFEE` (`forex.ts:252`, `GetCurrentRetentionPolicy`; **404s** `ACTIVE_POLICY_NOT_FOUND` when no policy exists); `POST /forex/:forexId/confirm` (`forex.ts:713`, NBE roles, `ConfirmForex`, `REQUESTED→CONFIRMED`) — called via raw `fetch('/api/v1/forex/...')` with a manual `Authorization` header (bypasses `apiFetch`, works only because `ui/next.config.js` rewrites `/api/v1/:path*`); `GET /banking/lc` (`banking.ts:1349`, to find the LC for the contract — blocks with "No Letter of Credit found…" if none); `POST /forex/allocate` (`forex.ts:793`, NBE allowed); `POST /retention/:forexId/retention` (`retention.ts:186`, NBE; chaincode `RecordForexRetention` requires `ALLOCATED/UTILIZED`, marks `COMPLIED` only on exact policy match else `NON_COMPLIANT`, `forex.go:793-816`) | **P3.2.7:** "View Forex Details" eye icon only does `setSelectedForex(row)` — **no details dialog opens**. **P3.1.1:** `Export Report` (`:1750`) has **no `onClick`**. **P3.7.26:** Allocate sends `nbeOfficer`/`nbeApprovalRef`, but the route destructures `officer`/`approvalRef` (`forex.ts:796`) — officer falls back to JWT username, **`nbeApprovalRef` is silently dropped to `''`**; the approval reference never reaches the ledger. Chaincode requires the LC be `ISSUED`/`FOREX_REQUESTED` and retention rate equal the active policy (`forex.go:550-551, 507-508`). **No forex Reject action anywhere** (chaincode `RejectForex`, `forex.go:379`; route `POST /banking/forex/:forexID/reject`, `banking.ts:657`). **No forex Utilise action** (`POST /forex/utilize`, `forex.ts:938`). Retention rate: 40% is a **default, not a chaincode constant** — chaincode stores whatever `SetRetentionPolicy` set and `AllocateForex` enforces an exact match; with no policy, `GET /forex/retention-policy/COFFEE` 404s → Allocate button disabled and dialog shows an error banner; the Record Retention dialog hardcodes `'40'` as prefill when there is no policy (`:1142`). Exchange rate/retention are zeroed in the mapper unless status is `ALLOCATED` (`:311`), so `CONFIRMED` rows show "Pending"/"-". `CONFIRMED`, legacy `APPROVED`, `UTILIZED`, `REJECTED` have no KPI and no sub-tab filter. |
| 1 LC Monitoring | Read-only DataGrid over `lettersOfCredit`: LC Number, Contract ID, Exporter, Amount, Issuing Bank, Advising Bank, Status chip, Expiry, Issued Date. No TS status union; KPI "Active LCs" counts `ISSUED/FOREX_ALLOCATED/UTILIZED/AMENDED` | `Export Report` (no `onClick` — dead). **No row actions at all** — purely observational | `GET /nbe/lc-monitoring` (`nbe.ts:462`, raw PG `letters_of_credit` rows, snake_case). Note: an identically-named handler also exists at `forex.ts:415` under `/forex/lc-monitoring` — portal hits the `/nbe` one | Chaincode LC statuses also include `REQUESTED, APPROVED, REJECTED, EXPIRED, PAYMENT_RELEASED, SHIPPED` (`banking.go:25, 741-743`); counting `UTILIZED` as "active" while excluding `PAYMENT_RELEASED`/`SHIPPED` is unlabelled. No LC approve/issue/amend/discrepancy action (those live in BanksPortal). |
| 2 Exchange Rates | Cards per rate from `GET /forex/rates`: currency, `midRate` ETB, status chip, effective date. Status union (`:126`): `ACTIVE/INACTIVE/SUPERSEDED` — matches chaincode (`forex.go:70-78`); loader coerces anything else to `INACTIVE`. KPIs: Current Rate (ETB/USD, latest ACTIVE USD `midRate`), Active Currencies, Rate Updates, Active Rates | `Export Rates` (no `onClick` — dead); `Update Rates` → Update Exchange Rate dialog → **Set Rate** | `GET /forex/rates` (`forex.ts:209`, `QueryAllExchangeRates`); intended `POST /forex/rates` (`forex.ts:487`, NBE) via `handleSetExchangeRate()` (`:633`) — **never called** | **P3.2.5 — CRITICAL: NBE cannot set an exchange rate from its own portal.** The dialog is fully dead: every input is uncontrolled with no `value`/`onChange`/state (currency `Select defaultValue="USD"`, buying/selling/effective-date/justification `TextField`s with placeholders only), and "Set Rate" (`:2679`) just does `onClick={() => setRateDialogOpen(false)}`. `handleSetExchangeRate()` is never called from anywhere. Also `api.createExchangeRate`/`updateExchangeRate` (`utils/api.ts:444, 481`) — the latter posts to `/banking/exchange-rates`, which has **no route**. (A second setter `POST /forex/exchange-rate`, `forex.ts:332`, requiring `rateID`, is also never called.) |
| 3 SWIFT Monitoring | `<SWIFTMonitoringWrapper>` → `SWIFTMonitoring.tsx`. Sub-tabs: 0 All Messages / 1 Analytics & Charts / 2 Compliance Alerts. Table: Message Type, SWIFT Ref, From/To BIC, Amount (bold/red > $1M), Status tag (`SETTLED` green, `DRAFT`/`NBE_APPROVED` orange, else blue), Date. Chaincode statuses (`swift.go:50-71`): `DRAFT, NBE_APPROVED, SENT, RECEIVED, SETTLED, REJECTED, …` — table renders any status | "Export Report" (placeholder — only `notification.info('Report export functionality will download…')`, no download); Row "View" / "Approve" (label "Approve" only when `amount > 1,000,000 && status==='DRAFT'`) → approval modal → OK; "Review" in Compliance Alerts → same modal | `GET /swift/messages?startDate&endDate` (`swift.ts:972`) and `GET /swift/statistics` (`swift.ts:1036`) via `loadMonitoringData()` (`SWIFTMonitoring.tsx:144-176`, 60 s refresh); `POST /swift/messages/:messageId/nbe-approve` (`swift.ts:579`; chaincode accepts **DRAFT only** → `NBE_APPROVED`, `swift.go:798-807`) | **P3.6.21:** portal KPIs "Forex Inflow / Success Rate / Compliant / Compliance Rate" count `SENT`, not `SETTLED` (`:1218, 1222-1223, 1230-1232`) — a merely-sent message counts as realised forex and as compliant; the sub-component correctly uses `MT103 + SETTLED` (`SWIFTMonitoring.tsx:181-184`). **P3.6.22:** high-value threshold is **$100,000** in the portal vs **$1,000,000** in the sub-component (alerts + approve gate) — same tab, two definitions. **P3.2.8:** "Review" opens the approval modal for any generated alert, but alerts are generated for `DRAFT` **or** `NBE_APPROVED` (`:223`) while the endpoint requires DRAFT — Review on a `NBE_APPROVED` alert must fail. **No UI path for `NBE_APPROVED → APPROVED`** (`POST /swift/messages/:id/approve`, `swift.ts:533`). Two independent SWIFT loads (portal, no params; sub-component, 30-day window + statistics) can disagree. |
| 4 Forex Repatriation | `<RepatriationManagementTab>`: `GET /repatriation`; columns Repatriation ID, Exporter, Export Amount, Status chip, Deadline, Days Remaining/Overdue, Initiated. Status union (`:72`): `PENDING/PARTIAL/READY_FOR_VERIFICATION/COMPLIED/WAIVED/NON_COMPLIANT/OVERDUE` — effectively correct (chaincode `repatriation.go:50, 762, 964-966`). Stats computed client-side. Search / status filter / From-To date (client-side), Refresh, Export (works — client-side CSV) | Row "View Details" → `RepatriationDetailsDialog`; Row "Verify" (only `READY_FOR_VERIFICATION`/`OVERDUE`) → `window.prompt` for reference/notes → verify | `GET /repatriation` (`repatriation.ts:18`); `GET /repatriation/:id` (`:60`); `POST /repatriation/:id/verify` (`repatriation.ts:306`, NBE; chaincode requires `READY_FOR_VERIFICATION\|OVERDUE` → `COMPLIED`, `repatriation.go:521-538`) | **Dead/unreachable:** `RepatriationCompliancePanel` is rendered but `compliancePanelOpen` is **never set to `true`** anywhere, so its `POST /notifications/compliance/repatriation` (`RepatriationCompliancePanel.tsx:109`, route exists `notifications.ts:178`) is unreachable. `RepatriationInitiationDialog` (`POST /repatriation/initiate`, `repatriation.ts:199` — BANKS-only) and `RepatriationRecordingDialog` (`POST /repatriation/:id/record`, `:258` — BANKS-only) are exported but **never imported/rendered** by the management tab. **No UI at all** for `POST /repatriation/:id/penalty` (`repatriation.ts:345`) and `POST /repatriation/:id/waiver/approve` (`:435`) — waivers/penalties can be viewed as statuses but never decided. `daysRemaining` defaults to `0` when absent, rendering as "0 days" / overdue-adjacent rather than unknown. Retention-status KPI distortion: "Review Required" counts `retentionStatus` in `PENDING\|NON_COMPLIANT` (`:1236`), but the forex list endpoint normalises every row to `retention_status \|\| 'PENDING'` (`forex.ts:186`), so every `REQUESTED`/`CONFIRMED` row inflates it. |
| 5 Policy & Compliance | Two static cards only. "Compliance Metrics": `Minimum Price Compliance: {bankingMetrics.complianceRate}%`; "EUDR Documentation: Unavailable" (hardcoded); "Regulatory Updates 2026" — three hardcoded bullets | None | **None that works.** `GET /analytics/banking` via `api.getBankingMetrics()` (`:395`) — **route does not exist** (`analytics.ts` has only `/dashboard`, `/timeseries/:metric`, `/blockchain`, `/export-report`, `/breakdown`); always falls back to zeros | **"Minimum Price Compliance: 0%" always** — the metric comes from the non-existent endpoint, and the label is wrong anyway (it is a banking-metrics compliance rate, not minimum-price compliance). **Nothing here performs any policy action** — no form calls `POST /forex/retention-policy` (`forex.ts:266`, NBE) or `POST /retention/policy` (`retention.ts:15`), and **none** of the `api/src/routes/nbe.ts` endpoints is called from anywhere in the portal: `GET /nbe/forex`, `POST /nbe/forex/:id/approve`, `POST /nbe/forex/:id/repatriation`, `POST /nbe/retention-accounts`, `POST /nbe/retention-accounts/:id/calculate-penalty`, `POST /nbe/waiver-requests`, `GET /nbe/compliance-tracking`. |
| 6 Analytics | `<AnalyticsDashboard>`; sub-tabs Overview / Trends / Breakdown (Breakdown gated on `kpis.paymentMethods`, `:319`). Date-range/metric/group-by controls (functional), export report (functional) | Date-range/metric/group-by, Export Report | `GET /analytics/dashboard` (`analytics.ts:16`); `GET /analytics/timeseries/:metric?period&dateFrom` (`:53`); export via hardcoded `fetch('http://localhost:3001/api/v1/analytics/export-report?...')` (`AnalyticsDashboard.tsx:173`) — exists (`analytics.ts:157`) but hardcoded host. `GET /analytics/breakdown` exists (`analytics.ts:225`) but is **never called** | Portal KPIs for this tab are wrong (see §3.8 below): the Analytics KPI branch is attached to `tabValue===5`, so tab 6 falls through to the generic fallback KPIs. |
| 7 User Management | Generic `UserManagement` | User CRUD etc. | `GET/POST/PUT/DELETE /users`, `PUT /users/:id/status`, `POST /users/:id/reset-password` | This tab's KPIs show **Audit Trail** stats (see §3.8), and its tab label carries the delivered-shipments count (see §3.9). |
| 8 Audit Trail | `<AuditTrailTable>` (`GET /audit/portal/recent?limit=500&entityType&action`, auto-refresh 60 s) | Filter, refresh | `GET /audit/portal/recent` (`audit.ts:71`) | Its KPIs are the generic fallback set (see §3.8). **Dead siblings:** `AuditTrailViewer` rendered at the bottom (`NBEPortal.tsx:2696`) but `showAuditTrail` is never set to `true` and entity type/id never set — unreachable. `DocumentValidationDialog` (`:2685`) likewise never opened. |

**NBE-only problems (not in the table):** **§3.3.9 — `contractColumns` is never rendered**
(`:859-962`): no `DataGrid` uses it (only `forexColumns` is rendered). Consequences: the contract
**Approve** flow (`:916-929` → approval dialog `:2029` → "Approve for Forex" `:2155` →
`handleApproveContract()` `:544`) is **unreachable** — and even if reached, it calls
`api.approveContractForForex()` → `POST /contracts/:id/nbe-approve`, whose route **always returns
400 `ENDPOINT_DEPRECATED`** (`contracts.ts:1823-1867`: "Contract approval is done by ECTA"). The
contract **Details** dialog (`:2164`, with `BlockchainBadge`/`BlockchainSignatureVerification`) is
unreachable. **Contract Reject is `prompt()` + `alert()` only** (`:935-955`): collects a reason via
`window.prompt`, then `alert('Contract … rejected…')` and returns; `handleRejectContract()` (`:585`,
`POST /contracts/:id/reject` via `api.rejectContract`) is never called — no rejection is recorded.
**§3.8 — KPI/tab-index misalignment (off-by-one from tab 5):** KPI branches (`:1180-1270`) have
cases for 0,1,2,3,4,5,7 and a default, but the tabs are 0–8 with Analytics at 6 and Audit at 8:
tab 4 (Repatriation) shows retention-policy KPIs; tab 5 (Policy & Compliance) shows Analytics KPIs
(Total Contracts, Total Export Value, Forex Allocated, SWIFT Messages); tab 6 (Analytics) and tab 8
(Audit Trail) get the generic fallback set (which mislabels contract value as "Total Forex (M)"
and the all-status forex count as "Allocations"); tab 7 (User Management) shows Audit Trail KPIs.
A second, duplicate KPI section (`:1317-1650`) is rendered with `display: 'none'` — dead markup
containing hardcoded "+10% / +15% / +18%" growth claims and a "Retention Rate" card reading the
live policy. **§3.8/32:** `loadAuditStats()` fires on `tabValue===7` (`:264-268`) — User Management
— instead of 8 (Audit Trail). **§3.9 — wrong counts in tab labels** (`:1726-1728`): tab 1 "LC
Monitoring" shows `exchangeRates.length` (the rate count, not the LC count); tab 7 "User
Management" shows `deliveredShipments.length` (a shipment count on a users tab). **§3.3.10/11:**
`handleKPIFilter()` (`:511-542`) and `handleReviewForexCompliance()` (`:673-698`) are never called.
`couchDBService` (`:55`) and `PostDeliveryWorkflowPanel` (`:69`) imported but never referenced.

**Workflow coverage (NBE):** forex confirm ✅, exchange-rate setting ❌ (**dead dialog — core NBE
step unperformable**), forex allocation ✅ (with dropped approval ref), retention policy ⚠️
(read-only — no UI to set it), retention record ✅, repatriation ⚠️ (verify only; no
initiate/record/penalty/waiver UI), SWIFT monitoring ⚠️ (approve works for DRAFT > $1M; export is
a placeholder, KPI "inflow/compliance" counts `SENT` not `SETTLED`, thresholds disagree,
`NBE_APPROVED` rows have no onward action), analytics/policy & compliance ⚠️ (analytics works;
policy tab is static and its headline metric is always 0% from a missing endpoint). No surface for
licence, contract approval (dead + deprecated endpoint), ECX grading, inspection, permit,
phytosanitary, customs, border crossing, shipping/BoL, payment settle/release, contract close.

---

## 7. Shipping Portal — `ui/src/components/portals/ShippingPortal.tsx` (4,652 lines)

Page `ui/src/pages/portals/shipping.tsx`: `ProtectedRoute` allows `SHIPPING, ADMIN, Logistics
Officer, Documentation Officer, Operations Manager, Shipping Coordinator, Freight Forwarder`.
Single tab strip driven by numeric `tabValue` (`:177, 191-202`); **no nested sub-tabs**; each tab
is one lifecycle status (plus Users). Tab 9 is role-gated. **No Dashboard, Analytics, Freight
Booking, Border Crossing, or Documents tab.** All tabs 0–8 render the same shared `DataGrid`
(`shippingColumns`, `:2090+`) filtered by status, plus a per-tab KPI row (`:2362-2620`) and a
status-count `Alert`. A "Refresh Data" icon button sits beside the strip (`:2781`, re-runs
`loadData()`). Shared `loadData()` (`:422-660`, on mount): `api.getShipments()` → `GET /shipments`
(`shipments.ts:561`, CouchDB first, PG fallback) and `apiFetch('/customs/clearances')` →
`GET /customs/clearances` (`customs.ts:322`) — used only to build a set of cleared `shipment_id`s
so a shipment cleared in PG but not yet on-chain still shows as `CUSTOMS_CLEARED`.
**Status mapping (`:484-560`):** raw status upper-cased and mapped 1:1; `CREATED` is deliberately
dropped; any other unmapped status (`PERMIT_ISSUED`, `CUSTOMS_DECLARED`, `INSPECTION_PENDING`,
`CUSTOMS_REJECTED`, `CANCELLED`) is dropped with `console.error … UNMAPPED STATUS … SKIPPING THIS
RECORD`. UI status union (`ShippingRecord.status`, `:102`): `CUSTOMS_CLEARED | FREIGHT_BOOKED |
LAND_TRANSPORT | PORT_ARRIVED | CONTAINER_STUFFED | VESSEL_LOADED | DEPARTED | IN_TRANSIT |
DESTINATION_ARRIVED | ARRIVED | DELIVERED | LOADED | CREATED` — omits `PERMIT_ISSUED,
CUSTOMS_DECLARED, CUSTOMS_REJECTED, INSPECTION_PENDING, CANCELLED` from the chaincode closed set
(`main.go:2089-2096`), so a shipment awaiting permit/customs/inspection is invisible here.
Lifecycle progress map (`:209-222`): CUSTOMS_CLEARED/FREIGHT_BOOKED 10%, LAND_TRANSPORT 25%,
PORT_ARRIVED 40%, CONTAINER_STUFFED 55%, VESSEL_LOADED/LOADED 70%, DEPARTED 75%, IN_TRANSIT 85%,
DESTINATION_ARRIVED/ARRIVED 95%, DELIVERED 100%. `SystemTraceability.tsx` and
`BlockchainAuditTrail.tsx` are **not** imported by this portal; `DocumentValidationDialog` is
imported (`:67`) but never rendered.

| Tab | Shows | Actions | API calls | Problems |
|---|---|---|---|---|
| 0 Clearance | Rows `CUSTOMS_CLEARED` + `FREIGHT_BOOKED`. Grid columns: Shipping ID (`SH-<id>`), Shipment ID, Exporter, Mode (SEA/AIR icon), Carrier, B/L or AWB (`billOfLading`/`containerNumber` or `airwayBill`/`flightNumber`, `(Pending)` before stuffing), Vessel/Flight (`(To be assigned)` before loading), Origin, Destination, Container Type (DRY/REEFER/OPEN_TOP chip), Status chip, ETD, ETA, Current Stage chip, Progress bar, Actions. KPIs: "Approved Clearances", "Ready for Transport", "In Progress", "Clearance Rate" | `CUSTOMS_CLEARED` rows only — "Start Land Transport" (grid icon `:2205-2221`; dialog button `:3292`). **No action for `FREIGHT_BOOKED` rows anywhere** | `POST /shipments/:id/land-transport/start` (`:1704`, `{transportCompany, truckPlateNumber, driverName, sealNumber}`; chaincode `StartLandTransport`, requires `CUSTOMS_CLEARED`, `main.go:3202`; route `shipments.ts:2139`, `requireRole('SHIPPING','SHIPPING_ADMIN')`) | **P3 — `FREIGHT_BOOKED` is a dead end, and freight booking has no UI at all.** No button calls `POST /shipments/:id/book-freight` (`shipments.ts:1777`, sets `FREIGHT_BOOKED`) or any `/shipping/*` booking route (`shipping.ts:410 POST /bookings`, `:536 load`, `:607 depart`, `:674 arrive`, `:741 deliver`, `:812 bill-of-lading/issue`, `:1159 containers/allocate` — none called). `StartLandTransport` requires exactly `CUSTOMS_CLEARED`, so a `FREIGHT_BOOKED` shipment can never start land transport — booking freight (if done elsewhere) strands the shipment. **P2:** grid "Start Land Transport" shortcut always fails client-side — `handleStartLandTransport` requires `transportCompany` + `truckPlateNumber` from `actionInputs`, which are only ever filled inside the approval dialog. Only the detail-dialog path works. **P12:** KPI "Approved Clearances" = count of *all* records (`:2375`), not clearances. |
| 1 Land Transport | Rows `LAND_TRANSPORT`. KPIs: Land Transport (count), "Avg Duration" (hardcoded `3-5d`), Trucks Active (same count), On Schedule | "Record Port Arrival" (grid `:2225`, dialog `:3303`) | `POST /shipments/:id/port/arrive` (`:1755`, `{arrivalTime, notes}`; chaincode `ArriveAtPort`, requires `LAND_TRANSPORT`, `main.go:3290`; route `shipments.ts:2203`) | Grid shortcut works (handler supplies defaults) — see P2 note in Tab 0 for which shortcuts are dead. |
| 2 Port Arrival | Rows `PORT_ARRIVED`. KPIs: At Port, Awaiting Stuffing, Port Operations (all = count), Port Throughput | "Stuff Container" / "Record Container Stuffing" (grid `:2241`, dialog `:3314`) | `POST /shipments/:id/container/stuff` (`:1813`, `{containerNumber, containerType, sealNumber, stuffedBy, location}`; chaincode `StuffContainer`, requires `PORT_ARRIVED`, `main.go:3371`; route `shipments.ts:2260`) | **P2:** grid "Stuff Container" shortcut always fails — `handleContainerStuffing` requires `containerNumber` from `actionInputs`, only filled in the approval dialog. |
| 3 Container Stuffing | Rows `CONTAINER_STUFFED`. KPIs: Containers, DRY, REEFER (split by `containerType`), Ready to Load | "Load on Vessel" / "Record Vessel Loading" (grid `:2257`, dialog `:3325`) | `POST /shipments/:id/vessel/load` (`:1860`, `{vesselName, voyageNumber, notes}`; chaincode `LoadOnVessel`, requires `CONTAINER_STUFFED`, `main.go:3469`; route `shipments.ts:2325`) | — |
| 4 Vessel Loading | Rows `VESSEL_LOADED` + `LOADED`. KPIs: Loaded, Awaiting Departure, At Djibouti (all = count), Loading Efficiency | `VESSEL_LOADED` rows — "Mark Vessel Departed" (grid `:2273`); detail dialog has **two** buttons: "Issue Bill of Lading" (`:3337`, opens BoL dialog) and "Record Vessel Departure" (`:3353`). **`LOADED` rows have no action button** in grid or dialog | `POST /shipments/:id/vessel/depart` (`:1905`, `{vesselName, voyageNumber, notes}`; chaincode `DepartFromPort`, requires `VESSEL_LOADED`, `main.go:3545`; route `shipments.ts:2382`); `POST /shipments/:id/shipping-document` (`:1604`, BoL/AWB body; chaincode `RecordShippingDetails`, sets status `LOADED` unconditionally, no status guard, `main.go:2401-2430`; route `shipments.ts:2694`, `requireRole('SHIPPING','SHIPPING_ADMIN')`) | **P4 — `LOADED` is a dead end and `RecordShippingDetails` has no status guard.** Recording a B/L or AWB sets `LOADED` unconditionally; `DepartFromPort` requires exactly `VESSEL_LOADED`, so a `LOADED` shipment can never depart. The BoL can also be recorded at *any* status (no guard), jumping a `CUSTOMS_CLEARED` shipment straight to `LOADED` and skipping land transport / port / stuffing / loading. BoL dialog (`:3670-4075`) is reachable *only* from here; its label does **not** change to "Record Airway Bill" in AIR mode; `autoMapBOLData` (`:1400-1560`) fabricates B/L `BL${Date.now()}`, tracking `TRK${timestamp}`, container no. (not a valid ISO container number), voyage `V${year}W${random 1-52}`, consignee defaults to `'TOLAWAQ Trading GmbH'`, destination `'Hamburg, Germany'`; `transportMode` forced to `'SEA'` (`:1497`) even for AIR; the submit body drops the form's weight, volume, consignee, notify, freightTerms, specialInstructions, estimatedDeparture — the API never receives them. Older `POST /shipments/:id/bill-of-lading` (`shipments.ts:1498`, also sets `LOADED`) is never called — UI uses `shipping-document` instead. |
| 5 Departed | Rows `DEPARTED`. KPIs: Departed, "Recent Departures / Last 24h", From Djibouti, On Schedule | "Update to In-Transit" (grid `:2289`, dialog `:3365`) | `POST /shipments/:id/in-transit/update` (`:1952`, `{trackingNumber}`; chaincode `UpdateToInTransit`, requires `DEPARTED`, `main.go:3623`; route `shipments.ts:2439`) | KPI "Recent Departures / Last 24h" counts *all* `DEPARTED` rows ever (`:2547`). |
| 6 In Transit | Rows `IN_TRANSIT`. KPIs: At Sea, "Avg Transit" (hardcoded `25-35d`), GPS Tracking, On Schedule | "Record Destination Arrival" (grid `:2305`, dialog `:3376`) | `POST /shipments/:id/destination/arrive` (`:1995`, `{notes}`; chaincode `ArriveAtDestination`, requires `IN_TRANSIT`, `main.go:3700`; route `shipments.ts:2496`) | Tracking dialog values are hardcoded (see P12). |
| 7 Destination Arrived | Rows `DESTINATION_ARRIVED` + `ARRIVED`. KPIs: Arrived, Awaiting Clearance, Ready for Delivery, "Clearance Rate" (shows `completionRate`, i.e. delivered %, `:2607` — mislabelled) | `DESTINATION_ARRIVED` rows — "Complete Delivery" (grid `:2321`, dialog `:3387`). **`ARRIVED` rows have no action button** | `POST /shipments/:id/delivery/complete` (`:2040`, `{deliveryNotes}`; chaincode `CompleteDelivery`, requires `DESTINATION_ARRIVED`, `main.go:3778`; route `shipments.ts:2553`) | **P5 — `ARRIVED` is a dead end.** `CompleteDelivery` requires exactly `DESTINATION_ARRIVED`. `ARRIVED` is produced by the booking mirror (`shipping.ts:707 mirrorBookingStatusToShipment(bookingId, 'ARRIVED', …)`), a flow this portal never invokes — any `ARRIVED` shipment arriving from elsewhere is stuck. |
| 8 Delivered | Rows `DELIVERED`. KPIs: Delivered, This Month (DELIVERED with ETD in current month), Total Weight (delivered tonnes), Success Rate (`completionRate`). No shipping action buttons. **Post-Delivery Workflow section** (`~:2940-2985`, only when ≥1 `DELIVERED` row): per delivered shipment a card with `PostDeliveryWorkflowPanel shipmentId userRole="SHIPPING"` | Post-delivery panel: "Record Payment", "Record Forex", "Record LC Settlement" (work). **"Complete Audit" and "Close Contract" never appear** — panel renders them only for `['ECTA','ADMIN']` (`PostDeliveryWorkflowPanel.tsx:504, 537`) and `userRole` is hardcoded to `"SHIPPING"` here | `GET /post-delivery/:shipmentId/status` (panel `:137`); `POST /post-delivery/:id/payment` (`:160`); `POST /post-delivery/:id/forex` (`:186`); `POST /post-delivery/:id/lc-settlement` (`:211`); `POST /post-delivery/:id/ecta-audit` (`:235`); `POST /post-delivery/:id/close-contract` (`:260`) — all exist (`postDeliveryWorkflow.ts:58, 128, 190, 250, 308, 368`, mounted `/post-delivery`, `server.ts:320`) | Retention is shown as a post-delivery checklist item only; no retention action in this portal (`/retention` routes never called here). |
| 9 Users | Generic `UserManagement` | User CRUD etc. | `GET/POST/PUT/DELETE /users`, `PUT /users/:id/status`, `POST /users/:id/reset-password` | KPI row above it falls through to the Delivered KPIs (ternary chain `:2362-2620` has no `tabValue === 9` branch). |

**Shipping-only problems (not in the table):** **P1 — "Reject" can never succeed: no input for the
rejection reason.** `handleReject` (`:1344`) blocks unless `rejectionReason.trim()` is non-empty,
but the approval dialog contains **no TextField bound to `rejectionReason`** — the state is only
ever set to `''` (`:251, 1291, 1339, 1380, 4558`) and never via `onChange`. Clicking "Reject"
always shows "⚠️ Please provide a reason for rejection". The endpoint itself is fine
(`POST /shipments/:id/reject-action`, `shipments.ts:2640`, `proposedAction` must be one of the 8
action types, reason 3–1000 chars). **P2 — grid shortcut buttons bypass verification and two are
always-dead.** Grid icon buttons (`:2215-2327`) call the lifecycle handlers directly, skipping
`openApprovalDialog`/`fetchVerificationData` (no prior-steps, customs, or document check); "Start
Land Transport" and "Stuff Container" always fail client-side validation from the grid (see Tabs
0/2); the other five shortcuts work because their handlers supply defaults. **P6 — verification
dialog shows the wrong declaration.** `fetchVerificationData` (`:969`) calls
`GET /customs/declarations?shipmentId=${shipmentId}` and takes `declData.data[0]`, but the backend
only reads `req.query.status` — `shipmentId` is ignored and **all** declarations are returned, so
with >1 declaration the dialog shows an arbitrary (most recent) one as "Customs Declaration Filed"
for this shipment. **P7 — exporter lookup uses the wrong endpoint.** `fetchVerificationData`
(`:696`) calls `GET /users/${exporterId}` where `exporterId` is an `EXP-…` id;
`GET /users/:userId` (`users.ts:463`) does `WHERE id = $1` on the numeric user PK + a
same-organisation check, so it 404s/403s; failure is swallowed and `exporterInfo` stays null.
(The same file's `autoMapBOLData` correctly uses `GET /users/by-exporter/:exporterId`, `:1429`.)
**P8 — "Download Documents" opens a JSON endpoint without auth.** Detail dialog `:3408-3411`:
`window.open('/api/v1/shipments/${shipmentId}/documents', '_blank')` — that is
`GET /shipments/:id/documents` (`shipments.ts:787`), which returns JSON `{success, data:{documents}}`
behind `authMiddleware` with no token attached → 401 in practice, and even authenticated it is not
a file download. **P9 — "Generate QR Code" is a fake.** Tracking dialog `:3560-3575`: the button
only calls `setSnackbar({message: '📱 QR Code generated for …'})`. No QR code is generated,
rendered, or downloadable. **P10 — required documents are computed but never shown or enforced.**
`getRequiredDocuments()` (`:1233`, incl. an `ISSUE_BOL` entry that is never used — `handleApprove`
`:1305-1338` has no `ISSUE_BOL` case) produces per-action lists (e.g. "Truck Registration",
"Driver License", "Border Crossing Certificate", "Proof of Delivery"), but the approval dialog
renders only `uploadedDocuments`, never `requiredDocuments`, and "Approve & Proceed" does not check
coverage. The "Verified" chip on every listed document (`~:4520`) is unconditional. The dialog's
static banner always says "Verify customs clearance and documents before approving land transport"
regardless of action. `handleApprove` closes the dialog *before* executing the action.
**P11 — status-union mismatches:** see the union note above; grid's "B/L or AWB" column shows
`containerNumber` as a fallback for the B/L number (`~:2140`) — a container number displayed where
a bill-of-lading number is expected. **P12 — fabricated / hardcoded data presented as live:**
`shippingTrendsData` (`:312`), `portPerformanceData` (`:363`), `shippingLineData` (`:371`) are
hardcoded tables **never rendered** (dead code); `getShippingStats()`/`stats` (`:2339-2348`)
computed but never read. `loadData` invents values when the chaincode record lacks them (`:585-610`):
`shippingLine` defaults to `'Maersk Line'` / `'Ethiopian Airlines Cargo'`, `portOfDischarge` to
`'Hamburg'`, `weight` to `20000` kg, `volume` to `quantity/600`, `estimatedDeparture` to now+2d,
`estimatedArrival` to now+30d (SEA) / +1d (AIR), `trackingNumber` to `` `TRK-${shipmentId}` ``.
Tracking dialog: "IoT Sensors: Temperature 18°C • Humidity 65% • GPS Active" and "Last Update:
{new Date().toLocaleString()} • Seal Intact" are static strings (`:3485`); "Container Loaded" chip
is always `success` regardless of status. `applicationId` derivation (`:690`):
`shipmentId.replace('SHIPAPP-','').replace('SHIP','')` — unverified string surgery feeding
`GET /exporters/applications/:applicationId`; failure swallowed. KPI cards have `cursor: 'pointer'`
+ hover lift but **no `onClick`** (`:2640-2680`). **P13 — duplicates / dead imports / duplicate
backend handlers:** `<AuditTrailViewer …/>` rendered **twice** with identical props (`:3580` and
`:4077`) — both mount when `showAuditTrail` is true. `DocumentValidationDialog` imported but never
rendered. Backend `shipments.ts` has duplicate handlers — `POST /:shipmentID/container/stuff`
(`:2260`) vs `POST /:shipmentId/container/stuff` (`:2790`), same for `vessel/load` (`2325/2852`),
`vessel/depart` (`2382/2898`), `in-transit/update` (`2439/2944`), `destination/arrive`
(`2496/2990`); Express matches the first, the second set is dead. **Role mismatch:** page allows
display-name roles (`'Logistics Officer'`, `'Documentation Officer'`, …) but every lifecycle API
route requires `requireRole('SHIPPING', 'SHIPPING_ADMIN')` — a display-name user passes the page
gate and gets 403 from the API; conversely `SHIPPING_ADMIN` passes the API but is not in the
page's list (only `SHIPPING`/`ADMIN` are). **P14 — no freight-booking, shipment-creation, pickup,
or border-crossing action.** The portal never calls `POST /shipments` (`shipments.ts:150`, create),
`POST /shipments/:id/book-freight`, `POST /shipments/:id/pickup` (`shipments.ts:1874`, legacy
`CUSTOMS_CLEARED/PERMIT_ISSUED → IN_TRANSIT`), any `/shipping/*` route, or any
`/bordercrossing/*` route — despite the land leg Addis Ababa → Djibouti necessarily crossing the
Galafi border, and "Border Crossing Certificate" being listed as a required document for port
arrival. **Verification dialog loads** (for reference): `GET /shipments/:id`, `GET /users/:exporterId`,
`GET /contracts/:id`, `GET /customs/clearances`, `GET /shipments/:id/history` (fallback
`GET /audit/entity/SHIPMENT/:id`, fallback reconstruction from `GET /exporters/applications/:id`,
`GET /forex`, `GET /banking/lc`, `GET /customs/declarations?shipmentId=…`), `GET /shipments/:id/documents`,
per-doc `GET /documents/:docId` — all exist.

**Workflow coverage (Shipping):** the portal fully performs its 8-step core chain (land transport
→ port arrival → stuffing → vessel loading → departure → in-transit → destination arrival →
delivery) plus BoL/AWB recording — but only through the detail-dialog → verification-dialog path,
with the grid shortcuts half-broken (P2). Freight booking, border crossing, and the three terminal
side-states (`FREIGHT_BOOKED`, `LOADED`, `ARRIVED`) are displayed yet unactionable, and everything
before customs clearance and after delivery is read-only reconstruction or a post-delivery panel
whose two final actions are role-hidden. The portal only *starts* at `CUSTOMS_CLEARED`.

---

## Cross-portal summary

### The 20-step workflow vs the UI — steps with NO UI surface at all

| Workflow step | UI surface anywhere? |
|---|---|
| Exporter licence application (applicant submits, checks status) | **None in any portal.** The public applicant flow (`POST /exporters/exporter-applications`, applicant login/status) has no portal UI; ECTA only approves/rejects applications that already exist. ExporterPortal loads `licenseStatus`/`ectaLicenseNumber` and never displays them. |
| ECX lot intake (warehouse receipt) | Dialog + handler exist in ECXPortal but **unreachable — no button opens it** (ECX P1). Effectively no surface. |
| ECX auto-release on customs clearance | Handler exists in ECXPortal, **never invoked** (ECX P2). No surface. |
| Duty calculation / valuation | **No surface.** No UI file calls `POST /customs/declaration/:id/calculate-duty` or `/valuation`; CustomsPortal invents fees client-side (Customs P5). |
| Border crossing `clear-exit` (+ `/verify`, `/location`, `/delay`) | **No surface.** `POST /bordercrossing/:id/clear-exit` is never called from anywhere; the whole Border Crossing tab's writes are broken by the `borderCrossingId`/`crossingId` mismatch (Customs P6). |
| Forex reject | **No surface.** Chaincode `RejectForex` + route `POST /banking/forex/:forexID/reject` exist; no portal offers a reject action. |
| Forex utilise | **No surface.** `POST /forex/utilize` exists; no portal calls it. |
| SWIFT lifecycle beyond (re-)initiation | **No surface for approve / receive / process / settle / reject** in BanksPortal; NBE has NBE-approve for DRAFT only and no `NBE_APPROVED → APPROVED` path. |
| Repatriation penalty / waiver decisions | **No surface.** `POST /repatriation/:id/penalty`, `POST /repatriation/:id/waiver/approve` have no UI caller; the compliance panel that would call the notification endpoint can never open (NBE Tab 4). |
| Retention policy setting | **No surface.** `POST /forex/retention-policy` and `POST /retention/policy` are never called; NBE Tab 5 is static text. |
| Exchange-rate setting (NBE) | Dialog exists but is **fully dead** — inputs unwired, "Set Rate" just closes the dialog (NBE Tab 2). Effectively no surface. |
| Pre-shipment inspection schedule / conduct | Buttons exist in ECTA Tab 6 but are **broken** — wrong method+body (P1) and wrong entity's endpoint (P2). Effectively no surface. |
| Customs declaration submit | Handler correct but **unreachable** — no button opens the dialog (Customs P3). |
| Customs declaration reject | Dialog exists but **unwired** — can never submit (Customs P1). |
| Freight booking | **No surface in any portal.** ExporterPortal's booking dialog is unreachable (Exporter P1); ShippingPortal has no booking button at all and `FREIGHT_BOOKED` is a dead end (Shipping P3). |
| Payment initiation (exporter) | Dialog + handler exist but **unreachable** (Exporter P1). |
| Payment document verification (bank) | Panel rendered but **unreachable** — `selectedPayment` is never set (Banks P0). |
| LC document submission (exporter) | Handler exists, **zero callers** (Exporter P2). |
| Shipment creation (shipping-side) | ShippingPortal never calls `POST /shipments` (Shipping P14); creation lives only in ExporterPortal, gated behind forex-allocated pending rows / contract dialog. |

### Steps that exist in the UI but are display-only in every portal

- **Contract close / post-delivery audit:** visible as a checklist in `PostDeliveryWorkflowPanel`
  in ECTA (audit + close work for ECTA, gated on prior steps), Exporter (read-only — all actions
  role-gated away from `EXPORTER`), Shipping (audit + close hidden — `userRole="SHIPPING"`),
  Banks (audit + close visible, ECTA-only). No portal other than ECTA can perform them, and ECTA's
  are gated on payment + forex + LC-settled-if-used + audit.
- **Retention:** shown as a rate/percentage in Banks (allocate/settle payloads), NBE (record works;
  policy read-only), Exporter (displayed; "40% NBE Retention Applied" is a phantom payment label),
  Shipping (post-delivery checklist item only). No standalone record action outside NBE Tab 0.
- **Repatriation:** actionable only in Banks Tab 1 (initiate/record) and NBE Tab 4 (verify only).
- **Phytosanitary:** actionable only in ECTA Tab 10 (request → inspect → issue collapsed into one
  click, half the form dropped). Exporter/Customs mention it only as a checklist label.
- **Export permit:** actionable in ECTA Tab 3 (Postgres-only, not on-chain) and Banks Tab 5
  (`POST /permits`). Exporter/Customs only gate on it (Customs checks it wrongly, P7).
- **Quality / pre-shipment inspection:** actionable in ECTA Tab 3 (with fabricated results) and
  effectively broken in ECTA Tab 6. Exporter/Customs/Shipping only display it.

### Most severe findings (ranked)

1. **ECX lot intake unreachable** — no "Register Intake" button; no lot can enter the system
   through the ECX portal (ECX P1). The whole downstream lot workflow depends on lots created
   by tests/scripts or another portal.
2. **Exporter booking + payment initiation unreachable** — both dialogs fully built, zero openers
   (Exporter P1). The exporter's two most downstream actions cannot be performed.
3. **Banks LC request 403s for BANKS** — the portal's own LC-creation entry point is
   role-blocked server-side (Banks P0); only `ADMIN` succeeds.
4. **Banks payment-document verification dead** — panel rendered, `selectedPayment` never set
   (Banks P0). The `PENDING → DOCUMENTS_SUBMITTED → VERIFIED` step cannot be performed.
5. **NBE exchange-rate dialog fully dead** — a core NBE step cannot be performed at all (NBE Tab 2).
6. **Customs border-crossing writes all broken** — `borderCrossingId` vs `crossingId` mismatch
   makes every write hit `/undefined/…` (Customs P6); initiate also sends the wrong field names.
7. **Customs reject unwired + declaration submit unreachable + duty/valuation never called**
   (Customs P1, P3, P5) — three of Customs' five core steps are dead or faked.
8. **ECTA pre-shipment Schedule/Conduct broken** — wrong method+body, wrong entity endpoint
   (ECTA P1, P2); ECTA Tab 3 "Inspect" records fabricated passing results (P14); export permit
   is Postgres-only with an unimplemented customs handoff (P15).
9. **Shipping terminal side-states are dead ends** — `FREIGHT_BOOKED`, `LOADED`, `ARRIVED` rows
   are displayed with no action and cannot advance through the chaincode's own guards
   (Shipping P3, P4, P5); freight booking has no UI anywhere.
10. **Status unions drift from the chaincode in 4 portals** — Exporter shipment union (missing
    `PERMIT_ISSUED`/`CUSTOMS_DECLARED`/`CANCELLED`, 8 phantom values), Exporter payment union
    (phantom machine), Shipping union (omits 5 chaincode states, drops those rows silently),
    NBE forex union (omits `REJECTED`), Banks `StatusChip` hardcodes (`pending`/`approved`/
    `ACTIVE`) that mislabel real states, ECTA contract chips (any non-`REGISTERED`/`APPROVED`
    renders red "rejected").
11. **Hardcoded/fake data presented as live** — ECX market prices + grading standards (static,
    partly wrong), NBE Policy & Compliance (0% from a non-existent endpoint), Banks "Avg Release
    Time 1.2d", Shipping IoT sensors / Maersk / Hamburg defaults, Exporter Reports "Unavailable",
    Customs clearance fees computed client-side with invented constants.
12. **Dead buttons with no handler** — Exporter Reports "Generate"; NBE "Export Report" ×2,
    "Export Rates"; ECTA Inspection Report "Download Certificate"/"Print Report"; Shipping
    "Generate QR Code" (fake), "Reject" (no reason input), KPI cards with pointer cursor and no
    `onClick`; Banks KPI-dialog "Export CSV" ("coming soon").
13. **Hardcoded `http://localhost:3001` hosts** in `DocumentManagementPanel`,
    `BlockchainSignatureVerification`, `AnalyticsDashboard` export, and several raw `fetch` calls
    (Banks `:1324`, `:5947`; ECTA `:3562`) — all break on any non-localhost deployment.
14. **Role-vocabulary mismatches** in ECX, Shipping, Banks, NBE, ECTA: page gates admit
    display-name roles (`Grading Officer`, `Logistics Officer`, `Bank Officer`, `Screening
    Officer`…) that the API's `requireRole` does not recognise (or vice versa), so users pass
    the page gate and get 403s — or can never reach a tab they are granted in code.
15. **KPI/tab-index bugs** — NBE KPIs shifted by one from tab 5 and wrong counts in tab labels;
    ECTA audit KPIs wired to tab 6 (Pre-shipment) instead of 8; Exporter audit stats load on
    tab 6 (Reports) instead of 7; Banks All-LCs tab shows Payment Release KPIs; ECX User
    Management KPIs hardcode 0 above real users; Customs KPIs include rejected declarations.

### Method note / limitations

- Static analysis only: no browser run, no clicks, no live API calls. "Exists" means the route
  is registered in `api/src/routes/*.ts` (and, where stated, the chaincode function exists);
  it does not mean the call succeeds at runtime (RBAC, body shape, and ledger state can still
  reject it — several findings above are exactly that).
- Line numbers refer to the files as read during this inventory (branch `features`, HEAD
  `434fbdda` + uncommitted `start-all.sh` change). Where a child report quoted a line, it is
  reproduced as given.
- The sibling chaincode-rules mapping (a parallel task) is the authoritative source for the
  smart-contract side of each rule; this inventory is the UI side. Where the two disagree, the
  chaincode wins — that is precisely the class of defect recorded as P5/P6/P8/P10/P11 above.
