# GoCBC Portal Inventory — for end-to-end testing

> **Scope:** all 7 role portals, every tab / sub-tab, data shown, API endpoints called,
> prerequisites, and actions. Static inventory only (source reads, no servers started).
>
> **Branch / HEAD:** `fix/auth-chaincode-audit`, `12d5a8d` (on top of `features` `042b8b7`).
> **Files read:** `ui/src/components/portals/{ECTA,ECX,Exporter,Banks,Customs,NBE,Shipping}Portal.tsx`,
> `ui/src/components/portals/{ecta,ecx,exporter,nbe,banks,customs,shipping,shared}/`,
> `ui/src/components/portals/*.tsx` (shared components), `api/src/routes/portals.ts`,
> `ui/src/utils/api.ts`, `ui/src/utils/portalDataLoader.ts`, `ui/src/pages/portals/*.tsx`,
> `ui/src/pages/index.tsx`, `api/src/server.ts` (mounts), all `api/src/routes/*.ts` (557 routes).
>
> **Counts:** 7 portals · **60 top-level content tabs** · 4 Banks parent tabs ·
> 3 working sub-tab groups (all in NBE) · 2 dead sub-tab states (ECTA, ECX).

| Portal | File | Lines | Top-level tabs | Route | Page roles (`ProtectedRoute`) |
|---|---|---|---|---|---|
| ECTA | `ECTAPortal.tsx` | 4,487 | 10 | `/portals/ecta` | ECTA, ADMIN, Quality Inspector, Lab Analyst, Phytosanitary Officer, License Officer, … |
| ECX | `ECXPortal.tsx` | 905 | 4 | `/portals/ecx` | ECX, ADMIN, Grading/Warehouse/Registration/Release Officer, ECX Officer |
| Exporter | `ExporterPortal.tsx` | 7,394 | 8 | `/portals/exporter` | EXPORTER, ADMIN |
| Banks | `BanksPortal.tsx` | 6,905 | 11 content tabs under 4 parent tabs | `/portals/banks` | BANKS, ADMIN, Bank Officer, Branch Manager, Trade Finance Officer, Credit Analyst, … |
| Customs | `CustomsPortal.tsx` | 3,825 | 8 | `/portals/customs` | CUSTOMS, ADMIN, Customs/Inspection/Clearance Officer, Risk Analyst, … |
| NBE | `NBEPortal.tsx` | 2,588 | 9 | `/portals/nbe` | NBE, ADMIN, NBE/Forex/Screening/Compliance/Exchange Rate/Settlement Officer |
| Shipping | `ShippingPortal.tsx` | 4,641 | 10 (9 lifecycle + Users) | `/portals/shipping` | SHIPPING, ADMIN, … |

Login redirects by role in `ui/src/pages/index.tsx` (`portalRoutes` map, incl. sub-roles
such as `ECTA Officer`, `Grading Officer`, `Forex Officer`, `Bank Officer`). Tab
visibility inside each portal is additionally filtered per tab by the `roles` arrays
in each portal's `allTabs` / `tabStructure` (ADMIN / super-admin sees all tabs).

## How the portals get data (read this before testing)

- All 7 portals call the API through **two** clients, both of which import from
  **`@/config/api.config`** — see mismatch **M-01** (that module does not exist):
  1. `api` from `ui/src/utils/api.ts` — typed axios client (`getContracts()`,
     `getShipments()`, `approveContract()`, …). Its `baseURL` is `API_BASE_URL`
     from the missing module. Paths used are **bare** (`/contracts`, `/forex`).
  2. `apiFetch` from `@/config/api.config` — raw fetch wrapper used with **bare**
     paths (`/forex`, `/banking/lc`, `/customs/declarations`, …) and an explicit
     `Authorization: Bearer <token>` header.
- `ui/src/utils/portalDataLoader.ts` (parallel multi-endpoint loader) also imports
  `apiFetch` from the missing module; it is itself only referenced from the dead
  `ecta/utils/dataLoader.ts`.
- `api/src/routes/portals.ts` exposes `GET /portals/:portal/dashboard`,
  `GET /portals/:portal` and 7 summary endpoints
  (`/ecta/approved-exporters`, `/ecx/active-contracts`, `/banks/active-lcs`,
  `/quality/certificates-issued`, `/customs/cleared-shipments`,
  `/shipping/active-shipments`, `/nbe/forex-monitoring`) — **no portal component
  calls any of them** (M-09). Portals call the domain routes directly instead.
- The API base is `http://localhost:3001/api/v1` (per `ui/src/services/swiftApi.ts:6`,
  `ui/src/utils/documentHelpers.ts:6`, `api/tests/test-frontend-document-fetch.js:4`).

## Mismatches — endpoints the UI calls that do not exist, and other blockers

| # | Severity | What | Evidence |
|---|---|---|---|
| M-01 | **BLOCKER** | `ui/src/config/api.config` **does not exist** — no file, never in git history (`git log --all -- ui/src/config/api.config.ts` is empty). It must export `apiFetch`, `getAuthHeaders`, `API_BASE_URL`, `API_ENDPOINTS`. **49 files** import it, including all 7 portals and `ui/src/utils/api.ts`. The Next.js frontend cannot compile, so **no portal tab can load at all** until this file is restored. | `find . -name "api.config*"` → nothing; imports e.g. `ECTAPortal.tsx:90`, `ECXPortal.tsx:25`, `ExporterPortal.tsx:91`, `BanksPortal.tsx:52`, `CustomsPortal.tsx:62`, `NBEPortal.tsx:59`, `ShippingPortal.tsx:65`, `utils/api.ts:6` |
| M-02 | High | `BanksPortal.tsx:739,763,801,814` call `apiFetch('/api/v1/contracts')`, `('/api/v1/banking/lc')`, `('/api/v1/swift/messages')`, `('/api/v1/forex')` — with the `/api/v1` prefix — while every other `apiFetch` call in the codebase uses bare paths (`/forex`, `/banking/lc`). If `apiFetch` prepends the base URL (as `api.ts` does), these four double-prefix to `/api/v1/api/v1/…` → 404. | `BanksPortal.tsx:739,763,801,814` vs e.g. `:763` neighbours and `ExporterPortal.tsx:901,970` |
| M-03 | High | `POST /blockchain/invoke` and `POST /blockchain/query` called by `ui/src/utils/api.ts:309,317` (`invokeChaincode`, `queryChaincode`) **do not exist**. `api/src/routes/blockchain.ts` has only `GET /network`, `GET /status`, `GET /ledger/blocks/:blockNumber`, `GET /ledger/transactions/:txId`. Any portal action that invokes chaincode through this client fails. | `api.ts:309,317`; `blockchain.ts:28,114,130,157` |
| M-04 | High | `GET /analytics/exports`, `GET /analytics/compliance`, `GET /analytics/quality`, `GET /analytics/banking` called by `ui/src/utils/api.ts` (`getExportStats:282`, `getComplianceStats:287`, `getQualityStats:292`, `getBankingMetrics`) **do not exist**. `analytics.ts` only has `/dashboard`, `/timeseries/:metric`, `/blockchain`, `/export-report`, `/breakdown`. Analytics tabs/charts fed by these return 404. | `api.ts:277–295`; `analytics.ts:16,53,102,157,225` |
| M-05 | High | `POST /banking/exchange-rates` (and `GET /banking/exchange-rates`) called by `api.ts` `updateExchangeRate` **do not exist**. Exchange-rate routes live at `GET/POST /exchange-rates` (`exchangeRates.ts`, mounted `/exchange-rates`) and `GET/POST /forex/rates`, `POST /forex/exchange-rate`. | `api.ts` `updateExchangeRate`; `banking.ts` has no `exchange-rates` route; `exchangeRates.ts:18,94,163` |
| M-06 | Medium | `GET /exporters/:exporterId/shipments` called by `api.ts` `getShipmentsByExporter` **does not exist**. Only `GET /exporters/me/shipments` (`exporters.ts:1063`) and `GET /exporters/shipments` (`:2157`) exist; the two-segment path does not match `GET /exporters/:exporterID`. | `api.ts:297`; `exporters.ts:1063,2157` |
| M-07 | Medium | `GET /shipments/eudr-compliant` called by `api.ts` `getEUDRCompliantShipments` **does not exist**. EUDR is a query parameter on `GET /shipments` (`shipments.ts:528` reads `eudrCompliant` from query). The path would instead match `GET /shipments/:shipmentID` with id `eudr-compliant` → 404. | `api.ts:302`; `shipments.ts:526,846` |
| M-08 | Medium | `GET /shipments/:id/lc-documents` does not exist — only `POST /shipments/:shipmentID/lc-documents` (`shipments.ts:1989`). No UI caller uses GET today (`ExporterPortal.tsx:2076` correctly uses POST), so this is latent, not live. | `shipments.ts:1989` |
| M-09 | Medium | `api/src/routes/portals.ts` (9 endpoints incl. `GET /portals/:portal/dashboard`) is **never called by any portal**. Either the portals should use it, or it is dead API surface. | `grep "portals/" ui/src/components/portals/*.tsx` → no matches |
| M-10 | Low | Dead code: `ui/src/components/portals/{banks,customs,ecta,ecx,exporter,nbe,shipping}/utils/` (`dataLoader.ts`, `kpiConfig.ts`, `tabConfig.tsx` each) and `ui/src/components/portals/ecx/tabs/` (`GradingStandardsTab.tsx`, `LotManagementTab.tsx`, `MarketPricesTab.tsx`) are imported by **nothing**. `shared/StandardPortalLayout.tsx` is imported only by those dead `tabConfig.tsx` files. `PaymentProcessingTab.tsx` is a deprecated stub that returns `null`. `PaymentMethodTab` is imported by `BanksPortal.tsx:113` but never rendered (only `UnifiedPaymentWorkflow` is rendered, `:3092`). | `grep -rn "portals/*/utils\|portals/ecx/tabs"` → no importers; `PaymentProcessingTab.tsx:23` |
| M-11 | Low | Dead tab state: `subTabValue` is declared but never used in `ECTAPortal.tsx:203` and `ECXPortal.tsx:73` — neither portal has working sub-tabs. | `grep -c subTabValue` → 1 occurrence each |
| M-12 | Low | Unverifiable dynamic calls: `BanksPortal.tsx:714` (`apiFetch(path, …)`) and `:2065` (`apiFetch(endpoint, …)`) build the URL from variables — the endpoint cannot be checked statically. | `BanksPortal.tsx:714,2065` |
| M-13 | High | Border-crossing dialogs call endpoints that do not exist **with that method**: `PUT /bordercrossing/:id/clear` and `PUT /bordercrossing/:id/detain` (`ClearanceDecisionDialog.tsx:22`) — the server has only `POST /bordercrossing/:id/clear` (`bordercrossing.ts:218`) and `POST /:id/detain` (`:258`). `PUT /bordercrossing/:id/inspect` (`PhysicalInspectionDialog.tsx:20`) has **no server route at all** (closest is `POST /:id/crossing`, `:374`). Clear / Detain / Record Inspection actions in Customs tab 5 will fail. | `ClearanceDecisionDialog.tsx:21–22`; `PhysicalInspectionDialog.tsx:20`; `bordercrossing.ts:148,218,258,374` |

### Endpoints verified to exist (spot-checked, used by the portals)
`GET /exporters/exporter-applications`, `GET/POST /exporters/exporter-applications/:id/approve|reject|resubmit`,
`POST /exporters/:id/renew-license`, `GET /exporters/me/profile`, `GET /exporters/applications/:id`,
`PUT /exporters/:id/status`, `POST /exporters/:id/revoke`, `POST /users/reset-password-by-identifier`,
`GET /users`, `GET /users/by-exporter/:id`, `GET /users/:id`, `GET /contracts`, `POST /contracts/:id/approve|reject|nbe-approve`,
`GET /shipments`, `PUT /shipments/:id/status`, `POST /shipments/:id/{land-transport/start,port/arrive,container/stuff,vessel/load,vessel/depart,in-transit/update,destination/arrive,delivery/complete,reject-action,shipping-document,lc-documents,bill-of-lading}`,
`GET /shipments/:id/{documents,history,traceability}`, `GET /forex` (array route `['/','/allocations']`, `forex.ts:120`),
`POST /forex/request|allocate`, `GET /forex/rates/:currency/current`, `GET /forex/retention-policy/:commodityType`,
`GET /banking/lc`, `GET /banking/lc/:id`, `POST /banking/lc/request`, `POST /banking/lc/:id/{approve,reject,amend,issue,examine-documents,release-payment}`,
`POST /banking/{cad,payment/initiate,consignment/register}`, `POST /banking/payment/:id/verify-documents`,
`GET /swift/messages`, `GET /swift/messages/:id/ledger-proof`, `GET /customs/declarations`, `GET /customs/{clearances,permit-ready}`,
`POST /customs/declaration/{submit,review,complete-inspection,clear,reject}`,
`GET /quality/inspections`, `GET /quality/inspections/by-shipment/:id`, `POST /quality/inspections/:id/{perform,approve,reject,issue-permit}`,
`GET /documents/entity/:entityType/:entityId`, `POST /documents/upload`, `POST /documents/:id/verify`, `GET /documents/:id`,
`GET /audit/portal/recent`, `GET /audit/entity/:entityType/:entityId`, `GET /ecx/lots`, `POST /ecx/lots/:id/{grade,assign,release,auto-release}`,
`GET /nbe/lc-monitoring`, `POST /nbe/forex/:id/{approve,repatriation}`, `GET /repatriation`,
`POST /repatriation/:id/verify`, `GET /bordercrossing`, `POST /bordercrossing/initiate`,
`POST /bordercrossing/:id/{clear,detain}` (POST versions only — see M-13), `GET /payments`, `POST /payments/initiate`,
`GET /analytics/dashboard`, `POST /auth/login|logout`. Field mappings spot-checked OK: banking `GET /lc`
returns `{lcId, contractId, status, …}` as the Exporter portal reads it; forex `GET /` normalises rows to
`{forexId, lcId, requestedAmount, allocatedAmount, retentionRate, requestDate, …}` (`forex.ts:33–53`,
columns added by migrations 038/047); customs declarations are mapped to camelCase
(`declarationNumber, shipmentId, exporterId`, `customs.ts:140+`); exporter applications are `SELECT *`
(`exporters.ts:31,66`), so ECTA's `application_id / company_name / email / phone / status` reads match.

---

# 1. ECTA Portal — `ui/src/components/portals/ECTAPortal.tsx` (4,487 lines)

**Roles:** ECTA, ADMIN + officer sub-roles (ECTA Officer, License Officer, Permit Officer,
Quality Inspector, Lab Analyst, ECTA_SUPERVISOR, ECTA_INSPECTOR, ECTA Portal Administrator).
Tab roles are in `allTabs` (`:437–449`). **Sub-tabs:** none (`subTabValue` declared `:203`,
never used — M-11).

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Pending Applications | Pending exporter applications table (company, TIN, contact, submitted date); application detail dialog | `GET /exporters/exporter-applications?status=pending` (`api.get`, :1312); `GET /exporters/applications/:applicationId` (detail, :1441); `POST /exporters/exporter-applications/:applicationId/approve` (:306–307 in 042b8b7 numbering, auth-only on `features` — role check added in the local fix branch); `POST /exporters/exporter-applications/:applicationId/reject` | A submitted exporter application | View Details; **Approve Exporter Application** (confirm dialog `:3571`); **Reject** (dialog `:3721`, requires Rejection Reason) |
| 1 | Approved Exporters | Approved exporters table (licence no., company, expiry, status); exporter detail dialog | `GET /exporters?status=approved` / `api.getExporters()`; `PUT /exporters/:id/status`; `POST /exporters/:id/revoke`; `POST /users/reset-password-by-identifier` (reset password, `:2297`); `GET /exporters/:id/licenses` | An approved application | View; Suspend/Activate (status toggle); Revoke Licence; Reset Password |
| 2 | Sales Contracts | Contracts table (contract no., exporter, buyer, coffee type, quantity, value, status); contract detail dialog | `GET /contracts` (`api.getContracts()`); `POST /contracts/:id/approve` (`api.approveContract`); `POST /contracts/:id/reject` (`api.rejectContract`) | Approved exporter + submitted contract | View; **Approve Contract** / **Reject Contract** (dialogs, reason required) |
| 3 | Quality Control | "Quality Inspection Records" table: pending shipments awaiting inspection + inspection records (grade, moisture, defects, lab results) | `GET /quality/inspections?limit=500`; `GET /quality/inspections/by-shipment/:shipmentId`; `POST /quality/inspections/:id/perform`; `POST /quality/inspections/:id/approve`; `POST /quality/inspections/:id/reject`; `POST /quality/inspections/:id/issue-permit` | A shipment in quality-pending state | Perform Inspection; Approve / Reject Inspection; **Issue Export Permit** |
| 4 | License Renewals | Renewal requests table (licence, exporter, expiry, renewal status) | `GET /exporters?status=approved`; `POST /exporters/:exporterId/renew-license` | An approved exporter with an expiring licence | View; **Renew Licence** |
| 5 | Analytics | `AnalyticsDashboard` (`@/components/analytics/AnalyticsDashboard`) — export volumes, EUDR compliance, contract trends | `GET /analytics/dashboard` (works); `GET /analytics/exports`, `GET /analytics/compliance` (**M-04 — do not exist**) | Any seeded data | Drill-down / filters only |
| 6 | Pre-shipment Inspection | `InspectionRequestsTab` (`@/components/inspection`) — inspection requests list, request detail, inspector assignment | `GET /quality/inspections` (pending); `POST /quality/inspections` (create request); `POST /quality/inspections/:id/assign` | A shipment + a contract | Create Inspection Request; Assign Inspector; View |
| 7 | User Management | `UserManagement` (`@/components/admin/UserManagement`) — users table (name, role, org, status) | `GET /users`; `POST /users`; `PUT /users/:id`; `DELETE /users/:id`; `GET /users/by-exporter/:exporterId` | — | Create / Edit / Suspend / Delete User |
| 8 | Audit Trail | `AuditTrailTable` / `AuditTrailViewer` — portal audit entries | `GET /audit/portal/recent` (with `entityType`, `entityId`, `limit` params) | Any audited action | Filter; View entry detail |
| 9 | Post-Delivery Audits | Post-delivery audit list + `PostDeliveryWorkflowPanel` (`@/components/shared/PostDeliveryWorkflowPanel`); contract approve/reject dialogs live in this tab's segment | `GET /contracts` (audit candidates); `GET /audit/entity/:entityType/:entityId`; `POST /contracts/:id/approve|reject` | A delivered shipment | Open Post-Delivery Workflow; Approve / Reject Contract |

**ECTA in the 20-step workflow:** steps 1–2 (licence application approve/reject), 3 (contract
approve/reject), 7–8 (quality inspection + export permit), 20 (post-delivery audit).

---

# 2. ECX Portal — `ui/src/components/portals/ECXPortal.tsx` (905 lines)

**Roles:** ECX, ADMIN, ECX Officer, Grading Officer, Warehouse Officer, Registration Officer,
Release Officer, ECX Portal Administrator (`allTabs` `:283–287`).
**Sub-tabs:** none (`subTabValue` declared `:73`, never used — M-11).

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Coffee Lots | Lot table (lot no., coffee type, grade, quantity, warehouse, status); intake form dialog; grade / assign / release dialogs | `GET /ecx/lots`; `POST /ecx/lots` (intake); `POST /ecx/lots/:id/grade`; `POST /ecx/lots/:id/assign`; `POST /ecx/lots/:id/release`; `POST /ecx/lots/:id/auto-release` | — (lots are created here; this is the start of the ECX flow) | Record Intake; **Grade Lot**; **Assign to Contract**; **Release Lot**; Auto-Release |
| 1 | Market Prices | Price trends chart + KPI cards (Avg Price 150 ETB/kg) — **static hardcoded data** (`priceData` array, `:114`; chart title "ECX Coffee Price Trends (USD/kg) — 2026", `:505`). No API call. The server route `GET /ecx/market` (`ecx.ts:49`) exists but is **never called** by the portal. | None | — | View / filter only (no live data) |
| 2 | Grading Standards | Static grading standards reference table (grade, moisture, defects, screen size). No API call. The server route `GET /ecx/grading-standards` (`ecx.ts:73`) exists but is **never called** by the portal. | None | — | None (read-only) |
| 3 | User Management | `UserManagement` (same shared component as ECTA tab 7) | `GET /users`; `POST /users`; `PUT /users/:id` | — | Create / Edit / Suspend User |

**ECX in the 20-step workflow:** coffee lot intake → grading → assignment to a sales contract →
release. Note the dead `portals/ecx/tabs/` components (`LotManagementTab`, `MarketPricesTab`,
`GradingStandardsTab`) — the live tabs are inline in `ECXPortal.tsx` (M-10).

---

# 3. Exporter Portal — `ui/src/components/portals/ExporterPortal.tsx` (7,394 lines)

**Roles:** EXPORTER, ADMIN only (`pages/portals/exporter.tsx`). No per-tab role filter in the
file — every exporter user sees all 8 tabs. **Sub-tabs:** none.

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Dashboard | KPI cards (contracts, shipments in transit, LCs, forex), trend charts, recent activity | `GET /exporters/me/profile`; `GET /contracts?exporterId=…` (`api.getContracts`); `GET /shipments?exporterId=…`; `GET /banking/lc`; `GET /forex` | Approved exporter account | Navigate to tab (KPI click-throughs) |
| 1 | Contracts | Contracts table + create-contract form (buyer, coffee type, quantity, price, payment method, delivery terms); contract detail dialog (with Download PDF) | `GET /contracts`; `POST /contracts` (`api.createContract`, `:1411`); `GET /contracts/:id`; `POST /contracts/:id/resubmit` (rejected contracts, `:1254`); `GET /documents/entity/contract/:id` | Approved exporter; ECX lot (for assignment) | **Create Contract**; View; Correct & Resubmit (rejected); Download PDF |
| 2 | Forex & Banking | Forex allocations table (`forexId, lcId, requestedAmount, allocatedAmount, exchangeRate, retentionRate, requestDate`); LC list (`lcId, contractId, status, amount, expiryDate`) | `GET /forex` (`api.getForexAllocations`); `GET /banking/lc` (`api.getLettersOfCredit`); `POST /banking/lc/request` (`api.requestLC`, `:2116`); `GET /forex/rates/:currency/current` | Approved contract (LC request needs `contractId`) | **Request LC**; View LC detail |
| 3 | Shipments | Shipments table + tracking view (status timeline); create-shipment form (contract, lot, quantity, destination, shipping line); shipment detail dialog | `GET /shipments` (`api.getShipments`); `POST /shipments` (`api.createShipment`, `:1582`); `PUT /shipments/:id/status` (`:988`); `GET /shipments/:id/traceability`; `GET /exporters/me/shipments` | Approved contract + LC (for shipping) | **Create Shipment**; View Tracking; Update Status |
| 4 | Customs | Customs declarations table (declaration no., shipment, status); submit-declaration form (shipment, declared value, HS code, documents) | `GET /customs/declarations?exporterId=…`; `POST /customs/declaration/submit` (`:1775`); `GET /customs/permit-ready` | A shipped / arrived shipment + export permit | **Submit Customs Declaration**; View Declaration |
| 5 | LC & Payments | LC & payment list; `SWIFTMessagesViewWrapper`; LC documents upload; payment initiation form | `GET /banking/lc`; `GET /swift/messages`; `POST /shipments/:id/lc-documents` (`:2066`); `POST /payments/initiate` (`:1970`); `POST /banking/payment/initiate` | LC + shipped goods + documents | **Initiate Payment**; **Submit LC Documents**; View SWIFT messages |
| 6 | Reports | Report generator (export volumes, settlements, compliance); downloadable reports table | `GET /analytics/export-report` (`api.getExportReport`); `GET /analytics/dashboard` | Any completed data | Generate Report; Download |
| 7 | Audit Trail | `AuditTrailTable` + `DocumentManagementPanel` + `PostDeliveryWorkflowPanel` (shared); shipment detail dialog | `GET /audit/portal/recent`; `GET /documents/entity/:entityType/:entityId` | Any audited action | Filter; View; Open Post-Delivery Workflow |

**Exporter in the 20-step workflow:** steps 1 (apply), 3 (create contract), 5–6 (forex/LC
request), 9–10 (create shipment, book shipping), 11 (customs declaration), 15–16 (LC documents,
payment initiation), 20 (post-delivery).

---

# 4. Banks Portal — `ui/src/components/portals/BanksPortal.tsx` (6,905 lines)

**Roles:** BANKS, ADMIN, Bank Officer, Branch Manager, Trade Finance Officer, Credit Analyst, …
(`pages/portals/banks.tsx`). Two navigation layers: **4 parent tabs** (sidebar groups) each
opening **content tabs** (`allTabs` flat list `:615–628` + `activeParentTab`/`activeChildTab` `:231–232`).

| Parent tab | Child content tabs (tabIndex) |
|---|---|
| Payment Operations | All LCs (10), Payment Methods (0), Document Examination (2), Payment Release (3), LC Discrepancies (9) |
| Forex & Settlements | Forex Allocations (1), LC Settlements (5) |
| Communication & Issues | SWIFT Messages (4) |
| System Management | Analytics (6), User Management (7), Audit Trail (8) |

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Payment Methods | `UnifiedPaymentWorkflow` — payment-method selector (LC / CAD / TT Advance / TT Post / Advance) + method forms + payment list | `GET /banking/lc`; `POST /banking/{lc/request,cad,payment/initiate,consignment/register}`; `GET /payments` | Approved contract | Select Payment Method; Submit LC / CAD / TT / Advance request |
| 1 | Forex Allocations | Forex allocations table (forexId, lcId, requested/allocated amount, rate, retention, status) + allocate dialog (`ForexAllocationDialog`, rendered `:5252`) | `GET /forex` (`:801` — **M-02**: this call is `/api/v1/forex`); `POST /forex/allocate`; `GET /forex/rates/:currency/current`; `GET /forex/retention-policy/:commodityType` | NBE forex approval + LC | **Allocate Forex** (dialog: LC ref, amount, officer, approval ref, expiry; disabled until a live rate + retention policy are loaded) |
| 2 | Document Examination | Documents awaiting examination (shipment, LC, document list, discrepancies) | `GET /shipments/:id/documents`; `GET /banking/lc/:id`; `POST /banking/lc/:id/examine-documents`; `POST /banking/payment/:id/verify-documents` | LC documents submitted by exporter | **Examine Documents**; Verify / Flag Discrepancy |
| 3 | Payment Release | Payments ready for release (LC, amount, documents verified) | `GET /banking/lc`; `GET /payments`; `POST /banking/lc/:id/release-payment`; `POST /payments/:id/release` | Documents examined clean | **Release Payment** |
| 4 | SWIFT Messages | SWIFT message list (MT700/701/707/760/103…), compose dialog (`SwiftComposeDialog`, rendered `:5287`), ledger-proof view | `GET /swift/messages` (`:763` — **M-02**: `/api/v1/swift/messages`); `POST /swift/messages`; `GET /swift/messages/:id/ledger-proof` | An LC or payment | **Compose SWIFT Message**; View Ledger Proof |
| 5 | LC Settlements | "LC Settlement Tracking" — delivered shipments requiring settlement (`deliveredShipments` state, loaded by portal-level `loadData` from `GET /shipments` filtered to delivered / payment-released, `:833,878`); per-shipment documents and examination / SWIFT dialogs. No endpoint is called inside the tab segment itself. | `GET /shipments` (portal loadData) | Delivered shipment with released payment | View Document; open Document Examination dialog; open SWIFT details dialog |
| 6 | Analytics | `AnalyticsDashboard` | `GET /analytics/dashboard`; `GET /analytics/banking` (**M-04 — does not exist**) | Any data | Filters / drill-down |
| 7 | User Management | `UserManagement` (shared) | `GET /users`; `POST /users`; `PUT /users/:id` | — | Create / Edit / Suspend User |
| 8 | Audit Trail | `AuditTrailTable` (shared) | `GET /audit/portal/recent` | Any audited action | Filter; View |
| 9 | LC Discrepancies | `LCDiscrepancyTab` (`@/components/lcdiscrepancy`, `:3743`) — discrepancy list derived from LC data (LC, type, severity, status) + resolution dialog. **No dedicated discrepancy endpoint is called** — the tab fetches `GET /banking/lc` only (`LCDiscrepancyTab.tsx:56`); no resolve POST was found in the component, so resolution appears to be client-side only. | `GET /banking/lc` | A flagged LC | View discrepancy; Resolve (dialog; no server call found) |
| 10 | All LCs | Full LC list (all statuses) | `GET /banking/lc` (`:739` — **M-02**: `/api/v1/banking/lc`) | Any LC | View; filter by status |

**Banks in the 20-step workflow:** steps 4–6 (LC issuance, forex allocation), 14–15 (document
examination, payment release), 17–19 (SWIFT, settlement). `PaymentMethodTab` is imported
(`:113`) but never rendered (M-10); `PaymentProcessingTab` is a deprecated null stub.

---

# 5. Customs Portal — `ui/src/components/portals/CustomsPortal.tsx` (3,825 lines)

**Roles:** CUSTOMS, ADMIN, Customs Officer, Inspection Officer, Clearance Officer, Border
Officer, CUSTOMS Portal Administrator (`allTabs` `:146–155`). **Sub-tabs:** none. Tabs 0–4 are
the same declaration list filtered by status; tab 7 is the detail/actions panel for the
selected declaration.

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Submitted | Declarations with status `submitted` (declaration no., exporter, shipment, declared value, date) | `GET /customs/declarations?status=submitted` | Exporter-submitted declaration | View (opens detail panel) |
| 1 | Inspecting | Declarations with status `inspecting` | `GET /customs/declarations?status=inspecting` | Declaration moved to inspection | View; Complete Inspection |
| 2 | Under Review | Declarations with status `under_review` | `GET /customs/declarations?status=under_review` | Inspected declaration | View; Review |
| 3 | Cleared | Declarations with status `cleared` | `GET /customs/declarations?status=cleared` | Reviewed declaration | View (read-only) |
| 4 | Rejected | Declarations with status `rejected` (with rejection reason/category) | `GET /customs/declarations?status=rejected` | Rejected declaration | View (read-only) |
| 5 | Border Crossing | `BorderCrossingTab` (`@/components/bordercrossing`) — border-crossing list (shipment, border post, status) + Physical Inspection dialog + Clear/Detain decision dialog + New Crossing initiation dialog | `GET /bordercrossing` (`BorderCrossingTab.tsx:51`); `POST /bordercrossing/initiate` (`BorderCrossingInitiationDialog.tsx:32`); `PUT /bordercrossing/:id/clear|detain` and `PUT /bordercrossing/:id/inspect` — **M-13, method/route mismatch** (server is POST-only, no `/inspect`) | A cleared shipment at a border post | Refresh; **+ New Crossing**; Physical Inspection; **Clear / Detain** (decision dialog) |
| 6 | User Management | `UserManagement` (shared) | `GET /users`; `POST /users`; `PUT /users/:id` | — | Create / Edit / Suspend User |
| 7 | Audit Trail | `AuditTrailTable` (shared) + `DocumentManagementPanel` (shared) + declaration detail panel with action buttons | `GET /audit/portal/recent`; `GET /documents/entity/:entityType/:entityId`; `POST /customs/declaration/review`; `POST /customs/declaration/complete-inspection`; `POST /customs/declaration/clear`; `POST /customs/declaration/reject` | Selected declaration | **Start Inspection**; **Complete Inspection**; **Review**; **Clear**; **Reject** (with category / severity / reason) |

**Customs in the 20-step workflow:** steps 11–13 (declaration → inspection → clearance),
plus border-crossing events. Declaration fields are mapped camelCase by the API
(`declarationNumber, shipmentId, exporterId` — `customs.ts:140+`).

---

# 6. NBE Portal — `ui/src/components/portals/NBEPortal.tsx` (2,588 lines)

**Roles:** NBE, ADMIN, NBE Officer, Forex Officer, Exchange Rate Officer, Settlement Officer,
Compliance Officer, Screening Officer, NBE Portal Administrator (`allTabs` `:781–793`).
**Sub-tabs (working):** `forexSubTab` (`:189` — 0 All, 1 Allocated, 2 Requested, 3 Expired;
KPI-click filter on tab 0), `swiftSubTab` (`:190` — 0 All Messages, 1 Analytics & Charts,
2 Compliance Alerts; passed to `SWIFTMonitoringWrapper`), `analyticsSubTab` (`:188` —
0 Overview, 1 Trends, 2 Breakdown; passed to `AnalyticsDashboard`).

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Forex Monitoring | Forex allocations DataGrid (`forexColumns`: forexId, lcId, contractId, exporterId, requestedAmount, allocatedAmount, exchangeRate, retentionRate, status, requestDate) + contract-monitoring grid (`contractId, nbeReferenceNumber, exporterId, buyerCountry, coffeeType, quantity, totalValue, minimumPriceCompliant, contractStatus`); KPI cards; allocate dialog | `GET /forex` (`apiFetch`, `:274`); `POST /forex/allocate`; `POST /forex/request`; `GET /contracts` (contract monitoring); `POST /nbe/forex/:id/approve` | Approved contract + LC request | **Allocate Forex**; Approve Forex; filter by sub-tab (All / Allocated / Requested / Expired) |
| 1 | LC Monitoring | LC monitoring table (`lc_number, issuing_bank, advising_bank, amount, status, expiry_date` — snake_case fields read directly, `:913+`) | `GET /nbe/lc-monitoring`; `GET /banking/lc` | Issued LC | View LC detail |
| 2 | Exchange Rates | Exchange-rate table (currency, rate, effective date, status) + set-rate form | `GET /forex/rates`; `POST /forex/rates`; `GET /forex/rates/:currency/current` | — | **Set Exchange Rate** |
| 3 | SWIFT Monitoring | `SWIFTMonitoringWrapper` — SWIFT message list + charts + compliance alerts (sub-tabs above) | `GET /swift/messages`; `GET /swift/messages/:id/ledger-proof` | SWIFT messages | Filter by sub-tab; View message |
| 4 | Forex Repatriation | `RepatriationManagementTab` (`@/components/repatriation/RepatriationManagementTab.tsx`) — repatriation records (exporter, amount, due date, status) | `GET /repatriation` (`:125`); `POST /repatriation/:id/verify` (`:236`); `POST /nbe/forex/:id/repatriation` (`nbe.ts:114`) | Settled payment / export proceeds | **Verify Repatriation**; Record Repatriation |
| 5 | Policy & Compliance | Retention policy view (40% retention rule), compliance metrics, minimum-price compliance | `GET /forex/retention-policy/:commodityType`; `GET /analytics/compliance` (**M-04 — does not exist**); `GET /nbe/policy` (check) | — | View policy; (no mutating action in tab) |
| 6 | Analytics | `AnalyticsDashboard` with sub-tabs Overview / Trends / Breakdown | `GET /analytics/dashboard`; `GET /analytics/exports` (**M-04 — does not exist**) | Any data | Switch sub-tab; filters |
| 7 | User Management | `UserManagement` (shared) | `GET /users`; `POST /users`; `PUT /users/:id` | — | Create / Edit / Suspend User |
| 8 | Audit Trail | `AuditTrailTable` (shared) + `DocumentManagementPanel` (shared) + `PostDeliveryWorkflowPanel` (imported) | `GET /audit/portal/recent`; `GET /documents/entity/:entityType/:entityId` | Any audited action | Filter; View |

**NBE in the 20-step workflow:** steps 4–6 (forex approval, allocation, retention policy),
17–19 (SWIFT monitoring, repatriation, settlement oversight).

---

# 7. Shipping Portal — `ui/src/components/portals/ShippingPortal.tsx` (4,641 lines)

**Roles:** SHIPPING, ADMIN, Shipping Portal Administrator (`pages/portals/shipping.tsx`).
**Sub-tabs:** none — tabs 0–8 *are* the shipment lifecycle statuses; the same list +
detail-dialog renderer is used for all of them, and the detail dialog offers the next-step
action for the shipment's current status.

| # | Tab (exact label) | Data shown | Endpoints | Needs first | Actions / buttons |
|---|---|---|---|---|---|
| 0 | Clearance | Shipments with status `CUSTOMS_CLEARED` | `GET /shipments?status=CUSTOMS_CLEARED`; `GET /exporters/applications/:applicationId` (`:799` — exists) | Customs-cleared shipment | View; Approve / Reject Clearance |
| 1 | Land Transport | Shipments `LAND_TRANSPORT` | `GET /shipments?status=LAND_TRANSPORT`; `POST /shipments/:id/land-transport/start` | Cleared shipment | **Start Land Transport** |
| 2 | Port Arrival | Shipments `PORT_ARRIVED` | `GET /shipments?status=PORT_ARRIVED`; `POST /shipments/:id/port/arrive` | Land transport started | **Record Port Arrival** |
| 3 | Container Stuffing | Shipments `CONTAINER_STUFFED` | `GET /shipments?status=CONTAINER_STUFFED`; `POST /shipments/:id/container/stuff` | Port arrival recorded | **Container Stuffing** |
| 4 | Vessel Loading | Shipments `VESSEL_LOADED` | `GET /shipments?status=VESSEL_LOADED`; `POST /shipments/:id/vessel/load` | Container stuffed | **Vessel Loading** |
| 5 | Departed | Shipments `DEPARTED` | `GET /shipments?status=DEPARTED`; `POST /shipments/:id/vessel/depart` | Vessel loaded | **Vessel Departure** |
| 6 | In Transit | Shipments `IN_TRANSIT` | `GET /shipments?status=IN_TRANSIT`; `POST /shipments/:id/in-transit/update` | Departed | **In-Transit Update** |
| 7 | Destination Arrived | Shipments `DESTINATION_ARRIVED` | `GET /shipments?status=DESTINATION_ARRIVED`; `POST /shipments/:id/destination/arrive` | In transit | **Destination Arrival** |
| 8 | Delivered | Shipments `DELIVERED` | `GET /shipments?status=DELIVERED`; `POST /shipments/:id/delivery/complete`; `POST /shipments/:id/shipping-document` (BOL submit) | Destination arrival | **Complete Delivery**; **Submit Bill of Lading** |
| 9 | Users | `UserManagement` (shared) | `GET /users`; `POST /users`; `PUT /users/:id` | — | Create / Edit / Suspend User |

Detail dialog (all status tabs): shipment summary, documents (`GET /shipments/:id/documents`),
status timeline, and the next-step action button for the current status, plus
Approve/Reject clearance and BOL submission. **Shipping in the 20-step workflow:** steps
9–10, 12–14 (booking → land transport → port → stuffing → loading → departure → transit →
destination → delivery, BOL).

---

# 8. Shared components — where they are used

| Component | File | Used in |
|---|---|---|
| `AuditTrailTable` / `AuditTrailViewer` | `ui/src/components/portals/AuditTrailTable.tsx`, `AuditTrailViewer.tsx` | ECTA tab 8, Exporter tab 7, Customs tab 7, NBE tab 8, Banks tab 8, ECX tab 3 (viewer only) |
| `AnalyticsDashboard` | `ui/src/components/analytics/AnalyticsDashboard.tsx` | ECTA tab 5, NBE tab 6, Banks tab 6, `pages/portals/analytics.tsx` (all roles) |
| `UserManagement` | `ui/src/components/admin/UserManagement.tsx` | ECTA 7, ECX 3, Customs 6, NBE 7, Banks 7, Shipping 9 |
| `DocumentManagementPanel` | `ui/src/components/portals/DocumentManagementPanel.tsx` | ECTA 9, Exporter 7, Customs 7, NBE 8, Shipping (imported) |
| `BlockchainSignatureVerification` | `ui/src/components/portals/BlockchainSignatureVerification.tsx` | ECTA, ECX, Exporter, Customs, NBE, Shipping (all except Banks) |
| `QualityInspectionWorkflow` / `InspectionManagement` | `ui/src/components/portals/QualityInspectionWorkflow.tsx`, `InspectionManagement.tsx` | ECTA only (workflow in a dialog, `ECTAPortal.tsx:3936`) |
| `InspectionRequestsTab` | `ui/src/components/inspection/InspectionRequestsTab.tsx` | ECTA tab 6 |
| `PostDeliveryWorkflowPanel` | `ui/src/components/shared/PostDeliveryWorkflowPanel.tsx` (note: NOT `portals/shared/`) | ECTA 9, Exporter 7, NBE (imported), Shipping (imported) |
| `UnifiedPaymentWorkflow` | `ui/src/components/portals/UnifiedPaymentWorkflow.tsx` | Banks tab 0 (`:3092`) |
| `PaymentMethodForms`, `PaymentDocuments`, `DocumentVerificationPanel`, `DocumentUploadDialog`, `DocumentValidationDialog` | `ui/src/components/portals/*.tsx` | BanksPortal dialogs |
| `ForexAllocationDialog`, `SwiftComposeDialog` | `ui/src/components/portals/ForexAllocationDialog.tsx`, `SwiftComposeDialog.tsx` | BanksPortal (`:5252`, `:5287`) |
| `BorderCrossingTab` | `ui/src/components/bordercrossing/BorderCrossingTab.tsx` | Customs tab 5 |
| `CustomsInspection`, `CustomsClearedShipments` | `ui/src/components/portals/CustomsInspection.tsx`, `CustomsClearedShipments.tsx` | CustomsPortal (imported) |
| `RepatriationManagementTab` | `ui/src/components/repatriation/RepatriationManagementTab.tsx` | NBE tab 4 |
| `SWIFTMonitoringWrapper` | `ui/src/components/portals/SWIFTMonitoringWrapper.tsx` | NBE tab 3 |
| `LCDiscrepancyTab` | `ui/src/components/lcdiscrepancy/LCDiscrepancyTab.tsx` | Banks tab 9 (`:3743`) |
| `SWIFTMessagesViewWrapper` | `ui/src/components/portals/SWIFTMessagesViewWrapper.tsx` | Exporter tab 5 |
| `StandardPortalLayout` | `ui/src/components/portals/shared/StandardPortalLayout.tsx` | **Dead** — imported only by the dead `tabConfig.tsx` files (M-10) |
| `portalDataLoader` | `ui/src/utils/portalDataLoader.ts` | **Dead** — only referenced from dead `ecta/utils/dataLoader.ts` |

---

# 9. End-to-end status-transition map (what the test run must walk)

One shipment's happy path across portals (each arrow is a tab action above):

```
Exporter applies (public form) 
  → ECTA 0 approve application (→ approved exporter + licence PDF)
  → ECX 0 intake lot → grade → assign to contract
  → Exporter 1 create contract
  → ECTA 2 approve contract
  → NBE 0 forex approve → Banks 1 allocate forex → Banks 0 issue LC (payment method)
  → Exporter 3 create shipment → Shipping 0 clearance approve → Shipping 1–8
    land transport → port → stuffing → loading → departed → in transit → destination → delivered (BOL)
  → ECTA 3 quality inspection → ECTA 3 issue export permit
  → Exporter 4 customs declaration submit
  → Customs 0→1→2→3 submitted → inspecting → under review → cleared (reject path → tab 4)
  → Exporter 5 submit LC documents → Banks 2 examine documents → Banks 3 release payment
  → Banks 4 SWIFT message → NBE 3 SWIFT monitoring → Banks 5 LC settlement
  → NBE 4 forex repatriation → ECTA 9 / Exporter 7 post-delivery audit
```

Prerequisites that must exist before each step can be tested (in order):
approved exporter → ECX lot → contract → LC → shipment → permit → declaration →
clearance → LC documents → payment → settlement → repatriation → audit. Every tab's
"Needs first" column above states its own prerequisite; a step cannot be exercised
without the previous portal's output.

# 10. Test-run blockers (fix before any live test)

1. **M-01 first:** restore `ui/src/config/api.config.ts` (`apiFetch`, `getAuthHeaders`,
   `API_BASE_URL`, `API_ENDPOINTS`). Without it nothing renders.
2. Fix the four double-prefixed `apiFetch('/api/v1/…')` calls in `BanksPortal.tsx`
   (M-02), or confirm `apiFetch` does not prepend the base URL (in which case the
   bare-path calls are the wrong ones).
3. Add or stub the missing server routes: `POST /blockchain/invoke|query`,
   `GET /analytics/{exports,compliance,quality,banking}`, `POST /banking/exchange-rates`,
   `GET /exporters/:exporterId/shipments`, `GET /shipments/eudr-compliant` (M-03–M-07),
   or change the UI to the routes that exist (`/exchange-rates`, `/forex/rates`,
   `GET /shipments?eudrCompliant=true`, `/analytics/dashboard`). Fix the border-crossing
   method mismatch (M-13): change the dialogs to POST, or add PUT routes server-side.
4. Decide the fate of `api/src/routes/portals.ts` (M-09) and delete the dead
   `portals/*/utils/`, `portals/ecx/tabs/`, `PaymentProcessingTab`, and the unused
   `PaymentMethodTab` import (M-10).
5. Live-test note: the API needs Postgres running and the fix branch's env gate
   (`JWT_SECRET` ≥ 32 chars) satisfied; the frontend needs `NEXT_PUBLIC_API_URL`
   (or whatever `API_BASE_URL` reads) pointing at the API.
