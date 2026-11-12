# GoCBC — Full Export Workflow Status Machine (TEST-WORKFLOW-MAP)

> **Working file for the end-to-end test run.** Static code map only — no server was
> started, no live chaincode or database was queried. "Cannot succeed" means
> "cannot succeed against the committed chaincode / API as written", not a runtime
> observation.
>
> - **Repo:** `gurmudemuma/GoCBC`, local clone `~/workspace/GoCBC`
> - **Branch / HEAD:** `fix/auth-chaincode-audit` @ `12d5a8d` (on top of `features` `042b8b7`)
> - **Mapped:** 2026-11-09, from `api/src/routes/*.ts`, `chaincodes/coffee/*.go`,
>   `api/src/services/statusManager.ts` (where cited), and
>   `tests/complete-workflow-test.sh`, `tests/complete-workflow-test-v2.sh`,
>   `tests/complete-crud-workflow-test.sh`, `tests/e2e-workflow-test.sh`
> - **Detailed evidence:** Appendices A–D at the end of this file (verbatim part maps
>   with file:line citations for every endpoint, status value and validator).

## How to read this map

- **Three state stores that disagree.** The same business step is often recorded in
  up to three places with different status vocabularies: (1) **chaincode** (UPPERCASE,
  e.g. `APPROVED`, `CLEARED`) — the ledger of record; (2) **PostgreSQL** (often
  lowercase, e.g. `pending`, `approved`, `in_transit`); (3) **CouchDB** (lowercase,
  e.g. `submitted`, `inspecting`). Many transitions write only one or two of them.
  A test that reads a different store from the one a step wrote will see a stale
  status — this is the single most common failure mode in the map.
- **Three state machines that disagree.** `statusManager.ts` transition tables, the
  chaincode `validateStatusTransition` tables, and the transitions the code actually
  performs are three different machines. `statusManager.validateTransition` returns
  `true` for any current status not in its map, and `updateEntityStatus` is a no-op
  for the ledger (logs "PostgreSQL only", no chaincode write, no cascades) — so the
  `PUT /status` gate and every declared cross-entity cascade are effectively inert.
- **Mounts.** All API paths below are under `/api/v1` plus the mount prefix from
  `api/src/server.ts`: `/exporters`, `/applications` (same exporters router),
  `/auth`, `/contracts`, `/banking` (mounted **twice**, `:246` and `:253`),
  `/shipments`, `/forex`, `/nbe`, `/customs`, `/quality` (+ aliases
  `/quality-inspections`, `/certificates`), `/permits`, `/phytosanitary`,
  `/inspection`, `/shipping`, `/payments`, `/swift`, `/repatriation`,
  `/retention`, `/post-delivery`, `/status`, `/portals`, `/blockchain-signatures`.
- **Roles.** `requireRole` exists in two flavours: `middleware/auth.ts` (variadic,
  `requireRole('ECTA','ECTA_ADMIN')`, ADMIN always bypasses) and `middleware/rbac.ts`
  (array, `requireRole(['BANKS','BANK_ADMIN'])`, ADMIN always bypasses). Many
  mutating routes carry `authMiddleware` only — any authenticated role can call them;
  the chaincode MSP check sometimes compensates, sometimes does not (see §5).

---

## 1. Canonical workflow — start to finish

Merged canonical order from the test scripts (Part D §2) and the route/chaincode
analysis (Parts A–C). Steps 0–2 are the licensing pre-step; steps 3–20 are the
20-step export workflow.

| # | Step | Entity / status after | Who | API endpoint | Chaincode function |
|---|---|---|---|---|---|
| 0 | Submit exporter application | application `pending` (PG, lowercase) | public (applicant) | POST `/exporters/exporter-applications` | — (async audit log only) |
| 1 | ECTA approves application | application `approved`; exporter `LicenseStatus=ACTIVE` | ECTA / ECTA_ADMIN | POST `/exporters/exporter-applications/:applicationId/approve` | `RegisterExporter` |
| 2 | Applicant login (temp credentials) | applicant token (role `APPLICANT`) | applicant | POST `/auth/applicant/login` | — |
| 3 | Create sales contract | contract `REGISTERED` | EXPORTER | POST `/contracts` | `RegisterSalesContract` |
| 4 | ECTA approves contract | contract `APPROVED`; auto-creates LC `REQUESTED` | ECTA | POST `/contracts/:contractID/approve` | `ApproveSalesContract` |
| 5 | Bank issues LC | LC `ISSUED` (or `REQUESTED`→`APPROVED`→`ISSUED` via approve then issue) | BANKS | POST `/banking/lc/issue` (or `/lc/:lcID/approve` then issue) | `IssueLetterOfCredit` / `CreateAndIssueLC` |
| 6 | Forex request (auto on LC issue, or manual) | forex `REQUESTED` | BANKS | POST `/forex/request` | `RequestForex` |
| 7 | NBE confirms forex | forex `CONFIRMED` (optional) | NBE (NBEMSP) | POST `/forex/confirm` | `ConfirmForex` |
| 8 | Allocate forex | forex `ALLOCATED`; LC → `FOREX_ALLOCATED` | BANKS/NBE | POST `/forex/allocate` or POST `/banking/lc/:lcID/allocate-forex` | **none — CouchDB/PG only; `AllocateForex` is never called** |
| 9 | Request quality inspection | quality `pending` (PG) | EXPORTER/ECTA | POST `/quality/inspections` | **none** |
| 10 | Collect sample → lab results → approve | quality `sample_collected` → `inspected` → `approved`; certificate `certificate_issued` | ECTA | POST `/quality/inspections/:id/collect-sample`, `/lab-results`, PUT `/quality/inspections/:id/approve` | **none** (reject/issue call wrong functions — §5) |
| 11 | Issue export permit | permit `ISSUED` | ECTA | POST `/permits` (or POST `/permits/issue`) | `IssueExportPermit` |
| 12 | Phytosanitary certificate | phyto `ISSUED` (request/inspect steps broken — §5) | ECTA | POST `/phytosanitary/request`, `/inspect`, `/issue` | `IssuePhytosanitaryCertificate` (called with wrong arity) |
| 13 | Pre-shipment inspection | inspection `SCHEDULED` → `COMPLETED` → `APPROVED` | ECTA | POST `/inspection/request`, `/perform`, `/:id/approve` | `PerformInspection` never called; `ApproveInspection` unguarded |
| 14 | Create shipment | shipment `pending` (PG) / no chaincode record | EXPORTER/SHIPPING | POST `/shipments` | **none — `CreateShipment` never called** |
| 15 | Book freight / Bill of Lading | shipment `FREIGHT_BOOKED` (chaincode) / `in_transit` (CouchDB) | SHIPPING | POST `/shipments/:shipmentID/book-freight`, `/bill-of-lading` | `RecordBillOfLading` never called by routes |
| 16 | Load → depart → arrive → deliver | shipment `LOADED` → `DEPARTED`/`IN_TRANSIT` → `DESTINATION_ARRIVED` → `DELIVERED` | SHIPPING | POST `/shipping/bookings/:id/{load,depart,arrive,deliver}` (PG, unguarded) | second lifecycle set calls functions that do not exist (§5) |
| 17 | Customs declaration → review → inspect → clear | declaration `SUBMITTED` → `UNDER_INSPECTION` → `UNDER_REVIEW` → `CLEARED` | CUSTOMS | POST `/customs/declaration/submit`, `/:id/review`, `/:id/inspect`, `/:id/complete-inspection`, `/:id/clear` | `SubmitDeclaration`, `ReviewDeclaration`, `CompleteInspection`, `ClearDeclaration` |
| 18 | Border crossing | crossing `PENDING` → `CLEARED_EXIT` → `IN_TRANSIT` → `CROSSED` → `ARRIVED` | CUSTOMS/SHIPPING | POST `/bordercrossing/...` | `InitiateBorderCrossing`, `ClearForExit`, `RecordDeparture`, `RecordBorderCrossing`, `RecordArrival` (no from-state guards on 9/10) |
| 19 | Payment documents → bank verification | payment `PENDING` → `DOCUMENTS_SUBMITTED` → `VERIFIED` | BANKS | POST `/payments/record`, `/payments/:id/verify` (see §5 I9) | `SubmitPaymentDocuments`, `VerifyPaymentDocuments` |
| 20 | SWIFT initiated → received | payment `SWIFT_INITIATED` → `SWIFT_RECEIVED` | BANKS | POST `/payments/:id/swift-initiate`, `/swift-receive` (+ `/swift/*` message flow) | `InitiateSWIFTTransfer`, `ConfirmSWIFTReceipt` |
| 21 | Release LC payment | LC `PAYMENT_RELEASED` | BANKS | POST `/banking/lc/:lcID/release-payment` | `ReleasePayment` (auth-only — no role check) |
| 22 | Settle payment | payment `SETTLED` | BANKS/NBE | POST `/payments/:paymentID/settle` | `SettlePayment` (route's `statusManager` check rejects `VERIFIED → SETTLED` — §5) |
| 23 | NBE forex approve + repatriation | forex `APPROVED` (PG-only); repatriation `PENDING` → `PARTIAL`/`READY_FOR_VERIFICATION` → `COMPLIED` | NBE | POST `/nbe/forex/:forexId/approve`, `/nbe/forex/:forexId/repatriation` | **none** (`RecordForexRepatriation` does not exist) |
| 24 | Retention compliance | `RetentionStatus` `PENDING` → `COMPLIED`/`NON_COMPLIANT` | NBE | POST `/retention/record` | `RecordForexRetention` |
| 25 | Post-delivery → close contract | contract `COMPLETED` (PG) | ADMIN/ECTA | POST `/post-delivery/...`, `/close-contract` | `UpdateContractStatus` (close verifies nothing — §5) |

Notes on ordering: the test scripts disagree on order — v1/v2 run quality → LC →
forex → customs; CRUD runs quality fully → LC → customs → shipping → NBE last; e2e
is read-only in portal order ECTA → ECX → quality → customs → banks → NBE → shipping
(Part D §2). The chaincode itself enforces almost no ordering (most functions have
no from-state guard), so the "order" above is the *intended* business order, not an
enforced one.

---

## 2. Dependency chain (what each step needs from a previous step)

```
application (APP-… / numeric id)            [submit, public]
  └─> approve → exporterId + licence number + temp credentials (username/password)
        └─> applicant login → APPLICANT token
              └─> CONTRACT (needs: exporterID; pricePerKg ≥ 5.0; quantity, coffeeType…)
                    └─> ECTA approve → contractId (REGISTERED → APPROVED)
                          ├─> auto LC REQUESTED (LC-<timestamp>, bank = Commercial Bank of Ethiopia)
                          ├─> LC approve (needs LC id, status REQUESTED) → APPROVED
                          ├─> LC issue (needs LC id, APPROVED) → ISSUED
                          │     └─> auto forex REQUESTED (FOREX_<lcID>_REQUEST)
                          ├─> forex confirm (needs forexId, REQUESTED) → CONFIRMED [optional]
                          ├─> forex allocate (needs forexId + lcId) → ALLOCATED / LC FOREX_ALLOCATED [PG/CouchDB only]
                          ├─> QUALITY inspection (needs contractId/shipmentId; PG only)
                          │     └─> sample → lab results → approve → certificate_issued
                          │           └─> permit issue (needs inspection approved OR passed=true — OR-guard, Part B #15)
                          ├─> PHYTO certificate (needs shipment/contract ref; request+inspect broken)
                          ├─> PRE-SHIPMENT inspection (needs shipment/contract ref)
                          ├─> SHIPMENT (needs contractId; PG only, no chaincode record)
                          │     ├─> book freight / B/L (needs shipmentId)
                          │     └─> load → depart → arrive → deliver (PG bookings, unguarded)
                          ├─> CUSTOMS declaration (needs shipmentId/BL; chaincode SUBMITTED → … → CLEARED)
                          │     └─> border crossing (needs declaration/shipment ref; unguarded order)
                          ├─> PAYMENT documents (needs contractId/shipmentId/LC id)
                          │     ├─> bank verification → VERIFIED
                          │     ├─> SWIFT initiate (needs VERIFIED) → SWIFT_INITIATED
                          │     ├─> SWIFT receive → SWIFT_RECEIVED
                          │     └─> settle (needs SWIFT_RECEIVED per chaincode; route wrongly demands statusManager path) → SETTLED
                          ├─> LC payment release (needs LC UTILIZED; docs verified if shipment linked)
                          ├─> NBE forex approve (needs forexId; PG-only, unguarded by status)
                          ├─> REPATRIATION record (needs payment SETTLED / forexId; verify → COMPLIED)
                          ├─> RETENTION record (needs forexId + policy; → COMPLIED/NON_COMPLIANT)
                          └─> POST-DELIVERY checklist → close contract → COMPLETED (PG; verifies nothing)
```

Hard gates that actually exist in code (enforced, not just documented):
- Contract approve (production only): `CONTRACT_SIGNED` + `PROFORMA_INVOICE` documents
  must exist or approval 400s (`contracts.ts:1340-1375`). No test script uploads documents.
- LC examine/release: shipment-linked LCs require verified shipping documents
  (BILL_OF_LADING, COMMERCIAL_INVOICE, PACKING_LIST) before payment release.
- Quality permit (Q10): inspection `approved` OR `passed=true` (OR, not AND).
- Customs clear: chaincode requires `UNDER_REVIEW`; the PG-only clear path requires nothing.
- Settle: chaincode accepts `VERIFIED`/`SWIFT_RECEIVED`; the route's `statusManager`
  check accepts only the `statusManager` table's successors — `VERIFIED → SETTLED` is
  rejected at the route (Part C I3).
- Everything else is effectively unguarded: most chaincode functions and most PG
  routes accept any current status (or never read it).

---

## 3. Status inventories (exact strings)

Full per-entity lists with the file:line of every writer are in the appendices
(A §7, B §1, C §1). Summary by entity:

| Entity | Store | Status values (count) |
|---|---|---|
| Exporter application | PG (lowercase) | `pending`, `approved`, `rejected` (3) |
| Exporter licence | chaincode | `ACTIVE`, `SUSPENDED`, `REVOKED` (3; only `ACTIVE` is written by a route) |
| Contract (`ContractStatus`) | chaincode + PG | `REGISTERED`, `APPROVED`, `REJECTED`, `CANCELLED` (dead endpoint), `EXECUTED`, `COMPLETED`, `LC_ISSUED` (map/cascade only, never written) (7) |
| Forex (`Status`) | chaincode + PG/CouchDB | `REQUESTED`, `CONFIRMED`, `APPROVED` (PG-only), `ALLOCATED`, `UTILIZED`, `REJECTED` (intended, unwritable), `EXPIRED` (never written), `SETTLED` (cascade only), `REPATRIATED` (PG fallback), `ELIGIBLE` (cascade only); `RetentionStatus`: `PENDING`, `COMPLIED`, `NON_COMPLIANT` (9 + 3) |
| LC (`Status`) | chaincode + PG/CouchDB | `REQUESTED`, `APPROVED`, `REJECTED`, `ISSUED`, `FOREX_ALLOCATED`, `FOREX_REQUESTED` (accepted, never set), `AMENDED` (unreachable), `UTILIZED`, `PAYMENT_RELEASED`, `SETTLED` (never written), `EXPIRED`; `NegotiationStatus`: `NOT_STARTED`, `UNDER_NEGOTIATION`, `ACCEPTED`, `REJECTED`; discrepancy: `OPEN`, `RESOLVED`, `WAIVED`, `REJECTED`; amendment: `ACCEPTED` (12 + 4 + 4 + 1) |
| Consignment | chaincode | `PERMIT_ISSUED`, `SHIPPED`, `PARTIAL`, `SETTLED` (4); permit `ISSUED` |
| Quality inspection | PG (lowercase) | `pending`, `requested`, `sample_collected`, `inspected`, `approved`, `rejected`, `certificate_issued`, `permit_issued`, `completed`, + legacy/alias values (see B §1.1) |
| Export permit | chaincode | `ISSUED`, `UTILIZED`, `SETTLED`, `EXPIRED` (never set), `CANCELLED` (never set) (5) |
| Phytosanitary certificate | chaincode | `ISSUED`, `REVOKED`, `CLAIMED`, `EXPIRED` (never set), `REQUESTED`/`INSPECTED` (implied by API, do not exist in chaincode) |
| Pre-shipment inspection | chaincode | `REQUESTED`, `SCHEDULED`, `IN_PROGRESS` (never set), `COMPLETED`, `INSPECTED`, `APPROVED`, `REJECTED` |
| Shipment | chaincode + PG + CouchDB (three vocabularies) | chaincode: `CREATED` (never written by routes), `FREIGHT_BOOKED`, `LOADED`, `IN_TRANSIT`, `LAND_TRANSPORT`, `PORT_ARRIVED`, `CONTAINER_STUFFED`, `VESSEL_LOADED`, `DEPARTED`, `DESTINATION_ARRIVED`, `DELIVERED`, `CUSTOMS_CLEARED`, `PERMIT_ISSUED`; PG lowercase: `pending`, `in_transit`, `booked`, `arrived`, `delivered`, …; `statusManager`: `CREATED`, `QUALITY_INSPECTION`, `QUALITY_APPROVED`, `PHYTO_INSPECTION`, `PHYTO_APPROVED`, `EUDR_*`, `INSURANCE_REGISTERED`, `BORDER_CROSSING`, `CUSTOMS_DECLARED`, `CUSTOMS_CLEARED`, `LAND_TRANSPORT_STARTED`, `ARRIVED_DESTINATION`, `DELIVERED`, `QUALITY_REJECTED`, `CUSTOMS_REJECTED`, `CANCELLED` (many never set — B §1.5) |
| Customs declaration | chaincode + PG + CouchDB | chaincode: `SUBMITTED`, `UNDER_INSPECTION`, `UNDER_REVIEW`, `CLEARED`, `REJECTED`; PG: `submitted`, `INSPECTING`, `CLEARED`; CouchDB: `submitted`, `inspecting`, `cleared` |
| Border crossing | chaincode | `PENDING`, `CLEARED_EXIT`, `IN_TRANSIT`, `CROSSED`, `ARRIVED`, `CLEARED`, `INSPECTED`, `INSPECTION_FAILED`, `DETAINED`; `ComplianceStatus`: `COMPLIANT`, `NON_COMPLIANT`, `UNDER_REVIEW` |
| Payment (`PaymentSettlement`) | chaincode + PG | `PENDING`, `DOCUMENTS_SUBMITTED`, `VERIFIED`, `SWIFT_INITIATED`, `SWIFT_RECEIVED`, `SETTLED`, `ADVANCE_RECEIVED`, `BALANCE_RECEIVED`, `PAYMENT_RELEASED`, `DOCUMENTS_RELEASED` (never assigned), `COMPLETED` (never assigned); `statusManager`-only: `UNDER_VERIFICATION`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED`, `PAYMENT_AUTHORIZED` (never assigned); PG-only: `RECEIVED`, `SPLIT`, `RELEASED` |
| Documentary collection / CAD | chaincode | `SENT`, `PRESENTED`, `ACCEPTED`, `PAID`, `RETURNED` |
| Advance payment | chaincode | `RECEIVED`, `PERMIT_ISSUED`, `SHIPPED`, `SETTLED` |
| SWIFT message | chaincode | `DRAFT`, `APPROVED`, `NBE_APPROVED` (never persisted), `SENT`, `IN_TRANSIT` (never assigned), `RECEIVED`, `PROCESSING`, `SETTLED`, `REJECTED`, `PENDING_APPROVAL` (never assigned), `CANCELLED` (never assigned), `FAILED` (never assigned) |
| Repatriation | chaincode | `PENDING`, `PARTIAL`, `READY_FOR_VERIFICATION`, `COMPLIED`, `NON_COMPLIANT`, `OVERDUE` (read-time only), `WAIVED` |
| Retention | chaincode | policy `ACTIVE`/`INACTIVE`; `RetentionStatus` `PENDING`, `COMPLIED`, `NON_COMPLIANT` |
| Post-delivery / contract close | PG | checklist booleans; contract `COMPLETED` (terminal) |
| Exchange rate / retention policy | chaincode | `SUPERSEDED` (old rate), `INACTIVE` (old policy) |

**Case warning for tests:** quality inspections are stored lowercase in PG
(`pending`/`approved`) but the CRUD script asserts `"APPROVED"` uppercase; customs
is uppercase in chaincode but lowercase in PG/CouchDB. Which casing each list filter
expects was not runtime-verified (Part D §9).

---

## 4. Counts

| Measure | Count | Source |
|---|---|---|
| State-changing transitions documented (API + chaincode) | **174** | A 40 + B 58 + C 76 |
| — of which API-level transitions | 34 (A) + 58 (B) + 64 (C, excl. 12 reads/broken calls) | Parts A–C |
| — of which chaincode-only / no-route transitions | 5 (A) + 12 (C reads & broken calls) | Parts A, C |
| Distinct status values inventoried | A 35 · B 60 · C 97 (slices overlap — e.g. forex/LC/shipment appear in two slices; do not sum) | Parts A–C §1/§7 |
| Test steps mapped | **128** across 4 scripts; **108 unique** (v1 ≡ v2 byte-identical) | Part D |
| Test mismatches | **29** (5 blocking, 9 wrong-assertion, 10 silent field loss, 5 other/minor) | Part D §8, summarised §7 below |
| Chaincode functions called by the API that do not exist | **17** (see §5.1) | Parts A–C |
| Chaincode functions that exist but no route calls | **10+** (see §5.2) | Parts B, C |
| Dead-end statuses | **36** (B) + terminal rows in A and C (see §6) | Parts A–C |

---

## 5. Consolidated disagreement register

### 5.1 Calls to chaincode functions that do not exist (route can never succeed)

| # | Caller (file:line) | Missing function | Effect |
|---|---|---|---|
| 1 | `banking.ts:657` — POST `/banking/forex/:forexID/reject` | `RejectForex` | Forex rejection is impossible (A #1) |
| 2 | `payments.ts:908` — PUT `/payments/:paymentID/confirm` | `ConfirmSettlement` | Confirm endpoint cannot succeed (C I6; also I17) |
| 3 | `payments.ts:1359` | `RecordForexRepatriation` | Repatriation recording via payments fails (C I6) |
| 4 | `swift.ts:611` — POST `/messages/:messageID/nbe-approve` | `NBEApproveSWIFTMessage` | `NBE_APPROVED` is never persisted (C I5) |
| 5 | `swift.ts:129` | `AddSWIFTDocuments` | Failure swallowed (fire-and-forget) (C I6) |
| 6 | `swift.ts:205` | `LinkSWIFTMessageToPayment` | Failure swallowed (C I6) |
| 7 | phyto request — `phytosanitary.ts` (H1) | `RequestPhytosanitaryCertificate` | First phyto step can never succeed (B #4) |
| 8 | phyto inspect — `phytosanitary.ts` (H2) | `InspectPhytosanitaryCertificate` | Second phyto step can never succeed (B #4) |
| 9 | shipments S21 | `RecordContainerStuffing` | Duplicate lifecycle set broken (B #3) |
| 10 | shipments S22 | `RecordVesselLoading` | Duplicate lifecycle set broken (B #3) |
| 11 | shipments S23 | `RecordVesselDeparture` | Duplicate lifecycle set broken (B #3) |
| 12 | shipments S25 | `RecordDestinationArrival` | Duplicate lifecycle set broken (B #3) |
| 13 | `status.ts` workflow aggregate | `ReadCONTRACT`, `ReadCUSTOMS`, `QueryByContractId`, `QueryByShipmentId`, `QueryByPaymentId`, `Get<entity>History` (except SHIPMENT) | Related entities always `[]`, several reads `NOT_FOUND` with HTTP 200 (C I12) |
| — | `customs.ts:1478-1494` comment claims `UpdateShipmentStatus` "doesn't exist in chaincode" | it does exist (`main.go:1788`) | Shipment-status update skipped on customs clear for a false reason (C I10) |

### 5.2 Wrong-arity / wrong-order chaincode calls

| Caller | Call | Chaincode signature | Effect |
|---|---|---|---|
| quality reject (Q7) | `RejectInspection` with 3 args | 2 args, pre-shipment entity | Fails or corrupts state (B #7) |
| quality issue (Q9) | `IssueCertificate` 5 args, `(certId, inspectionId, …)` | 3 args `(inspectionID, certificateNumber, certificateURL)` | Fails / wrong positions (B #7) |
| phyto issue (H3) | `IssuePhytosanitaryCertificate` 5 args | 14 args | Values land in wrong positions; shipment check runs against certificate number (B #5) |
| phyto revoke (H4) | `(id, reason, revokedBy, date)` | `(id, revokedBy, reason)` | Reason and revoker swapped on-chain (B #6) |
| shipments S26 | `CompleteDelivery` 3 args | 2 args | Fails (B #3) |
| customs clear (C5) | `ClearCustomsDeclaration` 7 args via `customsService.ts:282` | 4 args | Only chaincode-backed clear path is mismatched (C I4) |
| forex confirm (F2) | passes current ISO timestamp as `comments` | `ConfirmForex` expects comments | Wrong value stored (A #16) |

### 5.3 Chaincode functions that exist but no route calls

`AllocateForex` (both allocation paths write CouchDB/PG directly, bypassing
endorsement and the NBE-rate check — A #2); `RequestInspection`, `PerformInspection`,
`CreateShipment`, `RecordBillOfLading`, `RecordAirwayBill` (B §3.5); `ResubmitRejectedContract`
(chaincode exists, no route — contract `REJECTED` is terminal at API level);
`ReleaseDocumentsToBuyer` (no route; `DOCUMENTS_RELEASED` unreachable — C §11).

### 5.4 Duplicate / parallel endpoints with divergent semantics

- **Two contract-approve endpoints**: `POST /contracts/:contractID/approve` (guarded,
  LC handoff, audit) vs `POST /contracts/approve` (body `contractId`, no status
  validation, no LC handoff, no audit; chaincode `ApproveSalesContract` has no
  from-state guard, so it can re-approve `APPROVED`/`REJECTED`) (A #5).
- **Two forex-allocation endpoints** (F3 vs F3b): different id schemes, role sets,
  data sources (A #3).
- **Two LC-creation paths on contract approval**: timestamp-id vs `LC-<contractID>`
  (A #4).
- **Two quality approve/reject pairs**: POST (guarded, chaincode, side effects) vs
  PUT (unguarded, no chaincode, different reject column `notes` vs `remarks`) (B #2).
- **Two permit-issue endpoints** with different validation (P1a validates and fills
  8 hard-coded defaults incl. `amount=85000`, `destination='Germany'`; P1b validates
  nothing, 500s on missing `amount`) (B #16).
- **Two shipment lifecycle sets** (`:shipmentID` vs `:shipmentId`); second set has no
  validators and calls 4 non-existent functions (B #3).
- **Two delivery paths**: `IN_TRANSIT → DELIVERED` vs `DESTINATION_ARRIVED → DELIVERED`
  (B #12); **three B/L paths** ending in `in_transit` (CouchDB) vs `LOADED`
  (chaincode) (B #11).
- **Two customs clear paths**: chaincode-backed `POST /customs/declaration/:id/clear`
  vs PG-only `POST /customs/declarations/:id/clear` (C I16); **two**
  `GET /customs/declarations` (second unreachable) and **two**
  `GET /quality/inspections` (second unreachable) (B #1, C I16).
- **Banking router mounted twice** (`server.ts:246` and `:253`) (A #14).
- **Contract cancel is dead code**: declared after `export default router`
  (`contracts.ts:1924`, after `:1917`), never registered (A #6).

### 5.5 State-machine divergence (code vs code)

- `statusManager` vs chaincode vs actually-implemented path disagree for CUSTOMS,
  PAYMENT and SHIPMENT (C I2, I3; B #10, #22). Practical consequences: the settle
  route rejects `VERIFIED → SETTLED` although `SettlePayment` accepts it; `GET
  /status/transitions/CUSTOMS` advertises transitions the chaincode rejects;
  `statusManager` SHIPMENT flow uses `LAND_TRANSPORT_STARTED` /
  `ARRIVED_DESTINATION` while chaincode uses `LAND_TRANSPORT` /
  `DESTINATION_ARRIVED`, and omits `DEPARTED` and `FREIGHT_BOOKED`/`LOADED`.
- `statusManager.updateEntityStatus` is a ledger no-op; all declared cascades
  (`ELIGIBLE`, `LC_ISSUED`, `SETTLED`, `CONTRACT → PAYMENT_RECEIVED`,
  `SHIPMENT → CUSTOMS_CLEARED`, `CONTRACT → COMPLETED`) are dead code (A #8, C I13).
- Three parallel state stores for customs (chaincode / PG / CouchDB) and for
  shipments (chaincode / PG / CouchDB) diverge — e.g. a declaration can be `CLEARED`
  in PG while still `SUBMITTED` on the ledger (C I10, B #23).
- Retention rates disagree: API/`PaymentService` 40% vs `ReceiveAdvancePayment`
  100% vs `SettlePayment` fallback 100% (C I7).
- Grade rules disagree: API grades by `overall` alone; chaincode
  `determineQualityGrade` grades by defects + cupping + moisture — chaincode is
  never called, so the on-chain rule is dead (B #18).
- Case/format drift: lowercase PG vs UPPERCASE chaincode vs mixed response strings
  (`'pending'` vs `'REGISTERED'` vs `'APPROVED'` for the same entity); `letter_of_credits`
  (wrong table name) written by the LC examine fallback and read by
  `GET /nbe/lc-monitoring` (A #12); `POST /quality/issue` returns `'issued'` for PG
  `'certificate_issued'` (B #21).

### 5.6 Missing role checks on state-changing routes (same pattern as the auth fix)

Only 4 mutating endpoints in Part C's slice carry `requireRole`; the rest rely on
mount-level `authMiddleware` (C I1). Notable, in addition to the ones fixed on
branch `fix/auth-chaincode-audit`:
- `POST /banking/lc/:lcID/examine-documents` and `/release-payment` — any
  authenticated role can examine documents or release LC payment (A #11).
- `POST /banking/lc/issue` — no validator chain, no visible contract-`APPROVED`
  check (A #11).
- Customs clear/settle/close: any authenticated role (incl. `EXPORTER`) can clear a
  declaration, settle a payment, or close a contract at the route level; chaincode
  MSP checks partially compensate (C I1).
- Phyto inspect/issue use an inline `user.role !== 'ECTA'` check that **rejects
  `ECTA_ADMIN`**; quality reject/perform/issue-permit use no role check; no permit
  route uses `requireRole` (B #17).
- `GET /forex/lc-monitoring` has `requireRole` but no per-route `authMiddleware`
  (relies on mount) (A #12).

### 5.7 Test-script disagreements (Part D §8 — 29 findings)

- **Blocking (5):** M1 v1/v2 `GET /exporters/exporter-applications/:id` does not
  exist; M2 e2e `GET /applications/:id` hits the exporter lookup, not application
  detail; M3 e2e `GET /users/exporters` does not exist; M4 e2e
  `GET /banking/payments?contractId=` — handler requires `exporterId` (400);
  M14 CRUD rejection-test shipment create is missing 9 required fields → 400.
  (M25: contract approve 400s `MISSING_DOCUMENTS` in production — no script uploads
  documents, so approval only passes in non-production.)
- **Wrong assertions (9, M5–M13):** list endpoints return `data` as a bare array
  while scripts read `.data.<plural>` — e2e silently counts 0 on six endpoints
  (contracts, shipments, quality, customs, banking LC, forex, shipping); v1/v2
  verification GETs pass query params the handlers ignore (`contractId`,
  `shipmentId`) and pass vacuously.
- **Silent field loss (10, M15–M24):** fields scripts send but handlers drop —
  application extras (13 fields, incl. contact details), contract create extras
  (buyerName, ports, incoterm, certifications…), PATCH `totalValue` /
  `amendmentReason`, quality `inspectionType`/`sampleLocation`/`requestedBy`,
  lab `appearance`/`odor`, forex `requestedBy`, customs review/inspect/clear
  bodies, shipping booking fields (destructured but not persisted).
- **Other/minor (5, M25–M29):** licence expiry date already past in CRUD (licence
  would verify `EXPIRED`); resubmit looks up by numeric `id` while the param is
  `APP-…`; submit response carries no temp password so applicant login cannot be
  exercised; v1/v2 create sample documents but never upload them; no script calls
  any `/status/*` endpoint.

---

## 6. Dead ends (statuses with no outgoing transition in code)

| Status | Entity | Verdict |
|---|---|---|
| `approved` | application (PG) | Terminal; re-approval blocked by `pending` guard |
| `REJECTED` | contract | Terminal at API level (`ResubmitRejectedContract` exists in chaincode, no route) |
| `APPROVED` (contract) | contract | `EXECUTED`/`CANCELLED` exist in map, no writer (cancel endpoint dead) |
| `EXECUTED` → `COMPLETED` | contract | No writer |
| `REJECTED`, `EXPIRED`, `SETTLED`, `REPATRIATED` | forex | Terminal; `EXPIRED` never written; `SETTLED` only a disabled-cascade target |
| `CONFIRMED`, `APPROVED` | forex | No entry in `StatusTransitions.FOREX` (map gap) |
| `REJECTED`, `SETTLED`, `EXPIRED`, `AMENDED` | LC | Terminal; `SETTLED` never written; `AMENDED` unreachable |
| `PAYMENT_RELEASED` → `SETTLED` | LC | Map-defined, no writer |
| `SETTLED` | consignment / permit | Terminal by design |
| `rejected` | quality (PG) | Terminal; no rework/re-request path; chaincode `REWORK` is comment-only |
| `certificate_issued`, `permit_issued`, `completed` | quality (PG) | Nothing reads them as a from-state (permit step reachable only via `passed=true` OR-guard) |
| `EXPIRED`, `CANCELLED` | permit (chaincode) | Declared, never set or read — unreachable |
| `REVOKED` | phyto | Terminal by design; `EXPIRED` declared, never set |
| `APPROVED` | pre-shipment inspection | Terminal in-slice: no shipment gate consumes it |
| `REJECTED` | pre-shipment inspection | Terminal; `ReInspectionRequired=true` set, no re-inspection endpoint |
| `IN_PROGRESS` | pre-shipment inspection | Declared, never set |
| `DELIVERED` | shipment | Terminal (`statusManager` `DELIVERED: []`, chaincode has no exit) |
| `FREIGHT_BOOKED`, `LOADED` | shipment (chaincode) | No endpoint gates on them; `FREIGHT_BOOKED` has no chaincode exit |
| `QUALITY_REJECTED`, `CUSTOMS_REJECTED`, `CANCELLED`, `QUALITY_INSPECTION`, `QUALITY_APPROVED`, `PHYTO_INSPECTION`, `PHYTO_APPROVED`, `EUDR_*`, `INSURANCE_REGISTERED`, `BORDER_CROSSING`, `CUSTOMS_DECLARED` | `statusManager` SHIPMENT flow | Terminal-by-design or never set by any route (only generic `PUT /status` could write them) |
| `BOOKED` / `ARRIVED` | shipping bookings (PG) | Exitable only because load/deliver are unguarded |
| `CLEARED`, `REJECTED` | customs declaration | Terminal (chaincode); `statusManager` claims `CLEARED → RELEASED`, nothing sets `RELEASED` |
| `SUBMITTED` (via API wrapper C7), `INSPECTING` (PG-only C9) | customs | Dead ends — chaincode never sees them |
| `ARRIVED`, `CROSSED`, `CLEARED`, `INSPECTED`, `INSPECTION_FAILED`, `DETAINED` | border crossing | Terminal-by-design but overwritable (no from-state guards on 9/10 functions) |
| `SETTLED` | payment | Terminal in practice; `DOCUMENTS_RELEASED`/`COMPLETED` declared successors never assigned |
| `SETTLED`, `REJECTED` | SWIFT message | Terminal (except unguarded reject can move `SETTLED → REJECTED`) |
| `PENDING_APPROVAL`, `IN_TRANSIT`, `CANCELLED`, `FAILED` | SWIFT | Never assigned (dead constants) |
| `UNDER_VERIFICATION`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED`, `PAYMENT_AUTHORIZED` | payment (`validateStatusTransition` tables) | Declared only, never assigned |
| `COMPLIED`, `WAIVED` | repatriation | Terminal (correct end states) |
| `NON_COMPLIANT` | repatriation | Near-terminal: waiver or overdue-re-verify only |
| `COMPLIED` | forex retention | Terminal; `NON_COMPLIANT` re-recordable |
| `COMPLETED` | post-delivery / contract | Terminal (correct end state) |
| `PENDING_RELEASE`, `AWAITING_RELEASE` | payments list filter | Never assigned — `GET /payments/pending-release` can only match `VERIFIED` |

---

## 7. Test-script verdicts (per script)

| Script | Steps | Verdict |
|---|---|---|
| `tests/complete-workflow-test.sh` | 20 | Byte-identical to v2. Passes only vacuously in places: verification GETs use ignored query params; contract approve passes only outside production (no documents uploaded). 1 blocking mismatch (M1). |
| `tests/complete-workflow-test-v2.sh` | 20 | Identical to v1 (diff: no output). Same verdict. |
| `tests/complete-crud-workflow-test.sh` | 53 | Most complete coverage (incl. reject/cancel branches, NBE last). 1 blocking (M14, shipment create missing 9 fields), licence expiry already past (M26), silent field loss on application/contract/quality/customs/shipping steps. |
| `tests/e2e-workflow-test.sh` | 35 (read-only) | Cannot pass as written: 3 endpoints do not exist as called (M2, M3) or reject the query param (M4); 9 wrong assertions read `.data.<plural>` on bare-array responses and silently count 0. |
| `tests/complete-portal-actions-test.sh`, `tests/verify-all-portal-tabs.sh` | — | Not mapped in this pass (portal tab/action scripts; see §8). |

**Dominant failure mode is not missing routes but response-shape mismatch** (Part D):
list endpoints return `data` as a bare array while scripts read `.data.<plural>`,
and verification GETs pass query params the handlers ignore.

---

## 8. Portal tabs — appendix (partial)

A full per-portal tab/sub-tab inventory was **not** completed in this pass: portal
components render tabs conditionally (`visibleTabs`, indexed `tabValue` panels,
hierarchical parent/child navigation), so an accurate inventory needs a dedicated
read of each portal file. What was verified:

- **BanksPortal** (`ui/src/components/portals/BanksPortal.tsx:461+`): hierarchical
  parent/child structure — *Payment Operations* (All LCs, Payment Methods, Document
  Examination, Payment Release, LC Discrepancies), *Forex & Settlements* (Forex
  Allocations, LC Settlements), *Communication & Issues* (SWIFT Messages),
  *System Management* (Analytics, …; Audit Trail at index 8, User Management at 7).
- **ExporterPortal**: top-level tabs include Dashboard (0), Reports (6), Audit Trail
  (7); intermediate tabs are rendered conditionally.
- **ECTAPortal**: indexed `tabValue` panels (0–6+), incl. application review,
  quality, permits, analytics, audit trail.
- **CustomsPortal**: tabs incl. Submitted / Under Review / Inspecting / Cleared /
  Rejected, Border Crossing, User Management, Audit Trail.
- **NBEPortal / ECXPortal / ShippingPortal**: tab labels present in the files
  (forex allocations, LC monitoring, retention, exchange rates; lots/grading/
  warehouse; bookings, tracking, clearances) — not enumerated here.
- **Portal dashboard gap (verified in Part D §3 E40):** `GET /portals/:portal/dashboard`
  has no `quality` case — `GET /portals/quality` returns the ECTA dashboard;
  the alias maps `quality` → ECTA dashboard. CRUD's quality-dashboard assertion
  therefore cannot return a quality-specific dashboard.
- Portal-dashboard sub-keys asserted by the scripts were confirmed present in
  `portals.ts` (Part D §9), except e2e's `.data.statistics.applications.*`,
  `.data.totalLCs`, `.data.totalForex`, `.data.totalShipments`, which were not
  line-verified.

---

## Appendix — detailed part maps

The four part files below are reproduced verbatim (only the top heading level is
kept as written). They are the evidence base for §§1–7 above.

---

# Appendix A
# Part A — Contract → Forex → LC Chain

**Scope:** read-only mapping on local clone `~/workspace/GoCBC`, branch `fix/auth-chaincode-audit`, HEAD `12d5a8d`.
**Files read:** `api/src/routes/exporters.ts` (application endpoints only), `api/src/routes/contracts.ts`,
`api/src/routes/forex.ts`, `api/src/routes/nbe.ts`, `api/src/routes/banking.ts` (LC/forex parts only),
`chaincodes/coffee/forex.go`, `chaincodes/coffee/banking.go`, `chaincodes/coffee/consignment.go`
(transition functions + status constants only). Supporting reads needed to resolve chaincode function names:
`api/src/services/contractService.ts`, `forexService.ts`, `lcService.ts`, `fabricService.ts`,
`api/src/utils/statusManager.ts`, `chaincodes/coffee/main.go` (contract + exporter functions).

**Mount points** (`api/src/server.ts`): `/api/v1` router; `apiV1.use('/exporters', exporterRoutes)` (line 240),
`apiV1.use('/contracts', authMiddleware, contractRoutes)` (line 245),
`apiV1.use('/banking', authMiddleware, bankingRoutes)` (lines 246 **and** 253 — mounted twice),
`apiV1.use('/forex', authMiddleware, forexRoutes)` (line 254),
`apiV1.use('/nbe', authMiddleware, nbeRoutes)` (line 255).
All paths below are full mounted paths. Unless noted, `authMiddleware` is applied at mount level and/or per-route.

**Status-value conventions (important):** exporter applications use **lowercase** in PostgreSQL
(`pending` / `approved` / `rejected`); contracts, forex and LCs use **UPPERCASE** on-chain and in PostgreSQL
(`REGISTERED`, `APPROVED`, `REQUESTED`, …). The two casings are never mixed for the same entity, but audit-log
`oldValue`/`newValue` strings for applications use uppercase (`PENDING`/`APPROVED`) while the DB row is lowercase.

**Transition count:** 34 API-level transitions + 5 chaincode-only transitions + 1 dead-code transition = **40 rows** below.
Distinct status values documented: **35** (application 3, contract 7, forex 9, LC 12, consignment 4 — see §7).

---

## 1. Licensing pre-step — exporter application

Entity: `exporter_applications` (PostgreSQL only for status; chaincode touched only via `RegisterExporter` on approval
and via `auditService` / `recordAudit` for submit/reject). `StatusTransitions.APPLICATION` in
`api/src/utils/statusManager.ts:15-19`: `PENDING: [APPROVED, REJECTED]`, `APPROVED: []`, `REJECTED: [PENDING]`.

| # | Transition | Who | Endpoint | Body (validator chain, exact) | Chaincode / side effect |
|---|---|---|---|---|---|
| A1 | — → `pending` (create) | Public (no auth) | `POST /api/v1/exporters/exporter-applications` — `api/src/routes/exporters.ts:101` | Required: `companyName` `.notEmpty()`, `tinNumber` `.notEmpty()`, `businessLicenseNumber` `.notEmpty()`, `capitalRequirement` `.notEmpty()`, `professionalTaster` `.notEmpty()`, `contactPerson` `.notEmpty()`, `email` `.isEmail()`, `phone` `.notEmpty()`, `address` `.notEmpty()`, `city` `.notEmpty()`. Optional: `tasterCertificate` `.optional({values:'falsy'}).isString()`, `region` `.optional().isString()`, `bankName` `.optional().isString()`, `bankAccountNumber` `.optional({values:'falsy'}).isString().matches(/^\d{1,13}$/)`, `bankBranchName` `.optional().isString()`, `bankBranchCode` `.optional().isString()`, `comments` `.optional().isString()`, `documents` `.optional().isArray()`, `exporterType` `.optional().isIn(['private','company','individual'])`, `laboratoryFacility` `.optional().isString()`, `laboratoryCertificateNumber` `.optional().isString()`, `registrationDate` `.optional().isISO8601()`. | No chaincode write on the request path. `auditService.log` (async, non-blocking) records `SUBMIT` / `PENDING` (`exporters.ts:207-230`). Insert sets `status='pending'` (`exporters.ts:177`). Duplicate guard: 400 if a `pending` application already exists for the email (`exporters.ts:170-180`). Generates temp credentials via `applicantCredentialsService`. |
| A2 | `pending` → `approved` | `ECTA` / `ECTA_ADMIN` (`requireRole('ECTA','ECTA_ADMIN')`, `exporters.ts:306-313`) | `POST /api/v1/exporters/exporter-applications/:applicationId/approve` — `exporters.ts:306` | `param('applicationId').notEmpty()`; body required: `exporterId` `.notEmpty()`, `ectaLicenseNumber` `.matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/)`, `licenseExpiryDate` `.isISO8601()`; optional: `bankName`, `bankAccountNumber`, `bankBranch`, `bankBranchCode` (all bare `.optional()`, no type check). | `fabricService.registerExporter(...)` → `invokeChaincode('RegisterExporter', [exporterId, companyName, ectaLicenseNumber, exporterType, capitalRequirement, professionalTaster, tasterCertificate, laboratoryCertificateNumber, licenseExpiryDate])` (`api/src/services/fabricService.ts:1075-1090`). Chaincode `RegisterExporter` sets exporter `LicenseStatus: "ACTIVE"` (`chaincodes/coffee/main.go:251`). PG update sets `status='approved'` + licence fields (`exporters.ts:437-456`). Temp account converted to full account (`convertToFullAccount`). Guard: 404 unless current status is exactly `pending` (`exporters.ts:336`) — re-approval is blocked. |
| A2b | `pending` → `approved` (alias) | `ECTA` / `ECTA_ADMIN` | `POST /api/v1/exporters/applications/:applicationId/approve` — `exporters.ts:546` | No validators. | Does **not** run approval logic: returns HTTP 307 redirect to `/exporter-applications/...` (`exporters.ts:556`). |
| A3 | `pending` → `rejected` | `ECTA` / `ECTA_ADMIN` (`exporters.ts:559-562`) | `POST /api/v1/exporters/exporter-applications/:applicationId/reject` — `exporters.ts:559` | `param('applicationId').notEmpty()`; `body('reason').notEmpty()` (required). | `auditService.recordAudit` (`REJECT`) on-chain first, then PG `status='rejected'`, `rejection_reason`, `blockchain_tx_id` (`exporters.ts:589-611`); linked `users` row set `status='rejected'` where `status='inactive'` (`exporters.ts:601-604`); new temp password generated. Guard: 404 unless status is `pending` (`exporters.ts:581`). |
| A4 | `rejected` → `pending` (resubmit) | Applicant owning the application (`role==='APPLICANT'` and `user.applicationId === :applicationId`) **or** `ECTA`/`ECTA_ADMIN`/`ADMIN` (inline check, `exporters.ts:706-725`) | `POST /api/v1/exporters/exporter-applications/:applicationId/resubmit` — `exporters.ts:701` | `param('applicationId').notEmpty()`; `body('email').isEmail()` (**required** — must match the stored email, `exporters.ts:759-768`); all other fields optional-with-validation when present: `companyName`/`tinNumber`/`businessLicenseNumber` `.optional().notEmpty()`, `registrationDate` `.optional().isISO8601()`, `exporterType` `.optional().isIn(['private','company','individual'])`, `capitalRequirement` `.optional().isNumeric()`, `professionalTaster` `.optional().isBoolean()`, `tasterCertificate`/`laboratoryFacility`/`laboratoryCertificateNumber`/`contactPerson`/`phone`/`address`/`city`/`region`/`bankName`/`bankAccountNumber`/`bankBranchName`/`bankBranchCode`/`comments` `.optional().isString()`, `documents` `.optional().isArray()`, `documents.*` `.optional().isString()`. | No chaincode call. PG update sets `status='pending'`, clears `rejected_at`/`rejection_reason`, refreshes `submitted_at` (`exporters.ts:864-877`); linked `users` row `rejected` → `inactive` (`exporters.ts:883-886`). **Inconsistency:** the lookup is `WHERE id = $1 AND status = 'rejected'` (`exporters.ts:751`) — numeric PK — while approve/reject look up by `application_id` (`APP-…`). Calling resubmit with the `APP-…` id 404s. |
| A5 | read-only status check | Public (no auth) | `GET /api/v1/exporters/exporter-applications/check/:email` — `exporters.ts:664` | No validators. | No transition. Returns only `id, application_id, company_name, email, status, submitted_at, rejection_reason, approved_at, license_number, exporter_id` (`exporters.ts:673-679`). |
| A6 | read-only list / read | Any authenticated user (`authMiddleware` only) | `GET /api/v1/exporters/exporter-applications` (`exporters.ts:26`), `GET /api/v1/exporters/applications/:applicationId` (`exporters.ts:59`) | Optional query `?status=` filter on list; `param('applicationId').notEmpty()` on read. | No transition. |

**Dependencies (A):** A2/A3/A4 require the `applicationId` (`APP-<ts>-<rand>`) produced by A1; A2 additionally requires
caller-supplied `exporterId` and `ectaLicenseNumber` (not derived from the application). A2's chaincode call requires the
exporter not already exist on-chain (an "already exists" error is tolerated and approval proceeds, `exporters.ts:362-366`).

---

## 2. Contract

Entity: `SalesContract` on-chain (`ContractStatus` field) + `contracts` table in PostgreSQL.
`StatusTransitions.CONTRACT` (`api/src/utils/statusManager.ts:27-34`):
`REGISTERED: [APPROVED, REJECTED]`, `APPROVED: [EXECUTED, CANCELLED]`, `REJECTED: []`,
`EXECUTED: [COMPLETED]`, `CANCELLED: []`, `COMPLETED: []`.
Chaincode: `RegisterSalesContract` (`chaincodes/coffee/main.go:331`, sets `ContractStatus: "REGISTERED"`, line 469)
and `RegisterSalesContractWithPaymentMethod` (`main.go:503`, sets `"REGISTERED"`, line 642).

| # | Transition | Who | Endpoint | Body (validator chain, exact) | Chaincode / side effect |
|---|---|---|---|---|---|
| C1 | — → `REGISTERED` (create; response reports lowercase `status: 'pending'`) | Any authenticated user, but non-admin/ECTA callers may only register for their own exporter (`exporterID` must equal `user.exporterId`/`exporter_id`/`username`; roles `ADMIN`/`ECTA`/`ECTA_ADMIN`/`SUPER_ADMIN` exempt — inline check, `contracts.ts:376-407`) | `POST /api/v1/contracts/` — `api/src/routes/contracts.ts:326` | Required: `contractID` `.notEmpty()`, `exporterID` `.notEmpty()`, `buyerID` `.notEmpty()`, `buyerCountry` `.notEmpty()`, `buyerBank` `.notEmpty()`, `exporterBank` `.notEmpty()`, `coffeeType` `.notEmpty()`, `quantity` `.isNumeric()`, `pricePerKg` `.isNumeric().custom(v => parseFloat(v) >= 5.0)` (min 5.0 USD/kg), `currency` `.notEmpty()`, `eudrRequired` `.isBoolean()`. Optional: `paymentMethod` `.optional().isIn(['LC','CAD','TT_ADVANCE','TT_POST','ADVANCE'])` (default `LC`), `supersedesContractID` `.optional().isString()`, `documents` `.optional().isArray()`. Note: `buyerName` is read from body (`contracts.ts:476`) but has **no** validator. | `contractService.registerContract` → `invokeChaincode('RegisterSalesContractWithPaymentMethod', [contractID, exporterID, buyerID, buyerName, buyerCountry, coffeeType, quantity, pricePerKg, currency, eudrRequired, buyerBank, exporterBank, paymentMethod, documentsCSV])` (`api/src/services/contractService.ts:32-95`; paymentMethod is arg 13). PG insert sets `status='REGISTERED'` (`contractService.ts:104-124`). If chaincode fails the contract is still saved and the API returns 202 with `blockchainSynced: false` (`contracts.ts:547-560`). **Correction flow:** if `supersedesContractID` is given it must be a `REJECTED` contract of the same exporter (`contracts.ts:409-430`); a *new* contract ID is registered, linked via `supersedes_contract_id` — the rejected contract itself is never re-registered. |
| C2 | `REGISTERED` → `APPROVED` | ECTA only — inline check `userOrg === 'ECTAMSP' \|\| userRole === 'ECTA'` (`contracts.ts:1341`); note `ECTA_ADMIN` passes only via org `ECTAMSP` | `POST /api/v1/contracts/:contractID/approve` — `contracts.ts:1311` | `param('contractID').notEmpty()` only; no body fields. | Two-step: (1) `contractService.approveContract` → `invokeChaincode('ApproveSalesContract', [contractID, approvedBy, reason])` (`contractService.ts:174-180`); chaincode `ApproveSalesContract` (`main.go:707`) requires MSP `ECTAMSP`/`AdminMSP` and sets `ContractStatus = "APPROVED"` (**no from-state guard** — it approves from any status). (2) `statusManager.validateTransition('CONTRACT', currentStatus, 'APPROVED')` is checked **before** the service call (`contracts.ts:1385-1396`) — but `validateTransition` returns `true` for unknown current statuses (fail-open, `statusManager.ts:219-232`). PG set to `APPROVED` (`contractService.ts:186-190`). **LC handoff (same request, `contracts.ts:1421-1505`):** if `paymentMethod === 'LC'` (default), creates LC `LC-<contractID>` via `fabricService.requestLC(...)` → `invokeChaincode('RequestLC', [lcId, contractId, exporterId, bankName, amount, currency, expiryDate])` (`fabricService.ts:1175-1199`), amount = `totalValue` or `quantity × pricePerKg`, expiry = today + 90 days, issuing bank = contract `buyerBank`, advising bank = contract `exporterBank`; idempotent via `QueryAllLCs` pre-check; PG mirror row inserted with `status='REQUESTED'`. **Double-creation hazard:** `contractService.approveContract` *also* runs `triggerLCAutoCreation` (`contractService.ts:210, 284-315`) which calls `lcService.requestLC` with a *different* LC id (`LC-<Date.now()>`, bank hard-coded `Commercial Bank of Ethiopia`). The route's handoff then finds that LC via `QueryAllLCs` and reports `already_exists` — so the effective LC id is the timestamp one, not `LC-<contractID>`. Documents check: `CONTRACT_SIGNED` + `PROFORMA_INVOICE` are required only when `NODE_ENV === 'production'` (`contracts.ts:1357-1380`). |
| C3 | `REGISTERED` → `APPROVED` (duplicate path) | ECTA / `ECTA_ADMIN` (inline: `userOrg !== 'ECTAMSP' && userRole !== 'ECTA' && userRole !== 'ECTA_ADMIN'` → 403, `contracts.ts:1247`) | `POST /api/v1/contracts/approve` (contractId **in body**) — `contracts.ts:1232` | No express-validator chain; manual check `if (!contractId)` → 400 (`contracts.ts:1241`). | `fabricService.approveSalesContract(contractId)` → `invokeChaincode('ApproveSalesContract', [contractId])` (`fabricService.ts:1170-1172`) after `connectAsOrg('ECTAMSP')`. **No** `statusManager` validation, **no** LC handoff, **no** audit row. Because chaincode `ApproveSalesContract` has no from-state guard, this endpoint can approve an already-`APPROVED` (or `REJECTED`) contract. |
| C4 | `REGISTERED` → `REJECTED` | ECTA only (same inline org/role check as C2, `contracts.ts:1742`) | `POST /api/v1/contracts/:contractID/reject` — `contracts.ts:1707` | `param('contractID').notEmpty()`; `body('reason').notEmpty()` (required); `body('rejectedBy').optional().isString()`. Additionally the `reason` must match `/^Field to correct:\s*([^\n]+)\nRequired change:\s*([\s\S]+)$/i` with the change ≥ 20 chars, else 400 `ACTIONABLE_REJECTION_FEEDBACK_REQUIRED` (`contracts.ts:1755-1768`). | `statusManager.validateTransition('CONTRACT', currentStatus, 'REJECTED')` first (`contracts.ts:1780-1791`); then `contractService.rejectContract` → `invokeChaincode('RejectSalesContract', [contractID, rejectedBy, reason])` (`contractService.ts:239-244`); chaincode `RejectSalesContract` (`main.go:801`) requires MSP `ECTAMSP`/`AdminMSP` and **requires** `ContractStatus == "REGISTERED"` (line 829), sets `"REJECTED"` (line 840). PG set to `REJECTED` + reason. |
| C5 | `REJECTED` → `REGISTERED` (chaincode only) | Chaincode: owner exporter (`ExporterMSP` / `ExporterID == resubmitterID`) or `AdminMSP`/`ECTAMSP` (`main.go:896-945`) | **No API route calls it.** `grep ResubmitRejectedContract api/src/` → no hits. | — | `invokeChaincode('ResubmitRejectedContract', …)` — exists in chaincode only. The API-level correction path is C1 with `supersedesContractID` (new contract ID), not this function. **Dead end at API level.** |
| C6 | (any) → `CANCELLED` | Any authenticated user (no role check; `contracts.ts:1924`) | `POST /api/v1/contracts/:contractId/cancel` — `contracts.ts:1924` | No validators; body `cancellationReason` read but not validated. | **Dead code:** the handler sits *after* `export default router;` (`contracts.ts:1917` vs `:1924`) so it is never registered. Even if reached it is PostgreSQL-only (`UPDATE contracts SET status='CANCELLED'`, no chaincode call, no status guard, no existence check). |
| C7 | — (update, no status change) | Owner exporter or `ADMIN`/`ECTA`/`ECTA_ADMIN`/`SUPER_ADMIN` (inline, `contracts.ts:122-141`) | `PATCH /api/v1/contracts/:contractId` — `contracts.ts:68` | `param('contractId').notEmpty()`; all body fields optional: `buyerID`/`buyerName`/`buyerCountry`/`buyerBank`/`exporterBank`/`coffeeType`/`currency` `.optional().notEmpty()`, `quantity` `.optional().isNumeric()`, `pricePerKg` `.optional().isNumeric().custom(>= 5.0)`, `paymentMethod` `.optional().isIn(['LC','CAD','TT_ADVANCE','TT_POST','ADVANCE'])`, `eudrRequired`/`organicCertified`/`fairTradeCertified` `.optional().isBoolean()`, `portOfLoading`/`portOfDestination`/`deliveryDate`/`incoterm`/`specialInstructions` `.optional().isString()`, `documents` `.optional().isArray()`. | PostgreSQL only; **no chaincode call, no status change, no from-state guard** — an `APPROVED` contract's amount/price can be edited in PG while the ledger keeps the old values. |
| C8 | — (deprecated stub) | Any authenticated user | `POST /api/v1/contracts/:contractID/nbe-approve` — `contracts.ts:1879` | `param('contractID').notEmpty()`; `body('approvedBy').notEmpty()`; `body('approvalType').optional().isString()`. | Always returns 400 `ENDPOINT_DEPRECATED` (`contracts.ts:1898-1905`). Comment: "NBE should use forex allocation endpoints instead" (`contracts.ts:1871-1874`). |
| C9 | read-only | Mount-level `authMiddleware` only | `GET /api/v1/contracts/` (`contracts.ts:623`), `GET /api/v1/contracts/:contractID` (`contracts.ts:1114`), `GET /api/v1/contracts/:contractID/documents` (`contracts.ts:966`) | Query filters `exporterID`, `status`, `eudrRequired`, `limit`, `offset` on list. | No transition. |

**Dependencies (C):** C2/C3/C4 require a `REGISTERED` contract created by C1. C2's LC handoff derives `lcId`, `amount`, `currency`, `exporterId`, `buyerCountry`, `issuingBank` (`buyerBank`), `advisingBank` (`exporterBank`) from the contract — no LC fields are supplied by the caller.
`statusManager.updateEntityStatus('CONTRACT', …)` is called by C2/C4 (`contracts.ts:1413, 1794`) but is a **no-op**: it logs "PostgreSQL only" and returns success without touching chaincode or running cascades (`api/src/utils/statusManager.ts:290-298`); `cascadeStatusUpdates` is never invoked from it, so the `RelatedStatusUpdates` entries (`CONTRACT_APPROVED` → forex `ELIGIBLE`, `LC_ISSUED` → contract `LC_ISSUED`, `PAYMENT_SETTLED` → LC/FOREX/CONTRACT `SETTLED`) are dead config (`statusManager.ts:155-213`).

---

## 3. Forex

Entity: `ForexAllocation` on-chain (`Status` field) + `forex_allocations` table.
`StatusTransitions.FOREX` (`statusManager.ts:37-44`):
`REQUESTED: [ALLOCATED, REJECTED]`, `ALLOCATED: [UTILIZED, EXPIRED]`, `REJECTED: []`,
`UTILIZED: [SETTLED]`, `EXPIRED: []`, `SETTLED: []`.
Note the map omits `CONFIRMED` and `APPROVED` although both are real statuses (see F2, F6 below) — `validateTransition` fail-open means this is not enforced anywhere in the slice.

| # | Transition | Who | Endpoint | Body (validator chain, exact) | Chaincode / side effect |
|---|---|---|---|---|---|
| F1 | — → `REQUESTED` | `BANKS` / `BANK_ADMIN` / `BANK OFFICER` / `FOREX OFFICER` (`requireRole`, `forex.ts:541`) | `POST /api/v1/forex/request` — `api/src/routes/forex.ts:541` | **No express-validator chain.** Manual check: `forexId` and `contractId` required, else 400 `MISSING_FIELDS` (`forex.ts:544-547`). Body fields read: `forexId`, `contractId`, `exporterId`, `amount`, `currency` — all effectively optional at the validator level; missing `exporterId`/`amount`/`currency` are auto-mapped from the contract (`ReadSalesContract` query; amount = `quantity × pricePerKg`, `forex.ts:550-577`). | `invokeChaincode('RequestForex', [forexId, contractId, finalExporterId, finalAmount, finalCurrency])` as `BanksMSP` (`forex.ts:595-600`), with up to 5 retries (`forex.ts:588-677`). Chaincode `RequestForex` (`chaincodes/coffee/forex.go:96`) requires caller MSP `ECTAMSP` or bank, contract must exist **and** `ContractStatus == "APPROVED"` (`forex.go:140`), sets `Status: "REQUESTED"` (line ~180). **No `lcId` parameter** — the LC is linked only later, at allocation. PG mirror insert with `status='REQUESTED'` (`forex.ts:648-665`). 5 s sleep after success "to prevent AllocateForex failing" (`forex.ts:634`). |
| F1b | — → `REQUESTED` (wrapper) | Same roles (`forex.ts:23`) | `POST /api/v1/forex/` — `forex.ts:23` | **No express-validator chain.** Manual check requires `forexID` (or `forexId`), `contractID`, `exporterID`, `amount` (`forex.ts:31-40`) — stricter than F1 despite doing the same thing. | Delegates to `forexService.requestForex` → `invokeChaincode('RequestForex', [forexId, contractId, exporterId, amount, currency])` (`api/src/services/forexService.ts:32-52`); PG insert `status='REQUESTED'` (`forexService.ts:55-72`). Accepts both `forexID`/`forexId`, `contractID`/`contractId`, `lcNumber` naming variants. |
| F2 | `REQUESTED` → `CONFIRMED` | `NBE` / `NBE_ADMIN` / `NBE OFFICER` (`forex.ts:711`) | `POST /api/v1/forex/:forexId/confirm` — `forex.ts:711` | No validators. Body: `confirmedBy` (optional; defaults to `'NBE Officer'`). | `invokeChaincode('ConfirmForex', [forexId, confirmedBy, <ISO date>])` as `NBEMSP` (`forex.ts:728-735`). Chaincode `ConfirmForex` (`forex.go:226`) requires caller MSP `NBEMSP`, requires `forex.Status == "REQUESTED"` (`forex.go:262`), sets `Status = "CONFIRMED"` (`forex.go:279`). Note: the 3rd chaincode arg is `comments`, but the route passes the current timestamp. PG `status='CONFIRMED'` (`forex.ts:743-752`). |
| F3 | `REQUESTED`/`CONFIRMED`/`APPROVED` → `ALLOCATED` (forex) **and** LC `ISSUED`/`FOREX_REQUESTED` → `FOREX_ALLOCATED` | `BANKS` / `BANK_ADMIN` / `BANK OFFICER` / `FOREX OFFICER` / `NBE` / `NBE_ADMIN` / `NBE OFFICER` (`forex.ts:784`) | `POST /api/v1/forex/allocate` — `forex.ts:784` | No validators. Manual check: `forexId` and `lcId` required (`forex.ts:789-796`). Optional body: `amount`, `exchangeRate`, `retentionRate` (default `0.4` = 40 %), `officer`, `approvalRef`, `expiryDate`. | **Does NOT call chaincode `AllocateForex`.** `forexService.allocateForex` (`forexService.ts:100-…`) writes **directly to CouchDB** (`nano`, db `coffeechannel_coffee`): sets LC doc `Status='FOREX_ALLOCATED'` and inserts/overwrites a `FOREX_<id>` doc with `Status: 'ALLOCATED'`, retention 40 % split (`forexService.ts:160-200`); then PG updates (`forex_allocations` → `ALLOCATED`, `letters_of_credit` → `FOREX_ALLOCATED` where status in `APPROVED/ISSUED/REQUESTED`, `forexService.ts:133-155`). Chaincode `AllocateForex` (`forex.go:335`) exists and would enforce: forex in `REQUESTED`/`APPROVED`/`CONFIRMED` (`forex.go:432`), LC in `ISSUED`/`FOREX_REQUESTED` (`forex.go:450`), LC↔forex contract/exporter/currency match, amount ≤ requested and ≤ LC amount, exchange rate == active NBE mid-rate (`forex.go:464-476`), then sets forex `ALLOCATED` + LC `FOREX_ALLOCATED` atomically (`forex.go:480, 517`) — **but no API code in this slice ever invokes it** (`grep AllocateForex api/src/` finds only a comment in `contracts.ts:1874` and one in `forex.ts:618`). Consequence: the on-chain forex record keeps its pre-allocation status while CouchDB/PG say `ALLOCATED`. |
| F3b | `ISSUED` → `FOREX_ALLOCATED` (LC) + forex `ALLOCATED` (duplicate path) | `NBE` / `NBE_ADMIN` / `BANKS` / `BANK_ADMIN` / `ADMIN` (`banking.ts:1062`) | `POST /api/v1/banking/lc/:lcID/allocate-forex` — `api/src/routes/banking.ts:1059` | `param('lcID').notEmpty()`; `body('exchangeRate').isNumeric()`, `body('allocatedAmount').isNumeric()` (both required); `remarks` read but unvalidated. | Also **no chaincode call**: reads the LC (chaincode `ReadLC`, 3 retries, then CouchDB fallback), then writes **directly to CouchDB** — LC doc `Status='FOREX_ALLOCATED'` and a new forex doc `FOREX_<lcID>_<ts>` with `Status: 'ALLOCATED'`, `RetentionRate: 40` (`banking.ts:1159-1243`); PG `letters_of_credit` → `FOREX_ALLOCATED` (`banking.ts:1230-1240`). Differs from F3: the forex id is generated (`FOREX_<lcID>_<Date.now()>`) instead of supplied, and `exchangeRate`/`allocatedAmount` come from the caller rather than the stored forex request. Two parallel allocate-forex paths exist. |
| F4 | `ALLOCATED` → `UTILIZED` | `BANKS` / `BANK_ADMIN` / `BANK OFFICER` / `FOREX OFFICER` / `NBE` / `NBE_ADMIN` / `NBE OFFICER` (`forex.ts:854`) | `POST /api/v1/forex/utilize` — `forex.ts:854` | No validators. Body: `forexId`, `utilizedAmount` (both required by code — `utilizedAmount.toString()` throws if absent, `forex.ts:860-862`). | `invokeChaincode('UtilizeForex', [forexId, utilizedAmount])` as `NBEMSP` or `BanksMSP` by caller role (`forex.ts:859-862`). Chaincode `UtilizeForex` (`forex.go:573`) requires `forex.Status == "ALLOCATED"` (`forex.go:605`), sets `Status = "UTILIZED"` (`forex.go:626`). |
| F5 | `REQUESTED` → `REJECTED` | `BANKS` / `BANK_ADMIN` (`banking.ts:657-663`) | `POST /api/v1/banking/forex/:forexID/reject` — `banking.ts:657` | `param('forexID').notEmpty()`; `body('rejectionReason').notEmpty()` (required). | `invokeChaincode('RejectForex', [forexID, rejectionReason, user.org])` (`banking.ts:686-690`). **BROKEN: no `RejectForex` function exists in the chaincode** (`grep -rn RejectForex chaincodes/` → no hits; the only reference in the whole repo is this call). Every call fails at endorsement. No PG fallback either. |
| F6 | (any) → `APPROVED` (PostgreSQL only) | `NBE` only (`requireRole('NBE')`, `nbe.ts:58`) | `POST /api/v1/nbe/forex/:forexId/approve` — `api/src/routes/nbe.ts:58` | No validators. Body: `approvalNotes` (optional, echoed in response, never stored). | **PostgreSQL only, no chaincode call, no from-state guard:** `UPDATE forex_allocations SET status='APPROVED', approved_by=<user id>, approval_date=NOW() WHERE allocation_id=$2 OR CAST(id AS TEXT)=$2` (`nbe.ts:73-82`). Can "approve" an already-`ALLOCATED`/`UTILIZED`/`REJECTED` row; the on-chain record is untouched, so ledger and PG diverge (chaincode `AllocateForex` would accept `APPROVED`, but see F3 — it is never invoked). |
| F7 | (any) → `REPATRIATED` (PG) / repatriation `COMPLETED` | `NBE` only (`requireRole('NBE')`, `nbe.ts:114`) | `POST /api/v1/nbe/forex/:forexId/repatriation` — `nbe.ts:114` | No validators. Body: `repatriationAmount`, `repatriationDate`, `bankReference`, `repatriationMethod` (all unvalidated; `repatriationDate` defaults to today, method defaults to `'Wire Transfer'`). | No chaincode call. Primary path inserts into `forex_repatriations` with `status='COMPLETED'` (`nbe.ts:132-140`); if that table does not exist, fallback `UPDATE forex_allocations SET status='REPATRIATED', …` (`nbe.ts:146-160`). Response always reports `status: 'COMPLETED'` regardless of which path ran. No from-state guard — repatriation can be recorded against a `REQUESTED` forex. |
| F8 | `ALLOCATED`/`UTILIZED` → `RetentionStatus` `PENDING`/`COMPLIED`/`NON_COMPLIANT` (chaincode only) | — | No route in this slice. Called from `api/src/routes/retention.ts:213` (out of slice). | — | `invokeChaincode('RecordForexRetention', …)`; chaincode `RecordForexRetention` (`forex.go:655`) requires forex `ALLOCATED` or `UTILIZED` (`forex.go:693`) and sets `RetentionStatus` to `PENDING`, then `COMPLIED` or `NON_COMPLIANT` (`forex.go:708-713`). This is a sub-status, not the forex `Status`. |
| F9 | (payment `SETTLED`) → forex `UTILIZED` (chaincode only) | — | No route in this slice. | — | Chaincode `VerifyForexUtilization` (`forex.go:1393`) requires `payment.Status == "SETTLED"` (`forex.go:1442`) then sets `forex.Status = "UTILIZED"` (`forex.go:1461`). No API caller in the slice. |
| F10 | read-only | Mount-level `authMiddleware` (+ `requireRole` on some) | `GET /api/v1/forex/` and `/allocations` (`forex.ts:120`), `GET /api/v1/forex/rates[/:currency[/current]]` (`forex.ts:207/222/236`), `GET /api/v1/forex/retention-policy/:commodityType` (`forex.ts:250`), `GET /api/v1/forex/exporter/:exporterId` (`forex.ts:398`), `GET /api/v1/forex/lc-monitoring` (`forex.ts:413`, `requireRole` NBE roles, **no** per-route `authMiddleware` — relies on mount), `GET /api/v1/forex/:forexId` (`forex.ts:450`); `GET /api/v1/nbe/forex` (`nbe.ts:16`), `GET /api/v1/nbe/lc-monitoring` (`nbe.ts:193`, reads table `letter_of_credits` — likely wrong name; the real table is `letters_of_credit`). | — | No transition. |
| F11 | — (config, no forex status change) | `NBE` / `NBE_ADMIN` / `NBE OFFICER` | `POST /api/v1/forex/retention-policy` (`forex.ts:264`) → `invokeChaincode('SetRetentionPolicy', [policyID, commodityType, retentionRate, setBy, justification], 'NBEMSP')`; `POST /api/v1/forex/exchange-rate` (`forex.ts:330`) and `POST /api/v1/forex/rates` (`forex.ts:485`) → `invokeChaincode('SetExchangeRate', …)`. All manual required-field checks, no express-validator chains. | Chaincode supersedes the previous rate/policy: old rate `Status = "SUPERSEDED"` (`forex.go:1000`), old policy `Status = "INACTIVE"` (`forex.go:1233`). These statuses are prerequisites for F3's chaincode path (active NBE rate) but F3 never calls the chaincode. |

**Dependencies (F):** F1/F1b require an `APPROVED` contract (chaincode-enforced, `forex.go:140`) and a caller-supplied `forexId`;
`exporterId`/`amount`/`currency` may be auto-derived from the contract. F2 requires a `REQUESTED` forex (chaincode-enforced).
F3/F3b require a forex id + LC id; chaincode `AllocateForex` (unused) would additionally require the LC to exist in
`ISSUED`/`FOREX_REQUESTED` with matching contract/exporter/currency and an active NBE exchange rate equal to the submitted rate.
F4 requires an `ALLOCATED` forex. F6/F7 are PG-only and require nothing on-chain.

---

## 4. Letter of Credit

Entity: `LetterOfCredit` on-chain (`Status` field; also `NegotiationStatus`) + `letters_of_credit` table.
`StatusTransitions.LC` (`statusManager.ts:48-61`):
`REQUESTED: [APPROVED, REJECTED]`, `APPROVED: [ISSUED, EXPIRED]`, `ISSUED: [FOREX_ALLOCATED, UTILIZED, AMENDED, EXPIRED]`,
`FOREX_ALLOCATED: [UTILIZED, EXPIRED]`, `AMENDED: [ISSUED, FOREX_ALLOCATED, UTILIZED, EXPIRED]`,
`UTILIZED: [PAYMENT_RELEASED]`, `PAYMENT_RELEASED: [SETTLED]`, `SETTLED: []`, `REJECTED: []`, `EXPIRED: []`.
Chaincode guards are stricter/different in places — see per-row notes. `NegotiationStatus` values:
`NOT_STARTED`, `UNDER_NEGOTIATION`, `ACCEPTED`, `REJECTED`.

| # | Transition | Who | Endpoint | Body (validator chain, exact) | Chaincode / side effect |
|---|---|---|---|---|---|
| L1 | — → `REQUESTED` | `EXPORTER` / `ECTA` / `ECTA_ADMIN` / `ADMIN` (`banking.ts:87`); exporters may only request for their own `exporterID` (inline check, `banking.ts:108-116`) | `POST /api/v1/banking/lc/request` — `banking.ts:85` | Required: `lcID` `.notEmpty()`, `contractID` `.notEmpty()`, `exporterID` `.notEmpty()`, `bankName` `.notEmpty()`, `amount` `.notEmpty()`, `currency` `.notEmpty()`, `expiryDate` `.notEmpty()`. | `fabricService.requestLC(...)` → `invokeChaincode('RequestLC', [lcID, contractID, exporterID, bankName, amount, currency, expiryDate])` as `ECTAMSP` (`banking.ts:178-189`). Chaincode `RequestLC` (`chaincodes/coffee/banking.go:104`) requires caller MSP `ECTAMSP` only, contract exists **and** `ContractStatus == "APPROVED"` (`banking.go:169`), exporterID matches the contract's exporter, amount ≤ contract `TotalValue`, currency == contract currency, issuing bank (`BuyerBank`) ≠ advising bank (`ExporterBank`), exporter `LicenseStatus == "ACTIVE"` (`banking.go:234`); sets `Status: "REQUESTED"` (`banking.go:267`). Duplicate guard: 409 if any LC already exists for the contract (`banking.ts:143-166`). PG mirror `status='REQUESTED'` (`banking.ts:207-228`). Also reachable via `lcService.requestLC` (same chaincode call; PG pre-check `contract.status === 'APPROVED'`, `api/src/services/lcService.ts:61-99`). |
| L1b | — → `REQUESTED` (automatic, on contract approval) | System (triggered by C2) | No direct endpoint — see C2 (`contracts.ts:1421-1505`) and `contractService.triggerLCAutoCreation` (`contractService.ts:284-315`). | Fields derived from the contract (see C2). | `RequestLC` via `fabricService.requestLC` (route handoff, id `LC-<contractID>`) **or** `lcService.requestLC` (service trigger, id `LC-<Date.now()>`). The service trigger runs first and wins; the route handoff then reports `already_exists`. Net effect: one LC per approved LC-payment contract, but with an unpredictable timestamp id. |
| L2 | `REQUESTED` → `APPROVED` | `BANKS` / `BANK_ADMIN` (`banking.ts:291`) | `POST /api/v1/banking/lc/:lcID/approve` — `banking.ts:289` | `param('lcID').notEmpty()` only. Body `beneficiary` read but unvalidated (defaults to `'Exporter'`). | `fabricService.approveLC(...)` → `invokeChaincode('ApproveLC', [lcID, issuingBank, advisingBank, beneficiary])` as `BanksMSP` (`banking.ts:330-339`; `fabricService.ts:1203-1210`). Issuing/advising bank are taken from `user.org` (both set to the same org, `banking.ts:305-307`) — chaincode `RequestLC`'s issuing≠advising rule is **not** re-checked here. Chaincode `ApproveLC` (`banking.go:317`) requires `lc.Status == "REQUESTED"` (`banking.go:353`), sets `Status = "APPROVED"` (`banking.go:384`). PG `status='APPROVED'` (`banking.ts:517-527`). |
| L3 | `REQUESTED` → `REJECTED` | `BANKS` / `BANK_ADMIN` (`banking.ts:574`) | `POST /api/v1/banking/lc/:lcID/reject` — `banking.ts:572` | `param('lcID').notEmpty()`; `body('rejectionReason').isString().trim().isLength({min:10, max:500})` (required). | `invokeChaincode('RejectLC', [lcID, rejectionReason])` as `BanksMSP` (`banking.ts:600-602`). Chaincode `RejectLC` (`banking.go:437`) requires `lc.Status == "REQUESTED"` (`banking.go:470`), sets `Status = "REJECTED"` (`banking.go:480`). PG `status='REJECTED'` + reason/by/date (`banking.ts:607-617`). |
| L4 | `APPROVED` → `ISSUED` | `BANKS` / `BANK_ADMIN` (`banking.ts:895`) | `POST /api/v1/banking/lc/:lcID/issue` — `banking.ts:893` | `param('lcID').notEmpty()`; `body('terms').notEmpty()` (required). Optional body (unvalidated): `contractID`, `exporterID`, `amount`, `currency` — used only for the forex auto-request. | `fabricService.issueLC(lcID, terms)` → `invokeChaincode('IssueLC', [lcID, terms])` as `BanksMSP` (`banking.ts:914`; `fabricService.ts:1212-1214`). Chaincode `IssueLC` (`banking.go:514`) requires `lc.Status == "APPROVED"` (`banking.go:547`), sets `Status = "ISSUED"` (`banking.go:558`). **Forex auto-request:** on success, calls `invokeChaincode('RequestForex', [FOREX_<lcID>_REQUEST, contractId, exporterId, amount, currency])` (`banking.ts:956-968`) and PG-inserts the forex row with `status='REQUESTED'` (`banking.ts:976-1002`). If LC data is missing from the body it is read back from chaincode (`ReadLC`); if still missing, the forex request is skipped with a warning (`banking.ts:934-951`). PG `letters_of_credit` → `ISSUED` + terms (`banking.ts:1017-1028`). |
| L5 | — → `ISSUED` (create-and-issue in one step; bypasses `REQUESTED`/`APPROVED`) | `BANKS` / `BANK_ADMIN` (`banking.ts:733`) | `POST /api/v1/banking/lc/issue` — `banking.ts:731` | **No express-validator chain.** Manual checks: `lcId`/`lcID` required; `amount` required and numeric (`banking.ts:759-783`). All other fields optional with defaults: `lcNumber` (= lcId), `contractId`/`contractID`, `exporterId`/`exporterID`, `issuingBank`, `advisingBank`, `beneficiary` (= exporterId), `applicant` (default `'Buyer'`), `currency` (default `'USD'`), `expiryDate`, `latestShipmentDate` (= expiryDate), `portOfLoading`, `portOfDischarge`, `paymentTerms` (default `'Sight LC'`), `partialShipment`/`transhipment` (default `false`), `bankName`, `shippingTerms` (read, unused). | `lcService.issueLC(...)` → `invokeChaincode('CreateAndIssueLC', [lcID, contractID, exporterID, issuingBank, advisingBank, beneficiary, applicant, amount, currency, expiryDate, latestShipmentDate, portOfLoading, portOfDischarge, paymentTerms, partialShipment, transhipment])` (`api/src/services/lcService.ts:213-234`). Chaincode `CreateAndIssueLC` (`banking.go:602`) creates the LC directly with `Status: "ISSUED"` and `NegotiationStatus: "NOT_STARTED"` (`banking.go:700-…`). **Forex auto-request:** `lcService.issueLC` returns `forexAutoCreated`/`forexID`; the route records a `RequestForex` signature when set (`banking.ts:797-850`). Response reports `status: 'ISSUED'`. No contract-`APPROVED` check is visible on this path (unlike L1). |
| L6 | `ISSUED` → `FOREX_ALLOCATED` | `NBE` / `NBE_ADMIN` / `BANKS` / `BANK_ADMIN` / `ADMIN` (`banking.ts:1062`) | `POST /api/v1/banking/lc/:lcID/allocate-forex` — see **F3b** (`banking.ts:1059`). | `param('lcID').notEmpty()`; `body('exchangeRate').isNumeric()`, `body('allocatedAmount').isNumeric()` (required). | CouchDB direct write, no chaincode call (see F3b). Chaincode `AllocateForex` would also set LC `FOREX_ALLOCATED` (`forex.go:517`) but is never invoked. |
| L7 | `ISSUED` → `ISSUED` (amended; **LC status does not change**) | `BANKS` / `BANK_ADMIN` (`banking.ts:1254`) | `POST /api/v1/banking/lc/:lcID/amend` — `banking.ts:1252` | `param('lcID').notEmpty()`; `body('amendmentReason').notEmpty()` (required). Optional, unvalidated: `newAmount`, `newExpiryDate`, `newTerms`. | `invokeChaincode('AmendLC', [lcID, amendmentReason, newAmount, newExpiryDate, newTerms, amendedBy])` as `BanksMSP` (`banking.ts:1273-1281`). Chaincode `AmendLC` (`banking.go:837`) requires caller bank MSP and `lc.Status == "ISSUED"` (`banking.go:872`); it updates `lc.Amount`/`ExpiryDate`/`Terms` and appends an `LCAmendment` record whose own `Status` is `"ACCEPTED"` (`banking.go:896-…`) — **it never assigns `lc.Status`**. So `statusManager`'s `AMENDED` state (`ISSUED → AMENDED`, `AMENDED → ISSUED/…`) is **never produced** by any code in the slice, and `RejectLCDocuments`/`ReportLCDiscrepancy` accept `AMENDED` as a from-state that can never occur. |
| L8 | `ISSUED`/`FOREX_ALLOCATED` → `UTILIZED` (if `compliant=true`) or **no change** (if `compliant=false`) | Any authenticated user — **no `requireRole`** (`banking.ts:3179-3185`) | `POST /api/v1/banking/lc/:lcID/examine-documents` — `banking.ts:3179` | `param('lcID').notEmpty()`; `body('compliant').isBoolean()` (required). Optional, unvalidated: `discrepancies`, `examinationDate` (defaults to now). | `invokeChaincode('ExamineLCDocuments', [lcID, compliant, discrepancies, examinationDate, user.org])` (`banking.ts:3197-3203`). Chaincode `ExamineLCDocuments` (`banking.go:1193`) requires `lc.Status == "ISSUED"` or `"FOREX_ALLOCATED"` (`banking.go:1223`); if `compliant == "true"` sets `Status = "UTILIZED"` (`banking.go:1229`); otherwise **leaves the status unchanged** and only logs the discrepancy (`banking.go:1235-1241`). PG mirrors `UTILIZED` only when compliant (`banking.ts:3213-3226`). Note the route does not verify the caller is a bank. |
| L9 | `UTILIZED` → `PAYMENT_RELEASED` | Any authenticated user — **no `requireRole`** (`banking.ts:3264-3270`) | `POST /api/v1/banking/lc/:lcID/release-payment` — `banking.ts:3264` | `param('lcID').notEmpty()`; `body('amount').notEmpty()`, `body('currency').notEmpty()` (required). Optional: `paymentDate` (defaults to now). | `invokeChaincode('ReleaseLCPayment', [lcID, amount, currency, paymentDate, user.org])` (`banking.ts:3337-3343`). Chaincode `ReleaseLCPayment` (`banking.go:1266`) requires `lc.Status == "UTILIZED"` (`banking.go:1308`), sets `Status = "PAYMENT_RELEASED"` (`banking.go:1319`) and creates a payment record with `Status: "VERIFIED"`. Pre-check (best-effort, non-blocking): if the LC has a `ShipmentID`, requires shipping docs `BILL_OF_LADING`, `COMMERCIAL_INVOICE`, `PACKING_LIST` to exist **and** be `verified`, else 400 (`banking.ts:3286-3330`); the check is skipped silently on error. No PG status update for the LC on this route. |
| L10 | Discrepancy `OPEN` → `RESOLVED` | `BANKS` / `BANK_ADMIN` (`banking.ts:3466`) | `POST /api/v1/banking/lc/:lcId/discrepancy/:discrepancyId/resolve` — `banking.ts:3464` | `param('lcId').notEmpty()`, `param('discrepancyId').notEmpty()`; `body('resolution').isString().trim().isLength({min:1, max:500})` (required). | `fabricService.submitTransaction('ResolveLCDiscrepancy', lcId, discrepancyId, resolution)` as `BanksMSP` (`banking.ts:3478-3484`). Chaincode `ResolveLCDiscrepancy` (`banking.go:1701`) requires the discrepancy `Status == "OPEN"` (`banking.go:1747`), sets it `RESOLVED` (`banking.go:1750`); if no `OPEN` discrepancies remain sets `lc.NegotiationStatus = "ACCEPTED"` (`banking.go:1775`). LC `Status` itself is unchanged. PG `lc_discrepancies` → `RESOLVED`. |
| L11 | Discrepancy `OPEN` → `WAIVED` | `BANKS` / `BANK_ADMIN` (`banking.ts:3523`) | `POST /api/v1/banking/lc/:lcId/discrepancy/:discrepancyId/waive` — `banking.ts:3521` | `param('lcId').notEmpty()`, `param('discrepancyId').notEmpty()`; `body('waiverReason').isString().trim().isLength({min:1, max:500})` (required). | `submitTransaction('WaiveLCDiscrepancy', lcId, discrepancyId, waiverReason)` (`banking.ts:3535-3541`). Chaincode `WaiveLCDiscrepancy` (`banking.go:1807`) mirrors L10: discrepancy `OPEN` → `WAIVED` (`banking.go:1856`), `NegotiationStatus = "ACCEPTED"` when none remain open (`banking.go:1881`). LC `Status` unchanged. |
| L12 | (new discrepancy) `NegotiationStatus` `NOT_STARTED` → `UNDER_NEGOTIATION`; discrepancy created `OPEN` | `BANKS` / `BANK_ADMIN` (`banking.ts:3392`) | `POST /api/v1/banking/lc/:lcId/discrepancy/report` — `banking.ts:3390` | `param('lcId').notEmpty()`; `body('discrepancyId').isString().trim().notEmpty()`, `body('discrepancyType').isString().trim().notEmpty()`, `body('severity').isIn(['MINOR','MAJOR','CRITICAL'])`, `body('affectedDocument').isString().trim().notEmpty()`, `body('description').isString().trim().isLength({min:10, max:500})` (all required); optional `affectedClauses`, `recommendedAction`. | `submitTransaction('ReportLCDiscrepancy', lcId, discrepancyId, discrepancyType, severity, affectedDocument, description, affectedClauses, recommendedAction)` (`banking.ts:3403-3412`). Chaincode `ReportLCDiscrepancy` (`banking.go:1582`) requires LC in `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED`/`AMENDED` (`banking.go:1619`); creates discrepancy with `Status: "OPEN"` (`banking.go:1656`) and sets `lc.NegotiationStatus = "UNDER_NEGOTIATION"` (`banking.go:1664`). LC `Status` unchanged. PG `lc_discrepancies` insert with `status='OPEN'`. |
| L13 | `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED`/`AMENDED` → `EXPIRED` **and** `NegotiationStatus` → `REJECTED`, all `OPEN` discrepancies → `REJECTED` | `BANKS` / `BANK_ADMIN` (`banking.ts:3580`) | `POST /api/v1/banking/lc/:lcId/documents/reject` — `banking.ts:3578` | `param('lcId').notEmpty()`; `body('rejectionReason').isString().trim().isLength({min:10, max:500})` (required). | `submitTransaction('RejectLCDocuments', lcId, rejectionReason)` (`banking.ts:3589-3593`). Chaincode `RejectLCDocuments` (`banking.go:1913`) requires LC in `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED`/`AMENDED` (`banking.go:1952`); sets `lc.NegotiationStatus = "REJECTED"`, `lc.Status = "EXPIRED"` (`banking.go:1959-1960`), all `OPEN` discrepancies → `REJECTED` (`banking.go:1975-1976`). PG mirrors `letters_of_credit.status='EXPIRED'` + document-rejection fields (`banking.ts:3603-3613`). This is the **only** writer of LC `EXPIRED` in the slice; note the status name is misleading (documents rejected, not time-expired). |
| L14 | `ISSUED`/`FOREX_ALLOCATED` → (no status change) | Any authenticated user — **no `requireRole`** | `POST /api/v1/banking/lc/:lcId/examine` — `banking.ts:3699` | No validators. Body: `examinationResult` (`'COMPLIANT'` → `compliant=true`), `examinationNotes` → `discrepancies`. | Forwards to the L8 handler by reaching into `router.stack` (`banking.ts:3709-3716`). **Fallback** (if the L8 route is not found): PG-only `UPDATE letter_of_credits SET status='DOCUMENTS_EXAMINED' …` (`banking.ts:3725-3732`) — table name `letter_of_credits` does not match the real `letters_of_credit` table used everywhere else, so the fallback would fail; and `DOCUMENTS_EXAMINED` is not a status in any transition map. |
| L15 | (chaincode only) `SubmitLCDocuments` / `LinkShipmentToLC` — no status change | — | No route in this slice calls them. | — | `SubmitLCDocuments` (`banking.go:1474`) requires LC `ISSUED`/`FOREX_ALLOCATED`, records documents, `lc.Status` remains unchanged (`banking.go:1507`). `LinkShipmentToLC` (`banking.go:1413`) requires LC `FOREX_ALLOCATED`/`ISSUED`, links `ShipmentID`, status unchanged (a `SHIPPED` status assignment was deliberately removed, `banking.go:1445`). |
| L16 | read-only | Mount-level `authMiddleware`; list endpoints have **no** per-route auth | `GET /api/v1/banking/lc` (`banking.ts:1321`), `GET /api/v1/banking/lcs` (`banking.ts:1452`), `GET /api/v1/banking/lc/:lcID` (`banking.ts:1601`, `authMiddleware`), `GET /api/v1/banking/lc/:lcId/discrepancies` (`banking.ts:3632`, `evaluateTransaction('GetLCDiscrepancies')`), `GET /api/v1/banking/lc/discrepancies/pending` (`banking.ts:3665`, `evaluateTransaction('QueryLCsWithDiscrepancies')`), `GET /api/v1/banking/forex` (`banking.ts:1975`). | — | No transition. Note `GET /lc` and `GET /lcs` are public at route level (rely only on mount-level `authMiddleware`). |
| L17 | (chaincode only) generic status write | — | No route in this slice. | — | Chaincode `UpdateLCStatus` (`banking.go:734`) sets an arbitrary status (with a special-case branch at `banking.go:781` when `newStatus == "UTILIZED"`); it is referenced only by `statusManager.getUpdateFunctionName` (`statusManager.ts:259-266`) for the disabled cascade path. No API caller in the slice. `DeleteLC` (`banking.go:1099`) likewise has no API caller. |

**Dependencies (L):** L1/L1b require an `APPROVED` contract and an `ACTIVE` exporter licence (chaincode-enforced).
L2 requires `REQUESTED`; L3 requires `REQUESTED`; L4 requires `APPROVED`; L5 requires nothing except a body `amount`
(no contract check visible on that path). L6 (F3b) requires the LC to exist (read via chaincode/CouchDB) and caller-supplied
`exchangeRate`/`allocatedAmount`. L7 requires `ISSUED`. L8 requires `ISSUED`/`FOREX_ALLOCATED`. L9 requires `UTILIZED`
(and, if the LC has a shipment, verified shipping docs). L10/L11 require an `OPEN` discrepancy. L12/L13 require an
active issued LC. The forex request auto-created by L4/L5 (`FOREX_<lcID>_REQUEST`) supplies the `forexId` that F3/F3b
later allocate against; F3 additionally requires the caller-supplied `lcId`.

---

## 5. Consignment (chaincode only — no route in this slice)

`chaincodes/coffee/consignment.go`. No `banking.ts` consignment route was in scope (routes exist at
`banking.ts:2861-3178` but are outside the assigned slice); the chaincode transitions are:

| # | Transition | Chaincode function | Guard / note |
|---|---|---|---|
| K1 | — → permit `ISSUED` **and** consignment `PERMIT_ISSUED` | `IssueConsignmentPermit` (`consignment.go:52`) | Requires exporter `LicenseStatus == "ACTIVE"` (`consignment.go:91`). Creates an `ExportPermit` with `Status: "ISSUED"` (`consignment.go:133`) and a `ConsignmentPayment` with `Status: "PERMIT_ISSUED"` (`consignment.go:170`). |
| K2 | `PERMIT_ISSUED` → `SHIPPED` | `RecordConsignmentShipment` (`consignment.go:227`) | Requires `consignment.Status == "PERMIT_ISSUED"` (`consignment.go:260`); sets `Status = "SHIPPED"` (`consignment.go:271`). |
| K3 | `SHIPPED`/`PARTIAL` → `PARTIAL` (partial payment) or → `SETTLED` (full) | `RecordPartialPayment` (`consignment.go:296`) | Requires `SHIPPED` or `PARTIAL` (`consignment.go:339`); sets `SETTLED` when fully paid (`consignment.go:367`), else `PARTIAL` (`consignment.go:378`); `SETTLED` also triggers a follow-up branch (`consignment.go:390`). |
| K4 | read-only | `ReadConsignmentPayment`, `QueryConsignmentsByExporter/ByStatus`, `QueryOutstandingConsignments` (`SHIPPED`/`PARTIAL`, `consignment.go:474`), `QueryAllConsignments` (`consignment.go:410-483`). | No transition. |

---

## 6. End-to-end dependency chain (happy path)

```
A1 submit application (pending)
  → A2 ECTA approves → exporter registered on-chain, LicenseStatus=ACTIVE
  → C1 register contract (REGISTERED)            [requires: exporterID; contract fields; pricePerKg ≥ 5.0]
  → C2 ECTA approves contract (APPROVED)         [requires: REGISTERED; docs only in production]
      → auto-creates LC (REQUESTED)              [L1b; id LC-<timestamp> via service trigger]
  → L2 bank approves LC (APPROVED)               [requires: REQUESTED]
  → L4 bank issues LC (ISSUED)                   [requires: APPROVED]
      → auto-creates forex request (REQUESTED)   [FOREX_<lcID>_REQUEST via RequestForex]
  → F2 NBE confirms forex (CONFIRMED) — optional [requires: REQUESTED; NBEMSP only]
  → F3/F3b allocate forex (ALLOCATED) + LC → FOREX_ALLOCATED
      [requires: forexId + lcId; NOTE: CouchDB/PG only, chaincode AllocateForex never called]
  → L8 examine documents, compliant (UTILIZED)   [requires: ISSUED or FOREX_ALLOCATED]
  → L9 release payment (PAYMENT_RELEASED)        [requires: UTILIZED; verified shipping docs if shipment linked]
  → (SETTLED for LC/forex/contract: only via statusManager PAYMENT_SETTLED cascade, which is disabled — see §8)
```

Alternative / parallel branches: L5 (`CreateAndIssueLC`) jumps straight to `ISSUED` without request/approve;
F6 (NBE PG-only `APPROVED`) and F7 (repatriation) run outside the chaincode state machine; L7 (amend) mutates
amount/expiry/terms without changing status; L10–L13 handle discrepancies/negotiation; C4 rejects the contract
(`REJECTED`, terminal at API level — chaincode resubmit exists but is uncallable, C5); F5 forex reject is broken.

---

## 7. Status inventory

| Entity | Status values seen in code (this slice) | Where each is written |
|---|---|---|
| Exporter application (PG, lowercase) | `pending`, `approved`, `rejected` | `exporters.ts:177` (insert), `:452` (approve), `:609` (reject), `:872` (resubmit). |
| Exporter licence (chaincode) | `ACTIVE` (on `RegisterExporter`, `main.go:251`); `REVOKED`/`SUSPENDED` exist in chaincode (`main.go:1167-1242`) but no route in slice writes them. | — |
| Contract (`ContractStatus`) | `REGISTERED`, `APPROVED`, `REJECTED`, `CANCELLED` (dead PG-only endpoint C6), `EXECUTED`, `COMPLETED` (statusManager map only — no writer in slice), `LC_ISSUED` (cascade target only — never written, cascade disabled). | `main.go:469, 642, 746, 840`; `contracts.ts:1924-1941` (dead). |
| Forex (`Status`) | `REQUESTED`, `CONFIRMED`, `APPROVED` (PG-only, F6), `ALLOCATED`, `UTILIZED`, `REJECTED` (intended by F5 but chaincode fn missing), `EXPIRED` (map only — no writer in slice), `SETTLED` (cascade target only — never written), `REPATRIATED` (PG fallback, F7), `ELIGIBLE` (cascade target only — never written, cascade disabled). `RetentionStatus` (sub-status): `PENDING`, `COMPLIED`, `NON_COMPLIANT`. | `forex.go:180, 279, 480, 626, 1461`; `forexService.ts` (CouchDB); `nbe.ts:76, 152`. |
| LC (`Status`) | `REQUESTED`, `APPROVED`, `REJECTED`, `ISSUED`, `FOREX_ALLOCATED`, `AMENDED` (map only — never produced, see L7), `UTILIZED`, `PAYMENT_RELEASED`, `SETTLED` (cascade target only — never written), `EXPIRED` (only via documents-reject L13), `FOREX_REQUESTED` (accepted as a from-state by chaincode `AllocateForex`, `forex.go:450`, but no code in the slice ever sets it). `NegotiationStatus`: `NOT_STARTED`, `UNDER_NEGOTIATION`, `ACCEPTED`, `REJECTED`. Discrepancy `Status`: `OPEN`, `RESOLVED`, `WAIVED`, `REJECTED`. Amendment `Status`: `ACCEPTED`. | `banking.go:267, 384, 480, 558, 700, 1229, 1319, 1664, 1750, 1856, 1959-1960`; `forex.go:517`; CouchDB writes in `forexService.ts` / `banking.ts:1159-1243`. |
| Consignment (`Status`) | `PERMIT_ISSUED`, `SHIPPED`, `PARTIAL`, `SETTLED`; permit `ISSUED`. | `consignment.go:133, 170, 271, 367, 378`. |
| Exchange rate / retention policy | `SUPERSEDED` (old rate), `INACTIVE` (old policy). | `forex.go:1000, 1233`. |

**Dead ends (statuses with no outgoing transition in code, within this slice):**
- Application `approved` — terminal (no outgoing route; re-approval blocked by the `pending` guard).
- Contract `REJECTED` — terminal at API level (chaincode `ResubmitRejectedContract` exists but has no route; the API correction path mints a *new* contract instead).
- Contract `APPROVED` — `EXECUTED`/`CANCELLED` exist in the map but no route in the slice writes them (cancel endpoint is dead code, C6).
- Contract `EXECUTED` → `COMPLETED` — no writer in slice.
- Forex `REJECTED`, `EXPIRED`, `SETTLED`, `REPATRIATED` — terminal; `EXPIRED` is never written at all; `SETTLED` is only a disabled-cascade target.
- Forex `CONFIRMED` and `APPROVED` — have no entry in `StatusTransitions.FOREX` (map gap), though chaincode `AllocateForex` accepts them.
- LC `REJECTED`, `SETTLED`, `EXPIRED` — terminal; `SETTLED` is never written; `AMENDED` is unreachable (never written).
- LC `PAYMENT_RELEASED` → `SETTLED` — defined in the map but no writer in the slice (settlement lives in `payments.ts`/`swift.ts`, out of scope).
- Consignment `SETTLED` — terminal.

---

## 8. Inconsistencies and flags

1. **`RejectForex` chaincode function does not exist** — `POST /api/v1/banking/forex/:forexID/reject`
   (`banking.ts:657-690`) calls `invokeChaincode('RejectForex', …)`; `grep -rn RejectForex chaincodes/` returns nothing
   and it is the only reference repo-wide. Forex rejection is therefore impossible; there is also no PG fallback.
   (`StatusTransitions.FOREX` still lists `REQUESTED → REJECTED`.)
2. **Chaincode `AllocateForex` is never invoked by any API code** — `grep AllocateForex api/src/` finds only comments
   (`contracts.ts:1874`, `forex.ts:618`). Both allocation paths (`POST /api/v1/forex/allocate` → `forexService.allocateForex`,
   `POST /api/v1/banking/lc/:lcID/allocate-forex`) write **directly to CouchDB** (`coffeechannel_coffee`) and PostgreSQL,
   bypassing endorsement, the LC/forex match checks, and the active-NBE-rate equality check in `forex.go:432-476`.
   The on-chain forex record therefore keeps its pre-allocation status while PG/CouchDB say `ALLOCATED`.
3. **Two parallel forex-allocation endpoints** (F3 vs F3b) with different forex-id schemes (caller-supplied vs
   `FOREX_<lcID>_<timestamp>`), different role sets, and different data sources (stored forex request vs caller-supplied
   `exchangeRate`/`allocatedAmount`).
4. **Two parallel LC-creation paths on contract approval** (C2): `contractService.triggerLCAutoCreation`
   (`LC-<Date.now()>`, bank hard-coded `Commercial Bank of Ethiopia`) runs inside `approveContract`, then the route's
   own handoff (`LC-<contractID>`) finds the first LC and reports `already_exists`. Effective LC id is the timestamp one.
5. **Two contract-approve endpoints** (C2 `/:contractID/approve` vs C3 `/approve` with body `contractId`): C3 has no
   status validation, no LC handoff, no audit row, and a different role rule (`ECTA_ADMIN` explicitly allowed). Chaincode
   `ApproveSalesContract` has no from-state guard, so C3 can re-approve an already-`APPROVED` or `REJECTED` contract.
6. **Cancel endpoint is dead code** — `POST /api/v1/contracts/:contractId/cancel` (`contracts.ts:1924`) is declared after
   `export default router;` (`contracts.ts:1917`) and is never registered; it is also PG-only with no role check.
7. **`AMENDED` LC status is unreachable** — `AmendLC` never assigns `lc.Status` (L7); the `AMENDED` branches in
   `StatusTransitions.LC` and in `RejectLCDocuments`/`ReportLCDiscrepancy` guards can never trigger.
8. **`statusManager` is effectively inert** — `validateTransition` returns `true` for unknown current statuses
   (`statusManager.ts:219-232`); `updateEntityStatus` logs "PostgreSQL only" and returns success without chaincode writes
   or cascades (`statusManager.ts:290-298`). All `RelatedStatusUpdates` (`ELIGIBLE`, `LC_ISSUED`, `SETTLED` cascades) are dead.
9. **NBE forex approve is PG-only and unguarded** (F6): sets `APPROVED` on any row regardless of current status and never
   touches the ledger; it is a *different* "approve" from forex confirm (`CONFIRMED`, on-chain, F2).
10. **Resubmit lookup-key mismatch** (A4): resubmit queries by numeric `id`, approve/reject by `application_id` (`APP-…`).
11. **Missing role checks**: `POST /api/v1/banking/lc/:lcID/examine-documents` (L8) and
    `POST /api/v1/banking/lc/:lcID/release-payment` (L9) have `authMiddleware` only — any authenticated role can examine
    documents or release LC payment. `POST /api/v1/banking/lc/issue` (L5) has no express-validator chain and no visible
    contract-`APPROVED` check.
12. **Case/format drift**: application statuses are lowercase in PG but uppercase in audit-log values; contract-create
    response reports lowercase `status: 'pending'` (`contracts.ts:553`) while the stored status is `REGISTERED`;
    `POST /api/v1/banking/lc/:lcId/examine` fallback writes to table `letter_of_credits` (wrong name; real table is
    `letters_of_credit`) with status `DOCUMENTS_EXAMINED`, which exists in no transition map (L14);
    `GET /api/v1/nbe/lc-monitoring` reads `letter_of_credits` (`nbe.ts:196-199`); `GET /api/v1/forex/lc-monitoring`
    (`forex.ts:413`) has `requireRole` but no per-route `authMiddleware` (relies on mount).
13. **`POST /api/v1/contracts/:contractID/nbe-approve` is a stub** returning 400 `ENDPOINT_DEPRECATED` (C8), while the
    file comment still describes NBE contract approval as the forex path.
14. **Duplicate mount**: `bankingRoutes` is mounted twice at `/api/v1/banking` (`server.ts:246` and `:253`) — harmless
    (first match wins) but worth noting.
15. **No expiry mechanism**: forex `EXPIRED` and LC `EXPIRED`-by-time have no writer; `AllocateForex` sets an `ExpiryDate`
    (`forex.go:492`) that nothing ever enforces; the only `EXPIRED` writer is documents-rejection (L13).
16. **`ConfirmForex` arg mismatch**: route passes the current ISO timestamp as the chaincode's `comments` parameter
    (`forex.ts:728-735` vs `forex.go:226`).
17. **PATCH contract has no chaincode sync** (C7): PG-only edits to an `APPROVED` contract's amount/price diverge from the ledger.
18. **Forex request auto-mapping vs validation**: `POST /api/v1/forex/request` (F1) requires only `forexId`/`contractId`
    and auto-derives the rest, while the wrapper `POST /api/v1/forex/` (F1b) manually requires `exporterID` and `amount`
    before doing the same auto-mapping.

---

# Appendix B
# Part B — Quality → Permit → Phyto → Inspection → Shipment Chain

**Scope:** read-only workflow mapping. Repo `~/workspace/GoCBC`, branch `fix/auth-chaincode-audit`,
HEAD `12d5a8d` (verified via `git rev-parse` before reading).
Files read: `api/src/routes/quality.ts` (1778 lines), `permits.ts` (319), `phytosanitary.ts` (451),
`inspection.ts` (500), `shipments.ts` (3102), `shipping.ts` (600);
chaincode `chaincodes/coffee/quality.go`, `permit.go`, `phytosanitary.go`, `inspection.go`
(plus `main.go` only to resolve shipment-chaincode functions the routes call, and
`api/src/utils/statusManager.ts` + `api/src/services/shipmentService.ts` where a route delegates to them).
No files under `~/workspace/GoCBC` were edited.

## 0. How to read this file

- **Full path** = mount prefix (`/api/v1`, `api/src/server.ts`) + router path. All six routers are
  mounted behind `authMiddleware` at the mount point, so every endpoint below requires a valid
  token even when the route itself lists no per-route `authMiddleware` (see §0.1).
- **Role** = `requireRole(...)` on the route, else an inline `user.role`/`user.org` check, else
  "any authenticated user" (mount auth only). Chaincode MSP checks are listed separately — they
  are enforced by Fabric identity, not by the API role.
- **Chaincode call** = first argument of `invokeChaincode` / `submitTransaction` /
  `evaluateTransaction` / `queryChaincode`, or `fabricService.<method>` where the route uses a
  wrapper (`updateShipmentStatus` → `UpdateShipmentStatus`, `getShipment` → read).
  "— (none)" means the handler writes PostgreSQL and/or CouchDB directly and never calls chaincode.
- **Status case matters.** PostgreSQL quality/shipment rows use **lowercase** (`pending`,
  `inspected`, `in_transit`); chaincode uses **UPPERCASE** (`PENDING`, `INSPECTED`, `IN_TRANSIT`).
  They are different strings and are never normalised. Both spellings are recorded verbatim.
- **"From" enforcement** is split into three columns where relevant: what the API checks
  (PG `SELECT … status`), what the chaincode checks (guard clause), and what nothing checks.

### 0.1 Mount points (`api/src/server.ts`)

| Router file | Mounted at | Line |
|---|---|---|
| `quality.ts` | `/api/v1/quality`, alias `/api/v1/quality-inspections`, alias `/api/v1/certificates` | 258, 261–262 |
| `permits.ts` | `/api/v1/permits` | 283 |
| `phytosanitary.ts` | `/api/v1/phytosanitary` | 290 |
| `inspection.ts` | `/api/v1/inspection` | 339 |
| `shipments.ts` | `/api/v1/shipments` | 247 |
| `shipping.ts` | `/api/v1/shipping` | 349 |

All mounts are `apiV1.use('<path>', authMiddleware, <router>)`. No router in this slice has a
`router.use(...)` global guard (verified by grep); per-route `authMiddleware` below is therefore
redundant-but-explicit where present, and its **absence** on a route (e.g. all of `permits.ts`
except `GET /`, most of `shipments.ts`) does **not** mean the route is public — mount auth still
applies. The one genuine gap is role checks: only the routes listed with `requireRole` or an
inline check restrict *which* authenticated user may act.

## 1. Status-value inventories (exact strings, with where each is written)

### 1.1 Quality inspections — PG table `quality_inspections` (lowercase)

| Status value | Written by | Read / gated by |
|---|---|---|
| `pending` | `quality.ts:328` (INSERT on create), `:366` (response) | `quality.ts:298` (duplicate-pending check), `:434` (perform guard accepts `pending`/`requested`), `shipmentService.ts:150` writes **`PENDING`** (uppercase) for the auto-created task — different string |
| `requested` | **Never written** by any route in this slice | `quality.ts:434` — perform accepts it as a from-state anyway |
| `sample_collected` | `quality.ts:1595`, `:1607` (collect-sample) | Never read as a from-state (lab-results has no guard) |
| `inspected` | `quality.ts:517`, `:553`, `:585` (perform); `:1674`, `:1694` (lab-results) | `quality.ts:646`, `:953` (approve/reject guards require it) |
| `approved` | `quality.ts:670`, `:694` (POST approve); `:854`, `:889` (PUT approve) | `quality.ts:1130` (issue-permit guard, OR-ed with `passed=true`) |
| `rejected` | `quality.ts:980`, `:986` (POST reject); `:1749`, `:1762` (PUT reject) | Never read as a from-state |
| `certificate_issued` | `quality.ts:1068` (POST `/issue`) | Never read as a from-state |
| `issued` | Response-only, `quality.ts:1084` (`status: 'issued'` in the `/issue` response body; PG holds `certificate_issued`) | — |
| `permit_issued` | `quality.ts:1161`, `:1181` (issue-permit) | Never read as a from-state |
| `completed` | `quality.ts:1262` (legacy complete; audit log claims `PENDING → COMPLETED`, `:1238–1239`) | Never read as a from-state |
| `APPROVED` | Response-only, `quality.ts:905` (PUT approve response; PG holds lowercase `approved`) | — |

Chaincode `QualityInspection.Status` comment (`quality.go:70`): `PENDING, INSPECTED, APPROVED,
REJECTED, REWORK`. Actually set in chaincode: `PENDING` (`quality.go:153`, `RequestInspection`),
`INSPECTED` (`quality.go:337`, `PerformInspection`, guarded `Status != "PENDING"` → error,
`quality.go:204–205`). `APPROVED` / `REJECTED` / `REWORK` are **never set by any chaincode
function** — there is no `ApproveQuality`/`RejectQuality` function (see §6.5). Note the API
`POST /quality/inspections` never calls `RequestInspection` at all (§2.1, Q1).

### 1.2 Export permits — chaincode `ExportPermit.Status` (`permit.go:26`)

`ISSUED, UTILIZED, EXPIRED, CANCELLED, SETTLED` (comment, `permit.go:26`).

| Status value | Written by |
|---|---|
| `ISSUED` | `permit.go:187` (`IssueCBEExportPermit`) |
| `UTILIZED` | `permit.go:276` (`UtilizeExportPermit`; guard `Status != "ISSUED"` → error, `:256–257`; also expiry check, `:260–268`) |
| `SETTLED` | `permit.go:340` (`SettleExportPermit`; guard `Status != "UTILIZED"` → error, `:330–331`; also sets `Outstanding=false`, `:341`) |
| `EXPIRED`, `CANCELLED` | **Declared only — never set by any function in `permit.go`; no expiry job, no cancel function** |
| `issued` (lowercase) | Response-only, `permits.ts:76` (`POST /` response; chaincode holds `ISSUED`) |

### 1.3 Phytosanitary certificates — chaincode `PhytosanitaryCertificate.Status` (`phytosanitary.go:35`)

`ISSUED, EXPIRED, REVOKED` (comment, `phytosanitary.go:35`).

| Status value | Written by |
|---|---|
| `ISSUED` | `phytosanitary.go:121` (`IssuePhytosanitaryCertificate`; also sets `InspectionResult="PASSED"`, `ValidUntil`=+14 days) |
| `REVOKED` | `phytosanitary.go:218` (`RevokePhytosanitaryCertificate`; guard `Status == "REVOKED"` → error, `:206–207`) |
| `EXPIRED` | **Declared only — never set by any function** |
| *(implied, not in chaincode)* `REQUESTED`, `INSPECTED` | The API has request/inspect endpoints (§2.3, H1–H2) but **no such statuses exist** in the struct and the chaincode functions they call do not exist (§6.4). `statusManager.ts:102–110` separately defines a `PHYTOSANITARY` flow `REQUESTED → INSPECTION_SCHEDULED → INSPECTION_COMPLETED → ISSUED/REJECTED`, `ISSUED → VALID/EXPIRED` — **no route in this slice calls `statusManager` for phyto** (grep: zero references in `quality.ts`, `permits.ts`, `phytosanitary.ts`, `inspection.ts`, `shipping.ts`). |

### 1.4 Pre-shipment inspections — chaincode `PreShipmentInspection.Status` (`inspection.go:58`)

`REQUESTED, SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, REJECTED` (comment, `inspection.go:58`).

| Status value | Written by |
|---|---|
| `REQUESTED` | `inspection.go:148` (`RequestPreShipmentInspection`) |
| `SCHEDULED` | `inspection.go:210` (`ScheduleInspection`; **no from-state guard**) |
| `COMPLETED` | `inspection.go:299/301/304` (`RecordInspectionResults` — set for **all three** `overallResult` values `PASS`, `CONDITIONAL_PASS`, and anything else incl. `FAIL`; `ReInspectionRequired=true` only on the else-branch) |
| `APPROVED` | `inspection.go:407` (`ApproveInspection`; **no from-state guard**) |
| `REJECTED` | `inspection.go:463` (`RejectInspection`; **no from-state guard**; sets `ReInspectionRequired=true`) |
| `IN_PROGRESS` | **Declared only — never set by any function** |
| `pending` (lowercase) | Response-only, `inspection.ts:87` (`POST /` response; chaincode holds `REQUESTED`) |

### 1.5 Shipments — three overlapping vocabularies

**(a) Chaincode `CoffeeShipment.Status` (`main.go`)** — set by the functions the routes call:

| Status | Set by (chaincode) |
|---|---|
| `CREATED` | `main.go:1676` (`CreateShipment`; also auto-creates a `QualityInspection` with `Status="PENDING"`, `main.go:1711`) |
| `INSPECTION_PENDING` | `quality.go:171` (`RequestInspection` calls `UpdateShipmentStatus` on the shipment, best-effort) |
| `LOADED` | `main.go:2026` (`RecordBillOfLading`), `:2061` (`RecordAirwayBill`), `:2096` (`RecordShippingDetails`) |
| `IN_TRANSIT` | `main.go:2732` (`PickupShipment`), `:3290` (`UpdateToInTransit`) |
| `DELIVERED` | `main.go:2787` (`ConfirmDelivery`), `:3446` (`CompleteDelivery`) |
| `LAND_TRANSPORT` | `main.go:2870` (`StartLandTransport`; also `LandTransportStatus="IN_TRANSIT"`, `:2876`) |
| `PORT_ARRIVED` | `main.go:2958` (`ArriveAtPort`; `LandTransportStatus="ARRIVED"`, `:2960`) |
| `CONTAINER_STUFFED` | `main.go:3035` (`StuffContainer`) |
| `VESSEL_LOADED` | `main.go:3137` (`LoadOnVessel`) |
| `DEPARTED` | `main.go:3213` (`DepartFromPort`) |
| `DESTINATION_ARRIVED` | `main.go:3368` (`ArriveAtDestination`) |
| *(any string)* | `main.go:1812` (`UpdateShipmentStatus` — **no from-state guard, no allow-list**; sets whatever `newStatus` is passed) |
| *(any string)* | `main.go:2135` (`UpdateShipmentLocation` — sets `Status=status` verbatim; sets `ActualArrival` when status is `ARRIVED`/`DELIVERED`) |

**(b) `statusManager.ts:62–84` `SHIPMENT` flow** (enforced only by `PUT /shipments/:shipmentID/status`,
§2.5 S2): `CREATED → QUALITY_INSPECTION → QUALITY_APPROVED → PHYTO_INSPECTION → PHYTO_APPROVED →
EUDR_VERIFICATION → EUDR_APPROVED → INSURANCE_REGISTERED → LAND_TRANSPORT_STARTED →
BORDER_CROSSING → PORT_ARRIVED → CUSTOMS_DECLARED → CUSTOMS_CLEARED/CUSTOMS_REJECTED →
CONTAINER_STUFFED → VESSEL_LOADED → IN_TRANSIT → ARRIVED_DESTINATION → DELIVERED`;
terminals `DELIVERED, QUALITY_REJECTED, CUSTOMS_REJECTED, CANCELLED` (empty next-list). Note this
vocabulary disagrees with (a): `LAND_TRANSPORT_STARTED` vs chaincode `LAND_TRANSPORT`,
`ARRIVED_DESTINATION` vs chaincode `DESTINATION_ARRIVED`, `DEPARTED` absent from the flow entirely,
`FREIGHT_BOOKED`/`LOADED`/`BOOKED` absent. `validateTransition` (`statusManager.ts:217–245`)
**returns `true` (allows) when the current status is not in the map or has no transitions** —
so any status outside the map (e.g. lowercase `pending`, `FREIGHT_BOOKED`, `LOADED`) passes
validation unchecked.

**(c) PostgreSQL `shipments.status` (lowercase, written by routes, not chaincode):**
`pending` (`shipments.ts:382`, `:429`, `:448` on create), `in_transit` (`shipments.ts:1485` via
bill-of-lading CouchDB write). **Separate column** `shipments.logistics_status`, written only by
`PUT /:shipmentID/logistics-status` (§2.5 S27) with enum
`PENDING, BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED, CONFIRMED`
(`shipments.ts:3040`; same list in `shipmentService.ts:340`).

**(d) `shipping.ts` bookings** reuse the `shipments` table with `BOOKED, LOADED, IN_TRANSIT, ARRIVED,
DELIVERED` (`shipping.ts:373, 416, 468, 529, 568`) — PG only, no chaincode, no guards.
`GET /shipping/bookings` derives a synthetic `bookingStatus`: `CUSTOMS_CLEARED → CONFIRMED`,
anything else → `PENDING` (`shipping.ts:207`).

## 2. Transition tables

Conventions: **Req/Opt** = express-validator chain on that route (`notEmpty()` = required,
`.optional()` = optional, `.isIn([...])` = enum, `.isNumeric()`/`.isBoolean()` as stated; "—" =
no validator chain at all, field read straight from `req.body`/`req.params`).
"Body fields" lists only fields the handler destructures/uses.

### 2.1 Quality — `api/src/routes/quality.ts` (mounted `/api/v1/quality`, + aliases `/api/v1/quality-inspections`, `/api/v1/certificates`)

Read-only GETs (no transition): `GET /inspections` (`:22`, also duplicated at `:1281` — see §6.1),
`GET /` (`:80`), `GET /pre-shipment` (`:138`), `GET /post-delivery` (`:185`),
`GET /inspections/by-shipment/:shipmentId` (`:1410`), `GET /inspections/:inspectionID` (`:1482`).
All `authMiddleware` only; query filters `status, exporterId, shipmentId, type, limit` (all optional).

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| Q1 | — → `pending` | `POST /api/v1/quality/inspections` (`quality.ts:253`) | Any authenticated user (docstring says "Exporter, ECTA"; **no `requireRole`**) | Req: `inspectionID` notEmpty, `exporterID` notEmpty, `shipmentID` notEmpty, `coffeeType` notEmpty, `quantity` isNumeric. Opt (no validator): `contractID`, `sampleSize`, `requestedDate`. Extra manual check: `shipmentID` must be present (`:279`); 409 if `inspection_id` exists or shipment already has a `pending` inspection (`:298–312`). | **— (none).** Writes CouchDB doc `inspection:<id>` (`:318–353`, DB `coffeechannel_coffee`) + PG INSERT `status='pending'` (`:328`, `:360`). `RequestInspection` chaincode is **not** called, so no `INSPECTION_PENDING` shipment update and no `PENDING` (uppercase) record. |
| Q2 | `pending` → `sample_collected` (docstring; **no from-state check in code** — handler only checks the row exists, `:1580`) | `POST /api/v1/quality/inspections/:inspectionID/collect-sample` (`quality.ts:1563`) | Any authenticated user (docstring "Quality Officer"; no role check) | Req: `sampleWeight` isNumeric, `collectionDate` notEmpty. Opt (no validator): `collectorName`, `sealNumber`. Note: `collectionDate` and `sealNumber` are echoed in the response but **never persisted** (UPDATE sets only `sample_size, inspector_name, status`, `:1590–1599`). | — (none). PG only. |
| Q3 | `sample_collected` → `inspected` (docstring; **no from-state check** — existence only, `:1649`) | `POST /api/v1/quality/inspections/:inspectionID/lab-results` (`quality.ts:1631`) | Any authenticated user (docstring "Quality Lab Technician"; no role check) | Req: `moistureContent` isNumeric, `defectCount` isNumeric. Opt (no validator): `cupScore`, `screenSize`, `labTechnician`, `testDate`. **No grade/passed is set** — only moisture/defect/cup/screen/inspector/date + `status='inspected'`. | — (none). PG only. |
| Q4 | `pending` **or** `requested` → `inspected` (guard `quality.ts:434`: `status !== 'pending' && !== 'requested'` → 400) | `POST /api/v1/quality/inspections/:inspectionID/perform` (`quality.ts:385`) | Any authenticated user (docstring "ECTA Quality Inspector"; **no `requireRole`**) | Only validator: `param('inspectionID').notEmpty()`. All body fields unvalidated: `inspectorID, inspectorName, sampleSize, moistureContent, defectCount, beanSize, color, odor, fragrance, flavor, aftertaste, acidity, body, balance, uniformity, cleanCup, sweetness, overall, classification, pesticideTest, heavyMetalTest, mycotoxinTest, remarks` (`:397–421`). Grade derived in-API: `overall>=85 → Grade 1; >=80 → Grade 2; >=75 → Grade 3; else Below Grade` (`:447–450`) — **different rule from chaincode** `determineQualityGrade` (defects + cupping + moisture → Grade 1–9, `quality.go:379–412`). | **— (none).** CouchDB PUT (`:505–541`, note: reads from DB `fabricchannel_cecbschannel`, a *different* DB name from Q1's `coffeechannel_coffee`) + PG UPDATE `status='inspected'` (`:517`). `PerformInspection` chaincode is **not** called. |
| Q5 | `inspected` → `approved` (guard `:646–652`: must be `inspected`) | `POST /api/v1/quality/inspections/:inspectionID/approve` (`quality.ts:618`) | `requireRole('ECTA','ECTA_ADMIN')` (`:622`) | Only validator: `param('inspectionID').notEmpty()`. Body (no validator): `approvedBy` (Opt, default `'ECTA Quality Director'`), `certificateNo` (Opt, default `` `CERT${inspectionID}` ``). Side effects: signs linked documents (`:708–837`, failure tolerated) and auto-triggers a customs declaration via `shipmentService.triggerCustomsDeclaration(shipment_id, inspectionID, user)` (`:841–868`, failure tolerated). | **— (none).** CouchDB PUT + PG UPDATE `status='approved', passed=true` (`:670`). No chaincode approve function exists (§1.1). Response `status: 'approved'`, `blockchain_tx_id: null`. |
| Q6 | **any** → `approved` (**no from-state guard, no existence check beyond the UPDATE matching zero rows silently**) | `PUT /api/v1/quality/inspections/:inspectionID/approve` (`quality.ts:873`) — "PUT version of approve for compatibility with tests" | `requireRole('ECTA','ECTA_ADMIN')` (`:875`) | Only validator: `param('inspectionID').notEmpty()`. Body (no validator): `certificateNumber` (Opt, default `` `CERT-${inspectionID}` ``), `grade` (Opt, default `'Grade 1'`), `remarks` (Opt, default `'Approved'`), `approvedBy` (unused). No document signing, no customs trigger, no chaincode. | — (none). PG only (`:889`). Response status is uppercase `'APPROVED'` (`:905`) while PG holds lowercase `'approved'`. Duplicate of Q5 with weaker semantics (§6.2). |
| Q7 | `inspected` → `rejected` (guard `:953–959`: must be `inspected`) | `POST /api/v1/quality/inspections/:inspectionID/reject` (`quality.ts:927`) | Any authenticated user (docstring "ECTA Quality Director"; **no `requireRole`**) | Req: `param('inspectionID')` notEmpty, `body('reason')` notEmpty ("Rejection reason is required"). Opt (no validator): `rejectedBy` (default `'ECTA Quality Director'`). | `invokeChaincode('RejectInspection', [inspectionID, rejectedBy, reason])` (`:965–972`) **then** PG UPDATE `status='rejected', passed=false` (`:980`). ⚠️ Arity/entity mismatch: chaincode `RejectInspection` (`inspection.go:430`) takes **2** args `(inspectionID, rejectionReason)` on the **pre-shipment** inspection entity (bare key), not the quality-inspection entity (`INSPECTION_` prefix) — see §6.5. |
| Q8 | **any** → `rejected` (**no from-state guard**, existence only) | `PUT /api/v1/quality/inspections/:inspectionID/reject` (`quality.ts:1719`) | Any authenticated user (docstring "Quality Director"; no role check) | Req: `param('inspectionID')` notEmpty, `body('rejectionReason')` notEmpty. | — (none). PG UPDATE `status='rejected', notes=$1` (`:1749`) — note: writes column **`notes`**, whereas Q7 writes `remarks`; `notes` is not selected/normalised anywhere else in this file. Duplicate of Q7 with weaker semantics (§6.2). |
| Q9 | (any; inspection must exist, `:1037`) → `certificate_issued` (PG; response says `issued`) | `POST /api/v1/quality/issue` (`quality.ts:1012`) | Any authenticated user (docstring "ECTA Quality Director"; no role check) | **No validator chains at all.** Manual check (`:1030`): `certificateID` and `inspectionID` required (400 otherwise). Body: `certificateID, shipmentID, inspectionID, qualityGrade, status` (destructured `:1017`; `status` is read but ignored). `shipmentID` defaults to the inspection's `shipment_id`; `qualityGrade` defaults to inspection grade or `'Grade 2'`. | `invokeChaincode('IssueCertificate', [certId, inspectionId, shipmentId, qualityGrade, <today>])` (`:1050–1058`) **then** PG UPDATE `status='certificate_issued'` (`:1068`). ⚠️ Arity mismatch: chaincode `IssueCertificate` (`inspection.go:328`) takes **3** args `(inspectionID, certificateNumber, certificateURL)` — the route passes 5, in a different order/meaning (see §6.5). |
| Q10 | `approved` (or `passed=true`) → `permit_issued`. Guard `:1130`: reject only if `status !== 'approved' && passed !== true` (OR logic — either condition alone passes). Also requires `certification_number` non-null (`:1140–1148`, `MISSING_CERTIFICATE`). | `POST /api/v1/quality/inspections/:inspectionID/issue-permit` (`quality.ts:1105`) | Any authenticated user (docstring "ECTA Export Permit Office"; **no `requireRole`**) | Only validator: `param('inspectionID').notEmpty()`. Body (no validator): `exportPermitNo` (Opt, default `` `PERMIT${Date.now()}` ``), `issuedBy` (Opt, default `'ECTA Export Permit Office'`), `autoCreateCustomsDeclaration` (Opt; **read but never acted on** — "TODO", `:1175`). | **— (none).** Comment `:1155`: "SKIP BLOCKCHAIN - IssueExportPermit function doesn't exist in chaincode". PG only (`:1161`). This is **not** the CBE export permit (`permits.ts` / `IssueCBEExportPermit`) — it only flips the quality-inspection row and appends to `remarks`. |
| Q11 | **any** → `completed` (**no from-state guard**, existence only, `:1222`) | `POST /api/v1/quality/inspections/:inspectionID/complete` (`quality.ts:1203`) — "legacy - single step" | Any authenticated user (docstring "ECTA"; no role check) | Req: `param('inspectionID')` notEmpty, `body('grade')` notEmpty, `body('passed')` isBoolean. Opt (no validator): `cupQuality, moistureContent, defectCount, screenSize, certificationNumber, inspectorName, remarks`. | — (no chaincode transaction). Calls `auditService.log({oldValue:'PENDING', newValue:'COMPLETED', action:'COMPLETE'})` (`:1238–1239`) **then** PG UPDATE `status='completed'` (`:1250–1262`). The audit log's `PENDING → COMPLETED` claim is hard-coded, not the row's actual prior status. |

### 2.2 Permits — `api/src/routes/permits.ts` (mounted `/api/v1/permits`)

No `requireRole` on any route; no express-validator chains on any route. Mount-level `authMiddleware`
only (`server.ts:283`). All four mutating routes rely on **chaincode MSP checks** instead:
`IssueCBEExportPermit` requires `BanksMSP` (`permit.go:66–69`); `UtilizeExportPermit` requires
`BanksMSP` or `CustomsMSP` (`permit.go:241–244`); `SettleExportPermit` requires `BanksMSP`
(`permit.go:310–313`).

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| P1a | — → `ISSUED` | `POST /api/v1/permits` (`permits.ts:11`) — "wrapper for /issue endpoint" | Any authenticated user; chaincode enforces `BanksMSP` (route itself calls `connectAsOrg('BanksMSP')`, `:48`) | **No validator chains.** Manual check (`:38–46`): `permitID` and `shipmentID` required. Body read: `permitID, shipmentID, exporterID, quantity, certificateID, status` (`:14–20`; `quantity` and `status` are read but **unused**; `shipmentID` is used only in the `description` string and the manual check — it is **not** passed to chaincode). Aliases accepted: `permitId`, `contractID/contractId`, `exporterId`, `lcID/lcId`. Hard-coded defaults: `permitId = permitID \|\| permitId \|\| PERMIT-<ts>`; `permitNumber = EP<ts>`; `paymentMethod='LC'`, `amount=85000`, `currency='USD'`, `destination='Germany'`, `commercialInvoice = certificateID \|\| 'CI-'+permitId`, `bankBranch='CBE Main Branch'`, `approvedBy='Bank Officer'` (`:21–35`). | `invokeChaincode('IssueCBEExportPermit', [permitId, permitNumber, contractId, exporterId, lcId, paymentMethod, amount, currency, description, destination, commercialInvoice, bankBranch, approvedBy])` (`:50–67`) — 13 args, matching the chaincode signature (`permit.go:48–50`). |
| P1b | — → `ISSUED` | `POST /api/v1/permits/issue` (`permits.ts:99`) — duplicate of P1a | Same as P1a (`connectAsOrg('BanksMSP')`, `:117`) | **No validator chains and no manual required-field check at all** — all 13 fields (`permitId, permitNumber, contractId, exporterId, lcId, paymentMethod, amount, currency, description, destination, commercialInvoice, bankBranch, approvedBy`) are passed through verbatim, `amount.toString()` will throw on `undefined` (→ 500). | Same `invokeChaincode('IssueCBEExportPermit', […13 args])` (`:119–136`). |
| P2 | `ISSUED` → `UTILIZED` (chaincode guard `permit.go:256`) | `POST /api/v1/permits/utilize` (`permits.ts:162`) | Any authenticated user; chaincode enforces `BanksMSP`/`CustomsMSP`. **No `connectAsOrg` call in this route** (unlike P1/P3 context — caller identity is whatever the Fabric service currently holds). | **No validator chains.** Body: `permitId` (required only by chaincode lookup; missing → chaincode "does not exist" error → 400). | `invokeChaincode('UtilizeExportPermit', [permitId])` (`:166`). |
| P3 | `UTILIZED` → `SETTLED` (chaincode guard `permit.go:330`) | `POST /api/v1/permits/settle` (`permits.ts:180`) | Any authenticated user; chaincode enforces `BanksMSP`. No `connectAsOrg` in this route either. | **No validator chains.** Body: `permitId`, `repatriatedAmount` (`repatriatedAmount.toString()` throws on `undefined` → 500). | `invokeChaincode('SettleExportPermit', [permitId, repatriatedAmount.toString()])` (`:184–187`). |

Read-only: `GET /api/v1/permits/:permitId` (`:201`, `queryChaincode('ReadExportPermit')` — **note:
this route is registered before `GET /exporter/:exporterId` (`:218`) and `GET /outstanding/all`
(`:235`), so Express matches `/exporter/<id>` and `/outstanding/all` as `:permitId` first**),
`GET /api/v1/permits/` (`:251`, `authMiddleware`, PG `export_permits` table, optional `?status=` filter).

**Permit dependencies (chaincode, `permit.go`):** issue requires exporter exists with
`LicenseStatus == "ACTIVE"` (`:88–90`); if `contractID` non-empty, contract must exist and
`ContractStatus == "APPROVED"` (`:139–141`); if `paymentMethod == "LC"` and `lcID` non-empty,
LC must exist with `Status == "ISSUED"` or `"APPROVED"` (`:150–152`); CAD > $100k needs
`BRANCH_MANAGER` role attr, > $500k needs `NBE_OFFICER`, total CAD exposure > $500k needs NBE
(`:100–133`). None of these are checked in the API layer — a `POST /` with empty `contractId` /
`lcId` (the defaults) skips the contract and LC checks entirely.

### 2.3 Phytosanitary — `api/src/routes/phytosanitary.ts` (mounted `/api/v1/phytosanitary`)

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| H1 | — → *(intended `REQUESTED`; **no such status exists** — see §6.4)* | `POST /api/v1/phytosanitary/request` (`phytosanitary.ts:41`) | `authMiddleware` only (no role check) | Req: `certificateID` notEmpty, `shipmentID` notEmpty, `exporterID` notEmpty. Opt: `plantDescription` isString, `quantity` isNumeric, `treatmentApplied` isString. Defaults applied: `plantDescription \|\| 'Coffee beans (Coffea arabica)'`, `quantity?.toString() \|\| '0'`, `treatmentApplied \|\| 'Fumigation'`. | `invokeChaincode('RequestPhytosanitaryCertificate', [certificateID, shipmentID, exporterID, plantDescription, quantity, treatmentApplied])` (`:65–71`). ⚠️ **This function does not exist in `chaincodes/coffee/`** (grep: only the API call site). The call cannot succeed against the committed chaincode. |
| H2 | *(intended ? → `INSPECTED`; **no such status/function exists** — see §6.4)* | `POST /api/v1/phytosanitary/:certificateID/inspect` (`phytosanitary.ts:114`) | Inline check: `user?.role !== 'ECTA'` → 403 (`:136–143`). Note: checks `role`, **not** `requireRole('ECTA','ECTA_ADMIN')` — `ECTA_ADMIN` is rejected by this check. | Req: `param('certificateID')` notEmpty, `inspectorName` notEmpty, `inspectionDate` notEmpty, `pestsDetected` isBoolean, `diseaseDetected` isBoolean. Opt (no validator): `inspectionNotes` (default `'No issues found'`). | `invokeChaincode('InspectPhytosanitaryCertificate', [certificateID, inspectorName, inspectionDate, pestsDetected.toString(), diseaseDetected.toString(), inspectionNotes])` (`:146–153`). ⚠️ **This function does not exist in `chaincodes/coffee/`** (grep: only the API call site). |
| H3 | — → `ISSUED` (chaincode creates the record already `ISSUED`, `phytosanitary.go:121`) | `POST /api/v1/phytosanitary/:certificateID/issue` (`phytosanitary.ts:189`) | Inline check: `user?.role !== 'ECTA'` → 403 (`:204–211`); same `ECTA_ADMIN`-rejected quirk as H2. | Req: `param('certificateID')` notEmpty, `certificateNumber` notEmpty, `issuingAuthority` notEmpty, `validUntil` notEmpty. Opt (no validator): `additionalDeclarations` (default `'No additional declarations'`). | `invokeChaincode('IssuePhytosanitaryCertificate', [certificateID, certificateNumber, issuingAuthority, validUntil, additionalDeclarations])` (`:213–219`) — **5 args**. ⚠️ Chaincode signature (`phytosanitary.go:47–51`) takes **14 args**: `(certificateID, shipmentID, exporterID, inspectorName, botanicalName, treatmentApplied, placeOfOrigin, pointOfEntry, quantityStr, packagingType, numberOfPackagesStr, distinguishMarks, meansOfConveyance, issuedBy)`. The 5 API values land in the wrong positions (`certificateNumber` → `shipmentID`, `issuingAuthority` → `exporterID`, `validUntil` → `inspectorName`, …) and `ShipmentExists(shipmentID)` (`phytosanitary.go:68–73`) will fail on the certificate number. This call cannot succeed as written. |
| H4 | `ISSUED` (any non-`REVOKED`) → `REVOKED` (chaincode guard `phytosanitary.go:206`) | `POST /api/v1/phytosanitary/:certificateId/revoke` (`phytosanitary.ts:389`) | `requireRole('ECTA','ECTA_ADMIN')` (`:393`) **plus** inline check `user?.org !== 'ECTA' && user?.organization !== 'ECTA'` → 403 (`:406–413`). | Req: `param('certificateId')` notEmpty, `reason` notEmpty, `revokedBy` notEmpty. | `invokeChaincode('RevokePhytosanitaryCertificate', [certificateId, reason, revokedBy, <ISO now>])` (`:419–424`) — **4 args, order `(id, reason, revokedBy, date)`**. ⚠️ Chaincode signature (`phytosanitary.go:189–191`) takes **3 args `(certificateID, revokedBy, reason)`** — `reason`/`revokedBy` are swapped and a 4th arg is passed. The revocation reason recorded on-chain would be the `revokedBy` value and vice versa (if the Fabric gateway tolerates the extra arg at all). |

Read-only: `GET /:certificateID` (`:256`, `queryChaincode('ReadPhytosanitaryCertificate')`),
`GET /` (`:295`, `evaluateTransaction('QueryAllPhytosanitaryCertificates')`, optional
`?status=&exporterId=&shipmentId=` filters), `GET /shipment/:shipmentId` (`:347`,
`evaluateTransaction('QueryPhytosanitaryCertificatesByShipment', shipmentId)`).
**Phyto dependency (chaincode):** `IssuePhytosanitaryCertificate` requires the shipment to exist
(`ShipmentExists`, `phytosanitary.go:68–73`) — so the API issue endpoint depends on a prior
shipment, but the API never passes a `shipmentID` to it (see H3).

### 2.4 Pre-shipment inspection — `api/src/routes/inspection.ts` (mounted `/api/v1/inspection`)

**No express-validator chains on any route in this file.** All validation is manual (only
`POST /` checks `inspectionId` + `shipmentId`, `:56–66`) or absent.

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| I1a | — → `REQUESTED` | `POST /api/v1/inspection` (`inspection.ts:17`) — "wrapper for /request" | `authMiddleware` only | **No validators.** Manual: `inspectionID` (or `inspectionId`) and `shipmentID` (or `shipmentId`) required, else 400. Body read: `inspectionID, shipmentID, contractID, exporterID, inspectorID, coffeeType, quantity, qualityGrade, moistureContent, defectPercentage, cuppingScore, result, status` (`:20–34`) — most are **ignored**. Hard-coded: `inspectionAgency='SGS'`, `inspectionLocation='Addis Ababa Warehouse'`, `packagingType='JUTE_BAGS'`; defaults: `quantity \|\| 10000`, `contractGrade = qualityGrade \|\| coffeeType \|\| 'Grade 2'`, `contractType = coffeeType \|\| 'Arabica'`. Response claims `status: 'pending'` (`:87`) — chaincode sets `REQUESTED`. | `submitTransaction('RequestPreShipmentInspection', inspectionId, contractId, shipmentId, exporterId, 'SGS', 'Addis Ababa Warehouse', String(quantity), contractGrade, contractType, 'JUTE_BAGS')` (`:68–79`). 10 args, matches chaincode (`inspection.go:103–106`). |
| I1b | — → `REQUESTED` | `POST /api/v1/inspection/request` (`inspection.ts:233`) — duplicate of I1a | `authMiddleware` only | **No validators and no manual required-field check at all.** Body (lowercase names): `inspectionId, contractId, shipmentId, exporterId, inspectionAgency, inspectionLocation, contractQuantity, contractGrade, contractType, packagingType` — all passed through, `String(contractQuantity)` → `"undefined"` if omitted. | Same `submitTransaction('RequestPreShipmentInspection', …10 args)` (`:252–263`). |
| I2 | `REQUESTED` → `SCHEDULED` (chaincode has **no from-state guard**, `inspection.go:174–210`) | `POST /api/v1/inspection/:id/schedule` (`inspection.ts:289`) | `authMiddleware` only | **No validators.** Body: `inspectorName, inspectorLicense, inspectionDate` — all optional in code (passed as `undefined` if missing). | `submitTransaction('ScheduleInspection', id, inspectorName, inspectorLicense, inspectionDate)` (`:303–308`). Matches chaincode (`inspection.go:174–176`). |
| I3 | `SCHEDULED` (unchecked) → `COMPLETED` — **for any `overallResult`, incl. `FAIL`** (`inspection.go:296–305`) | `POST /api/v1/inspection/:id/results` (`inspection.ts:332`) | `authMiddleware` only | **No validators.** Body: `inspectedQuantity, actualGrade, cuppingScore, defectsCount, moistureContent, beanSize, bagsInspected, packagingCondition, overallResult, inspectionNotes` — all optional in code (numeric ones default to `0`, strings to `''`). `overallResult` is passed through even if `undefined`. | `submitTransaction('RecordInspectionResults', id, String(inspectedQuantity\|\|0), actualGrade\|\|'', String(cuppingScore\|\|0), String(defectsCount\|\|0), String(moistureContent\|\|0), beanSize\|\|'', String(bagsInspected\|\|0), packagingCondition\|\|'', overallResult, inspectionNotes\|\|'')` (`:352–365`). Matches chaincode signature (`inspection.go:232–235`). Chaincode derives `QuantityAcceptable` (variance ≥ −5 kg), `QualityAcceptable` (`actualGrade == contractGrade && cuppingScore >= 80`), `PackagingAcceptable` (`NEW/GOOD/ACCEPTABLE`). |
| I4 | *(no status change — certificate fields only)* | `POST /api/v1/inspection/:id/certificate` (`inspection.ts:389`) | `authMiddleware` only | **No validators.** Body: `certificateNumber`, `certificateURL` (Opt, default `''`). | `submitTransaction('IssueCertificate', id, certificateNumber, certificateURL \|\| '')` (`:398–402`). Matches chaincode (`inspection.go:328–330`); chaincode sets `CertificateExpiry` = +90 days and **does not change `Status`**. |
| I5 | *(any, unchecked)* → `APPROVED` | `POST /api/v1/inspection/:id/approve` (`inspection.ts:427`) | `requireRole('ECTA','ECTA_ADMIN')` (`:427`) | **No validators.** Body: `comments` (Opt, default `''`). | `submitTransaction('ApproveInspection', id, comments \|\| '')` (`:436–439`). Matches chaincode (`inspection.go:374–376`); chaincode records caller X.509/MSP as approver. Note the chaincode comment says "Exporter/Buyer approves" while the API restricts to ECTA. |
| I6 | *(any, unchecked)* → `REJECTED` | `POST /api/v1/inspection/:id/reject` (`inspection.ts:464`) | `requireRole('ECTA','ECTA_ADMIN')` (`:464`) | **No validators.** Body: `rejectionReason` (Opt in code — passed as `undefined` if missing). | `submitTransaction('RejectInspection', id, rejectionReason)` (`:473–476`). Matches chaincode (`inspection.go:430–432`); chaincode sets `ReInspectionRequired=true`. |

Read-only: `GET /` (`:102`, `evaluateTransaction('QueryAllInspections')`), `GET /:id` (`:137`,
`evaluateTransaction('ReadInspection')`), `GET /shipment/:shipmentId` (`:167`),
`GET /status/:status` (`:200`, `evaluateTransaction('QueryInspectionsByStatus', status)`).
**Inspection dependencies:** request needs `contractId` + `shipmentId` + `exporterId` (passed to
chaincode; chaincode itself does not verify the contract/shipment exist — no `ShipmentExists` /
contract lookup in `RequestPreShipmentInspection`). Results are verified against the contract
values stored at request time (`contractQuantity/Grade/Type`, `inspection.go:281–294`).

### 2.5 Shipments — `api/src/routes/shipments.ts` (mounted `/api/v1/shipments`)

Auth note: only the routes marked `authMiddleware` below list it per-route; the rest rely on
mount-level auth (`server.ts:247`). **Only one route in this file has a `requireRole`**
(`reject-action`, S19). `connectAsOrg('ShippingMSP')` is called by most mutating routes;
`shipping-document` (S20) instead connects as `ECTAMSP`; `lc-documents` (S9) as `ExporterMSP`.

Read-only GETs (no transition): `GET /` (`:526`), `GET /:shipmentID/documents` (`:752`),
`GET /:shipmentID` (`:846`), `GET /:shipmentID/history` (`:1275`), `GET /:shipmentID/traceability`
(`:1334`). `PATCH /:shipmentID/buyer` (`:1097`, `invokeChaincode('UpdateShipmentBuyer')`) changes
buyer only, no status.

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| S1 | — → `pending` (PG + CouchDB; chaincode would be `CREATED`) | `POST /api/v1/shipments` (`shipments.ts:115`) | Any authenticated user (no per-route auth/role; mount auth only) | Req: `shipmentID, contractID, exporterID, buyerID, origin` notEmpty; `quantity` isNumeric; `grade` notEmpty; `icoNumber` notEmpty; `channel` notEmpty; `forexRate` isNumeric; `valueUSD` isNumeric; `eudrCompliant` isBoolean. Conditional-Req: `ecxLotNumber` if `channel=='ECX'`; `unionApprovalReference` if `channel=='Union'`; `bondReference` if `channel=='Direct Export'` (note: `.optional().if(...)` — effectively not enforced as required). Opt: `documents` isArray. Pre-checks: 400 if a shipment already exists for the `contractID` (`queryChaincode('QueryShipmentsByContract')`, `:170–210`, best-effort); contract auto-mapping of exporter/buyer/quantity/grade/value (`ReadSalesContract`, `:220–245`); non-blocking quality-documents check (`QUALITY_CERTIFICATE`, `CUPPING_REPORT`, `:274–300`). | **— (no `CreateShipment` call).** Direct CouchDB insert (`:314–355`, `Status: 'pending'`) + PG INSERT `status='pending'` (`:366–382`). Consequences: chaincode `CREATED` status, the LC forex gate (`main.go:1514`, LC must be `FOREX_ALLOCATED`+), and the auto-created `PENDING` quality inspection (`main.go:1700–1711`) never run. Instead the route calls `shipmentService.createQualityInspectionTask({shipmentID, contractID, exporterID, coffeeType, quantity})` (`:415–424`), which inserts a PG `quality_inspections` row with status **`PENDING`** (uppercase, `shipmentService.ts:150`) — a different string from this route's own `pending`. |
| S2 | any → any `status` (gated by `statusManager.validateTransition('SHIPMENT', current, status)`, `:1012` — **permissive fallback, §1.5b**) | `PUT /api/v1/shipments/:shipmentID/status` (`shipments.ts:988`) | Any authenticated user (no per-route auth/role) | Req: `param('shipmentID')` notEmpty, `body('status')` notEmpty. Swagger (`:977`) claims enum `[CREATED, QUALITY_CONTROL, CUSTOMS_CLEARANCE, SHIPPED, DELIVERED]` — **not enforced** by the validator (only `notEmpty`). Current status is read from **chaincode** (`fabricService.getShipment`, `:1001`); if the shipment only exists in PG/CouchDB (as S1 creates it), this 404s. | `fabricService.updateShipmentStatus(shipmentID, status)` (`:1025`) → chaincode `UpdateShipmentStatus` (`main.go:1788`, no guard); then `statusManager.updateEntityStatus('SHIPMENT', …)` cascade (`:1029`). |
| S3 | any → `targetStatus` (**admin override, no transition validation at all**) | `POST /api/v1/shipments/:shipmentID/reconcile-status` (`shipments.ts:1183`) — "Forces blockchain status to match the expected workflow state. Admin use only" (docstring; **no role check in code**) | Any authenticated user (no per-route auth/role) | Req: `param('shipmentID')` notEmpty, `body('targetStatus')` notEmpty. | `invokeChaincode('UpdateShipmentStatus', [shipmentID, targetStatus])` (`:1212`). |
| S4 | any → `in_transit` (lowercase, CouchDB/PG view of the world) | `POST /api/v1/shipments/:shipmentID/bill-of-lading` (`shipments.ts:1423`) | Any authenticated user (no per-route auth/role) | Req: `param('shipmentID')` notEmpty, `billOfLadingNo, vesselName, departurePort, destinationPort, estimatedArrival` notEmpty. Opt: `trackingNumber`. | **— (none).** Direct CouchDB update of `SHIPMENT_<id>`: sets B/L fields + `Status='in_transit'` (`:1470–1485`). `RecordBillOfLading` chaincode (which would set `LOADED`, `main.go:2026`) is **not** called. |
| S5 | any → `status` ∈ swagger enum `[BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED]` (validator: only `notEmpty`, **enum not enforced**) | `PUT /api/v1/shipments/:shipmentID/shipping-status` (`shipments.ts:1552`) | `ShippingMSP` identity (`connectAsOrg('ShippingMSP')`, `:1565`); any authenticated user | Req: `param('shipmentID')` notEmpty, `body('status')` notEmpty. Opt: `location`. | `invokeChaincode('UpdateShipmentLocation', [shipmentID, location \|\| '', status])` (`:1567–1570`) — chaincode sets `Status=status` verbatim (`main.go:2135`). |
| S6 | `CUSTOMS_CLEARED` → `FREIGHT_BOOKED` (API check `:1736–1743`: `currentStatus !== 'CUSTOMS_CLEARED'` → 400; chaincode `updateShipmentStatus` itself has no guard) | `POST /api/v1/shipments/:shipmentID/book-freight` (`shipments.ts:1697`) | `ShippingMSP` (`connectAsOrg`, `:1727`); any authenticated user | Req: `param('shipmentID')` notEmpty, `freightForwarder` notEmpty, `transportMode` notEmpty + `isIn(['SEA','AIR'])`, `estimatedDepartureDate` notEmpty. Opt: `vesselName, containerNumber, estimatedArrivalDate, portOfLoading` (default `'Djibouti Port'`), `portOfDischarge`. Current status read via `queryChaincode('ReadShipment')` (`:1730`). Response names the next step: `GENERATE_BILL_OF_LADING` → `POST /:shipmentID/bill-of-lading` (`:1767–1773`). | `fabricService.updateShipmentStatus(shipmentID, 'FREIGHT_BOOKED')` (`:1760`) → `UpdateShipmentStatus`. `FREIGHT_BOOKED` is **not** in the `statusManager` SHIPMENT flow and no later endpoint gates on it. |
| S7 | `CUSTOMS_CLEARED` **or** `PERMIT_ISSUED` → `IN_TRANSIT` (chaincode guard `main.go:2732`-area: `Status != "CUSTOMS_CLEARED" && != "PERMIT_ISSUED"` → error; swagger docstring says `CUSTOMS_CLEARED -> IN_TRANSIT` only) | `POST /api/v1/shipments/:shipmentID/pickup` (`shipments.ts:1790`) | `ShippingMSP` (`:1805`); any authenticated user | Req: `param('shipmentID')` notEmpty, `pickupBy` notEmpty ("Pickup by (shipping company) is required"). Opt: `pickupLocation, vehicleNumber, driverName` (read but **not passed to chaincode**). `transportMode` is read from the shipment (`:1811–1815`, default `'SEA'`); `trackingNumber` is generated `TRK-<ts>` (`:1808`). | `invokeChaincode('PickupShipment', [shipmentID, pickupBy, transportMode, trackingNumber])` (`:1816–1821`). Chaincode `PickupShipment` (`main.go:2701`) sets `Status="IN_TRANSIT"` (`:2732`). |
| S8 | `IN_TRANSIT` → `DELIVERED` (chaincode guard: `Status != "IN_TRANSIT"` → error, `main.go:2776`-area) | `POST /api/v1/shipments/:shipmentID/delivery` (`shipments.ts:1896`) | `ShippingMSP` (`:1908`); any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body (no validators): `deliveryLocation, deliveredTo, receivedBy, receiverSignature` — `receivedBy`/`receiverSignature` are read but **not passed to chaincode**; chaincode receives only a composed note. | `invokeChaincode('ConfirmDelivery', [shipmentID, "Delivered to ${deliveredTo \|\| 'buyer'} at ${deliveryLocation \|\| 'destination'}"])` (`:1913–1916`). Chaincode `ConfirmDelivery` (`main.go:2764`) sets `Status="DELIVERED"` (`:2787`). |
| S9 | *(no shipment status change; LC status stays `ISSUED`)* | `POST /api/v1/shipments/:shipmentID/lc-documents` (`shipments.ts:1989`) — "Submit LC documents after shipment (updates LC to DOCUMENTS_SUBMITTED)" (docstring; **false** — see chaincode) | `ExporterMSP` (`connectAsOrg`, `:2009`); any authenticated user | Req: `param('shipmentID')` notEmpty, `lcID` notEmpty, `documentIDs` isArray. | `invokeChaincode('SubmitLCDocuments', [lcID, documentIDs])` (`:2005`). Chaincode (`banking.go:1474`) requires LC `ISSUED`/`FOREX_ALLOCATED` and **keeps `lc.Status` as `ISSUED`** (comment: "documents submitted but not yet verified"). The `shipmentID` path param is not passed to chaincode. Included here because it is a shipment-lifecycle step that changes nothing. |
| S10 | `CUSTOMS_CLEARED` → `LAND_TRANSPORT` (chaincode guard `main.go:2860`-area) | `POST /api/v1/shipments/:shipmentID/land-transport/start` (`shipments.ts:2050`) | `ShippingMSP` (`:2064`); any authenticated user | Req: `param('shipmentID')` notEmpty, `transportCompany` notEmpty, `truckPlateNumber` notEmpty. Opt: `driverName, sealNumber` (default `` `SEAL-${Date.now()}` ``). | `invokeChaincode('StartLandTransport', [shipmentID, transportCompany, truckPlateNumber \|\| '', driverName \|\| '', sealNumber \|\| SEAL-<ts>])` (`:2066–2072`). Chaincode (`main.go:2847`) sets `Status="LAND_TRANSPORT"`, `LandTransportStatus="IN_TRANSIT"` (`:2870–2876`). |
| S11 | `LAND_TRANSPORT` → `PORT_ARRIVED` (chaincode guard `main.go:2948`-area) | `POST /api/v1/shipments/:shipmentID/port/arrive` (`shipments.ts:2112`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `notes` (Opt, default `'Arrived at Djibouti Port'`). | `invokeChaincode('ArriveAtPort', [shipmentID, notes \|\| 'Arrived at Djibouti Port'])` (`:2124–2127`). Chaincode (`main.go:2935`) sets `Status="PORT_ARRIVED"`, `LandTransportStatus="ARRIVED"`. |
| S12 | `PORT_ARRIVED` → `CONTAINER_STUFFED` (chaincode guard `main.go:3029`-area) | `POST /api/v1/shipments/:shipmentID/container/stuff` (`shipments.ts:2167`) | `ShippingMSP`; any authenticated user | Req: `param('shipmentID')` notEmpty, `containerNumber` notEmpty, `containerType` notEmpty. Opt: `sealNumber` (default `SEAL-<ts>`), `stuffedBy` (default `'Port Authority'`), `location` (default `'Djibouti Port'`). | `invokeChaincode('StuffContainer', [shipmentID, containerNumber, containerType \|\| 'DRY', sealNumber \|\| SEAL-<ts>, stuffedBy \|\| 'Port Authority', location \|\| 'Djibouti Port'])` (`:2183–2190`). Chaincode (`main.go:3012`) sets `Status="CONTAINER_STUFFED"` (`:3035`). |
| S13 | `CONTAINER_STUFFED` → `VESSEL_LOADED` (chaincode guard `main.go:3127`-area) | `POST /api/v1/shipments/:shipmentID/vessel/load` (`shipments.ts:2230`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `notes` (Opt, default `'Container loaded on vessel'`). | `invokeChaincode('LoadOnVessel', [shipmentID, notes \|\| 'Container loaded on vessel'])` (`:2242–2245`). Chaincode (`main.go:3114`) sets `Status="VESSEL_LOADED"`. |
| S14 | `VESSEL_LOADED` → `DEPARTED` (chaincode guard `main.go:3203`-area) | `POST /api/v1/shipments/:shipmentID/vessel/depart` (`shipments.ts:2285`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `notes` (Opt, default `'Vessel departed from Djibouti'`). | `invokeChaincode('DepartFromPort', [shipmentID, notes \|\| 'Vessel departed from Djibouti'])` (`:2297–2300`). Chaincode (`main.go:3190`) sets `Status="DEPARTED"`. |
| S15 | `DEPARTED` → `IN_TRANSIT` (chaincode guard `main.go:3280`-area) | `POST /api/v1/shipments/:shipmentID/in-transit/update` (`shipments.ts:2340`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `trackingNumber` (Opt, default `''`). | `invokeChaincode('UpdateToInTransit', [shipmentID, trackingNumber \|\| ''])` (`:2352–2355`). Chaincode (`main.go:3267`) sets `Status="IN_TRANSIT"` (`:3290`). |
| S16 | `IN_TRANSIT` → `DESTINATION_ARRIVED` (chaincode guard `main.go:3358`-area) | `POST /api/v1/shipments/:shipmentID/destination/arrive` (`shipments.ts:2395`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `notes` (Opt, default `'Arrived at destination port'`). | `invokeChaincode('ArriveAtDestination', [shipmentID, notes \|\| 'Arrived at destination port'])` (`:2407–2410`). Chaincode (`main.go:3345`) sets `Status="DESTINATION_ARRIVED"`. |
| S17 | `DESTINATION_ARRIVED` → `DELIVERED` (chaincode guard `main.go:3436`-area) | `POST /api/v1/shipments/:shipmentID/delivery/complete` (`shipments.ts:2450`) | `ShippingMSP`; any authenticated user | Only validator: `param('shipmentID')` notEmpty. Body: `deliveryNotes` (Opt, default `'Delivery completed'`). | `invokeChaincode('CompleteDelivery', [shipmentID, deliveryNotes \|\| 'Delivery completed'])` (`:2462–2465`). Chaincode (`main.go:3423`) sets `Status="DELIVERED"`. Second delivery path alongside S8 (different from-state). |
| S18 | any → any `status` (**no transition validation, no from-state read**) | `POST /api/v1/shipments/:shipmentID/status` (`shipments.ts:2521`) | `authMiddleware` (explicit, `:2522`); any authenticated user | Only validator: `body('status')` notEmpty (`:2523`; no `param` validator). Body: `status` (Req), `location` (Opt), `updatedBy` (Opt, default `user.username`). | `invokeChaincode('UpdateShipmentStatus', [shipmentID, status])` (`:2532–2535`, blockchain-first) **then** PG `INSERT INTO shipment_status_history (shipment_id, status, location, updated_by, blockchain_tx_id)` (`:2542–2545`). Duplicate of S2 without the `statusManager` gate. |
| S19 | *(no status change — records a rejection decision; response: `shipmentStatusChanged: false`)* | `POST /api/v1/shipments/:shipmentID/reject-action` (`shipments.ts:2565`) | `requireRole('SHIPPING','SHIPPING_ADMIN')` (`:2567`) — the **only** role-gated route in `shipments.ts` | Req: `param('shipmentID')` notEmpty; `proposedAction` `isIn(['START_LAND_TRANSPORT','RECORD_PORT_ARRIVAL','CONTAINER_STUFFING','VESSEL_LOADING','VESSEL_DEPARTURE','IN_TRANSIT_UPDATE','DESTINATION_ARRIVAL','DELIVERY_COMPLETE'])`; `reason` trimmed, length 3–1000. | `fabricService.recordShipmentActionRejection(shipmentID, proposedAction, reason)` (`:2580`) → chaincode `RecordShipmentActionRejection` (`main.go:1850`-area, "records an immutable rejection decision without changing the shipment lifecycle state"). The decision is only valid while the shipment is at the state that action would execute from. |
| S20 | any → `LOADED` (chaincode `RecordShippingDetails` sets `Status="LOADED"`, `main.go:2096`) | `POST /api/v1/shipments/:shipmentID/shipping-document` (`shipments.ts:2619`) — "Universal shipping document … Bill of Lading (SEA) and Airway Bill (AIR)" | `authMiddleware` (`:2620`); connects as **`ECTAMSP`** (`:2652`, comment: "exporters submit shipping docs"); any authenticated user | Req: `param('shipmentID')` notEmpty; `transportMode` `isIn(['SEA','AIR'])`; `documentNo, carrierName, vesselOrFlight, departurePoint, destinationPoint, estimatedArrival` notEmpty. Opt: `trackingNumber, containerNumber, containerType, voyageNumber` (all default `''`). | `invokeChaincode('RecordShippingDetails', [shipmentID, transportMode, documentNo, carrierName, vesselOrFlight, departurePoint, destinationPoint, estimatedArrival, trackingNumber\|\|'', containerNumber\|\|'', containerType\|\|'', voyageNumber\|\|''])` (`:2656–2668`) — 12 args, matching chaincode (`main.go:2073–2076`). Third B/L path alongside S4 (→ `in_transit`, no chaincode) and the uncalled `RecordBillOfLading` (→ `LOADED`). |
| S21 | `PORT_ARRIVED` → `CONTAINER_STUFFED` *(intended; **cannot run** — see chaincode column)* | `POST /api/v1/shipments/:shipmentId/container/stuff` (`shipments.ts:2713`) — duplicate of S12, `:shipmentId` (lowercase `d`) | `authMiddleware` (`:2714`); any authenticated user | **No validator chains at all.** Body (all effectively optional — defaults applied): `containerNumber` (default `` `CNT-${Date.now()}` ``), `containerType` (default `'DRY'`), `stuffingDate` (default now), `stuffingLocation` (default `'Djibouti Port'`), `stuffedBy` (default `'Port Authority'`), `containerCondition` (default `'GOOD'`), `sealNumber` (default `SEAL-<ts>`). | `invokeChaincode('RecordContainerStuffing', [shipmentId, containerNumber, containerType, stuffingDate, stuffingLocation, stuffedBy, containerCondition, sealNumber])` (`:2730–2739`). ⚠️ **No function named `RecordContainerStuffing` exists in `chaincodes/coffee/`** (grep: zero hits). Duplicate of S12 calling a non-existent function with a different (8-arg) signature. |
| S22 | `CONTAINER_STUFFED` → `VESSEL_LOADED` *(intended; **cannot run**)* | `POST /api/v1/shipments/:shipmentId/vessel/load` (`shipments.ts:2771`) — duplicate of S13 | `authMiddleware` (`:2772`); any authenticated user | **No validator chains.** Body: `notes` (Opt, default `'Container loaded on vessel'`). | `invokeChaincode('RecordVesselLoading', [shipmentId, <ISO now>, notes \|\| 'Container loaded on vessel'])` (`:2780–2784`). ⚠️ **No `RecordVesselLoading` in chaincode** (grep: zero hits). |
| S23 | `VESSEL_LOADED` → `DEPARTED` *(intended; **cannot run**)* | `POST /api/v1/shipments/:shipmentId/vessel/depart` (`shipments.ts:2816`) — duplicate of S14 | `authMiddleware` (`:2817`); any authenticated user | **No validator chains.** Body: `notes` (Opt, default `'Vessel departed from Djibouti'`). | `invokeChaincode('RecordVesselDeparture', [shipmentId, <ISO now>, notes \|\| 'Vessel departed from Djibouti'])` (`:2825–2829`). ⚠️ **No `RecordVesselDeparture` in chaincode** (grep: zero hits). |
| S24 | `DEPARTED` → `IN_TRANSIT` (duplicate of S15; this one works — the function exists) | `POST /api/v1/shipments/:shipmentId/in-transit/update` (`shipments.ts:2861`) — duplicate of S15 | `authMiddleware` (`:2862`); any authenticated user | **No validator chains.** Body: `trackingNumber` (Opt, default `` `TRK-${Date.now()}` `` — differs from S15's default `''`). | `invokeChaincode('UpdateToInTransit', [shipmentId, trackingNumber \|\| TRK-<ts>])` (`:2870–2873`). Chaincode guard: must be `DEPARTED` (`main.go:3280`-area). |
| S25 | `IN_TRANSIT` → `DESTINATION_ARRIVED` *(intended; **cannot run**)* | `POST /api/v1/shipments/:shipmentId/destination/arrive` (`shipments.ts:2905`) — duplicate of S16 | `authMiddleware` (`:2906`); any authenticated user | **No validator chains.** Body: `notes` (Opt, default `'Arrived at destination port'`). | `invokeChaincode('RecordDestinationArrival', [shipmentId, <ISO now>, notes \|\| 'Arrived at destination port'])` (`:2914–2918`). ⚠️ **No `RecordDestinationArrival` in chaincode** (grep: zero hits). |
| S26 | `DESTINATION_ARRIVED` → `DELIVERED` *(intended; arg-count mismatch)* | `POST /api/v1/shipments/:shipmentId/delivery/complete` (`shipments.ts:2950`) — duplicate of S17 | `authMiddleware` (`:2951`); any authenticated user | **No validator chains.** Body: `deliveryNotes` (Opt, default `'Delivery completed successfully'`). | `invokeChaincode('CompleteDelivery', [shipmentId, <ISO now>, deliveryNotes \|\| 'Delivery completed successfully'])` (`:2959–2963`) — **3 args**. Chaincode `CompleteDelivery` (`main.go:3423–3425`) takes **2 args** `(shipmentID, deliveryNotes)`; the ISO timestamp lands in the `deliveryNotes` position. |
| S27 | any → `logisticsStatus` ∈ `{PENDING, BOOKED, LOADED, DEPARTED, IN_TRANSIT, ARRIVED, DELIVERED, CONFIRMED}` (**separate column; `shipments.status` untouched**) | `PUT /api/v1/shipments/:shipmentID/logistics-status` (`shipments.ts:3033`) | `authMiddleware` (`:3034`); any authenticated user | Req: `param('shipmentID')` notEmpty; `logisticsStatus` notEmpty + `isIn([...8 values])` (`:3039–3041`). Opt (no validator): `location, notes`. | **— (no chaincode).** `shipmentService.updateLogisticsStatus(shipmentID, logisticsStatus, userId, userOrg, {location, notes})` (`:3051–3057`) → PG `UPDATE shipments SET logistics_status=$1` (`shipmentService.ts:355–358`) + audit log. No from-state check; no transition table for logistics status (any → any within the enum). |

### 2.6 Shipping (bookings) — `api/src/routes/shipping.ts` (mounted `/api/v1/shipping`)

All routes `authMiddleware` only; **no `requireRole`, no validator chains, no chaincode calls** —
PostgreSQL `shipments` table only. Note the identity confusion: `POST /bookings` inserts a **new**
`shipments` row whose `shipment_id` is the generated booking id (`BOOK-<ts>`) and whose
`contract_id` is the caller-supplied `shipmentID` (`shipping.ts:343–373`); the load/depart/arrive/
deliver endpoints then treat that booking id as a `shipment_id`.

| # | Transition (from → to) | Endpoint | Who | Request body (Req / Opt + validation as written) | Chaincode called |
|---|---|---|---|---|---|
| B1 | — → `BOOKED` | `POST /api/v1/shipping/bookings` (`shipping.ts:329`) | Any authenticated user | **No validators.** Body: `shipmentID, exporterID, shippingLine, vesselName, voyageNumber, containerType, numberOfContainers, portOfLoading, portOfDischarge, estimatedDepartureDate, estimatedArrivalDate` — all optional in code (`shippingLine` defaults `'Maersk Line'`, ports default `'Djibouti'`/`'New York'`). `exporterID, vesselName, voyageNumber, containerType, numberOfContainers` are read but **never persisted**. | — (none). PG INSERT into `shipments` (`:343–373`). |
| B2 | any → `LOADED` (**no from-state guard**) | `POST /api/v1/shipping/bookings/:bookingId/load` (`shipping.ts:400`) | Any authenticated user | **No validators.** Body: `loadingDate, containerNumbers, sealNumbers, loadedBy` — all optional; arrays joined with `,` if arrays. `loadingDate`/`loadedBy` echoed, not persisted. | — (none). PG `UPDATE shipments SET status='LOADED', container_number, seal_number` (`:410–417`). |
| B3 | any → `IN_TRANSIT` (**no guard; skips `DEPARTED`** — there is no depart-status step in this file) | `POST /api/v1/shipping/bookings/:bookingId/depart` (`shipping.ts:453`) | Any authenticated user | **No validators.** Body: `departureDate, actualDepartureTime` — `actualDepartureTime` echoed, not persisted; `departureDate` defaults to today. | — (none). PG `UPDATE … status='IN_TRANSIT', actual_departure` (`:463–469`). |
| B4 | any → `ARRIVED` (**no guard**) | `POST /api/v1/shipping/bookings/:bookingId/arrive` (`shipping.ts:503`) | Any authenticated user | **No validators.** Body: `arrivalDate, actualArrivalTime` — same pattern as B3. | — (none). PG `UPDATE … status='ARRIVED', actual_arrival` (`:513–519`). |
| B5 | any → `DELIVERED` (**no guard**) | `POST /api/v1/shipping/bookings/:bookingId/deliver` (`shipping.ts:553`) | Any authenticated user | **No validators.** Body: `deliveryDate, receivedBy, deliveryNotes` — `receivedBy`/`deliveryNotes` echoed, not persisted; `deliveryDate` defaults to today. | — (none). PG `UPDATE … status='DELIVERED', delivery_date` (`:563–568`). |

Read-only: `GET /shipments` (`:16`, `?status=` filter), `GET /shipments/:shipmentId` (`:95`),
`GET /bookings` (`:174`), `GET /tracking` (`:237` — synthesises events from `track.status`:
`LAND_TRANSPORT/ARRIVED_PORT/PORT_WAREHOUSED/VESSEL_LOADED/IN_TRANSIT/DESTINATION_PORT/DELIVERED`
imply `IN_TRANSIT`; `DELIVERED` implies `DELIVERED`, `:288–295`. Note `ARRIVED_PORT`,
`PORT_WAREHOUSED`, `DESTINATION_PORT` appear **only** here — no writer in this slice sets them).

## 3. Chaincode transition reference (functions the routes call, or should call)

### 3.1 Quality (`chaincodes/coffee/quality.go`)

| Function (line) | From → To (guard) | Notes |
|---|---|---|
| `RequestInspection` (`:102`) | — → `PENDING` (`:153`); shipment → `INSPECTION_PENDING` (`:171`, best-effort) | Args `(inspectionID, shipmentID, contractID, exporterID, scheduledDate)`. Shipment existence is only logged, not required (`:124–130`). **Called by no route in this slice.** |
| `PerformInspection` (`:183`) | `PENDING` → `INSPECTED` (`:337`); guard `Status != "PENDING"` → error (`:204–205`) | 25 args incl. all cupping scores; computes `TotalScore` (sum of 10 scores) and grade via `determineQualityGrade` / `determineCuppingGrade` (`:379–425`). **Called by no route** (API perform is PG/CouchDB only, Q4). |
| *(no approve/reject function)* | — | `APPROVED`/`REJECTED`/`REWORK` in the struct comment (`:70`) have no writer. API approve (Q5/Q6) and reject (Q7/Q8) therefore cannot be represented on-chain as quality-inspection states; Q7 instead calls the pre-shipment `RejectInspection` (wrong entity). |

### 3.2 Permits (`chaincodes/coffee/permit.go`)

| Function (line) | From → To (guard) | Notes |
|---|---|---|
| `IssueCBEExportPermit` (`:48`) | — → `ISSUED` (`:187`) | 13 args. MSP must be `BanksMSP` (`:66–69`). Dependencies: exporter `ACTIVE`, contract `APPROVED` if given, LC `ISSUED`/`APPROVED` if LC + `lcID` given, CAD amount-tier approvals. Expiry = end of current month (`:175–177`). |
| `UtilizeExportPermit` (`:222`) | `ISSUED` → `UTILIZED` (`:276`); guards `Status != "ISSUED"` (`:256`), expired (`:260–268`) | MSP `BanksMSP`/`CustomsMSP`. Records utilizer X.509 + MSP. |
| `SettleExportPermit` (`:291`) | `UTILIZED` → `SETTLED` (`:340`); guard `Status != "UTILIZED"` (`:330`) | MSP `BanksMSP`. Sets `Outstanding=false`, `RepatriatedAmount`; amount mismatch noted in `Remarks` (`:349–352`). |

### 3.3 Phytosanitary (`chaincodes/coffee/phytosanitary.go`)

| Function (line) | From → To (guard) | Notes |
|---|---|---|
| *(no `RequestPhytosanitaryCertificate`)* | — | Called by API H1; does not exist. |
| *(no `InspectPhytosanitaryCertificate`)* | — | Called by API H2; does not exist. |
| `IssuePhytosanitaryCertificate` (`:47`) | — → `ISSUED` (`:121`) | 14 args (see H3). Requires `ShipmentExists` (`:68–73`). Auto-generates `CertificateNumber` (`PHYTO-ET-<date>-<n>`), `ValidUntil` +14 days, `InspectionResult="PASSED"`. |
| `RevokePhytosanitaryCertificate` (`:189`) | any non-`REVOKED` → `REVOKED` (`:218`); guard already-`REVOKED` (`:206`) | 3 args `(certificateID, revokedBy, reason)` — API passes 4 in swapped order (H4). |

### 3.4 Pre-shipment inspection (`chaincodes/coffee/inspection.go`)

| Function (line) | From → To (guard) | Notes |
|---|---|---|
| `RequestPreShipmentInspection` (`:103`) | — → `REQUESTED` (`:148`) | 10 args. No existence check for contract/shipment; no duplicate check (overwrites same key). |
| `ScheduleInspection` (`:174`) | (any) → `SCHEDULED` (`:210`) | 4 args. **No from-state guard.** |
| `RecordInspectionResults` (`:232`) | (any) → `COMPLETED` (`:299/301/304`, all `overallResult` branches) | 11 args. Derives acceptability flags; `ReInspectionRequired=true` only on non-PASS/non-CONDITIONAL_PASS. |
| `IssueCertificate` (`:328`) | *(no status change)* | 3 args `(inspectionID, certificateNumber, certificateURL)`; sets `CertificateExpiry` +90 days. API quality `/issue` (Q9) calls this with 5 mismatched args; API inspection `/certificate` (I4) calls it correctly. |
| `ApproveInspection` (`:374`) | (any) → `APPROVED` (`:407`) | 2 args. **No from-state guard.** Records approver X.509/MSP. |
| `RejectInspection` (`:430`) | (any) → `REJECTED` (`:463`) | 2 args `(inspectionID, rejectionReason)`; sets `ReInspectionRequired=true`. API quality reject (Q7) calls it with 3 args against a quality-inspection id. |

### 3.5 Shipment functions in `chaincodes/coffee/main.go` (called by `shipments.ts`)

| Function (line) | From → To (guard) |
|---|---|
| `CreateShipment` (`:1471`) | — → `CREATED` (`:1676`); auto-creates quality inspection `PENDING` (`:1711`). LC gate: contract's LC must be `FOREX_ALLOCATED`+ (`:1514`). **Called by no route** (S1 writes CouchDB/PG directly). |
| `UpdateShipmentStatus` (`:1788`) | any → any (`:1812`); **no guard, no allow-list**. |
| `UpdateShipmentLocation` (`:2121`) | any → `status` verbatim (`:2135`); `ARRIVED`/`DELIVERED` also set `ActualArrival`. |
| `RecordBillOfLading` (`:1994`-area) | any → `LOADED` (`:2026`). **Called by no route** (S4 writes CouchDB `in_transit` instead). |
| `RecordAirwayBill` | any → `LOADED` (`:2061`). Called by no route. |
| `RecordShippingDetails` (`:2073`) | any → `LOADED` (`:2096`). Called by S20. |
| `PickupShipment` (`:2701`) | `CUSTOMS_CLEARED` or `PERMIT_ISSUED` → `IN_TRANSIT` (`:2732`). |
| `ConfirmDelivery` (`:2764`) | `IN_TRANSIT` → `DELIVERED` (`:2787`). |
| `SubmitLCDocuments` (`banking.go:1474`) | LC `ISSUED`/`FOREX_ALLOCATED` → LC stays `ISSUED` (documents attached only). |
| `StartLandTransport` (`:2847`) | `CUSTOMS_CLEARED` → `LAND_TRANSPORT` (`:2870`). |
| `ArriveAtPort` (`:2935`) | `LAND_TRANSPORT` → `PORT_ARRIVED` (`:2958`). |
| `StuffContainer` (`:3012`) | `PORT_ARRIVED` → `CONTAINER_STUFFED` (`:3035`). |
| `LoadOnVessel` (`:3114`) | `CONTAINER_STUFFED` → `VESSEL_LOADED` (`:3137`). |
| `DepartFromPort` (`:3190`) | `VESSEL_LOADED` → `DEPARTED` (`:3213`). |
| `UpdateToInTransit` (`:3267`) | `DEPARTED` → `IN_TRANSIT` (`:3290`). |
| `ArriveAtDestination` (`:3345`) | `IN_TRANSIT` → `DESTINATION_ARRIVED` (`:3368`). |
| `CompleteDelivery` (`:3423`) | `DESTINATION_ARRIVED` → `DELIVERED` (`:3446`). |
| `RecordShipmentActionRejection` (`:1850`-area) | *(no status change)* — records rejection of a proposed action. Called by S19. |
| *(no `RecordContainerStuffing` / `RecordVesselLoading` / `RecordVesselDeparture` / `RecordDestinationArrival`)* | — | Called by API S21/S22/S23/S25; do not exist (grep: zero hits in `chaincodes/coffee/`). |

## 4. Dependencies (what each step needs from a previous step)

| Step | Requires (exact field names) | Where enforced |
|---|---|---|
| Quality create (Q1) | `shipmentID` (must exist as a shipment in the caller's mind — **not** verified: no shipment lookup in the handler; duplicate-`pending` check only). `contractID` optional. | `quality.ts:279`, `:298` |
| Quality perform (Q4) | A `quality_inspections` row with `inspection_id = :inspectionID` and `status` in (`pending`,`requested`). | `quality.ts:422–434` |
| Quality approve (Q5) | Same row, `status = 'inspected'`. Produces `certification_number` (default `CERT<id>`), which issue-permit later requires. Side-effect: auto-creates a customs declaration for the row's `shipment_id` via `shipmentService.triggerCustomsDeclaration`. | `quality.ts:634–652`, `:841–868` |
| Quality issue-permit (Q10) | Same row `status = 'approved'` OR `passed = true`, **and** `certification_number` non-null (i.e. Q5/Q6 or Q9 must have run). Produces only a `remarks` annotation — no permit record is created anywhere. | `quality.ts:1118–1148` |
| Quality certificate (Q9) | `inspectionID` row must exist (`:1037`); no status requirement. | `quality.ts:1037` |
| Permit issue (P1) | `permitID`, `shipmentID` (API-level only; `shipmentID` is **not** passed to chaincode). Chaincode: exporter `exporterID` with `LicenseStatus='ACTIVE'`; if `contractID` given, contract `APPROVED`; if `paymentMethod='LC'` and `lcID` given, LC `ISSUED`/`APPROVED`. | `permits.ts:38`, `permit.go:88–152` |
| Permit utilize (P2) | Permit `permitID` in `ISSUED`, unexpired. | `permit.go:256–268` |
| Permit settle (P3) | Permit `permitID` in `UTILIZED`; body `repatriatedAmount`. | `permit.go:330` |
| Phyto request (H1) | `certificateID, shipmentID, exporterID`. (Chaincode function missing, so nothing is actually required.) | `phytosanitary.ts:44–48` |
| Phyto issue (H3) | Chaincode: shipment `shipmentID` must exist — but the API never sends one (passes `certificateNumber` in that position). | `phytosanitary.go:68–73` |
| Inspection request (I1) | `inspectionId/inspectionID` + `shipmentId/shipmentID` (API `POST /` only); `contractId, exporterId, inspectionAgency, inspectionLocation, contractQuantity, contractGrade, contractType, packagingType` (chaincode stores all; none verified). | `inspection.ts:56–66`, `inspection.go:103` |
| Inspection schedule/results/approve/reject (I2/I3/I5/I6) | Only the inspection record (`:id`) must exist; no check that the previous step ran (chaincode has no guards). Results are judged against the `contractQuantity/Grade/Type` stored at request time. | `inspection.go:174–463` |
| Shipment create (S1) | `contractID` (duplicate-check via `QueryShipmentsByContract`; auto-mapping via `ReadSalesContract`). Chaincode `CreateShipment` would additionally require the contract's LC `FOREX_ALLOCATED`+ — bypassed because S1 never calls it. | `shipments.ts:170–245` |
| Shipment book-freight (S6) | Shipment `ReadShipment` → `Status = 'CUSTOMS_CLEARED'`. (Customs clearance itself is outside this slice.) | `shipments.ts:1730–1743` |
| Shipment pickup (S7) | Shipment `Status` in (`CUSTOMS_CLEARED`, `PERMIT_ISSUED`). | `main.go` `PickupShipment` guard |
| Shipment land-transport chain (S10–S17) | Strict linear chain, each step gated on the previous step's exact chaincode status: `CUSTOMS_CLEARED → LAND_TRANSPORT → PORT_ARRIVED → CONTAINER_STUFFED → VESSEL_LOADED → DEPARTED → IN_TRANSIT → DESTINATION_ARRIVED → DELIVERED`. | `main.go:2847–3446` guards |
| Shipment delivery via S8 | Shipment `Status = 'IN_TRANSIT'` (any `IN_TRANSIT`, including one reached via S7 pickup — which skips the whole land/port/vessel chain). | `main.go` `ConfirmDelivery` guard |
| B/L paths (S4/S20) | S4: shipment must exist in CouchDB (`SHIPMENT_<id>`). S20: shipment must exist on-chain (`ReadShipment` inside `RecordShippingDetails`). Neither checks any from-status. | `shipments.ts:1458–1485`, `:2656` |
| Shipping bookings (B1–B5) | B2–B5 need only a `shipments` row with `shipment_id = :bookingId` (created by B1); no status, contract, or chaincode prerequisite. | `shipping.ts:400–553` |

**Cross-entity handoffs inside the slice:** shipment create (S1) → auto quality task (`PENDING`,
`shipmentService.ts:128–152`); quality approve (Q5) → auto customs declaration
(`quality.ts:841–868`); quality approve → `certification_number` → issue-permit (Q10) gate;
book-freight (S6) response points to bill-of-lading (S4) as the next step. There is **no**
code link from quality/permit/phyto/inspection approval into the shipment status machine:
`statusManager`'s `QUALITY_APPROVED`/`PHYTO_APPROVED` cascade entries (`statusManager.ts:175–182`)
are only reachable through the generic `PUT /status` (S2) if a caller manually passes those
strings — no route invokes them after approving a quality inspection, permit, phyto certificate,
or pre-shipment inspection.

## 5. Dead ends (statuses with no outgoing transition in code)

| Status | Entity / vocabulary | Why it is a dead end |
|---|---|---|
| `rejected` | Quality PG | Q7/Q8 are terminal. No rework, re-request, or re-perform path: perform requires `pending`/`requested`, and a rejected row can never return to either (no endpoint sets them). Chaincode `REWORK` (comment only) has no writer and no reader. |
| `certificate_issued` | Quality PG | Nothing reads it as a from-state. The only onward step, issue-permit (Q10), is reachable from it **only** via the `passed=true` side of its OR-guard; an inspection with `passed` false/null is stuck. |
| `permit_issued` | Quality PG | Nothing reads it; no onward step in any file in this slice. |
| `completed` | Quality PG | Legacy complete (Q11) is terminal; nothing reads `completed`. |
| `sample_collected` | Quality PG | Has an onward step only because lab-results (Q3) has **no** from-state guard; if a guard were ever added matching its docstring, the chain is `pending → sample_collected → inspected`. As written it is reachable from any state and escapable to `inspected` from any state. |
| `SETTLED` | Permit chaincode | Terminal by design (no outgoing in `permit.go`). |
| `EXPIRED`, `CANCELLED` | Permit chaincode | Declared (`permit.go:26`) but never set and never read — unreachable states. |
| `REVOKED` | Phyto chaincode | Terminal by design. |
| `EXPIRED` | Phyto chaincode | Declared (`phytosanitary.go:35`) but never set. |
| `APPROVED` | Pre-shipment inspection | Terminal **within this slice**: nothing consumes an approved pre-shipment inspection (no shipment gate checks it; `PickupShipment` accepts `CUSTOMS_CLEARED`/`PERMIT_ISSUED`, not inspection approval). |
| `REJECTED` | Pre-shipment inspection | Terminal; `ReInspectionRequired=true` is set but there is no re-inspection endpoint — only a fresh `POST /request` with a new id. |
| `IN_PROGRESS` | Pre-shipment inspection | Declared (`inspection.go:58`) but never set. |
| `DELIVERED` | Shipment (all vocabularies) | Terminal in `statusManager` (`DELIVERED: []`) and in chaincode (no function leaves `DELIVERED`). |
| `FREIGHT_BOOKED` | Shipment chaincode | Set by S6; **no endpoint gates on it** and no function leaves it — the documented next step (B/L, S4) sets `in_transit` in CouchDB without reading chaincode state, and S20 sets `LOADED`. In chaincode terms it is a dead end. |
| `LOADED` | Shipment chaincode | Set by S20 / `RecordBillOfLading` / `RecordShippingDetails`; no endpoint or chaincode function requires `LOADED` as a from-state, so nothing guards the onward step. |
| `QUALITY_REJECTED`, `CUSTOMS_REJECTED`, `CANCELLED` | `statusManager` SHIPMENT flow | Terminal by design (`:81–83`) **and** unreachable: no route in this slice ever sets them (only S2/S3/S18 write arbitrary statuses, and no caller in-slice passes these strings). |
| `QUALITY_INSPECTION`, `QUALITY_APPROVED`, `PHYTO_INSPECTION`, `PHYTO_APPROVED`, `EUDR_*`, `INSURANCE_REGISTERED`, `BORDER_CROSSING`, `CUSTOMS_DECLARED` | `statusManager` SHIPMENT flow | Defined as intermediate states (`statusManager.ts:63–75`) but **never set by any route in this slice** — the generic `PUT /status` (S2) is the only writer and no in-slice caller passes them. The shipment can therefore never traverse the documented `CREATED → … → DELIVERED` path except by manual/external calls. |
| `BOOKED` (shipping.ts) / `ARRIVED` (shipping.ts) | Shipping bookings, PG | `BOOKED` is left only via unguarded load (B2); `ARRIVED` (B4) is left only via unguarded deliver (B5). Both "work" only because nothing is guarded. |
| `CONFIRMED` | Logistics status | Enum member (`shipments.ts:3040`) with no outgoing semantics — it is a value, not a step; nothing reads `logistics_status` as a gate anywhere in this slice. |
| `pending` / `in_transit` (lowercase, PG) | Shipments PG | No route gates on them (all chaincode guards read chaincode state, which S1/S4 never wrote). A shipment created by S1 is invisible to every chaincode-guarded step until something writes it on-chain. |
| `ARRIVED_PORT`, `PORT_WAREHOUSED`, `DESTINATION_PORT` | Shipping tracking only | Appear only in `shipping.ts:288` as tracking-event conditions; **no writer anywhere in this slice** sets them. |

## 6. Inconsistencies and defects (numbered)

1. **Two `GET /quality/inspections` handlers** (`quality.ts:22` and `:1281`, identical purpose, second one normalises fields). Express matches the first; the second is unreachable dead code.
2. **Duplicate approve (Q5 POST vs Q6 PUT) and duplicate reject (Q7 POST vs Q8 PUT) in quality.** POST versions guard on `inspected`, call chaincode (reject only), sign documents and trigger customs (approve only); PUT versions have no guard, no chaincode, no side effects, and write a different column on reject (`notes` vs `remarks`). Same URL, different semantics by method.
3. **Duplicate shipment lifecycle endpoints** (first set `:shipmentID`, S10–S17, vs second set `:shipmentId`, S21–S26). The second set has no validators, calls differently-named chaincode functions, four of which do not exist (S21–S23, S25), and S26 passes 3 args to a 2-arg function. Both sets are mounted simultaneously.
4. **Phyto request/inspect chaincode functions do not exist** (H1, H2). The API's first two phyto steps can never succeed against the committed chaincode, and the statuses they imply (`REQUESTED`, `INSPECTED`) do not exist in the chaincode struct.
5. **Phyto issue arg mismatch** (H3): API passes 5 args, chaincode takes 14; values land in wrong positions and the shipment-existence check runs against the certificate number.
6. **Phyto revoke arg mismatch** (H4): API passes `(id, reason, revokedBy, date)`; chaincode takes `(id, revokedBy, reason)` — reason and revoker are swapped on-chain.
7. **Quality reject/issue call the wrong chaincode functions with the wrong arity** (Q7: `RejectInspection` 3 args vs 2, pre-shipment entity; Q9: `IssueCertificate` 5 args vs 3, and with `(certId, inspectionId, …)` order vs `(inspectionID, certificateNumber, certificateURL)`). Both will fail or corrupt state at the Fabric gateway.
8. **Quality approve/perform/issue-permit/complete/collect-sample/lab-results never touch chaincode** (Q2–Q6, Q10, Q11) — they write PG and/or CouchDB with `blockchain_tx_id: NULL`, while Q7/Q9 are "blockchain-first". The quality chain's on-chain record therefore only ever contains a rejection or a (mismatched) certificate call; approvals, grades and permits exist only off-chain. Perform even reads/writes a **different CouchDB database** (`fabricchannel_cecbschannel`, `:505`) from create (`coffeechannel_coffee`, `:340`).
9. **Shipment creation never calls `CreateShipment`** (S1): no `CREATED` chaincode status, no LC forex gate, no auto `PENDING` quality inspection on-chain. The compensating PG task uses uppercase `PENDING` while the route's own shipment status is lowercase `pending`.
10. **`statusManager` SHIPMENT flow ≠ chaincode reality** (§1.5b): `LAND_TRANSPORT_STARTED` vs `LAND_TRANSPORT`; `ARRIVED_DESTINATION` vs `DESTINATION_ARRIVED`; `DEPARTED` missing from the flow while `VESSEL_LOADED → IN_TRANSIT` skips it; `FREIGHT_BOOKED`/`LOADED`/`BOOKED` absent. And `validateTransition` allows any status not in the map, so the `PUT /status` gate (S2) is a no-op for off-map current states.
11. **Three B/L paths disagree on the resulting status:** S4 (CouchDB) → `in_transit` (lowercase); S20 (chaincode `RecordShippingDetails`) → `LOADED`; uncalled `RecordBillOfLading` → `LOADED`. Same business step, two different end states in two different stores.
12. **Two delivery paths with different from-states:** S8 `IN_TRANSIT → DELIVERED` (`ConfirmDelivery`) vs S17 `DESTINATION_ARRIVED → DELIVERED` (`CompleteDelivery`), plus B5 (PG-only, unguarded) and S26 (duplicate, 3-arg call). A shipment picked up via S7 (`→ IN_TRANSIT`) can be delivered via S8 while skipping the entire land/port/vessel chain; a shipment that went through the chain cannot use S8.
13. **Pickup accepts a status the book-freight step cannot produce:** `PickupShipment` accepts `PERMIT_ISSUED` as well as `CUSTOMS_CLEARED`, but no route in this slice ever sets a shipment to `PERMIT_ISSUED` (quality `permit_issued` is a different entity's PG row, Q10). The `PERMIT_ISSUED` branch is unreachable from these routes.
14. **Inspection results approve a failure:** `RecordInspectionResults` sets `COMPLETED` for `FAIL` too, and `ApproveInspection` has no guard — a failed inspection (`QualityAcceptable=false`, `ReInspectionRequired=true`) can be approved with no further check (I5). There is also no re-inspection endpoint.
15. **Issue-permit guard is an OR, not an AND** (Q10): `status !== 'approved' && passed !== true` rejects only when *both* fail, so an inspection that merely has `passed=true` (e.g. via legacy complete Q11 with `passed=true` and any grade, no approval) can get a permit. And Q10 creates **no permit record** — it is not the CBE permit (P1), despite the name and the "Shipment ready for customs clearance" message.
16. **Permits has two issue endpoints with different validation** (P1a vs P1b): `POST /` validates `permitID`+`shipmentID` manually and fills 8 hard-coded defaults (`amount=85000`, `destination='Germany'`, …); `POST /issue` validates nothing and throws 500 on a missing `amount`. `GET /:permitId` (`:201`) shadows `GET /exporter/:exporterId` and `GET /outstanding/all` by registration order.
17. **Role-check inconsistency in phyto:** inspect/issue use an inline `user.role !== 'ECTA'` check that **rejects `ECTA_ADMIN`**, while revoke uses `requireRole('ECTA','ECTA_ADMIN')` *plus* an org check. Quality approve uses `requireRole`, quality reject/perform/issue-permit use none. No permit route uses `requireRole` at all (relies on chaincode MSP checks, which P2/P3 don't even set up with `connectAsOrg`).
18. **Grade rules disagree:** API perform (Q4) grades by `overall` alone (`≥85 → Grade 1`, …); chaincode `determineQualityGrade` grades by defects + total cupping score + moisture (`quality.go:379–412`); the chaincode is never called, so the on-chain rule is dead and the API rule is the only live one.
19. **`SubmitLCDocuments` does not do what its route docstring says** (S9): docstring claims "updates LC to DOCUMENTS_SUBMITTED"; chaincode keeps LC `ISSUED` (`banking.go` comment). No `DOCUMENTS_SUBMITTED` LC status is ever produced by this step.
20. **Shipping bookings conflate booking and shipment ids** (B1): a booking row is a `shipments` row with `shipment_id = BOOK-<ts>` and `contract_id = <the shipmentID the caller passed>`, so `GET /shipping/bookings`, tracking, and the shipments list all mix bookings with real shipments; B3 skips `DEPARTED`; `ARRIVED_PORT`/`PORT_WAREHOUSED`/`DESTINATION_PORT` are referenced by tracking but never written.
21. **Response/status spelling drift:** `POST /inspection` returns `status: 'pending'` for chaincode `REQUESTED` (I1a); `PUT /quality/…/approve` returns `'APPROVED'` for PG `'approved'` (Q6); `POST /quality/issue` returns `'issued'` for PG `'certificate_issued'` (Q9); `POST /permits` returns `'issued'` for chaincode `'ISSUED'` (P1a). Clients keying on response strings see different values from clients reading the store.
22. **`statusManager`'s `PHYTOSANITARY` flow is dead code for this slice** (§1.3): defined (`REQUESTED → INSPECTION_SCHEDULED → …`) but no route calls it, and its state names match neither the API nor the chaincode.
23. **S2 reads current status from chaincode, S1/S4 never write chaincode:** a shipment created through the normal API path (S1) has no chaincode record, so `PUT /:shipmentID/status` (S2) and `book-freight` (S6, `ReadShipment`) 404 on it, while the unguarded `POST /:shipmentID/status` (S18) and the CouchDB B/L path (S4) succeed. The two status-update endpoints disagree about which store is authoritative.

## 7. Counts

- **Mutating endpoints documented: 58** — Quality 11 (Q1–Q11), Permits 4 (P1a, P1b, P2, P3),
  Phytosanitary 4 (H1–H4), Pre-shipment inspection 7 (I1a, I1b, I2–I6), Shipments 27 (S1–S27),
  Shipping bookings 5 (B1–B5).
- **Transition rows in the tables: 58** (one per endpoint: 11 + 4 + 4 + 7 + 27 + 5). The
  inspection certificate step I4 and the no-change steps S9/S19 are included as rows and flagged
  as changing no status.
- **Distinct status string values inventoried: 60** (see §1: 15 quality + 5 permit-only +
  5 phyto-only including uppercase `REQUESTED` + 3 inspection-only + 32 shipment/logistics =
  60; exact per-entity lists in §1.1–§1.5 so the total is auditable rather than asserted).
- **Chaincode transition functions referenced in §3: 34 rows** (quality 2, permits 3, phyto 4,
  inspection 6, shipment 19), of which **6 do not exist**: `RequestPhytosanitaryCertificate`,
  `InspectPhytosanitaryCertificate`, `RecordContainerStuffing`, `RecordVesselLoading`,
  `RecordVesselDeparture`, `RecordDestinationArrival`; **5 exist but are called by no route**:
  `RequestInspection`, `PerformInspection`, `CreateShipment`, `RecordBillOfLading`,
  `RecordAirwayBill`; and **5 are called with the wrong arity/order**: `IssueCertificate` (Q9),
  `RejectInspection` (Q7), `IssuePhytosanitaryCertificate` (H3),
  `RevokePhytosanitaryCertificate` (H4), `CompleteDelivery` (S26).
- **Dead-end statuses: 36 individual values across 21 rows** in §5 (including 5
  declared-but-never-set chaincode states: quality `REWORK`, permit `EXPIRED`/`CANCELLED`,
  phyto `EXPIRED`, inspection `IN_PROGRESS`).
- **Inconsistencies: 23** (§6).

## 8. Method note / limits

- Static reads only; no server was started, nothing was executed, and no live chaincode or
  database state was queried. "Cannot succeed" claims above mean "cannot succeed against the
  committed chaincode as written" (missing function / arity mismatch), not a runtime observation.
- Chaincode guard line numbers for `main.go` shipment functions are given as `:<line>-area`
  where the guard sits a few lines below the function signature (exact `Status =` assignment
  lines are cited in §1.5a).
- Out of slice (not verified here): customs, EUDR, insurance, forex/LC issuance, and the
  `documents`/`exporters`/`blockchain-signatures` routers — the `CUSTOMS_CLEARED` precondition
  for S6/S7/S10, and the `QUALITY_APPROVED`/`PHYTO_APPROVED` cascade targets, are produced
  outside this slice.

---

# Appendix C
# Part C — Customs → Border → Payment → SWIFT → Repatriation → Retention → Settlement / Post-Delivery

- **Repo / branch / HEAD:** `~/workspace/GoCBC`, branch `fix/auth-chaincode-audit`, HEAD `12d5a8d` (verified `git rev-parse`).
- **Scope of this file:** the 8 route files + `status.ts` and the chaincode files `customs.go`, `bordercrossing.go`, `payment.go`, `swift.go`, `repatriation.go`, `collection.go`, `advance.go` (plus `forex.go` for `SetRetentionPolicy` / `RecordForexRetention`, which is where the retention chaincode actually lives, and `api/src/utils/statusManager.ts` + `api/src/services/postDeliveryWorkflowService.ts` because `status.ts` / `postDeliveryWorkflow.ts` delegate to them). Read-only; no files under `~/workspace/GoCBC` were modified.
- **Counts (counted from the `ID` column of the transition tables in §2–§8): 88 table rows, of which 76 are state-changing transitions and 12 are reads / status-preserving calls / calls to non-existent chaincode functions (P12, P13, S11 — the three broken calls — plus C12–C14, B10–B12, P23, R9, D6). §1 inventories 97 distinct uppercase values** (status strings plus post-delivery checklist-item and issue-type labels, which are listed alongside them).
- **How to read the tables:** `From → To` is the **chaincode** state change unless the row says `PG-only` / `API-only`. `Who` is the API `requireRole` / inline check first, then the chaincode MSP check in brackets. `Endpoint` is the full mounted path (`/api/v1` + mount + route path). `Req` = `R` required / `O` optional exactly as the `express-validator` chain states it; `—` means the file has **no validator chain at all** for that endpoint (all body fields are unvalidated). `Chaincode` is the first argument of `invokeChaincode` / `submitTransaction` / `evaluateTransaction` / `queryChaincode`.
- **Auth baseline (applies to every row unless noted):** every router in this slice is mounted behind `authMiddleware` in `api/src/server.ts` — `/customs` (L256), `/payments` (L294), `/retention` (L303), `/swift` (L307), `/status` (L314), `/post-delivery` (L320), `/repatriation` (L337), `/bordercrossing` (L340). Several `payments.ts` / `swift.ts` routes have **no per-route** `authMiddleware`, but they are still authenticated by the mount. Per-route `requireRole` is the exception, not the rule (see §12-I1).

## §0 — Mounts

| Router file | Mount (`api/src/server.ts`) | Per-route `requireRole` present? |
|---|---|---|
| `api/src/routes/customs.ts` | `/api/v1/customs` (L256) | Only `POST /declaration/:declarationId/reject` (`CUSTOMS`, L1342) |
| `api/src/routes/bordercrossing.ts` | `/api/v1/bordercrossing` (L340) | None — any authenticated role |
| `api/src/routes/payments.ts` | `/api/v1/payments` (L294) | Only `POST /:paymentID/release` (`NBE`,`NBE_ADMIN`,`ADMIN`, L1710) |
| `api/src/routes/swift.ts` | `/api/v1/swift` (L307) | None (`nbe-approve` has an inline `user.org === 'NBE'` check, L592–597) |
| `api/src/routes/repatriation.ts` | `/api/v1/repatriation` (L337) | Every route (see §6) |
| `api/src/routes/retention.ts` | `/api/v1/retention` (L303) | `POST /policy` + `POST /:forexId/retention` only |
| `api/src/routes/postDeliveryWorkflow.ts` | `/api/v1/post-delivery` (L320) | None — any authenticated role |
| `api/src/routes/status.ts` | `/api/v1/status` (L314) | None — any authenticated role |

## §1 — Status-string inventory (exact values, with source)

### 1a. Customs declaration (`CustomsDeclaration.Status`, chaincode `chaincodes/coffee/customs.go`)

| Status | Set by (chaincode) | Source |
|---|---|---|
| `SUBMITTED` | `SubmitDeclaration` (legacy, no route calls it), `SubmitCustomsDeclaration` | `customs.go:192`, `customs.go:320` |
| `UNDER_INSPECTION` | `ReviewDeclaration`, `ReviewCustomsDeclaration` | `customs.go:374`, `customs.go:461` |
| `UNDER_REVIEW` | `CompleteInspection`, `CompleteCustomsInspection` | `customs.go:511`, `customs.go:569` |
| `CLEARED` | `ClearDeclaration`, `ClearCustomsDeclaration` | `customs.go:628`, `customs.go:732` |
| `REJECTED` | `RejectDeclaration`, `RejectCustomsDeclaration` | `customs.go:795`, `customs.go:869` |
| `submitted` (lowercase) | API wrapper `POST /api/v1/customs` — CouchDB doc + PG row, **no chaincode** | `customs.ts:76,113` |
| `INSPECTING` (PG) / `inspecting` (CouchDB) | API `inspectHandler` — **no chaincode** | `customs.ts:1183–1184` handler body (PG `INSPECTING`, CouchDB `inspecting`) |
| `CUSTOMS_DECLARED` / `CUSTOMS_CLEARED` / `CUSTOMS_REJECTED` | Shipment status, set as a side effect by clear/reject chaincode via `UpdateShipmentStatus` | `customs.go:646,813,888`; `statusManager.ts:74–75` |
| `PERMIT_ISSUED` | Shipment status that **gates** declaration submission (must already hold) | `customs.go:269` |
| `INSPECTION_REQUIRED`, `INSPECTION_SCHEDULED`, `INSPECTION_IN_PROGRESS`, `INSPECTION_PASSED`, `INSPECTION_FAILED`, `PRE_CLEARED`, `RELEASED` | **Only in `statusManager.ts` `CUSTOMS` table — never set by any chaincode function or route in this slice** | `statusManager.ts:135–150` (see §12-I2) |

### 1b. Border crossing (`BorderCrossing.Status` + `ComplianceStatus`, `chaincodes/coffee/bordercrossing.go`)

| Status | Set by | Source |
|---|---|---|
| `PENDING` | `InitiateBorderCrossing` | `bordercrossing.go:156` |
| `CLEARED_EXIT` | `ClearForExit` | `bordercrossing.go:226` |
| `IN_TRANSIT` | `RecordDeparture` | `bordercrossing.go:281` |
| `CROSSED` | `RecordBorderCrossing` | `bordercrossing.go:345` |
| `CLEARED` | `ClearBorderCrossing` (also sets `ComplianceStatus=COMPLIANT`) | `bordercrossing.go:515,522` |
| `DETAINED` | `DetainBorderCrossing` (also sets `ComplianceStatus=UNDER_REVIEW`) | `bordercrossing.go:579,581` |
| `INSPECTED` | `RecordBorderInspection` when `passed=="true"` (also `ComplianceStatus=COMPLIANT`) | `bordercrossing.go:647–648` |
| `INSPECTION_FAILED` | `RecordBorderInspection` when `passed!="true"` (also `ComplianceStatus=NON_COMPLIANT`) | `bordercrossing.go:650–651` |
| `ARRIVED` | `RecordArrival` | `bordercrossing.go:709` |
| `COMPLIANT` / `NON_COMPLIANT` / `UNDER_REVIEW` (ComplianceStatus, not Status) | `ClearBorderCrossing`, `RecordBorderInspection`, `DetainBorderCrossing`, `VerifyCompliance` (arbitrary caller-supplied value) | `bordercrossing.go:522,647,650,581,781` |

### 1c. Payment (`PaymentSettlement.Status`, `chaincodes/coffee/payment.go`)

| Status | Set by | Source |
|---|---|---|
| `PENDING` | `InitiatePayment` (all 5 methods) | `payment.go:365–377,399` |
| `DOCUMENTS_SUBMITTED` | `SubmitPaymentDocuments` | `payment.go:502` |
| `VERIFIED` | `VerifyPaymentDocuments` | `payment.go:596` |
| `SWIFT_INITIATED` | `InitiateSWIFTTransfer` (also `SWIFTDetails.Status=SENT`) | `payment.go:1010,1012` |
| `SWIFT_RECEIVED` | `ConfirmSWIFTReceipt` (also `SWIFTDetails.Status=RECEIVED`) | `payment.go:1053,1055` |
| `SETTLED` | `SettlePayment` (also `SWIFTDetails.Status=SETTLED`) | `payment.go:754,765` |
| `ADVANCE_RECEIVED` | `ReceiveAdvancePayment` (ADVANCE/TT_ADVANCE only) | `payment.go:1278` |
| `BALANCE_RECEIVED` | `ReceiveBalancePayment` (requires `PaymentStage==ADVANCE`) | `payment.go:1332` |
| `RECEIVED` | **PG-only**, `PaymentService.recordPayment` (then immediately overwritten to `SPLIT`) | `paymentService.ts:129,136` |
| `SPLIT` | **PG-only**, `PaymentService.recordPayment` | `paymentService.ts:136` |
| `RELEASED` | **PG-only**, `PaymentService.releasePayment` (chaincode side is `SettlePayment` → `SETTLED`) | `paymentService.ts:336`; `payments.ts:1708–1835` |
| `RETENTION_CONVERTED` | **PG-only**, `PaymentService` (no route in this slice calls it) | `paymentService.ts:259,272` |
| `PENDING_RELEASE` / `AWAITING_RELEASE` | **Never set anywhere found** — only used as a *filter* in `GET /pending-release` | `payments.ts:1150–1153` |
| `DOCUMENTS_RELEASED` | Declared as a next state but **never assigned to `PaymentSettlement.Status`** (`ReleaseDocumentsToBuyer` sets only `DocumentsHeldBy="RELEASED"`) | `payment.go:118,1221`; `statusManager.ts:93` |
| `COMPLETED` | Declared as next state after `DOCUMENTS_RELEASED` in `statusManager.ts` only; never set on a payment | `statusManager.ts:94` |
| `REJECTED` | `SWIFTDetails.Status` only (`RejectSWIFTPayment` does **not** change `PaymentSettlement.Status`); also a declared next state | `payment.go:1105`; `statusManager.ts:89` |
| `SWIFT_FAILED` / `CANCELLED` | Declared in `statusManager.ts` `PAYMENT` table only; never set by chaincode | `statusManager.ts:89,97` |
| `UNDER_VERIFICATION`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED`, `PAYMENT_AUTHORIZED` | Declared in chaincode `validateStatusTransition` LC table only; **no function ever sets them** | `payment.go:112–115` |
| `GOODS_SHIPPED`, `DOCUMENTS_SENT_TO_BANK`, `DOCUMENTS_FORWARDED`, `BUYER_NOTIFIED`, `PAYMENT_RECEIVED`, `ADVANCE_REQUESTED`, `BALANCE_REQUESTED`, `PROFORMA_ISSUED`, `CONTRACT_REGISTERED`, `COFFEE_SOURCING`, `QUALITY_INSPECTION`, `DOCUMENTS_SENT_DIRECTLY`, `PAYMENT_AWAITED` | Declared in chaincode `validateStatusTransition` CAD / TT_ADVANCE / TT_POST / ADVANCE tables only; **no function ever sets them** | `payment.go:120–154` |
| `PAYMENT_RELEASED` | LC status (not payment status); set by `ReleaseLCPayment` (outside slice); `SettlePayment` cascades LC `PAYMENT_RELEASED → SETTLED` | `payment.go:786–787`; `statusManager.ts:54–55` |
| `UTILIZED` | LC/forex status referenced as a payment prerequisite | `payment.go:259` |

### 1d. Documentary collection / CAD (`DocumentaryCollection.Status`, `payment.go:1487–1695` + `collection.go`)

| Status | Set by | Source |
|---|---|---|
| `SENT` | `RegisterDocumentaryCollection`, `SendDocumentaryCollection` | `payment.go:1540`; `collection.go:167` |
| `FORWARDED` | Only via `UpdateCADStatus` (arbitrary) | `payment.go:1589` |
| `PRESENTED` | `UpdateCADStatus`, `PresentDocumentaryCollection` | `payment.go:1624`; `collection.go:268` |
| `ACCEPTED` | `UpdateCADStatus`, `AcceptDocumentaryCollection` (ACCEPTANCE term only) | `payment.go:1626`; `collection.go:325` |
| `PAID` | `UpdateCADStatus`, `RecordCADPayment`, `SettleDocumentaryCollection` | `payment.go:1628,1677`; `collection.go:390` |
| `REJECTED` | Only via `UpdateCADStatus` (arbitrary) | `payment.go:1630` |
| `RETURNED` | `ReturnDocumentaryCollection` only (`collection.go`, no route in this slice) | `collection.go:463` |

### 1e. Advance payment, separate entity (`AdvancePayment.Status`, `chaincodes/coffee/advance.go`)

| Status | Set by | Source |
|---|---|---|
| `RECEIVED` | `RecordAdvancePayment` | `advance.go:132` |
| `PERMIT_ISSUED` | `IssuePermitForAdvance` | `advance.go:283` |
| `SHIPPED` | `LinkShipmentToAdvance` | `advance.go:342` |
| `SETTLED` | `SettleAdvancePayment` | `advance.go:422` |

### 1f. SWIFT message (`SWIFTMessageEnhanced.Status`, `chaincodes/coffee/swift.go:50–63`)

| Status | Set by | Source |
|---|---|---|
| `DRAFT` | All six create functions | `swift.go:346,428,485,545,590,638` |
| `APPROVED` | `ApproveSWIFTMessage` | `swift.go:690` |
| `SENT` | `SendSWIFTMessage` | `swift.go:729` |
| `RECEIVED` | `ReceiveSWIFTMessage` | `swift.go:784` |
| `PROCESSING` | `ProcessSWIFTMessage` | `swift.go:838` |
| `SETTLED` | `SettleSWIFTMessage` | `swift.go:879` |
| `REJECTED` | `RejectSWIFTMessage` (from any state — no guard) | `swift.go:927` |
| `PENDING_APPROVAL` | Constant defined; **never assigned** (only counted in statistics) | `swift.go:51,1172` |
| `IN_TRANSIT` | Constant defined; **never assigned** (only accepted as a from-state by `ReceiveSWIFTMessage`) | `swift.go:54,774` |
| `CANCELLED` / `FAILED` | Constants defined; **never assigned, no function references them** | `swift.go:62–63` |
| `NBE_APPROVED` | **API response string only** (`swift.ts:602`); no chaincode status, no such chaincode function | `swift.ts:572–651` (see §12-I5) |

### 1g. Repatriation (`ExportProceedsRepatriation.Status`, `chaincodes/coffee/repatriation.go`)

| Status | Set by | Source |
|---|---|---|
| `PENDING` | `InitiateRepatriation` | `repatriation.go:256` |
| `PARTIAL` | `RecordRepatriation` (some but not all required amounts) | `repatriation.go:414` |
| `READY_FOR_VERIFICATION` | `RecordRepatriation` (retention + conversion both met) | `repatriation.go:409` |
| `OVERDUE` | `RecordRepatriation` if past deadline (L421–423); also **recomputed on reads only** via `updateRepatriationDeadline` (L939–946, called from `ReadRepatriation` L798 and `queryRepatriations` L908 — in-memory only, no `PutState`) | `repatriation.go:421,939–946` |
| `COMPLIED` | `VerifyRepatriation` (amounts met and not past deadline) | `repatriation.go:522` |
| `NON_COMPLIANT` | `VerifyRepatriation` (amounts unmet or past deadline); `ApplyNonCompliancePenalty` (self-loop) | `repatriation.go:527,606` |
| `WAIVED` | `ApproveWaiver` with `approved=="true"` | `repatriation.go:740` |
| (no status change) | `RequestWaiver` sets only `WaiverRequested=true` | `repatriation.go:633–694` |

### 1h. Retention (`ForexAllocation.RetentionStatus` + `RetentionPolicy.Status`, `chaincodes/coffee/forex.go`)

| Status | Set by | Source |
|---|---|---|
| `PENDING` (retention) | `RecordForexRetention` initial value; also API default when field absent | `forex.go:36,708`; `retention.ts:275–317` |
| `COMPLIED` (retention) | `RecordForexRetention` when submitted % equals active policy rate | `forex.go:711` |
| `NON_COMPLIANT` (retention) | `RecordForexRetention` when submitted % differs from active policy rate | `forex.go:713` |
| `ACTIVE` (policy) | `SetRetentionPolicy` (new policy; previous ACTIVE policy for same commodity → `INACTIVE`) | `forex.go:1170–1230` |
| `INACTIVE` (policy) | `SetRetentionPolicy` (superseded policy) | `forex.go` (previous-policy loop, L~1215) |
| `ALLOCATED` / `UTILIZED` | `ForexAllocation.Status` values that **gate** `RecordForexRetention` (retention itself does not change `Forex.Status`) | `forex.go:694` |

### 1i. Post-delivery / settlement (`postDeliveryWorkflowService.ts` + `statusManager.ts`)

| Status | Meaning / set by | Source |
|---|---|---|
| `PENDING` / `IN_PROGRESS` / `COMPLETED` / `DELAYED` | `overallStatus`, derived by `determineOverallStatus` (PG `post_delivery_tracking`) | `postDeliveryWorkflowService.ts:56,554–578` |
| `ISSUE` | In the `overallStatus` type union but **never returned** by `determineOverallStatus` | `postDeliveryWorkflowService.ts:56,554` |
| `PASSED` / `FAILED` | `ectaAuditResult` (audit still counts as "completed" either way) | `postDeliveryWorkflowService.ts:48,452–475` |
| `COMPLETED` (contract) | `closeContract` → `UpdateContractStatus [contractId, 'COMPLETED']` | `postDeliveryWorkflowService.ts:504–507` |
| `PAYMENT_RECEIVED`, `FOREX_REPATRIATED`, `LC_SETTLED`, `ECTA_AUDIT_COMPLETED`, `CONTRACT_CLOSED` | Checklist item types (booleans in PG, not statuses) | `postDeliveryWorkflowService.ts:581–590` |
| `PAYMENT_OVERDUE` / `FOREX_DELAYED` | Issue types actually created; `LC_ISSUE`, `AUDIT_REQUIRED`, `COMPLIANCE_ISSUE` declared but never created | `postDeliveryWorkflowService.ts:60–66,615,621` |

## §2 — Customs transitions

### 2a. Chaincode transitions (`chaincodes/coffee/customs.go`)

| ID | From → To | Who (API role / chaincode MSP) | Endpoint | Request fields (R/O + validation) | Chaincode |
|---|---|---|---|---|---|
| C1 | (none) → `SUBMITTED` | Any authenticated user (route has no `requireRole`; chaincode records submitter MSP, no MSP gate) | `POST /api/v1/customs/declaration/submit` — `customs.ts:673` | `declarationID` R `body().notEmpty()`; `shipmentID` R `notEmpty()`; `exporterID` R `notEmpty()` (`customs.ts:676–680`); `contractID`/`contractId` O, `declarationType` O (default `STANDARD`), `hsCode` O (default `090111`), `quantity` O (default `0`), `value` O (default `0`), `currency` O (default `USD`), `destination` O (default `Unknown`), `portOfExit` O (default `Djibouti Port`), `eudrCompliant` O (default `false`) | `invokeChaincode('SubmitCustomsDeclaration', [declarationID, shipmentID, exporterID, declarationType, hsCode, quantity, value, currency, destination, portOfExit, eudrCompliant])` — `customs.ts:721` |
| C2 | (none) → `SUBMITTED` | Any authenticated user; legacy function, **no route in this slice calls it** | — (no route) | Chaincode args: `declarationID, contractID, exporterID, lcID, forexID, quantity, totalValue, currency, destination, portOfExit, documents[]` | `SubmitDeclaration` — `customs.go:84–86` |
| C3 | `SUBMITTED` → `UNDER_INSPECTION` | Any authenticated user at API (no `requireRole`); chaincode only **warns** for non-`CustomsMSP`, does not reject | `POST /api/v1/customs/declaration/:declarationId/review` — `customs.ts:1032` | `declarationId` param R `param().notEmpty()` (`customs.ts:1034`); body `assignedInspector, scheduledDate, priorityLevel, location, inspectionType, inspectorNotes` — **all unvalidated/O** (`inspectionType` default `STANDARD`, `inspectorNotes` default `Inspection scheduled`) | `invokeChaincode('ReviewCustomsDeclaration', [declarationId, officerName, inspectionType, inspectorNotes])` — `customs.ts:1047` (legacy twin `ReviewDeclaration`, `customs.go:338`, same `SUBMITTED → UNDER_INSPECTION`, `customs.go:363,374`) |
| C4 | `UNDER_INSPECTION` → `UNDER_REVIEW` | Any authenticated user at API (no `requireRole`); chaincode only warns for non-`CustomsMSP` | `POST /api/v1/customs/declaration/:declarationId/complete-inspection` — `customs.ts:1280` | `declarationId` param R `notEmpty()`; body `inspectionResult, inspectorComments, completedDate` — **all unvalidated/O** (`inspectorComments` default `Inspection completed`; `inspectionResult` is **ignored by the chaincode call** — only `inspectorComments` is passed) | `invokeChaincode('CompleteInspection', [declarationId, inspectorComments])` — `customs.ts:1292` (legacy twin `CompleteCustomsInspection`, `customs.go:524`, same transition, `customs.go:559,569`) |
| C5 | `UNDER_REVIEW` → `CLEARED` (+ shipment → `CUSTOMS_CLEARED`) | Any authenticated user at API (no `requireRole` on the route); chaincode `ClearCustomsDeclaration` enforces `CustomsMSP` (`customs.go:697`) | `POST /api/v1/customs/declaration/:declarationId/clear` — `customs.ts:1421` | `declarationId` param R `notEmpty()`; body `clearanceNumber, clearedBy, clearanceDate, clearanceType, exportDuty, vatAmount, exitPoint, validityPeriod, transportMode, finalDestinationPort, estimatedDepartureDate, containerNumber, sealNumber, shippingLine, clearanceRemarks, officerNotes` — **all unvalidated/O** | Via `CustomsService.clearDeclaration` (`customsService.ts:282`) → `submitTransaction('ClearCustomsDeclaration', [declarationID, clearedBy, clearanceNumber, duties, taxes, clearanceNotes, date])` — **7 args vs the chaincode's 4-arg signature** `(declarationID, clearedBy, clearanceNumber, dutiesAmountStr)` (`customs.go:682–683`); see §12-I4. Legacy twin `ClearDeclaration` (`customs.go:584`, 3 args) is not called by any route. Shipment cascade: `customs.go:644–650` (best-effort, failure only logged) |
| C6 | any except `CLEARED` → `REJECTED` (+ shipment → `CUSTOMS_REJECTED`) | `requireRole('CUSTOMS')` — the **only** role-checked customs route (`customs.ts:1342`); chaincode enforces `CustomsMSP` (`customs.go:841`) | `POST /api/v1/customs/declaration/:declarationId/reject` — `customs.ts:1338` | `declarationId` param R `notEmpty()`; `rejectionReason` R `body().trim().notEmpty()`; `rejectedBy` O `isString()` (`customs.ts:1346–1349`) | `fabricService.rejectCustomsDeclaration(...)` → `invokeChaincode('RejectCustomsDeclaration', [declarationId, rejectedBy, rejectionReason])` (`fabricService.ts:2529–2543`; `customs.go:826`, guard `customs.go:859`, set `customs.go:869`, shipment cascade `customs.go:888`) |

**Chaincode gates for C1:** `SubmitCustomsDeclaration` requires the shipment (if found on ledger) to already be `PERMIT_ISSUED` or `CUSTOMS_DECLARED` (`customs.go:269–270`) — i.e. the ECTA export permit must precede the declaration; rejects duplicate `declarationID` (`customs.go:298`). Legacy `SubmitDeclaration` (C2) instead requires an existing LC (`lcID`) and forex (`forexID`) (`customs.go:149–163`) and auto-maps exporter/currency/destination from the contract (`customs.go:96–118`).

### 2b. API-only / PG-only customs transitions (no chaincode state change)

| ID | From → To | Who | Endpoint | Request fields | Chaincode |
|---|---|---|---|---|---|
| C7 | (none) → `submitted` (lowercase, PG + CouchDB) | Any authenticated user | `POST /api/v1/customs` — `customs.ts:29` | **No validator chain.** Manual check (`customs.ts:55–63`): `customsID`/`declarationNumber` and `shipmentID`/`shipmentId` effectively required; `exporterID, hsCode, quantity, value, currency, destination, status` O with defaults `0901.21 / 10000 / 85000 / USD / Germany`. `status` body field is **ignored** (hard-coded `submitted`) | **None** — direct CouchDB `PUT` + PG `INSERT` (`customs.ts:66–118`) |
| C8 | (none) → `SUBMITTED` (PG `customs_clearances`) | Any authenticated user | `POST /api/v1/customs/clearance` — `customs.ts:276` | `shipmentID` R `notEmpty()`, `clearanceNumber` R `notEmpty()` (`customs.ts:278`); `status` O (default `SUBMITTED`), `clearedBy, clearedDate` O | **None** — PG insert only |
| C9 | any → `INSPECTING` (PG) / `inspecting` (CouchDB) | Any authenticated user | `POST /api/v1/customs/declarations/:id/inspect` and `POST /api/v1/customs/declaration/:declarationId/inspect` — `customs.ts:1183–1184` (shared `inspectHandler`) | `id`/`declarationId` param R `notEmpty()`; no body fields | **None** — PG + CouchDB update only. Note: chaincode has no `INSPECTING` state; this **skips** the chaincode `SUBMITTED → UNDER_INSPECTION` guard (C3) |
| C10 | any → `CLEARED` (PG + CouchDB) | Any authenticated user | `POST /api/v1/customs/declarations/:id/clear` — `customs.ts:1190` | `id` param R `notEmpty()`; no body fields | **None** — PG + CouchDB update only. Bypasses chaincode `UNDER_REVIEW` guard (C5) and the `CustomsMSP` check |
| C11 | any → `CUSTOMS_CLEARED` (shipment, chaincode, no from-state guard) | Any authenticated user | `POST /api/v1/customs/test-shipment-update/:shipmentId` — `customs.ts:797` (labelled "Test endpoint") | `shipmentId` param; no body, no validators | `invokeChaincode('UpdateShipmentStatus', [shipmentId, 'CUSTOMS_CLEARED'])` — `customs.ts:820`. `UpdateShipmentStatus` (`main.go:1788`) accepts **any** `newStatus` with no transition validation |
| C12 | (none) → risk record (no status) | Any authenticated user | `POST /api/v1/customs/risk-assessment` — `customs.ts:234` | `shipmentID` R `notEmpty()`, `exporterID` R `notEmpty()`, `riskLevel` R `notEmpty()` (`customs.ts:237–241`); `riskFactors, inspectionRequired` O | **None** — PG insert only |
| C13 | — (read) | Any authenticated user | `GET /api/v1/customs/permit-ready` — `customs.ts:491` | — | — (reads PG `quality_inspections` where `status='permit_issued'` and no declaration exists) |
| C14 | — (reads) | Any authenticated user | `GET /api/v1/customs/declarations` (×2 — duplicate registration, `customs.ts:140` and `customs.ts:585`), `GET /api/v1/customs/declarations/:declarationID` (`customs.ts:855`), `GET /api/v1/customs/clearances` (`customs.ts:319`), `GET /api/v1/customs/clearance` (`customs.ts:396`), `GET /api/v1/customs/assessments` (`customs.ts:1530`), `GET /api/v1/customs/document-verification` (`customs.ts:1589`), `GET /api/v1/customs/risk-assessment` (`customs.ts:1648`), `GET /api/v1/customs/history` (`customs.ts:1730`, filters `status IN ('CLEARED','RELEASED')`), `GET /api/v1/customs/risk-rules` (`customs.ts:936`) | Query `?status=` optional on list endpoints | — |

**Structural note:** `customs.ts:1025` is `export default router;` yet the file continues registering routes (review L1032, inspect L1183, clear L1190, complete-inspection L1280, reject L1338, clear L1421, assessments/history L1530–1730) after it. They still execute on import, but the layout is fragile. Same pattern in `payments.ts:1796` (`tracking-status` route at L1836 is after the default export).

## §3 — Border-crossing transitions

All routes: `authMiddleware` only, **no `requireRole`, no express-validator chain** — every body field is unvalidated at the API layer. Chaincode enforces a from-state guard on **none** of these functions except the `CustomsMSP` check on `ClearForExit`.

| ID | From → To | Who (API / chaincode MSP) | Endpoint | Request fields (all O/unvalidated) | Chaincode |
|---|---|---|---|---|---|
| B1 | (none) → `PENDING` | Any authenticated user / any MSP (no chaincode MSP check) | `POST /api/v1/bordercrossing/initiate` — `bordercrossing.ts:148` | `crossingId, shipmentId, contractId, exporterId, borderPost, borderCountry, crossingType, transitCountry, finalDestination, exitPermitNumber, customsDeclaration, transportMode, vehicleNumber, driverName, sealNumber, cargoWeight, numberOfBags` — all passed through; only `transitCountry` has a default (`''`). Missing fields are passed as `undefined` | `submitTransaction('InitiateBorderCrossing', [crossingId, shipmentId, contractId, exporterId, borderPost, borderCountry, crossingType, transitCountry||'', finalDestination, exitPermitNumber, customsDeclaration, transportMode, vehicleNumber, driverName, sealNumber, String(cargoWeight), String(numberOfBags)])` — `bordercrossing.ts:172` |
| B2 | any → `CLEARED_EXIT` | Any authenticated user / **`CustomsMSP` only** (`bordercrossing.go:218`) | `POST /api/v1/bordercrossing/:id/clear-exit` — `bordercrossing.ts:299` | `customsOfficer, clearanceRef` (no defaults) | `submitTransaction('ClearForExit', [id, customsOfficer, clearanceRef])` — `bordercrossing.ts:306` |
| B3 | any → `IN_TRANSIT` | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/departure` — `bordercrossing.ts:337` | `departureDate` | `submitTransaction('RecordDeparture', [id, departureDate])` — `bordercrossing.ts:344` |
| B4 | any → `CROSSED` | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/crossing` — `bordercrossing.ts:374` | `crossingDate, borderCustomsOfficer` (O, `''`), `borderClearanceRef` (O, `''`), `borderStampURL` (O, `''`) | `submitTransaction('RecordBorderCrossing', [id, crossingDate, borderCustomsOfficer||'', borderClearanceRef||'', borderStampURL||''])` — `bordercrossing.ts:386` |
| B5 | any → `CLEARED` (+ `ComplianceStatus` → `COMPLIANT`) | Any authenticated user / any MSP (no MSP check in chaincode) | `POST /api/v1/bordercrossing/:id/clear` — `bordercrossing.ts:218` | `clearanceOfficer` (O, `''`), `certificateNumber` (O, `''`); clearance date is server-generated (`new Date().toISOString()`) | `submitTransaction('ClearBorderCrossing', [id, clearanceOfficer||'', certificateNumber||'', <now>])` — `bordercrossing.ts:225` |
| B6 | any → `DETAINED` (+ `ComplianceStatus` → `UNDER_REVIEW`) | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/detain` — `bordercrossing.ts:258` | `clearanceOfficer` (O, `''`), `detentionReason` (O, default `Inspection required`), `nextSteps` (O, `''`) | `submitTransaction('DetainBorderCrossing', [id, clearanceOfficer||'', detentionReason||'Inspection required', nextSteps||'', <now>])` — `bordercrossing.ts:265` |
| B7 | any → `INSPECTED` (+ `ComplianceStatus` → `COMPLIANT`) | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/inspect` — `bordercrossing.ts:536` | `inspectorName, inspectionDate` (O, defaults to now), `sealIntact` (bool → `String(sealIntact===true)`), `physicalCondition` (O, default `GOOD`), `documentationComplete` (bool → string), `findings` (O, default `No issues found`), `passed` (bool → `String(passed===true)`) | `submitTransaction('RecordBorderInspection', [id, inspectorName, inspectionDate||now, String(sealIntact===true), physicalCondition||'GOOD', String(documentationComplete===true), findings||'No issues found', String(passed===true)])` — `bordercrossing.ts:553` |
| B8 | any → `INSPECTION_FAILED` (+ `ComplianceStatus` → `NON_COMPLIANT`) | Any authenticated user / any MSP | Same endpoint/fields as B7 | Same as B7, with `passed` false/absent (chaincode branches on `passed == "true"`, `bordercrossing.go:646–652`) | Same call as B7 |
| B9 | any → `ARRIVED` | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/arrival` — `bordercrossing.ts:495` | `arrivalDate, arrivalLocation` | `submitTransaction('RecordArrival', [id, arrivalDate, arrivalLocation])` — `bordercrossing.ts:502` |
| B10 | — (no `Status` change; `ComplianceStatus` ← caller-supplied value) | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/verify` — `bordercrossing.ts:599` | `complianceStatus, complianceNotes` (O, `''`) | `submitTransaction('VerifyCompliance', [id, complianceStatus, complianceNotes||''])` — `bordercrossing.ts:606`. Sets `ComplianceStatus` verbatim (`bordercrossing.go:781`); `Status` untouched |
| B11 | — (no `Status` change; `LastKnownLocation` / checkpoint only) | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/location` — `bordercrossing.ts:419` | `location, checkpoint` (O, `''`) | `submitTransaction('UpdateLocation', [id, location, checkpoint||''])` — `bordercrossing.ts:426` |
| B12 | — (no `Status` change; `DelayReported=true`, `DelayReason`, `DelayDuration` accumulate) | Any authenticated user / any MSP | `POST /api/v1/bordercrossing/:id/delay` — `bordercrossing.ts:457` | `delayReason, delayDuration` (O, `String(delayDuration||0)`) | `submitTransaction('ReportDelay', [id, delayReason, String(delayDuration||0)])` — `bordercrossing.ts:464` |

Reads: `GET /api/v1/bordercrossing` (`bordercrossing.ts:17`, `QueryAllBorderCrossings`), `GET /:id` (L52, `ReadBorderCrossing`), `GET /shipment/:shipmentId` (L82, `QueryBorderCrossingsByShipment`), `GET /status/:status` (L115, `QueryBorderCrossingsByStatus`).

**Dependency:** `customsDeclaration` (B1 body field) is a free-text reference to the customs declaration number from §2; the chaincode does **not** look the declaration up — it stores the string as supplied (`bordercrossing.go:149`). The intended order is customs clearance (§2 C5) → `ClearForExit` (B2) → departure (B3) → crossing (B4) → arrival (B9), but **no from-state guard enforces it**: e.g. `RecordArrival` can run on a `PENDING` record, and `ClearBorderCrossing` (B5) can overwrite `DETAINED`/`ARRIVED`.

## §4 — Payment transitions (documents, bank verification, advance/balance, SWIFT legs, settlement, release)

Payment methods (chaincode `payment.go:92–104`): `LC`, `CAD`, `TT_ADVANCE`, `TT_POST`, `ADVANCE`. Note the route-level `statusManager` `PAYMENT` table (`statusManager.ts:87–99`) and the chaincode `validateStatusTransition` tables (`payment.go:107–178`) disagree — see §12-I3.

### 4a. Core LC payment flow

| ID | From → To | Who (API / chaincode MSP) | Endpoint | Request fields (R/O + validation) | Chaincode |
|---|---|---|---|---|---|
| P1 | (none) → `PENDING` | No per-route auth (mount only); chaincode records initiator MSP, no MSP gate. Route connects as `BanksMSP` | `POST /api/v1/payments/initiate` — `payments.ts:75` | All R `body().notEmpty()`: `paymentID, contractID, exporterID, lcID, amount, currency, receivingBank, receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod` (`payments.ts:77–88`). (The handler's `\|\|` fallbacks are dead code — validators reject missing values first.) | `invokeChaincode('InitiatePayment', [paymentID, contractID, exporterID, lcID, amount, currency, receivingBank, receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod])` — `payments.ts:148`. Pre-reads `ReadLC` (L115) and `ReadSalesContract` (L126) for auto-mapping. Chaincode gate: method `LC` requires LC in `ISSUED` / `FOREX_ALLOCATED` / `UTILIZED` (`payment.go:252–265`); `TT_ADVANCE`/`ADVANCE` need no LC; `CAD` only notes B/L will be required at document submission |
| P2 | (none) → `PENDING` → `DOCUMENTS_SUBMITTED` → `VERIFIED` (chaincode) then PG `RECEIVED` → `SPLIT` | `authMiddleware` per-route; service connects as `BanksMSP` | `POST /api/v1/payments/record` — `payments.ts:253` | `paymentID` R `notEmpty()`, `contractID` R, `shipmentID` R, `exporterID` R, `amountUSD` R `isNumeric()`, `currency` R, `paymentDate` R, `payerName` R (`payments.ts:256–263`); `lcID, forexID, swiftReference, payerBank` O | Via `PaymentService.recordPayment` (`paymentService.ts:38–177`): `submitTransaction('InitiatePayment', [paymentID, contractID, exporterID, lcID\|\|'', amount, currency, 'Commercial Bank of Ethiopia', 'CBETETAA', exporterID, exporterID+'-001', 'LC'])`, then `submitTransaction('SubmitPaymentDocuments', [paymentID, JSON.stringify(['Bill of Lading','Commercial Invoice','Certificate of Origin','Quality Certificate'])])`, then `submitTransaction('VerifyPaymentDocuments', [paymentID, userId, 'Payment documents verified - all documents in order'])`. PG: `INSERT payments … status='RECEIVED'`, then `UPDATE payments SET status='SPLIT'`; retention 40% computed in service (`NBE_RETENTION_RATE = 40`, `paymentService.ts:16,60–65`): `retentionAmount = total×0.40`, `releaseAmount = total×0.60` |
| P3 | (none) → `PENDING` | `authMiddleware` per-route | `POST /api/v1/payments` — `payments.ts:1590` | `paymentID` R `notEmpty()`, `amount` R `isNumeric()` (`payments.ts:1594–1597`); `lcNumber, contractID, exporterID, currency, paymentMethod, paymentDate, shipmentID` O/unvalidated | `invokeChaincode('InitiatePayment', [paymentID, contractID\|\|'', exporterID, lcNumber\|\|'', String(amount), currency\|\|'USD', receivingBank, receivingBankBIC, beneficiaryName, beneficiaryAccount, paymentMethod\|\|'LC'])` — `payments.ts:1625`. Pre-reads `ReadLC` (L1611) for auto-mapping of bank/beneficiary |
| P4 | `PENDING` → `DOCUMENTS_SUBMITTED` | No per-route auth (mount only); route connects as `BanksMSP`; chaincode records submitter MSP, no MSP gate | `POST /api/v1/payments/:paymentID/documents` — `payments.ts:355` | `paymentID` param R `notEmpty()`; `documents` R `isArray()` (`payments.ts:357–360`). Each element is `JSON.stringify`'d, then the array is `JSON.stringify`'d again as a single chaincode arg | `invokeChaincode('SubmitPaymentDocuments', [paymentID, JSON.stringify(documentStrings)])` — `payments.ts:374`. Chaincode guard: `payment.Status != "PENDING"` → error (`payment.go:491`) |
| P5 | `DOCUMENTS_SUBMITTED` → `VERIFIED` | No per-route auth (mount only); route connects as `BanksMSP`; chaincode only **warns** for non-`BanksMSP` (`payment.go:557–559`) | `POST /api/v1/payments/:paymentID/verify` — `payments.ts:448` | `paymentID` param R; `verifiedBy` R `notEmpty()`, `comments` R `notEmpty()` (`payments.ts:450–453`) | `invokeChaincode('VerifyPaymentDocuments', [paymentID, verifiedBy, comments])` — `payments.ts:464`. Guard: must be `DOCUMENTS_SUBMITTED` (`payment.go:585`) |
| P6 | `VERIFIED` or `DOCUMENTS_SUBMITTED` → `SWIFT_INITIATED` (and `SWIFTDetails.Status` → `SENT`) | No per-route auth (mount only); route connects as `BanksMSP`; chaincode has no MSP check | `POST /api/v1/payments/:paymentID/swift/initiate` — `payments.ts:555` | `paymentID` param R; `swiftReference` R, `senderBIC` R, `messageType` R, `valueDate` R, `charges` R, `remittanceInfo` R — all `notEmpty()` (`payments.ts:557–565`); `intermediary1, intermediary2` O (`''`) | `invokeChaincode('InitiateSWIFTTransfer', [paymentID, swiftReference, senderBIC, messageType, valueDate, intermediary1\|\|'', intermediary2\|\|'', charges, remittanceInfo])` — `payments.ts:575`. Guard: `VERIFIED` or `DOCUMENTS_SUBMITTED` (`payment.go:987`) — note `DOCUMENTS_SUBMITTED` can skip verification entirely |
| P7 | `SWIFT_INITIATED` → `SWIFT_RECEIVED` (and `SWIFTDetails.Status` → `RECEIVED`) | No per-route auth (mount only); route connects as `BanksMSP` | `POST /api/v1/payments/:paymentID/swift/confirm` — `payments.ts:653` | `paymentID` param R; `receivedBy` R `notEmpty()` (`payments.ts:655–657`) | `invokeChaincode('ConfirmSWIFTReceipt', [paymentID, receivedBy])` — `payments.ts:668`. Guard: must be `SWIFT_INITIATED` (`payment.go:1042`) |
| P8 | `VERIFIED` or `SWIFT_RECEIVED` → `SETTLED` (and `SWIFTDetails.Status` → `SETTLED`; LC `PAYMENT_RELEASED` → `SETTLED` cascade) | No per-route auth (mount only); route connects as `BanksMSP`; chaincode enforces **`BanksMSP` only** (`payment.go:655`) | `POST /api/v1/payments/:paymentID/settle` — `payments.ts:754` | `paymentID` param R; `exchangeRate` R, `retentionRate` R, `payingBank` R, `payingBankBIC` R, `swiftReference` R, `nbeApprovalRef` R — all `notEmpty()` (`payments.ts:756–764`) | `invokeChaincode('SettlePayment', [paymentID, exchangeRate, retentionRate, payingBank, payingBankBIC, swiftReference, nbeApprovalRef])` — `payments.ts:800`. Route pre-gate: `statusManager.validateTransition('PAYMENT', currentStatus, 'SETTLED')` (`payments.ts:786`) — this uses the `statusManager` table, which only allows `SWIFT_RECEIVED → SETTLED`, so a `VERIFIED` payment is **rejected by the route although the chaincode would accept it** (§12-I3). Chaincode: retention/exchange auto-mapped from `FOREX_<lcID>` when `0`/unparsable, else defaults `exchangeRate=120.0`, `retentionRate=100.0` (`payment.go:698–724`); `RetainedAmount = Amount × retentionRate/100`, `ConvertedAmount = Amount − RetainedAmount`, `AmountBirr = ConvertedAmount × exchangeRate` (`payment.go:738–742`); LC cascade only if LC is `PAYMENT_RELEASED` (`payment.go:786–787`) |
| P9 | `SETTLED` (chaincode) + PG `RELEASED` | `requireRole(['NBE','NBE_ADMIN','ADMIN'])` (`payments.ts:1710`) | `POST /api/v1/payments/:paymentID/release` — `payments.ts:1708` | `paymentID` param R; `exporterID` R `notEmpty()`, `amount` R `isNumeric()` (`payments.ts:1712–1715`); `releaseDate` O. Route rejects if PG `payments.status == 'RELEASED'` (already-released guard, PG only) | Via `PaymentService.releasePayment` (`paymentService.ts:285–377`): `submitTransaction('SettlePayment', [paymentID, '120.5', '40', 'Commercial Bank of Ethiopia', 'CBETETAA', releaseRef, 'NBE-APPROVAL-'+paymentID])` — i.e. **release is implemented as a second `SettlePayment`** (hard-coded rate 120.5 and 40% retention), then PG `UPDATE payments SET status='RELEASED'`. Note the route's `amount` body field is **never passed** to the service (release amount comes from the stored PG row) |
| P10 | any → caller-supplied `status` (validated against the per-method table) | No per-route auth (mount only); route connects as `BanksMSP` | `POST /api/v1/payments/:paymentID/status` — `payments.ts:1535` | `paymentID` param R; `status` R `notEmpty()` (`payments.ts:1537–1540`) — any string; validity is enforced only in chaincode | `invokeChaincode('UpdatePaymentStatus', [paymentID, status])` — `payments.ts:1550`. Chaincode `validateStatusTransition(payment.Status, newStatus, payment.PaymentMethod)` (`payment.go:1373`) — the LC/CAD/TT/ADVANCE tables at `payment.go:110–154` |
| P11 | — (PG `payment_tracking_status` only; chaincode untouched) | `authMiddleware` per-route | `PUT /api/v1/payments/:paymentID/tracking-status` — `payments.ts:1836` (after `export default`, L1796) | `paymentID` param R; `trackingStatus` R `notEmpty().isIn(['PENDING','DOCUMENTS_SUBMITTED','VERIFIED','SWIFT_INITIATED','SWIFT_RECEIVED','SETTLED'])` (`payments.ts:1840–1847`); `notes` O | **None** — PG `UPDATE payments SET payment_tracking_status=…` + audit log. No transition validation (any listed value from any current value) |
| P12 | — (no chaincode function exists; call always fails) | No per-route auth (mount only); route connects as `NBEMSP` | `POST /api/v1/payments/:paymentID/forex-repatriation` — `payments.ts:1335` | `paymentID` param R; `repatriationAmount` R `isNumeric()`, `repatriationCurrency` R `notEmpty()`, `exchangeRate` R `isNumeric()` (`payments.ts:1337–1341`); `swiftReference, nbeApprovalRef` O (`''`) | `invokeChaincode('RecordForexRepatriation', …)` — `payments.ts:1359`. **No `RecordForexRepatriation` function exists in any chaincode file** (grep over `chaincodes/coffee/*.go` returns nothing). This is a different function from the retention `RecordForexRetention` (`forex.go:655`) — see §12-I6 |
| P13 | — (no chaincode function exists; call always fails) | No per-route auth (mount only); connects as `NBEMSP` if `confirmationType=='NBE_APPROVAL'` else `BanksMSP` | `PUT /api/v1/payments/:paymentID/confirm` — `payments.ts:887` | `paymentID` param R; `confirmedBy` R `notEmpty()`, `confirmationType` R `notEmpty()` (`payments.ts:889–892`); `remarks` O (`''`). Swagger says `confirmationType` enum `BANK_VERIFICATION, NBE_APPROVAL, FOREX_REPATRIATION` but the validator does **not** enforce it | `invokeChaincode('ConfirmSettlement', [paymentID, confirmedBy, confirmationType, remarks||''])` — `payments.ts:908`. **No `ConfirmSettlement` function exists in any chaincode file** — see §12-I6 |

### 4b. Advance / balance (TT_ADVANCE / ADVANCE methods, on `PaymentSettlement`)

| ID | From → To | Who | Endpoint | Request fields | Chaincode |
|---|---|---|---|---|---|
| P14 | any → `ADVANCE_RECEIVED` (`PaymentStage` → `ADVANCE`) | No per-route auth (mount only); route connects as `BanksMSP`; chaincode has **no from-state guard** and no MSP check | `POST /api/v1/payments/:paymentID/advance` — `payments.ts:1411` | `paymentID` param R; `advancePercentage` R `notEmpty()`, `amountReceived` R `notEmpty()` (`payments.ts:1413–1416`) | `invokeChaincode('ReceiveAdvancePayment', [paymentID, advancePercentage, amountReceived])` — `payments.ts:1427`. Chaincode: method must be `ADVANCE`/`TT_ADVANCE` (`payment.go:1249`); `advancePercentage` must be 0–100 (`payment.go:1263`); **hard-codes `RetentionRate = 100.0`** on the advance (`payment.go:1282`) |
| P15 | `PaymentStage==ADVANCE` → `BALANCE_RECEIVED` (`PaymentStage` → `BALANCE`) | No per-route auth (mount only); route connects as `BanksMSP` | `POST /api/v1/payments/:paymentID/balance` — `payments.ts:1474` | `paymentID` param R; `amountReceived` R `notEmpty()` (`payments.ts:1476–1478`) | `invokeChaincode('ReceiveBalancePayment', [paymentID, amountReceived])` — `payments.ts:1489`. Chaincode guard is on `PaymentStage`, not `Status` (`payment.go:1315`) — so a payment that never went through P14 is rejected, but one in any `Status` with stage `ADVANCE` is accepted |

### 4c. Documentary collection / CAD (chaincode only — routes live in `banking.ts`, outside this slice, except `ReleaseDocumentsToBuyer` which has no route found)

| ID | From → To | Who | Endpoint in this slice | Chaincode |
|---|---|---|---|---|
| P16 | (none) → `SENT` | — (route in `banking.ts:2606`) | None in slice | `RegisterDocumentaryCollection` — `payment.go:1487`; requires `paymentTerm` `SIGHT`/`ACCEPTANCE` (`payment.go:1493`), `ACCEPTANCE` requires `acceptanceDays > 0` (`payment.go:1503`) |
| P17 | `SENT` → `PRESENTED` | — | None in slice | `PresentDocumentaryCollection` — `collection.go:230`; guard `SENT` (`collection.go:258`), also requires permit `ISSUED` at send time (`collection.go:113`) |
| P18 | `PRESENTED` → `ACCEPTED` | — | None in slice | `AcceptDocumentaryCollection` — `collection.go:283`; guard `PRESENTED` (`collection.go:315`), `ACCEPTANCE` term only (`collection.go:311`) |
| P19 | `PRESENTED` or `ACCEPTED` → `PAID` | — | None in slice | `SettleDocumentaryCollection` — `collection.go:340`; valid from-states `PRESENTED`/`ACCEPTED` (`collection.go:376–390`) |
| P20 | `PAID` → `RETURNED` | — | None in slice | `ReturnDocumentaryCollection` — `collection.go:425`; guard `PAID` (`collection.go:453`) |
| P21 | any → any of `SENT, FORWARDED, PRESENTED, ACCEPTED, PAID, REJECTED` (no from-state guard) | — (route in `banking.ts:2664`) | None in slice | `UpdateCADStatus` — `payment.go:1585`; only validates the *target* is in the set (`payment.go:1588–1591`) |
| P22 | any → `PAID` (no from-state guard) | — (route in `banking.ts:2718`) | None in slice | `RecordCADPayment` — `payment.go:1648` |
| P23 | `PAYMENT_RECEIVED`/`SETTLED`/`VERIFIED` → (no `Status` change; `DocumentsHeldBy` → `RELEASED`) | — (called only from `fabricService.ts:1452`, no route found) | None in slice | `ReleaseDocumentsToBuyer` — `payment.go:1190`; method `CAD`/`LC` only (`payment.go:1199`); valid from-states `PAYMENT_RECEIVED, SETTLED, VERIFIED` (`payment.go:1204–1208`) |

### 4d. Advance-payment entity (`AdvancePayment`, `advance.go` — no route in this slice calls these)

| ID | From → To | Chaincode guard | Chaincode |
|---|---|---|---|
| P24 | (none) → `RECEIVED` | Contract `ContractStatus==APPROVED` (`advance.go:89`); exporter `LicenseStatus==ACTIVE` (`advance.go:98`) | `RecordAdvancePayment` — `advance.go:53` |
| P25 | `RECEIVED` → `PERMIT_ISSUED` | Guard `RECEIVED` (`advance.go:218`); creates an `ExportPermit` with `Status=ISSUED` | `IssuePermitForAdvance` — `advance.go:190` |
| P26 | `PERMIT_ISSUED` → `SHIPPED` | Guard `PERMIT_ISSUED` (`advance.go:325`) | `LinkShipmentToAdvance` — `advance.go:297` |
| P27 | `SHIPPED` → `SETTLED` | Guard `SHIPPED` (`advance.go:411`); settles the linked export permit | `SettleAdvancePayment` — `advance.go:377` |

Reads: `GET /api/v1/payments` (`payments.ts:984`, `GetPaymentsByShipment`/`QueryAllPayments`, filters `status, exporterID, dateFrom, dateTo` in-memory), `GET /api/v1/payments/pending-release` (`payments.ts:1143`, filters `PENDING_RELEASE`/`VERIFIED`/`AWAITING_RELEASE`), `GET /api/v1/payments/:paymentID` (`payments.ts:1228`, PG first, then `ReadPayment`).

**Dependencies (§4):** P1/P3 need an existing LC (`lcID`) in `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED` for method `LC`; P4 needs a `PENDING` payment; P5 needs `DOCUMENTS_SUBMITTED`; P6 needs `VERIFIED` (or `DOCUMENTS_SUBMITTED`); P7 needs `SWIFT_INITIATED`; P8 needs `VERIFIED`/`SWIFT_RECEIVED` **plus** `payingBank, payingBankBIC, swiftReference, nbeApprovalRef` and (for the auto-map path) a forex allocation keyed `FOREX_<lcID>`; P9 re-uses P8's `SettlePayment` so it needs the same from-state — a payment already `SETTLED` by P8 will fail a second `SettlePayment` in P9 (chaincode guard `payment.go:690`); P14/P15 need method `ADVANCE`/`TT_ADVANCE`.

## §5 — SWIFT transitions (`SWIFTMessageEnhanced`)

All routes: `authMiddleware` only, no `requireRole` (except the inline org check on `nbe-approve`). All create functions set `DRAFT`; the lifecycle is strictly guarded in chaincode except `RejectSWIFTMessage`.

| ID | From → To | Who (API / chaincode MSP) | Endpoint | Request fields (R/O + validation) | Chaincode |
|---|---|---|---|---|---|
| S1 | (none) → `DRAFT` (MT700) | Any authenticated user / any MSP | `POST /api/v1/swift/messages` with `messageType=MT700` — `swift.ts:60` | `messageID` R `notEmpty()`, `messageType` R `isIn(['MT103','MT700','MT707','MT750','MT752','MT710','MT730','MT910'])`, `swiftReference` R, `senderBIC` R, `receiverBIC` R (`swift.ts:63–68`); `amount, currency, valueDate, beneficiary, remittanceInfo, linkedLcId, linkedPaymentId, orderingCustomer, beneficiaryAccount, chargeCode, lcNumber, applicant, lcExpiryDate, loadingPort, dischargePort, latestShipDate, documents, discrepancyDetails, discrepancyList` O | `invokeChaincode('CreateMT700_IssueLC', [messageID, linkedLcId\|\|'', swiftReference, senderBIC, receiverBIC, applicant\|\|'', beneficiary\|\|'', amount\|\|'0', currency\|\|'USD', lcExpiryDate\|\|'', loadingPort\|\|'', dischargePort\|\|'', latestShipDate\|\|''])` — `swift.ts:110`. On success, if `documents` is an array: `AddSWIFTDocuments` (**no such chaincode function** — §12-I6); if `linkedLcId`: `LinkSWIFTMessageToLC` (`swift.ts:129,135`) |
| S2 | (none) → `DRAFT` (MT700, dedicated) | Any authenticated user | `POST /api/v1/swift/messages/mt700` — `swift.ts:263` | `messageID, lcID, swiftReference, senderBIC, receiverBIC, applicant, beneficiary, amount, currency, expiryDate` R `notEmpty()` (`swift.ts:267–276`); `loadingPort, dischargePort, latestShipDate` O | `invokeChaincode('CreateMT700_IssueLC', [messageID, lcID, swiftReference, senderBIC, receiverBIC, applicant, beneficiary, amount, currency, expiryDate, loadingPort\|\|'', dischargePort\|\|'', latestShipDate\|\|''])` — `swift.ts:288` |
| S3 | (none) → `DRAFT` (MT707) | Any authenticated user | `POST /api/v1/swift/messages/mt707` — `swift.ts:325` | `messageID, lcID, swiftReference, amendmentReason` R `notEmpty()` (`swift.ts:329–332`); `senderBIC, receiverBIC, newAmount, newExpiryDate, amendmentNumber` O | `invokeChaincode('CreateMT707_AmendLC', [messageID, lcID, swiftReference, senderBIC, receiverBIC, amendmentReason, newAmount\|\|'', newExpiryDate\|\|'', amendmentNumber\|\|1])` — `swift.ts:343` |
| S4 | (none) → `DRAFT` (MT103) | Any authenticated user | `POST /api/v1/swift/messages` with `messageType=MT103` — `swift.ts:60` | Same base validators as S1; `linkedPaymentId, orderingCustomer, beneficiaryAccount, chargeCode` O (`chargeCode` default `SHA`) | `invokeChaincode('CreateMT103_Payment', [messageID, swiftReference, senderBIC, receiverBIC, linkedPaymentId\|\|'', orderingCustomer\|\|'', beneficiary\|\|'', beneficiaryAccount\|\|'', amount\|\|'0', currency\|\|'USD', valueDate\|\|'', remittanceInfo\|\|'', chargeCode\|\|'SHA'])` — `swift.ts:144`. On success, if `linkedLcId`: `LinkSWIFTMessageToLC` (`swift.ts:162`) |
| S5 | (none) → `DRAFT` (MT103, dedicated) | Any authenticated user | `POST /api/v1/swift/messages/mt103` — `swift.ts:376` | `messageID, swiftReference, amount` R `notEmpty()` (`swift.ts:380–383`); `senderBIC, receiverBIC, paymentID, orderingCustomer, beneficiary, beneficiaryAccount, currency, valueDate, remittanceInfo, chargeCode` O | `invokeChaincode('CreateMT103_Payment', [messageID, swiftReference, senderBIC, receiverBIC, paymentID\|\|'', orderingCustomer\|\|'', beneficiary\|\|'', beneficiaryAccount\|\|'', amount, currency\|\|'USD', valueDate\|\|'', remittanceInfo\|\|'', chargeCode\|\|'SHA'])` — `swift.ts:394` |
| S6 | (none) → `DRAFT` (MT750) | Any authenticated user | `POST /api/v1/swift/messages` with `messageType=MT750` — `swift.ts:60` | Same base validators as S1; `discrepancyDetails, discrepancyList` O | `invokeChaincode('CreateMT750_Discrepancy', [messageID, linkedLcId\|\|lcNumber\|\|'', swiftReference, senderBIC, receiverBIC, discrepancyDetails\|\|'', JSON.stringify(discrepancyList\|\|[])])` — `swift.ts:170` |
| S7 | (none) → `DRAFT` (MT750, dedicated) | Any authenticated user | `POST /api/v1/swift/messages/mt750` — `swift.ts:428` | `messageID, lcID, swiftReference, discrepancyDetails` R `notEmpty()` (`swift.ts:432–435`); `senderBIC, receiverBIC, discrepancyList` O | `invokeChaincode('CreateMT750_Discrepancy', [messageID, lcID, swiftReference, senderBIC, receiverBIC, discrepancyDetails, JSON.stringify(discrepancyList\|\|[])])` — `swift.ts:446` |
| S8 | (none) → `DRAFT` (MT752) | Any authenticated user | `POST /api/v1/swift/messages/mt752` — `swift.ts:478` | `messageID, lcID, amount` R `notEmpty()` (`swift.ts:482–485`); `swiftReference, senderBIC, receiverBIC, currency` O | `invokeChaincode('CreateMT752_AuthPayment', [messageID, lcID, swiftReference, senderBIC, receiverBIC, amount, currency\|\|'USD'])` — `swift.ts:495` |
| S9 | (none) → `DRAFT` (generic: MT710/MT730/MT910 or any other listed type) | Any authenticated user | `POST /api/v1/swift/messages` default branch — `swift.ts:60` | Same base validators as S1 | `invokeChaincode('CreateSWIFTMessage', [messageID, messageType, swiftReference, senderBIC, receiverBIC, currency\|\|'USD', amount\|\|'0', valueDate\|\|'', beneficiary\|\|'', remittanceInfo\|\|''])` — `swift.ts:183`. On success: `LinkSWIFTMessageToLC` if `linkedLcId`, `LinkSWIFTMessageToPayment` if `linkedPaymentId` (**no such chaincode function** — §12-I6), `UpdateSWIFTMessageField` for `orderingCustomer` / `beneficiaryAccount` (`swift.ts:199–218`; `UpdateSWIFTMessageField` only works on `DRAFT`, `swift.go:1362`) |
| S10 | `DRAFT` → `APPROVED` | Any authenticated user; `approvedBy` = `user.sub \|\| user.userId \|\| 'SYSTEM'` | `POST /api/v1/swift/messages/:messageID/approve` — `swift.ts:527` | `messageID` param R `notEmpty()`; no body fields | `invokeChaincode('ApproveSWIFTMessage', [messageID, approvedBy])` — `swift.ts:539`. Guard: `DRAFT` only (`swift.go:680`) |
| S11 | (no state change in chaincode — function does not exist; API claims `NBE_APPROVED`) | Inline check: `user.org`/`user.organization` must be `'NBE'` (403 otherwise, `swift.ts:592–597`); **not** `requireRole` | `POST /api/v1/swift/messages/:messageID/nbe-approve` — `swift.ts:572` | `messageID` param R; `approvedBy` R `notEmpty()`, `amlCheck` R `isIn(['PASS','FAIL'])`, `sanctionScreening` R `isIn(['PASS','FAIL'])` (`swift.ts:576–580`); `comments` O. Route pre-rejects `FAIL` on either check (400 `COMPLIANCE_FAILURE`) before calling chaincode | `invokeChaincode('NBEApproveSWIFTMessage', [messageID, approvedBy, amlCheck, sanctionScreening, comments\|\|'NBE approved after compliance review', <now>])` — `swift.ts:611`. **No `NBEApproveSWIFTMessage` function exists in `chaincodes/coffee/swift.go`** (nor anywhere in `chaincodes/coffee/*.go`) — the call cannot succeed; the `NBE_APPROVED` status in the success response (`swift.ts:602`) is never persisted |
| S12 | `APPROVED` → `SENT` | Any authenticated user; `sentBy` = `user.sub \|\| user.userId \|\| 'SYSTEM'` | `POST /api/v1/swift/messages/:messageID/send` — `swift.ts:653` | `messageID` param R `notEmpty()`; no body fields | `invokeChaincode('SendSWIFTMessage', [messageID, sentBy])` — `swift.ts:665`. Guard: `APPROVED` only (`swift.go:719`) |
| S13 | `SENT` or `IN_TRANSIT` → `RECEIVED` | Any authenticated user; `receivedBy` = `user.sub \|\| user.userId \|\| 'SYSTEM'` | `POST /api/v1/swift/messages/:messageID/receive` — `swift.ts:697` | `messageID` param R `notEmpty()`; no body fields | `invokeChaincode('ReceiveSWIFTMessage', [messageID, receivedBy])` — `swift.ts:709`. Guard: `SENT` or `IN_TRANSIT` (`swift.go:774`) — `IN_TRANSIT` is accepted as a from-state although nothing ever sets it |
| S14 | `RECEIVED` → `PROCESSING` | Any authenticated user; `processedBy` = `user.sub \|\| user.userId \|\| 'SYSTEM'` | `POST /api/v1/swift/messages/:messageID/process` — `swift.ts:741` | `messageID` param R `notEmpty()`; no body fields | `invokeChaincode('ProcessSWIFTMessage', [messageID, processedBy])` — `swift.ts:751`. Guard: `RECEIVED` only (`swift.go:828`) |
| S15 | `PROCESSING` → `SETTLED` | Any authenticated user | `POST /api/v1/swift/messages/:messageID/settle` — `swift.ts:783` | `messageID` param R `notEmpty()`; no body fields | `invokeChaincode('SettleSWIFTMessage', [messageID])` — `swift.ts:791`. Guard: `PROCESSING` only (`swift.go:869`) |
| S16 | any → `REJECTED` (no from-state guard) | Any authenticated user | `POST /api/v1/swift/messages/:messageID/reject` — `swift.ts:820` | `messageID` param R; `reason` R `notEmpty()` (`swift.ts:824–826`); `errorCode` O (default `G99`) | `invokeChaincode('RejectSWIFTMessage', [messageID, reason, errorCode||'G99'])` — `swift.ts:832`. No guard (`swift.go:905–955`): even a `SETTLED` message can be rejected afterwards |

Reads: `GET /api/v1/swift/messages/:messageID` (`swift.ts:865`, `ReadSWIFTMessage`), `GET /messages/:messageID/ledger-proof` (L898, `GetHistory`), `GET /messages` (L960, `QuerySWIFTMessagesByType/ByStatus/ByLC/ByPayment/ByReference/ByBIC` or `QueryAllSWIFTMessages`), `GET /statistics` (L1024, `GetSWIFTMessageStatistics`), `POST /messages/:messageID/validate` (L1056, `ValidateSWIFTMessageComplete` — read-only), `GET /` (L1099), `GET /analytics` (L1149), `GET /compliance` (L1239).

**Dependency:** a SWIFT message's link to a payment/LC is by **reference only** — `linkedLcId` / `linkedPaymentId` body fields passed to `LinkSWIFTMessageToLC` / `LinkSWIFTMessageToPayment`. The payment-side SWIFT leg (P6/P7, `payment.go`) and the message-side lifecycle (S10–S16, `swift.go`) are **two separate state machines** sharing only the `swiftReference` string: nothing in code synchronises `PaymentSettlement.Status` with `SWIFTMessageEnhanced.Status` (e.g. settling the message does not settle the payment, and vice versa).

## §6 — Repatriation transitions

No express-validator chains anywhere in this file — **all body fields are unvalidated at the API layer**; validation happens only in chaincode. Every route carries `requireRole` (rbac).

| ID | From → To | Who (API role / chaincode MSP) | Endpoint | Request fields (all unvalidated) | Chaincode |
|---|---|---|---|---|---|
| R1 | (none) → `PENDING` | `requireRole(['BANKS','BANK','BANK_ADMIN','BANK OFFICER'])` (`repatriation.ts:199`); chaincode: bank MSP only (`isBankMSP`, `repatriation.go:115`); route connects as `BanksMSP` | `POST /api/v1/repatriation/initiate` — `repatriation.ts:199` | `repatriationId, paymentId, contractId, shipmentId, exporterId, exportAmount, currency, fcyAccountNumber, fcyBank, fcyBankBIC, shipmentDate` — all passed positionally, no defaults | `submitTransaction('InitiateRepatriation', [repatriationId, paymentId, contractId, shipmentId, exporterId, String(exportAmount), currency, fcyAccountNumber, fcyBank, fcyBankBIC, shipmentDate])` — `repatriation.ts:218` |
| R2 | `PENDING`/`PARTIAL` → `PARTIAL` | `requireRole(['BANKS','BANK','BANK_ADMIN','BANK OFFICER'])` (`repatriation.ts:258`); chaincode: bank MSP only (`repatriation.go:322`); route connects as `BanksMSP` | `POST /api/v1/repatriation/:id/record` — `repatriation.ts:258` | `repatriatedAmount, convertedAmount, exchangeRate, swiftReference` (O, `''`), `bankCertificate` (O, `''`) | `submitTransaction('RecordRepatriation', [id, String(repatriatedAmount), String(convertedAmount), String(exchangeRate), swiftReference\|\|'', bankCertificate\|\|''])` — `repatriation.ts:272` |
| R3 | `PENDING`/`PARTIAL` → `READY_FOR_VERIFICATION` | Same as R2 | Same endpoint as R2 | Same as R2 | Same call as R2 — outcome depends on amounts: both `RequiredRetention` and `RequiredConversion` met → `READY_FOR_VERIFICATION` (`repatriation.go:409`); otherwise any positive amount → `PARTIAL` (`repatriation.go:414`) |
| R4 | `PENDING`/`PARTIAL`/`READY_FOR_VERIFICATION` → `OVERDUE` | Same as R2 (record path) or automatic on read (no write) | Same endpoint as R2 | Same as R2 | `RecordRepatriation` sets `OVERDUE` when `now` is past `ComplianceDeadline` (`repatriation.go:421–423`), **overriding** the `READY_FOR_VERIFICATION`/`PARTIAL` outcome in the same call. Read path: `updateRepatriationDeadline` recomputes `OVERDUE` in-memory on `ReadRepatriation` / `queryRepatriations` (`repatriation.go:798,908,939–946`) without persisting it |
| R5 | `READY_FOR_VERIFICATION` or `OVERDUE` → `COMPLIED` | `requireRole(['NBE','NBE_ADMIN','NBE OFFICER'])` (`repatriation.ts:306`); chaincode: `NBEMSP` only (`repatriation.go:501`); route connects as `NBEMSP` | `POST /api/v1/repatriation/:id/verify` — `repatriation.ts:306` | `verificationRef` (O at API, `''` — **but chaincode requires it non-empty**, `repatriation.go:501`), `verificationNotes` (O, `''`) | `submitTransaction('VerifyRepatriation', [id, verificationRef\|\|'', verificationNotes\|\|''])` — `repatriation.ts:314`. `COMPLIED` only if amounts met **and** not past deadline (`repatriation.go:522`); otherwise → `NON_COMPLIANT` (R6) |
| R6 | `READY_FOR_VERIFICATION` or `OVERDUE` → `NON_COMPLIANT` | Same as R5 | Same endpoint as R5 | Same as R5 | Same call as R5 — `NON_COMPLIANT` branch (`repatriation.go:527`) |
| R7 | `NON_COMPLIANT` or `OVERDUE` → `NON_COMPLIANT` (self-loop; only penalty fields change) | `requireRole(['NBE','NBE_ADMIN','NBE OFFICER'])` (`repatriation.ts:345`); chaincode: `NBEMSP` only; route connects as `NBEMSP` | `POST /api/v1/repatriation/:id/penalty` — `repatriation.ts:345` | `penaltyAmount, penaltyCurrency, reason` — all passed positionally (chaincode requires positive amount, non-empty currency and reason, `repatriation.go:599`) | `submitTransaction('ApplyNonCompliancePenalty', [id, String(penaltyAmount), penaltyCurrency, reason])` — `repatriation.ts:353`. Guard: from-state must be `NON_COMPLIANT` or `OVERDUE` (`repatriation.go:583`); sets `Status = "NON_COMPLIANT"` (`repatriation.go:606`) |
| R8 | any (with `WaiverRequested=true`) → `WAIVED` (only when `approved=="true"`; `approved=="false"` changes no status) | `requireRole(['NBE','NBE_ADMIN','NBE OFFICER'])` (`repatriation.ts:435`); chaincode: `NBEMSP` only; route connects as `NBEMSP` | `POST /api/v1/repatriation/:id/waiver/approve` — `repatriation.ts:435` | `approved, reason` (O, `''` at API — chaincode requires `reason` non-empty and `approved` exactly `"true"`/`"false"`, `repatriation.go:727–733`) | `submitTransaction('ApproveWaiver', [id, String(approved), reason\|\|''])` — `repatriation.ts:443`. Requires a pending waiver request (`repatriation.go:724`); `approved=="true"` → `WAIVED` + `IsOverdue=false` (`repatriation.go:740`) |
| R9 | — (no status change; sets `WaiverRequested=true`, `WaiverReason`) | `requireRole(['EXPORTER'])` (`repatriation.ts:385`); chaincode: **`ECTAMSP` only** (`repatriation.go:654` — note: the *exporter organisation* MSP, not an `EXPORTER` role; route connects as `ECTAMSP`); route also enforces exporter-ownership (`user.exporterId/username` must match the record) and a non-empty `waiverReason` (manual 400) | `POST /api/v1/repatriation/:id/waiver/request` — `repatriation.ts:385` | `waiverReason` (manual non-empty check, `repatriation.ts:403–405`) | `submitTransaction('RequestWaiver', [id, waiverReason])` — `repatriation.ts:405`. No from-state guard — a waiver can be requested from any status, including `COMPLIED` |

Reads: `GET /api/v1/repatriation` (L18, `QueryAllRepatriations` / `QueryRepatriationsByExporter` for exporters), `GET /:id` (L60, `ReadRepatriation`), `GET /exporter/:exporterId` (L96), `GET /status/:status` (L134, roles exclude `EXPORTER`), `GET /overdue/all` (L167, `QueryOverdueRepatriations`).

**Dependencies (R1, chaincode `repatriation.go:153–225` — the strictest gate in this slice):** the referenced payment must exist **and** be `SETTLED` **and** match `contractId`, `exporterId`, `currency` (L157); at most one repatriation per payment (composite-key + legacy query, L160–177); if the payment carries a `ShipmentID` it must equal `shipmentId` (L178); `exportAmount` must not exceed the settled payment amount (L181); the shipment must exist and match contract/exporter (L184–190); `shipmentDate` (body, `YYYY-MM-DD`) must equal the ledger's departure or bill-of-lading date (`parseRepatriationShipmentDate`, L191–203); an active `COFFEE` retention policy must exist, with retention + surrender rates totalling 100% (L217–225). `ComplianceDeadline = shipmentDate + 120 days` (L214). **Record (R2–R4) gates:** amounts finite, non-negative, at least one positive, cumulative caps vs `RequiredRetention` / `RequiredConversion` / `ExportAmount` (L339–352); `exchangeRate` must equal the active ledger mid-rate exactly (L353–359); `swiftReference` **and** `bankCertificate` are both required non-empty (L360–362) despite the route defaulting them to `''`.

## §7 — Retention transitions

Retention is recorded on the **forex allocation**, not on the payment: `ForexAllocation.RetentionStatus` (`PENDING`/`COMPLIED`/`NON_COMPLIANT`) while `ForexAllocation.Status` itself is unchanged. Chaincode lives in `chaincodes/coffee/forex.go` (not in the task's file list, but it is the only implementation of the two functions the retention routes call).

| ID | From → To | Who (API role / chaincode MSP) | Endpoint | Request fields (R/O + validation) | Chaincode |
|---|---|---|---|---|---|
| RT1 | (none) → policy `ACTIVE` (previous ACTIVE policy for same commodity → `INACTIVE`) | `requireRole(['NBE','NBE_ADMIN','NBE OFFICER'])` (`retention.ts:17`); chaincode: `NBEMSP` only; route connects as `NBEMSP` | `POST /api/v1/retention/policy` — `retention.ts:15` | `commodityType` R `notEmpty().isString()`, `retentionRate` R `isFloat({min:0, max:100})`, `setBy` R `notEmpty().isString()`, `justification` R `notEmpty().isString()` (`retention.ts:20–23`) | `invokeChaincode('SetRetentionPolicy', [policyId, commodityType.toUpperCase(), retentionRate, setBy, justification])` — `retention.ts:38`, where `policyId = 'POLICY-<commodityType>-<Date.now()>'`. Chaincode `forex.go:1170`: `SurrenderRate = 100 − retentionRate`; rejects duplicate `policyID` |
| RT2 | `Forex.Status ∈ {ALLOCATED, UTILIZED}` → `RetentionStatus = COMPLIED` | `requireRole(['BANKS','BANK_ADMIN','BANK OFFICER','FOREX OFFICER','NBE','NBE_ADMIN','NBE OFFICER'])` (`retention.ts:188`); chaincode: `NBEMSP` or bank MSP (`forex.go:669`); route connects as `NBEMSP` if role starts with `NBE`, else `BanksMSP` | `POST /api/v1/retention/:forexId/retention` — `retention.ts:186` | `forexId` param R `notEmpty()`; `fcyAccountNumber` R `notEmpty()`, `retentionPercentage` R `isFloat({min:0, max:100})` (`retention.ts:190–193`). Route pre-reads `ReadForex` (L201, 404 if missing) and re-reads it after commit (L226) to return the computed `retentionAmount` and `status`, then mirrors to PG `forex_allocations` | `invokeChaincode('RecordForexRetention', [forexId, String(retentionPercentage), fcyAccountNumber.trim()])` — `retention.ts:213`. Chaincode `forex.go:652–735`: forex must be `ALLOCATED`/`UTILIZED` (L694); already-`COMPLIED` is rejected (L696); `RetentionAmountUSD = AllocatedAmount × percentage / 100` (L705); `RetentionStatus` is first set to `PENDING` (L708), then `COMPLIED` iff the submitted % equals the active `COFFEE` policy rate within 0.0001 (L711) |
| RT3 | `Forex.Status ∈ {ALLOCATED, UTILIZED}` → `RetentionStatus = NON_COMPLIANT` | Same as RT2 | Same endpoint as RT2 | Same as RT2 | Same call as RT2 — `NON_COMPLIANT` branch when the submitted % differs from the active policy rate (`forex.go:713`) |
| RT4 | `Forex.Status ∈ {ALLOCATED, UTILIZED}` → `RetentionStatus = PENDING` | Same as RT2 | Same endpoint as RT2 | Same as RT2 | Same call as RT2 — `PENDING` is the outcome when **no active policy exists** (`forex.go:708–709`: the `COMPLIED`/`NON_COMPLIANT` evaluation is skipped if `GetCurrentRetentionPolicy` errors) |

Reads: `GET /api/v1/retention/policy/:commodityType` (`retention.ts:85`, `GetCurrentRetentionPolicy`; falls back to a hard-coded default for `COFFEE` — `retentionPercentage: 40`, `surrenderRate: 60` — when the chaincode query fails), `GET /api/v1/retention/:forexId/retention` (`retention.ts:275`, `ReadForex`; `status = retentionStatus || 'PENDING'`, `compliantWithNBE = retentionStatus === 'COMPLIED'`).

**Dependency:** RT2–RT4 require an existing forex allocation in `ALLOCATED` or `UTILIZED` (i.e. retention is recorded against the forex allocation, **not** against the settled payment). The repatriation flow (§6 R1) independently requires an active `COFFEE` retention policy and derives `RequiredRetention`/`RequiredConversion` from it — the two retention mechanisms are not linked in code (no call from repatriation to `RecordForexRetention` or vice versa). **Rate inconsistency:** the API default is 40%, `PaymentService` hard-codes 40% (§4 P2/P9), `ReceiveAdvancePayment` hard-codes 100% (`payment.go:1282`), and `SettlePayment`'s fallback default is 100% (`payment.go:722`, citing NBE FXD/01/2024) — see §12-I7.

## §8 — Settlement / post-delivery transitions

Routes: `postDeliveryWorkflow.ts`, all `authMiddleware` only, **no `requireRole`**. All state lives in PG (`post_delivery_tracking`, `post_delivery_checklist`, `post_delivery_issues`); the only chaincode calls are `SettlePayment` (LC path) and `UpdateContractStatus → COMPLETED`. The workflow is initialised by `PostDeliveryWorkflowService.initializePostDeliveryWorkflow` (`postDeliveryWorkflowService.ts:100–184`, called from `shipments.ts:2476`, **not** from any route in this slice) with `overall_status='PENDING'`, `completion_percentage=0`.

| ID | From → To | Who | Endpoint | Request fields (R/O + validation) | Chaincode / service |
|---|---|---|---|---|---|
| D1 | `payment_received=false` → `true` (PG; checklist `PAYMENT_RECEIVED` completed) | Any authenticated user | `POST /api/v1/post-delivery/:shipmentId/payment` — `postDeliveryWorkflow.ts:120` | `shipmentId` param R `notEmpty()`; `paymentAmount` R `isNumeric()`, `paymentCurrency` R `isLength({min:3,max:3})`, `swiftReference` R `notEmpty()` (`postDeliveryWorkflow.ts:124–128`) | **No chaincode.** `workflowService.recordPaymentReceived` (`postDeliveryWorkflowService.ts:285–320`): PG `UPDATE post_delivery_tracking SET payment_received=true …`. No check that a payment actually exists or is `SETTLED`; `swiftReference` is stored as a string only |
| D2 | `forex_repatriated=false` → `true` (PG; checklist `FOREX_REPATRIATED` completed) | Any authenticated user | `POST /api/v1/post-delivery/:shipmentId/forex` — `postDeliveryWorkflow.ts:180` | `shipmentId` param R; `forexAmount` R `isNumeric()`, `forexRate` R `isNumeric()` (`postDeliveryWorkflow.ts:184–186`) | **No chaincode.** `recordForexRepatriation` (`postDeliveryWorkflowService.ts:340–375`): PG update only. No link to the §6 repatriation record or the §7 retention record |
| D3 | `lc_settled=false` → `true` (PG; checklist `LC_SETTLED` completed) + payment `PAY_<lcReference>` `VERIFIED`/`SWIFT_RECEIVED` → `SETTLED` (chaincode, best-effort) | Any authenticated user | `POST /api/v1/post-delivery/:shipmentId/lc-settlement` — `postDeliveryWorkflow.ts:238` | `shipmentId` param R; `lcReference` R `notEmpty()` (`postDeliveryWorkflow.ts:242–244`) | `recordLCSettlement` (`postDeliveryWorkflowService.ts:375–437`): reads `ReadPayment` for `PAY_<lcReference>`; **only if** its status is `VERIFIED` or `SWIFT_RECEIVED` it calls `invokeChaincode('SettlePayment', [PAY_<lcReference>, '0', '0', payingBank, payingBankBIC, swiftReference, ''])` (zeros trigger the forex auto-map in `payment.go:698–724`). If the payment is missing or in another status, the chaincode step is **skipped with a warning and the PG update still happens** (`lc_settled=true` regardless of `blockchainSettled`) |
| D4 | `ecta_audit_completed=false` → `true`, `ectaAuditResult ∈ {PASSED, FAILED}` (PG; checklist `ECTA_AUDIT_COMPLETED` completed) | Any authenticated user | `POST /api/v1/post-delivery/:shipmentId/ecta-audit` — `postDeliveryWorkflow.ts:294` | `shipmentId` param R; `auditResult` R `isIn(['PASSED','FAILED'])`, `auditNotes` O `isString()` (`postDeliveryWorkflow.ts:298–301`) | **No chaincode.** `recordECTAAudit` (`postDeliveryWorkflowService.ts:452–486`): PG update only. A `FAILED` audit still sets `ecta_audit_completed=true` and therefore still counts toward completion/closure (see §11) |
| D5 | `contract_closed=false` → `true`, `overall_status` → `COMPLETED`, `completion_percentage` → `100` (PG) + contract → `COMPLETED` (chaincode) | Any authenticated user | `POST /api/v1/post-delivery/:shipmentId/close-contract` — `postDeliveryWorkflow.ts:352` | `shipmentId` param R `notEmpty()`; no body fields | `closeContract` (`postDeliveryWorkflowService.ts:487–533`): `invokeChaincode('UpdateContractStatus', [contractId, 'COMPLETED'])` (L504–507; **fire-and-forget — its result is not checked**), then PG update. No enforcement that D1–D4 are done — the route does not call `checkWorkflowCompletion` and does not verify `paymentReceived/forexRepatriated/lcSettled/ectaAuditCompleted` |
| D6 | `overallStatus` derived: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `DELAYED` | — (derived on read) | `GET /api/v1/post-delivery/:shipmentId/status` — `postDeliveryWorkflow.ts:50` | `shipmentId` param R `notEmpty()` | `getPostDeliveryStatus` + `determineOverallStatus` (`postDeliveryWorkflowService.ts:188–265,554–578`): `COMPLETED` iff `contract_closed`; `DELAYED` iff payment not received after 90 days (`PAYMENT_SLA`) or forex not repatriated within 7 days of payment (`FOREX_SLA`); `IN_PROGRESS` iff any of payment/forex/audit done; else `PENDING`. `ISSUE` is in the type but never returned. `completionPercentage = completed / (lcUsed ? 5 : 4)` (L541–551). `checkWorkflowCompletion` (L668–686) only *notifies* `READY_FOR_CLOSURE` when payment + forex + (LC if used) + audit are done — it never closes anything itself |

Reads: `GET /api/v1/post-delivery/dashboard` (`postDeliveryWorkflow.ts:400`, PG views `v_post_delivery_summary`, `v_pending_payments`, `v_pending_forex`, `v_pending_ecta_audits`, `v_ready_for_closure`).

## §9 — `status.ts`: what it reports and how it derives it

| Endpoint | Reports | Derivation (code) |
|---|---|---|
| `GET /api/v1/status/transitions/:entityType` — `status.ts:20` | Allowed next statuses for an entity type, optionally from a given `currentStatus` | `statusManager.getNextStatuses(entityType, currentStatus)` / the static `StatusTransitions` table (`statusManager.ts:10–150,245`). Params: `entityType` R `notEmpty()`; `currentStatus` O query `isString()` |
| `GET /api/v1/status/:entityType/:entityId/timeline` — `status.ts:77` | Status timeline (`status`, `timestamp`, `updatedBy` per change) | `statusManager.getStatusTimeline` → `queryChaincode('Get' + entityType + 'History', [entityId])` (`statusManager.ts:336–360`). **Only `GetShipmentHistory` exists in chaincode** (`main.go:2168`); there is no `GetPaymentHistory`, `GetCUSTOMSHistory`, etc. — for any entity other than `SHIPMENT` this query targets a non-existent function. The generic `GetHistory(key)` (`main.go:2564`) is not used here |
| `POST /api/v1/status/:entityType/:entityId/validate` — `status.ts:121` | `isValid` + `allowedNextStatuses` for a proposed transition | `statusManager.validateTransition` (`statusManager.ts:217–244`). Body: `currentStatus` R `notEmpty()`, `newStatus` R `notEmpty()` |
| `GET /api/v1/status/workflow/:entityId?type=CONTRACT\|SHIPMENT\|PAYMENT` — `status.ts:176` | Aggregate statuses across related entities | `type` query R `isIn(['CONTRACT','SHIPMENT','PAYMENT'])` (`status.ts:181`). CONTRACT → `{contract, forex, lc, shipment, payment}`; SHIPMENT → `{shipment, quality, phytosanitary, eudr, insurance, landTransport, customs, courier}`; PAYMENT → `{payment, swift, documents}`. Single-entity reads via `getEntityStatus` → `queryChaincode('Read' + entityType, [id])` (`status.ts:238–258`); related reads via `getRelatedStatus` → `queryChaincode('QueryBy' + fieldName, [value])` (`status.ts:261–283`). **Both query names are wrong for the chaincode as written:** there is no `ReadCONTRACT` (the function is `ReadSalesContract`, `main.go:675`), no `ReadCUSTOMS` (functions are `ReadDeclaration`/`ReadCustomsDeclaration`, `customs.go:901,927`), and no `QueryByContractId` / `QueryByShipmentId` / `QueryByPaymentId` function exists in any chaincode file — those related lookups will fail and return `[]`, and single reads return `status: 'NOT_FOUND'` on failure. Failures are swallowed (warn-logged), so the endpoint returns partial/empty aggregates with HTTP 200 |

### 9a. `statusManager.ts` transition tables (the reference the `status.ts` endpoints serve)

| Entity | Table (`statusManager.ts`) |
|---|---|
| `APPLICATION` | `PENDING→APPROVED/REJECTED; APPROVED→∅; REJECTED→PENDING` (L12–16) |
| `USER` | `INACTIVE→ACTIVE/REJECTED; ACTIVE→SUSPENDED/INACTIVE; REJECTED→INACTIVE; SUSPENDED→ACTIVE/INACTIVE` (L19–24) |
| `CONTRACT` | `REGISTERED→APPROVED/REJECTED; APPROVED→EXECUTED/CANCELLED; REJECTED→∅; EXECUTED→COMPLETED; CANCELLED→∅; COMPLETED→∅` (L27–34) |
| `FOREX` | `REQUESTED→ALLOCATED/REJECTED; ALLOCATED→UTILIZED/EXPIRED; REJECTED→∅; UTILIZED→SETTLED; EXPIRED→∅; SETTLED→∅` (L37–44) |
| `LC` | `REQUESTED→APPROVED/REJECTED; APPROVED→ISSUED/EXPIRED; ISSUED→FOREX_ALLOCATED/UTILIZED/AMENDED/EXPIRED; FOREX_ALLOCATED→UTILIZED/EXPIRED; AMENDED→ISSUED/FOREX_ALLOCATED/UTILIZED/EXPIRED; UTILIZED→PAYMENT_RELEASED; PAYMENT_RELEASED→SETTLED; SETTLED/REJECTED/EXPIRED→∅` (L47–60) |
| `SHIPMENT` | `CREATED→QUALITY_INSPECTION/CANCELLED; …; LAND_TRANSPORT_STARTED→BORDER_CROSSING; BORDER_CROSSING→PORT_ARRIVED; PORT_ARRIVED→CUSTOMS_DECLARED; CUSTOMS_DECLARED→CUSTOMS_CLEARED/CUSTOMS_REJECTED; CUSTOMS_CLEARED→CONTAINER_STUFFED; CONTAINER_STUFFED→VESSEL_LOADED; VESSEL_LOADED→IN_TRANSIT; IN_TRANSIT→ARRIVED_DESTINATION; ARRIVED_DESTINATION→DELIVERED; DELIVERED/QUALITY_REJECTED/CUSTOMS_REJECTED/CANCELLED→∅` (L62–86) |
| `PAYMENT` | `PENDING→DOCUMENTS_SUBMITTED/CANCELLED; DOCUMENTS_SUBMITTED→VERIFIED/REJECTED; VERIFIED→SWIFT_INITIATED; SWIFT_INITIATED→SWIFT_RECEIVED/SWIFT_FAILED; SWIFT_RECEIVED→SETTLED; SETTLED→DOCUMENTS_RELEASED; DOCUMENTS_RELEASED→COMPLETED; COMPLETED/REJECTED/CANCELLED→∅; SWIFT_FAILED→SWIFT_INITIATED` (L87–99) |
| `PHYTOSANITARY` / `EUDR` / `INSURANCE` | Tables at L102–133 (outside this slice's entities; listed for completeness — the `status.ts` endpoints serve them too) |
| `CUSTOMS` | `SUBMITTED→UNDER_REVIEW; UNDER_REVIEW→INSPECTION_REQUIRED/PRE_CLEARED; INSPECTION_REQUIRED→INSPECTION_SCHEDULED; INSPECTION_SCHEDULED→INSPECTION_IN_PROGRESS; INSPECTION_IN_PROGRESS→INSPECTION_PASSED/INSPECTION_FAILED; INSPECTION_PASSED→CLEARED; PRE_CLEARED→CLEARED; CLEARED→RELEASED; RELEASED→∅; INSPECTION_FAILED→INSPECTION_SCHEDULED` (L135–150) — **diverges from chaincode** (see §12-I2) |

**Enforcement reality:** `validateTransition` returns `true` (allows) when the entity type has no table or the current status is not in the table (`statusManager.ts:217–244`), and `updateEntityStatus` **never touches the chaincode** — it logs `✅ … (PostgreSQL only)` and returns success (`statusManager.ts:277–310`, with the blockchain/cascade code commented out as disabled). `cascadeStatusUpdates` (`statusManager.ts:326–…`, `RelatedStatusUpdates` L153–211) is therefore dead code: the declared cascades (`CUSTOMS_CLEARED → shipment.customsStatus=CLEARED`, `PAYMENT_SETTLED → LC/FOREX/CONTRACT=SETTLED`, etc.) never execute through this path. The only real settlement cascade is the one inside `SettlePayment` itself (§4 P8).

## §10 — Dependencies (previous step's output required as input)

| Transition | Required prior output (exact field names) |
|---|---|
| C1 `SubmitCustomsDeclaration` | `shipmentID` whose ledger shipment status is `PERMIT_ISSUED` (ECTA export permit) — `customs.go:269`. API also blocks a second declaration for the same `shipmentID` (PG check, `customs.ts:701–715`). Route's `permit-ready` list (§2 C13) is the source of permit-ready shipments |
| C3–C5 customs review/inspect/clear | A declaration in `SUBMITTED` (C3) → `UNDER_INSPECTION` (C4) → `UNDER_REVIEW` (C5); each step's input is the `declarationID` created in C1 |
| B1 `InitiateBorderCrossing` | `shipmentId, contractId, exporterId` (body) + `customsDeclaration` (declaration number string from §2, stored verbatim, not validated) + `exitPermitNumber` |
| B2 `ClearForExit` | Intended: customs clearance (C5, `CLEARED` declaration) first; **not enforced** in code |
| P1/P3 `InitiatePayment` | `lcID` of an LC in `ISSUED`/`FOREX_ALLOCATED`/`UTILIZED` (method `LC`); `contractID`, `exporterID`, `amount`, `currency` are auto-mapped from the LC/contract when present |
| P4 `SubmitPaymentDocuments` | Payment in `PENDING` (P1/P3) + `documents` array (route's `record` flow supplies Bill of Lading, Commercial Invoice, Certificate of Origin, Quality Certificate) |
| P5 `VerifyPaymentDocuments` | Payment in `DOCUMENTS_SUBMITTED` + `verifiedBy, comments` |
| P6 `InitiateSWIFTTransfer` | Payment `VERIFIED` (or `DOCUMENTS_SUBMITTED`) + `swiftReference, senderBIC, messageType, valueDate, charges, remittanceInfo` |
| P7 `ConfirmSWIFTReceipt` | Payment `SWIFT_INITIATED` + `receivedBy` |
| P8 `SettlePayment` | Payment `VERIFIED`/`SWIFT_RECEIVED` + `exchangeRate, retentionRate, payingBank, payingBankBIC, swiftReference, nbeApprovalRef`; forex allocation `FOREX_<lcID>` is the auto-map source for rate/retention when `0` is passed |
| P9 `release` | PG payment row (not `RELEASED`); internally re-runs `SettlePayment`, so it needs the same from-state as P8 — see §12-I8 |
| P14/P15 advance/balance | Payment with `paymentMethod` `ADVANCE`/`TT_ADVANCE`; P15 additionally needs `PaymentStage==ADVANCE` (i.e. P14 first) |
| S1–S9 SWIFT create | MT700/MT707/MT750/MT752 need an existing `lcID` (`linkedLcId`); MT103 needs `paymentID` (`linkedPaymentId`) for the payment link (link itself is a separate, partially missing call — §12-I6) |
| S10–S16 SWIFT lifecycle | The `messageID` created in S1–S9, in the exact from-state (`DRAFT` → `APPROVED` → `SENT` → `RECEIVED` → `PROCESSING` → `SETTLED`) |
| R1 `InitiateRepatriation` | Settled payment (`paymentId`, status `SETTLED`) matching `contractId`/`exporterId`/`currency`; matching shipment (`shipmentId`) with a ledger departure/BL date equal to body `shipmentDate`; active `COFFEE` retention policy (see §6 for the full gate list) |
| R2–R4 `RecordRepatriation` | Repatriation in `PENDING`/`PARTIAL` (no explicit from-state guard in code, but `OVERDUE`/`COMPLIED`/`WAIVED` records will fail the amount caps or be overwritten — see §12) + `swiftReference` + `bankCertificate` + `exchangeRate` equal to the active ledger mid-rate |
| R5/R6 `VerifyRepatriation` | Repatriation `READY_FOR_VERIFICATION` or `OVERDUE` + non-empty `verificationRef` |
| R7 penalty / R8 waiver | `NON_COMPLIANT`/`OVERDUE` (penalty); a pending waiver request + `reason` (waiver approve) |
| RT2–RT4 retention | Forex allocation `forexId` in `ALLOCATED`/`UTILIZED` + active `COFFEE` retention policy (for the `COMPLIED`/`NON_COMPLIANT` determination) + `fcyAccountNumber` |
| D3 LC settlement | Payment entity `PAY_<lcReference>` in `VERIFIED`/`SWIFT_RECEIVED`; if absent/other status, the chaincode step is skipped but PG still marks settled |
| D5 close-contract | Intended: D1 (payment) + D2 (forex) + D3 (LC if used) + D4 (audit) complete; **not enforced** by the route |
| `status.ts` workflow aggregate | A contract/shipment/payment `entityId` plus the related entities existing under the (incorrect) query names in §9 |

## §11 — Dead ends (statuses with no outgoing transition in code)

| Status (entity) | Outgoing transitions in code? | Verdict |
|---|---|---|
| `CLEARED` (customs declaration) | **None.** `Reject*` explicitly refuses `CLEARED` (`customs.go:784,859`); no release/forward function exists in `customs.go`. The `statusManager` table claims `CLEARED → RELEASED`, but no code sets `RELEASED` | Terminal (chaincode). Shipment side continues via `CUSTOMS_CLEARED` → `CONTAINER_STUFFED` in the `statusManager` table only — that shipment transition has no chaincode function in this slice |
| `REJECTED` (customs declaration) | **None.** No resubmit/re-review path; re-reject is allowed (guard is only `!= CLEARED`) but changes nothing material | Terminal |
| `SUBMITTED` (customs, via API wrapper C7) | **None on-chain** — the CouchDB/PG `submitted` record is never submitted to chaincode, so C3–C5 (which require a ledger `SUBMITTED` record) cannot act on it | Dead end (API/chaincode split) |
| `INSPECTING` (customs, PG-only C9) | **None** — no route moves `INSPECTING` onward, and the chaincode never sees it | Dead end (API-only state) |
| `ARRIVED` (border crossing) | **None.** No delivery/closure function in `bordercrossing.go`; `VerifyCompliance` only touches `ComplianceStatus`. `ARRIVED` is the last border state; the shipment's own `DELIVERED` state is a different entity (`statusManager` `SHIPMENT` table) with no linking call here | Terminal in this slice |
| `CROSSED` / `CLEARED` / `INSPECTED` (border) | **None as guarded transitions** — but because no function checks from-state, any of them can be *overwritten* by calling another border endpoint (e.g. `detain` on an `ARRIVED` record). So they are terminal by design, mutable by accident | Terminal-by-design, not enforced |
| `INSPECTION_FAILED` (border) | **None.** No re-inspection or release path; only overwrite-by-another-endpoint (unguarded) | Terminal-by-design |
| `DETAINED` (border) | **None.** No release-from-detention function; only overwrite-by-another-endpoint (unguarded) | Terminal-by-design |
| `SETTLED` (payment) | Chaincode: **none** — `validateStatusTransition` LC table says `SETTLED → DOCUMENTS_RELEASED`, but no function assigns `DOCUMENTS_RELEASED` to `PaymentSettlement.Status` (`ReleaseDocumentsToBuyer` only sets `DocumentsHeldBy="RELEASED"` and has no route). `statusManager` adds `DOCUMENTS_RELEASED → COMPLETED`, equally unreachable | Terminal in practice. The *workflow* continues outside the payment entity: repatriation (§6, gated on payment `SETTLED`), release (§4 P9, PG `RELEASED` via a second `SettlePayment` — which the chaincode guard would reject on an already-`SETTLED` payment, §12-I8), and post-delivery (§8) |
| `SETTLED` (SWIFT message) | **None** — except `RejectSWIFTMessage`, which has no from-state guard and can move a `SETTLED` message to `REJECTED` | Terminal except for the unguarded reject |
| `REJECTED` (SWIFT message) | **None** | Terminal |
| `COMPLIED` (repatriation) | **None** — no function moves out of `COMPLIED`; `updateRepatriationDeadline` explicitly excludes `COMPLIED`/`WAIVED` from becoming `OVERDUE` | Terminal (correct end state) |
| `WAIVED` (repatriation) | **None** | Terminal |
| `NON_COMPLIANT` (repatriation) | `ApplyNonCompliancePenalty` (self-loop, R7) and `RequestWaiver`/`ApproveWaiver` (R9/R8, waiver path). `VerifyRepatriation` cannot re-run it (from-state must be `READY_FOR_VERIFICATION`/`OVERDUE`) — so a `NON_COMPLIANT` record can only exit via waiver approval, not via recording more repatriation: `RecordRepatriation` has **no from-state guard**, so it *can* still add amounts, but if the deadline has passed it flips back to `OVERDUE`, and `VerifyRepatriation` from `OVERDUE` can then reach `COMPLIED` — a narrow re-entry path | Near-terminal; waiver or overdue-re-verify only |
| `OVERDUE` (repatriation) | `VerifyRepatriation` (→ `COMPLIED`/`NON_COMPLIANT`), `ApplyNonCompliancePenalty` (→ `NON_COMPLIANT`), `ApproveWaiver` (→ `WAIVED`); `RecordRepatriation` (amounts; may stay `OVERDUE`) | Not terminal |
| `COMPLIED` / `NON_COMPLIANT` (forex retention) | **None** — `RecordForexRetention` refuses to re-record once `COMPLIED` (`forex.go:696`); `NON_COMPLIANT` can be re-recorded (no guard against it) but there is no distinct "fix" transition | `COMPLIED` terminal; `NON_COMPLIANT` re-recordable |
| `COMPLETED` (post-delivery overall / contract) | **None** — `closeContract` is the end of the line; nothing follows `COMPLETED` in code | Terminal (correct end state) |
| `DOCUMENTS_RELEASED` / `COMPLETED` (payment, `statusManager` only) | **Unreachable** — declared as successors of `SETTLED` but never assigned (see row above) | Declared but dead |
| `PENDING_APPROVAL` / `IN_TRANSIT` / `CANCELLED` / `FAILED` (SWIFT) | **Never assigned** (constants only); `PENDING_APPROVAL` is counted in statistics, `IN_TRANSIT` is accepted as a from-state by `ReceiveSWIFTMessage` but unreachable | Dead constants |
| `UNDER_VERIFICATION` / `VERIFICATION_PASSED` / `VERIFICATION_FAILED` / `PAYMENT_AUTHORIZED` and all CAD/TT/ADVANCE intermediate states (§1c) | **Never assigned** — declared only in `validateStatusTransition` tables | Dead declared states |

## §12 — Inconsistencies and broken calls (flagged, not fixed)

- **I1 — Role checks are the exception in this slice.** Only 4 mutating endpoints carry `requireRole`: customs reject (`CUSTOMS`, `customs.ts:1342`), payment release (`NBE/NBE_ADMIN/ADMIN`, `payments.ts:1710`), retention policy + retention record, and all repatriation routes. Everything else in customs/border/payments/swift/post-delivery/status relies on mount-level `authMiddleware` only — any authenticated role (including `EXPORTER`) can e.g. clear a customs declaration (C5 route), settle a payment (P8 route), or close a contract (D5). Chaincode MSP checks partially compensate (e.g. `ClearCustomsDeclaration` requires `CustomsMSP`, `SettlePayment` requires `BanksMSP`), but several chaincode functions have no MSP check at all (border B1/B3–B12 except B2; `InitiatePayment`; `SubmitPaymentDocuments`; `ReceiveAdvancePayment`).
- **I2 — `statusManager` `CUSTOMS` table ≠ chaincode.** The table (`statusManager.ts:135–150`) says `SUBMITTED → UNDER_REVIEW → INSPECTION_REQUIRED → … → CLEARED → RELEASED`; the chaincode actually does `SUBMITTED → UNDER_INSPECTION → UNDER_REVIEW → CLEARED` (and `REJECTED`). `UNDER_REVIEW` is a *pre*-inspection state in the table but a *post*-inspection state in chaincode. Any client driving off `GET /status/transitions/CUSTOMS` will attempt transitions the chaincode rejects.
- **I3 — Two different payment state machines.** `statusManager` `PAYMENT` (`statusManager.ts:87–99`) says `DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED → DOCUMENTS_RELEASED → COMPLETED`. Chaincode `validateStatusTransition` (`payment.go:107–178`) says `DOCUMENTS_SUBMITTED → UNDER_VERIFICATION → VERIFICATION_PASSED → PAYMENT_AUTHORIZED → SWIFT_INITIATED` (LC) — states no function ever sets. The *implemented* chaincode path is `PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED`. Practical consequence: the `POST /:paymentID/settle` route validates via `statusManager`, so `VERIFIED → SETTLED` is **rejected at the route** even though `SettlePayment` accepts it (`payment.go:690`); conversely `UpdatePaymentStatus` validates via the chaincode table, so it can never set `VERIFIED` (not a valid successor of anything in the LC table except via the dead intermediate states).
- **I4 — `ClearCustomsDeclaration` argument-count mismatch.** `CustomsService.clearDeclaration` (`customsService.ts:282`) calls `submitTransaction('ClearCustomsDeclaration', [declarationID, clearedBy, clearanceNumber, duties, taxes, clearanceNotes, date])` — 7 args — while the chaincode function takes 4 (`customs.go:682–683`). The plural `POST /declarations/:id/clear` route (C10) avoids chaincode entirely, so the only chaincode-backed clear path is the one with the mismatch; whether Fabric's dispatcher rejects the extra args or ignores them was not verified by a live call (read-only task, no servers started).
- **I5 — SWIFT NBE approval is a dead end.** `POST /messages/:messageID/nbe-approve` (`swift.ts:572`) calls `NBEApproveSWIFTMessage`, which does not exist in chaincode; the `NBE_APPROVED` status it returns is never persisted. There is also no ordering rule: `ApproveSWIFTMessage` requires `DRAFT`, so even if the NBE function existed, its place in the sequence (before/after `APPROVED`) is undefined.
- **I6 — Calls to non-existent chaincode functions.** `ConfirmSettlement` (`payments.ts:908`), `RecordForexRepatriation` (`payments.ts:1359`), `NBEApproveSWIFTMessage` (`swift.ts:611`), `AddSWIFTDocuments` (`swift.ts:129`), `LinkSWIFTMessageToPayment` (`swift.ts:205`) — none of these five functions exists in any file under `chaincodes/coffee/*.go` (verified by grep). `AddSWIFTDocuments` / `LinkSWIFTMessageToPayment` failures are **swallowed** (fire-and-forget `await` with no result check in `swift.ts:126–140,200–208`); `ConfirmSettlement` / `RecordForexRepatriation` / `NBEApproveSWIFTMessage` failures surface as 400/500s. Note the names are close to real functions and are easy to confuse: `RecordForexRepatriation` (missing) vs `RecordForexRetention` (`forex.go:655`, used by the retention routes); `LinkSWIFTMessageToPayment` (missing) vs `LinkSWIFTMessageToLC` (`swift.go:1406`, exists).
- **I7 — Three different retention rates.** API default 40% (`retention.ts` fallback), `PaymentService` 40% (`paymentService.ts:16`), `ReceiveAdvancePayment` 100% (`payment.go:1282`), `SettlePayment` fallback default 100% (`payment.go:722`, citing NBE FXD/01/2024) — while `RecordForexRetention` derives compliance from whatever the active policy says. A payment settled via P8 with `retentionRate=0` gets 100% retained; the same payment recorded via P2 gets 40% retained in PG.
- **I8 — Release (P9) re-runs settlement on an already-settled payment.** `PaymentService.releasePayment` calls `SettlePayment` again (`paymentService.ts:318–329`). If P8 already settled the payment, the chaincode guard (`payment.Status != "SWIFT_RECEIVED" && != "VERIFIED"`, `payment.go:690`) rejects the second call, so the release fails at the chaincode step — but the route's PG `status='RELEASED'` update only runs after a successful submit, so the failure is at least not half-applied. If P8 was never run, P9 *is* the settlement (and the payment ends up both `SETTLED` on-chain and `RELEASED` in PG). The `amount` body field of the release endpoint is ignored.
- **I9 — `POST /payments/record` (P2) drives the chaincode through three states in one call and then contradicts it in PG.** Chaincode ends at `VERIFIED`; PG records `RECEIVED`, then immediately `SPLIT` — neither of which exists in the chaincode state machine, and `statusManager`'s `PAYMENT` table has no `RECEIVED`/`SPLIT` either. A payment created this way can never be settled via the P8 route's `statusManager` check (current status read from chaincode is `VERIFIED`, which the `statusManager` table *does* allow `VERIFIED → SWIFT_INITIATED` but the settle route requires `→ SETTLED`, allowed only from `SWIFT_RECEIVED`).
- **I10 — Customs has three parallel state stores that disagree.** Chaincode (`SUBMITTED/UNDER_INSPECTION/UNDER_REVIEW/CLEARED/REJECTED`), PG (`submitted` lowercase from C7, `INSPECTING` from C9, `CLEARED` from C10), CouchDB (`submitted`/`inspecting`/`cleared` lowercase). C7 creates records the chaincode never sees; C9/C10 move PG/CouchDB without touching chaincode, so the same declaration can be `CLEARED` in PG while still `SUBMITTED` on the ledger (and vice versa for C5, which updates chaincode via the service but whose shipment-status update is explicitly skipped in the route, `customs.ts:1478–1494` — the route comments that `UpdateShipmentStatus` "doesn't exist in chaincode", although it does, `main.go:1788`).
- **I11 — Border has no sequencing at all.** No from-state guard on 9 of 10 mutating chaincode functions (only `ClearForExit` checks MSP, and that is an org check, not a state check). The intended `PENDING → CLEARED_EXIT → IN_TRANSIT → CROSSED → ARRIVED` order, and the `DETAINED`/`INSPECTION_FAILED` holds, are all unenforced; any endpoint can overwrite any status. `VerifyCompliance` (B10) changes only `ComplianceStatus`, so a record can be `ComplianceStatus=COMPLIANT` while `Status=DETAINED`.
- **I12 — `status.ts` workflow aggregate queries functions that do not exist.** `ReadCONTRACT` (should be `ReadSalesContract`), `ReadCUSTOMS` (should be `ReadDeclaration`/`ReadCustomsDeclaration`), `QueryByContractId`/`QueryByShipmentId`/`QueryByPaymentId` (no `QueryBy*` functions in chaincode at all), and `Get<entity>History` for anything but `SHIPMENT`. Related entities therefore always come back `[]` and several single-entity reads come back `NOT_FOUND`, with HTTP 200.
- **I13 — `statusManager.updateEntityStatus` is a no-op for the ledger.** It never invokes chaincode and never runs the `RelatedStatusUpdates` cascades (`statusManager.ts:277–310`). Every caller that relies on it for a cross-entity cascade (e.g. `PaymentService.recordPayment`'s `CONTRACT → PAYMENT_RECEIVED`, `CustomsService.clearDeclaration`'s `SHIPMENT → CUSTOMS_CLEARED`, `PaymentService.releasePayment`'s `CONTRACT → COMPLETED`) gets a log line and nothing else. The `CONTRACT` statuses it passes (`ACTIVE`, `PAYMENT_RECEIVED`) are not even in the `statusManager` `CONTRACT` table.
- **I14 — Post-delivery close does not verify completion, and a failed audit still counts.** `closeContract` (D5) does not check D1–D4; `recordECTAAudit` (D4) marks the audit complete for `FAILED` as well as `PASSED`, and `checkWorkflowCompletion` only looks at the boolean. A contract can therefore be closed `COMPLETED` with a failed ECTA audit, unpaid balance, or unrepatriated forex. Conversely, D3 marks `lc_settled=true` in PG even when the chaincode settlement was skipped/failed.
- **I15 — Repatriation `OVERDUE` is read-time only.** `updateRepatriationDeadline` mutates the in-memory object on reads (`repatriation.go:798,908`) without `PutState`, so the stored status stays `PENDING`/`PARTIAL`/`READY_FOR_VERIFICATION` while reads report `OVERDUE`. `VerifyRepatriation`/`ApplyNonCompliancePenalty` accept `OVERDUE` as a from-state — but they read the *stored* status, so a record that is overdue only on reads will be rejected by those guards until `RecordRepatriation` (which does persist `OVERDUE`) runs. Also, `RecordRepatriation` can still add amounts to a `COMPLIED` record (no from-state guard) — it would then flip to `OVERDUE` if past deadline, resurrecting a terminal record.
- **I16 — Duplicate route registrations.** `GET /customs/declarations` is registered twice (`customs.ts:140` with `?status` filter, `customs.ts:585` without) — Express uses the first match, so the second is dead. `POST /customs/declarations/:id/clear` (PG-only, C10) and `POST /customs/declaration/:declarationId/clear` (chaincode-backed, C5) are near-identical paths with different semantics — a caller can clear a declaration in PG without ever clearing it on the ledger, or vice versa.
- **I17 — `PUT /payments/:paymentID/confirm` validator vs Swagger.** Swagger documents `confirmationType` as enum `BANK_VERIFICATION, NBE_APPROVAL, FOREX_REPATRIATION` (`payments.ts:876–884`), but the validator only requires it non-empty; combined with I6 (no such chaincode function) the endpoint cannot succeed regardless.
- **I18 — `GET /payments/pending-release` filters on statuses nothing sets.** `PENDING_RELEASE` and `AWAITING_RELEASE` (`payments.ts:1150–1153`) are never assigned by any chaincode function, service, or route found in this slice; only `VERIFIED` payments will ever match.

## Appendix — Chaincode function index (this slice)

| Chaincode function | File:line | From → To (Status) |
|---|---|---|
| `SubmitDeclaration` | `customs.go:84` | → `SUBMITTED` |
| `SubmitCustomsDeclaration` | `customs.go:244` | → `SUBMITTED` |
| `ReviewDeclaration` / `ReviewCustomsDeclaration` | `customs.go:338` / `416` | `SUBMITTED → UNDER_INSPECTION` |
| `CompleteInspection` / `CompleteCustomsInspection` | `customs.go:478` / `524` | `UNDER_INSPECTION → UNDER_REVIEW` |
| `ClearDeclaration` / `ClearCustomsDeclaration` | `customs.go:584` / `682` | `UNDER_REVIEW → CLEARED` |
| `RejectDeclaration` / `RejectCustomsDeclaration` | `customs.go:749` / `826` | not-`CLEARED → REJECTED` |
| `InitiateBorderCrossing` | `bordercrossing.go:99` | → `PENDING` |
| `ClearForExit` | `bordercrossing.go:183` | any → `CLEARED_EXIT` |
| `RecordDeparture` | `bordercrossing.go:247` | any → `IN_TRANSIT` |
| `RecordBorderCrossing` | `bordercrossing.go:305` | any → `CROSSED` |
| `UpdateLocation` / `ReportDelay` | `bordercrossing.go:380` / `428` | no status change |
| `ClearBorderCrossing` | `bordercrossing.go:480` | any → `CLEARED` |
| `DetainBorderCrossing` | `bordercrossing.go:544` | any → `DETAINED` |
| `RecordBorderInspection` | `bordercrossing.go:606` | any → `INSPECTED` / `INSPECTION_FAILED` |
| `RecordArrival` | `bordercrossing.go:675` | any → `ARRIVED` |
| `VerifyCompliance` | `bordercrossing.go:745` | ComplianceStatus only |
| `InitiatePayment` | `payment.go:205` | → `PENDING` |
| `SubmitPaymentDocuments` | `payment.go:456` | `PENDING → DOCUMENTS_SUBMITTED` |
| `VerifyPaymentDocuments` | `payment.go:542` | `DOCUMENTS_SUBMITTED → VERIFIED` |
| `InitiateSWIFTTransfer` | `payment.go:969` | `VERIFIED`/`DOCUMENTS_SUBMITTED → SWIFT_INITIATED` |
| `ConfirmSWIFTReceipt` | `payment.go:1025` | `SWIFT_INITIATED → SWIFT_RECEIVED` |
| `RejectSWIFTPayment` | `payment.go:1068` | SWIFTDetails → `REJECTED` (Status unchanged) |
| `SettlePayment` | `payment.go:639` | `VERIFIED`/`SWIFT_RECEIVED → SETTLED` |
| `ReleaseDocumentsToBuyer` | `payment.go:1190` | no Status change (`DocumentsHeldBy → RELEASED`) |
| `ReceiveAdvancePayment` | `payment.go:1240` | any → `ADVANCE_RECEIVED` |
| `ReceiveBalancePayment` | `payment.go:1307` | stage `ADVANCE` → `BALANCE_RECEIVED` |
| `UpdatePaymentStatus` | `payment.go:1364` | per-method table (`payment.go:110–154`) |
| `RegisterDocumentaryCollection` / `UpdateCADStatus` / `RecordCADPayment` | `payment.go:1487` / `1585` / `1648` | → `SENT` / any → listed set / any → `PAID` |
| `Send/Present/Accept/Settle/ReturnDocumentaryCollection` | `collection.go:66` / `230` / `283` / `340` / `425` | → `SENT` / `SENT → PRESENTED` / `PRESENTED → ACCEPTED` / `PRESENTED`/`ACCEPTED → PAID` / `PAID → RETURNED` |
| `RecordAdvancePayment` / `IssuePermitForAdvance` / `LinkShipmentToAdvance` / `SettleAdvancePayment` | `advance.go:53` / `190` / `297` / `377` | → `RECEIVED` / `RECEIVED → PERMIT_ISSUED` / `PERMIT_ISSUED → SHIPPED` / `SHIPPED → SETTLED` |
| `CreateSWIFTMessage` / `CreateMT700_IssueLC` / `CreateMT707_AmendLC` / `CreateMT103_Payment` / `CreateMT750_Discrepancy` / `CreateMT752_AuthPayment` | `swift.go:268` / `375` / `454` / `509` / `569` / `614` | → `DRAFT` |
| `ApproveSWIFTMessage` / `SendSWIFTMessage` / `ReceiveSWIFTMessage` / `ProcessSWIFTMessage` / `SettleSWIFTMessage` / `RejectSWIFTMessage` | `swift.go:664` / `703` / `758` / `812` / `853` / `905` | `DRAFT → APPROVED` / `APPROVED → SENT` / `SENT`/`IN_TRANSIT → RECEIVED` / `RECEIVED → PROCESSING` / `PROCESSING → SETTLED` / any → `REJECTED` |
| `UpdateSWIFTMessageField` / `LinkSWIFTMessageToLC` | `swift.go:1345` / `1406` | DRAFT-only field update / no status change |
| `InitiateRepatriation` | `repatriation.go:106` | → `PENDING` |
| `RecordRepatriation` | `repatriation.go:298` | → `PARTIAL` / `READY_FOR_VERIFICATION` / `OVERDUE` |
| `VerifyRepatriation` | `repatriation.go:464` | `READY_FOR_VERIFICATION`/`OVERDUE → COMPLIED` / `NON_COMPLIANT` |
| `ApplyNonCompliancePenalty` | `repatriation.go:553` | `NON_COMPLIANT`/`OVERDUE → NON_COMPLIANT` |
| `RequestWaiver` / `ApproveWaiver` | `repatriation.go:633` / `694` | no change / → `WAIVED` (if approved) |
| `SetRetentionPolicy` / `RecordForexRetention` / `GetCurrentRetentionPolicy` | `forex.go:1170` / `652` / `1294` | policy → `ACTIVE` (old → `INACTIVE`) / `RetentionStatus → PENDING`/`COMPLIED`/`NON_COMPLIANT` |
| `UpdateShipmentStatus` (used by customs test endpoint + clear/reject cascades) | `main.go:1788` | any → caller-supplied status (no guard) |
| `UpdateContractStatus` (used by post-delivery close) | — (called by `postDeliveryWorkflowService.ts:504`; implementation outside this slice's files) | → `COMPLETED` (as invoked) |

**Functions called by routes in this slice that do not exist in chaincode:** `ConfirmSettlement`, `RecordForexRepatriation`, `NBEApproveSWIFTMessage`, `AddSWIFTDocuments`, `LinkSWIFTMessageToPayment` (§12-I6).

---

# Appendix D
# Part D — Test Scripts + Exporter Licensing + Cross-Checks

Scope: local clone `~/workspace/GoCBC`, branch `fix/auth-chaincode-audit`, HEAD `12d5a8d`.
All four scripts target `API_BASE=http://localhost:5000/api/v1`. Read-only mapping; no server
started, nothing executed. Route citations are `api/src/routes/<file>.ts:<line>`; script
citations are `tests/<file>:<line>`. "Validator" means the route's `express-validator`
chain and/or its manual `req.body` checks in the handler.

## Counting method

One mapped step = one API call (one `curl` invocation, or one `test_endpoint` call in
`e2e-workflow-test.sh`, whose helper performs one `curl` per call). Logins count as steps.

| Script | Lines | API calls mapped | Note |
|---|---|---|---|
| `tests/complete-workflow-test.sh` | 555 | 20 | Byte-identical to v2 (`diff` empty) |
| `tests/complete-workflow-test-v2.sh` | 555 | 20 | Byte-identical to v1 (`diff` empty) |
| `tests/complete-crud-workflow-test.sh` | 1186 | 53 | `set +e`; collects all failures |
| `tests/e2e-workflow-test.sh` | 444 | 35 | 28× `test_endpoint` + 6× login `curl` + 1× payments `curl`; read-only, creates nothing |
| **Total instances** | — | **128** | Unique steps de-duplicated across v1/v2: **108** |

Assertion styles differ per script: v1/v2 mostly assert `jq -e '.success'` (truthy, not
HTTP status); CRUD asserts specific `.data.status` values; e2e's `test_endpoint` asserts
**HTTP 200 exactly** (`tests/e2e-workflow-test.sh:69-87`).

## 1. Ordered step sequences

### 1a. `tests/complete-workflow-test.sh` ≡ `tests/complete-workflow-test-v2.sh` (20 steps)

Phases are the scripts' own (`PHASE 1`–`8` + final verification). IDs are client-generated
except `APP_ID` (server-returned).

| # | Script line | Method + path | Payload fields sent | Expected assertion |
|---|---|---|---|---|
| 1 | :76 | POST `/exporters/exporter-applications` (public) | companyName, tinNumber, businessLicenseNumber, capitalRequirement (`"20000000"` string), professionalTaster (`"yes"`), tasterCertificate, contactPerson, email, phone, address, city, region, bankName, bankAccountNumber (`"1000"+9 digits` = 13 digits), bankBranchName, exporterType (`company`), laboratoryFacility (`"no"`), registrationDate, comments | `APP_ID` non-empty (`.data.applicationId // .applicationId`); reads `.data.credentials.username`, `.data.credentials.emailSent` |
| 2 | :128 | POST `/auth/login` | username `ecta_admin`, password `password123` | `.data.token` non-empty, else `exit 1` |
| 3 | :143 | POST `/exporters/exporter-applications/$APP_ID/approve` (Bearer ECTA) | exporterId (`EXP-<ts>`, local), ectaLicenseNumber (`ECTA-LIC-<ts>`), licenseExpiryDate (+1y), bankName, bankAccountNumber, bankBranch | `jq -e '.success'` else `exit 1` |
| 4 | :178 | POST `/auth/login` | username `admin`, password `admin123` | token non-empty, else fall back to ECTA token |
| 5 | :191 | POST `/contracts` (Bearer admin) | contractID, exporterID, buyerID, buyerName, buyerCountry, buyerBank, exporterBank, coffeeType, quantity `50000`, pricePerKg `5.50`, currency, paymentMethod `LC`, eudrRequired `true`, organicCertified `false`, fairTradeCertified `false`, portOfLoading, portOfDestination, deliveryDate (+90d), incoterm `FOB`, specialInstructions | `jq -e '.success'` |
| 6 | :231 | POST `/contracts/$NEW_CONTRACT_ID/approve` (Bearer ECTA) | approvedBy `ecta_admin`, comments | `jq -e '.success'` else warn only |
| 7 | :257 | POST `/auth/login` | username `shipping_admin`, password `password123` | token non-empty else fall back to ECTA token |
| 8 | :269 | POST `/shipments` (Bearer shipping) | shipmentID, contractID, exporterID, buyerID, grade, icoNumber, channel `SEA`, forexRate `57.50`, valueUSD `275000`, eudrCompliant `true`, origin, destination, transportMode `SEA`, carrier, vesselName, containerNumber, billOfLading, departureDate, estimatedArrival, quantity, status `PENDING` | `jq -e '.success'` |
| 9 | :312 | POST `/quality/inspections` (Bearer ECTA) | inspectionID, contractID, exporterID, shipmentID, coffeeType, quantity, requestedDate, inspectionType `PRE_SHIPMENT`, sampleLocation, requestedBy | `jq -e '.success'` |
| 10 | :342 | POST `/auth/login` | username `bank_admin`, password `password123` | token non-empty else fall back to ECTA token |
| 11 | :354 | POST `/banking/lc/issue` (Bearer bank) | lcID, lcNumber (same value), contractID, exporterID, issuingBank, advisingBank, beneficiary, applicant, amount `275000`, currency, expiryDate (+180d), latestShipmentDate (+90d), portOfLoading, portOfDischarge, paymentTerms, partialShipment `false`, transhipment `true` | `jq -e '.success'`; reads `.data.forexAutoCreated` |
| 12 | :401 | POST `/auth/login` (conditional: only if forex NOT auto-created) | username `bank_admin`, password `password123` | token non-empty else fall back to ECTA token |
| 13 | :413 | POST `/forex/request` (conditional, Bearer bank) | forexId, contractId, exporterId, amount, currency, requestedBy `bank_admin` | `jq -e '.success'` else warn only |
| 14 | :440 | POST `/auth/login` | username `customs_admin`, password `password123` | token non-empty else fall back to ECTA token |
| 15 | :452 | POST `/customs/declaration/submit` (Bearer customs) | declarationID, shipmentID, exporterID, contractID, declarationType `STANDARD`, hsCode `0901.11`, quantity, value, currency, destination, portOfExit, eudrCompliant `true`, additionalNotes | `jq -e '.success'` |
| 16 | :488 | GET `/exporters/exporter-applications/$APP_ID` (Bearer ECTA; only if `APP_ID` set) | — | `jq -e '.data // .success'` |
| 17 | :497 | GET `/contracts?contractId=$NEW_CONTRACT_ID` (Bearer admin) | query `contractId` | `jq -e '.data'` |
| 18 | :506 | GET `/shipments?shipmentId=$NEW_SHIPMENT_ID` (Bearer shipping) | query `shipmentId` | `jq -e '.data'` |
| 19 | :514 | POST `/auth/login` | username `nbe_admin`, password `password123` | token extracted, no failure check |
| 20 | :517 | GET `/nbe/lc-monitoring` (Bearer NBE) | — | reads `.count // 0`, informational only |

Notes: the scripts create sample documents in `/tmp/test-documents` (`:20-30`) but **never
upload any of them** — no `/documents/*` call exists in either file, despite the header
"with Form Submissions and Document Uploads". `sleep 5/3` waits follow approval/contract
steps. Step 13 is skipped when step 11 reports `forexAutoCreated=true`.

### 1b. `tests/complete-crud-workflow-test.sh` (53 steps)

| # | Script line | Method + path | Payload fields sent | Expected assertion |
|---|---|---|---|---|
| 1–8 | :79, :96, :113, :129, :145, :161, :177, :193 | POST `/auth/login` ×8 | admin/admin123; ecta_admin, ecx_admin, bank_admin, ecta_admin (as "quality"), customs_admin, shipping_admin, nbe_admin — all `password123` except admin | `.data.token` non-empty (admin failure exits; others continue) |
| 9 | :216 | POST `/exporters/exporter-applications` (public) | companyName, tinNumber, businessType, registrationNumber, establishmentDate, address, city, region, country, postalCode, primaryPhone, email, website, capitalRequirement, numberOfEmployees, productionCapacityKg, warehouseCapacityKg, contactPersonName, contactPersonTitle, contactPersonPhone, contactPersonEmail, businessLicenseNumber, professionalTaster (`yes`), tasterCertificate, contactPerson, phone | `.data.applicationId` non-empty AND `.data.status == "pending"` |
| 10 | :258 | GET `/portals/ecta` (Bearer ECTA) | — | `.data.pendingApplications // [] \| length > 0` |
| 11 | :271 | POST `/exporters/exporter-applications/$APPLICATION_ID/approve` (Bearer ECTA) | exporterId (`EXP-TEST-<ts>`), ectaLicenseNumber (`LIC<ts>`), licenseExpiryDate `2025-12-31T00:00:00.000Z` | `.data.exporterId` non-empty AND `.data.status == "approved"` |
| 12 | :291 | GET `/portals/ecta` (Bearer ECTA) | — | `.data.statistics.applications.approved_applications > 0` (else warn) |
| 13 | :304 | POST `/exporters/exporter-applications` (public) | companyName, tinNumber, businessType, registrationNumber, establishmentDate, address, city, region, country, postalCode, primaryPhone, email, capitalRequirement, contactPersonName, contactPersonTitle, contactPersonPhone, contactPersonEmail, businessLicenseNumber, professionalTaster (`no`), contactPerson, phone | `.data.applicationId` non-empty |
| 14 | :333 | POST `/exporters/exporter-applications/$REJECT_APPLICATION_ID/reject` (Bearer ECTA) | reason | `.success==true` OR `.data.status=="rejected"` (else warn) |
| 15 | :360 | POST `/contracts` (Bearer ECTA) | contractID, exporterID, buyerID, buyerName, buyerCountry, buyerBank, exporterBank, coffeeType, quantity `20000`, pricePerKg `8.5`, totalValue `170000`, currency, contractDate, deliveryDate, incoterm, portOfLoading, portOfDischarge, eudrRequired `true` | `.success==true` AND contract ID from `.data.contract.contractID // .data.contractID` non-empty |
| 16 | :396 | GET `/portals/ecx` (Bearer ECX) | — | `.data.availableLots // [] \| length > 0` (else warn) |
| 17 | :408 | POST `/contracts/$CONTRACT_ID/approve` (Bearer ECTA) | reviewNotes | `.success==true` |
| 18 | :425 | PATCH `/contracts/$CONTRACT_ID` (Bearer ECTA) | quantity `22000`, totalValue `187000`, amendmentReason | `.success==true` |
| 19 | :443 | POST `/contracts` (Bearer ECTA) | contractID (`CTR_CANCEL_<ts>`), exporterID, buyerID, buyerName, buyerCountry, buyerBank, exporterBank, coffeeType, quantity `1000`, pricePerKg `8.0`, totalValue `8000`, currency, contractDate, deliveryDate, incoterm, portOfLoading, portOfDischarge, eudrRequired `false` | contract ID extracted (same jq as #15) |
| 20 | :470 | POST `/contracts/$CANCEL_CONTRACT_ID/cancel` (Bearer ECTA) | cancellationReason | `.data.status == "CANCELLED"` |
| 21 | :496 | POST `/shipments` (Bearer ECTA) | shipmentID, contractID, exporterID, buyerID, coffeeType, grade, quantity, icoNumber, origin `Sidama`, channel `ECX`, ecxLotNumber, forexRate `55.5`, valueUSD `170000`, eudrCompliant `true`, destination, expectedShipmentDate | `.data.shipment.shipmentID // .data.shipmentID` non-empty |
| 22 | :529 | POST `/quality/inspections` (Bearer ECTA) | inspectionID, shipmentID, exporterID, contractID, coffeeType, quantity, sampleSize `1000`, requestedDate | `.success==true` AND inspection ID from `.data.inspection.inspectionID // .data.inspectionID` non-empty |
| 23 | :555 | GET `/portals/quality` (Bearer ECTA-token-as-quality) | — | `.data.pendingInspections // [] \| length > 0` |
| 24 | :567 | POST `/quality/inspections/$QUALITY_ID/collect-sample` (Bearer quality) | sampleWeight `1000`, collectionDate, collectorName, sealNumber | `.success==true` |
| 25 | :587 | POST `/quality/inspections/$QUALITY_ID/lab-results` (Bearer quality) | moistureContent `11.5`, defectCount `8`, cupScore `85`, screenSize `15`, appearance, odor, labTechnician, testDate | `.success==true` |
| 26 | :611 | PUT `/quality/inspections/$QUALITY_ID/approve` (Bearer quality) | certificateNumber, grade `Grade 1`, remarks | `.data.status == "APPROVED"` |
| 27 | :630 | POST `/quality/inspections` (Bearer ECTA) | inspectionID (`QI-REJECT-<ts>`), shipmentID, exporterID, contractID, coffeeType `Arabica Grade 2`, quantity `5000`, sampleSize `500`, requestedDate | inspection ID extracted (same jq as #22) |
| 28 | :648 | POST `/quality/inspections/$REJECT_QUALITY_ID/collect-sample` | sampleWeight `1000`, collectionDate, collectorName `Test`, sealNumber `SEAL_TEST` | output discarded (`> /dev/null`), no assertion |
| 29 | :654 | POST `/quality/inspections/$REJECT_QUALITY_ID/lab-results` | moistureContent `15.0`, defectCount `50`, cupScore `65`, screenSize `12`, labTechnician `Test`, testDate | output discarded, no assertion |
| 30 | :660 | PUT `/quality/inspections/$REJECT_QUALITY_ID/reject` (Bearer quality) | rejectionReason | `.success==true` |
| 31 | :688 | POST `/banking/lc/issue` (Bearer bank) | lcID, contractID, exporterID, amount `170000`, currency, issuingBank, advisingBank, beneficiary, applicant, expiryDate, latestShipmentDate, portOfLoading, portOfDischarge | `.success==true`; LC_ID from `.data.lcID // .data.lc.lcNumber // .data.lcNumber // .data.lc_number`, FOREX_ID from `.data.forexID // .data.forex.forexID // .data.forex_id`; falls back to sent `LC_NUMBER` if LC_ID empty |
| 32 | :728 | GET `/portals/banks` (Bearer bank) | — | `.data.pendingLCs // [] \| length > 0` (else warn) |
| 33 | :743 | POST `/banking/lc/$LC_ID/examine` (Bearer bank; skipped if LC_ID empty) | documentType, documentNumber, examinationResult `COMPLIANT`, examinedBy, examinationNotes | `.success==true` |
| 34 | :767 | POST `/banking/lc/$LC_ID/release-payment` (Bearer bank; skipped if LC_ID empty) | amount `170000`, currency, releaseDate, releaseNotes | `.success==true` |
| 35 | :787 | GET `/portals/nbe` (Bearer NBE) | — | `.data.pendingForexRequests // [] \| length > 0` (else warn) |
| 36 | :806 | POST `/customs/declaration/submit` (Bearer ECTA) | declarationID, shipmentID, exporterID, hsCode, declarationType, quantity, value, currency, destination, portOfExit, eudrCompliant `true`, additionalNotes (NO contractID) | `.data.declaration.declarationID // .data.declarationID` non-empty AND `.data.declaration.status // .data.status == "SUBMITTED"` |
| 37 | :835 | GET `/portals/customs` (Bearer customs) | — | `.data.pendingDeclarations // [] \| length > 0` |
| 38 | :847 | POST `/customs/declaration/$CUSTOMS_ID/review` (Bearer customs) | reviewNotes | `.success==true` |
| 39 | :864 | POST `/customs/declaration/$CUSTOMS_ID/inspect` (Bearer customs) | inspectionResult `PASSED`, inspectorName, inspectionNotes | `.success==true` |
| 40 | :883 | POST `/customs/declaration/$CUSTOMS_ID/complete-inspection` (Bearer customs) | inspectionResult `PASSED`, inspectorComments | `.success==true` |
| 41 | :901 | POST `/customs/declaration/$CUSTOMS_ID/clear` (Bearer customs) | clearanceNotes, customsDuty `0`, otherCharges `500` | `.success==true` |
| 42 | :921 | POST `/shipments` (Bearer ECTA) — rejection-test shipment | exporterID, contractID, quantity `500`, unit, destinationCountry, destinationPort, estimatedDepartureDate, ecxLotNumber | `.data.shipmentID // .data.id` non-empty (else warn, rest of rejection test skipped) |
| 43 | :939 | POST `/customs/declaration/submit` (Bearer ECTA; only if #42 yielded an ID) | declarationID (`DECL-REJECT-<ts>`), shipmentID, exporterID, hsCode, declarationType, quantity `500`, value `4000`, currency, destination, portOfExit, eudrCompliant `true`, additionalNotes (NO contractID) | declaration ID extracted (same jq as #36) |
| 44 | :960 | POST `/customs/declaration/$REJECT_CUSTOMS_ID/reject` (Bearer customs; only if #43 yielded an ID) | rejectionReason | `.data.status == "REJECTED"` |
| 45 | :988 | POST `/shipping/bookings` (Bearer ECTA) | shipmentID, exporterID, shippingLine, vesselName, voyageNumber, containerType `20ft`, numberOfContainers `2`, portOfLoading, portOfDischarge, estimatedDepartureDate, estimatedArrivalDate | `.data.booking.bookingID // .data.bookingID` non-empty AND `.data.booking.status // .data.status == "BOOKED"` |
| 46 | :1016 | GET `/portals/shipping` (Bearer shipping) | — | `.data.freightBookings // [] \| length > 0` (else warn) |
| 47 | :1028 | POST `/shipping/bookings/$BOOKING_ID/load` (Bearer shipping) | loadingDate, containerNumbers `[2]`, sealNumbers `[2]`, loadedBy | `.data.status == "LOADED"` |
| 48 | :1047 | POST `/shipping/bookings/$BOOKING_ID/depart` (Bearer shipping) | departureDate, actualDepartureTime | `.data.status == "IN_TRANSIT"` |
| 49 | :1064 | POST `/shipping/bookings/$BOOKING_ID/arrive` (Bearer shipping) | arrivalDate, actualArrivalTime | `.data.status == "ARRIVED"` |
| 50 | :1081 | POST `/shipping/bookings/$BOOKING_ID/deliver` (Bearer shipping) | deliveryDate, receivedBy, deliveryNotes | `.data.status == "DELIVERED"` |
| 51 | :1108 | POST `/nbe/forex/$FOREX_ID/approve` (Bearer NBE; skipped if FOREX_ID empty) | approvalNotes | `.success==true` |
| 52 | :1129 | POST `/nbe/forex/$FOREX_ID/repatriation` (Bearer NBE; skipped if FOREX_ID empty) | repatriationAmount `170000`, repatriationDate, bankReference, repatriationMethod `Wire Transfer` | `.success==true` |
| 53 | :1149 | GET `/portals/nbe` (Bearer NBE) | — | `.data.retentionConversions // [] \| length > 0` (else warn) |

### 1c. `tests/e2e-workflow-test.sh` (35 calls, read-only)

Helper `test_endpoint(name, token, endpoint, expected=200)` (`:69-87`) does one `curl`
and asserts HTTP status exactly. All calls below expect HTTP 200 unless noted. No POST
that creates anything; IDs come from list responses (`[0]` element). There are 28
`test_endpoint` calls in this file (not 27 as first counted), so 35 API calls total.

| # | Script line | Method + path | Payload | Expected assertion |
|---|---|---|---|---|
| 1 | :96 | POST `/auth/login` | username `ecta_admin`, password `password123` | `.data.token` non-null, else `exit 1` |
| 2 | :109 | GET `/applications?status=pending` (ECTA) | — | HTTP 200; reads `.data.applications \| length` |
| 3 | :117 | GET `/applications/$APP_ID` (ECTA; only if #2 count > 0) | — | HTTP 200 (output discarded) |
| 4 | :122 | GET `/applications?status=approved` (ECTA) | — | HTTP 200; reads `.data.applications \| length` |
| 5 | :128 | GET `/users/exporters` (ECTA) | — | HTTP 200; reads `.data.exporters \| length` |
| 6 | :134 | GET `/portals/ecta/dashboard` (ECTA) | — | HTTP 200; reads `.data.statistics.applications.pending_applications` and `.approved_applications` |
| 7 | :147 | POST `/auth/login` | username `ecx_admin`, password `password123` | token non-null |
| 8 | :159 | GET `/contracts` (ECX) | — | HTTP 200; reads `.data.contracts \| length` |
| 9 | :167 | GET `/contracts/$CONTRACT_ID` (ECX; only if #8 count > 0) | — | HTTP 200 (output discarded) |
| 10 | :172 | GET `/contracts?status=REGISTERED` (ECX) | query `status` | HTTP 200; reads `.data.contracts \| length` |
| 11 | :184 | GET `/quality/inspections` (ECTA) | — | HTTP 200; reads `.data.inspections \| length` |
| 12 | :190 | GET `/quality/inspections?status=pending` (ECTA) | query `status` | HTTP 200; reads `.data.inspections \| length` |
| 13 | :196 | GET `/quality/inspections?status=approved` (ECTA) | query `status` | HTTP 200; reads `.data.inspections \| length` |
| 14 | :204 | GET `/quality/inspections/$INSPECTION_ID` (ECTA; only if #11 count > 0) | — | HTTP 200 (output discarded) |
| 15 | :215 | POST `/auth/login` | username `customs_admin`, password `password123` | token non-null |
| 16 | :227 | GET `/customs/declarations` (customs) | — | HTTP 200; reads `.data.declarations \| length` |
| 17 | :233 | GET `/customs/declarations?status=SUBMITTED` | query `status` | HTTP 200; reads `.data.declarations \| length` |
| 18 | :239 | GET `/customs/declarations?status=UNDER_REVIEW` | query `status` | HTTP 200; reads `.data.declarations \| length` |
| 19 | :245 | GET `/customs/declarations?status=CLEARED` | query `status` | HTTP 200; reads `.data.declarations \| length` |
| 20 | :251 | GET `/portals/customs/dashboard` (customs) | — | HTTP 200; reads `.data.scheduledInspections \| length` |
| 21 | :259 | GET `/customs/declarations/$DECL_ID` (customs; only if #16 count > 0) | — | HTTP 200 (output discarded) |
| 22 | :270 | POST `/auth/login` | username `bank_admin`, password `password123` | token non-null |
| 23 | :282 | GET `/banking/lc` (bank) | — | HTTP 200; reads `.data.lcs \| length`, then `.data.lcs[0].lc_number/.amount/.currency/.issuing_bank/.status` |
| 24 | :297 | GET `/contracts` (bank) | — | HTTP 200; reads `.data.contracts \| length` |
| 25 | :303 | GET `/banking/payments?contractId=test` (bank; raw curl, not `test_endpoint`) | query `contractId=test` | `jq -e '.data'` else warn "requires contractId parameter" |
| 26 | :313 | GET `/portals/banks/dashboard` (bank) | — | HTTP 200; reads `.data.totalLCs // 0` |
| 27 | :325 | POST `/auth/login` | username `nbe_admin`, password `password123` | token non-null |
| 28 | :337 | GET `/forex` (NBE) | — | HTTP 200; reads `.data.allocations \| length // 0` |
| 29 | :343 | GET `/nbe/lc-monitoring` (NBE) | — | HTTP 200; reads `.count` |
| 30 | :358 | GET `/forex/rates` (NBE) | — | HTTP 200; reads `.data \| length // 0` |
| 31 | :364 | GET `/portals/nbe/dashboard` (NBE) | — | HTTP 200; reads `.data.totalForex // 0` |
| 32 | :376 | POST `/auth/login` | username `shipping_admin`, password `password123` | token non-null |
| 33 | :388 | GET `/shipping/shipments` (shipping) | — | HTTP 200; reads `.data.shipments \| length` |
| 34 | :394 | GET `/shipping/shipments?status=pending` (shipping) | query `status` | HTTP 200; reads `.data.shipments \| length` |
| 35 | :409 | GET `/portals/shipping/dashboard` (shipping) | — | HTTP 200; reads `.data.totalShipments // 0` |

Total: **35 API calls** (28 `test_endpoint` + 6 logins + 1 payments curl). Revised
grand total across all four scripts: **128 instances mapped** (20+20+53+35),
**108 unique** de-duplicated across v1/v2.

## 2. Merged canonical order (union of the three distinct scripts)

Licensing pre-step first (§5), then the business chain. Order differs by script:
v1/v2 run quality-request → LC → (forex) → customs; CRUD runs quality fully (incl.
approve) → LC → customs → shipping → NBE last; e2e is read-only in portal order
ECTA → ECX → quality → customs → banks → NBE → shipping.

| Order | Step | Method + path |
|---|---|---|
| 0 | Licensing pre-step | §5 below |
| 1 | Login (per role, as needed) | POST `/auth/login` |
| 2 | Create contract | POST `/contracts` |
| 3 | Approve contract (ECTA) | POST `/contracts/:id/approve` |
| 4 | Amend contract (CRUD only) | PATCH `/contracts/:id` |
| 5 | Create shipment | POST `/shipments` |
| 6 | Request quality inspection | POST `/quality/inspections` |
| 7 | Collect sample | POST `/quality/inspections/:id/collect-sample` |
| 8 | Enter lab results | POST `/quality/inspections/:id/lab-results` |
| 9 | Approve / issue quality certificate | PUT `/quality/inspections/:id/approve` |
| 10 | Issue LC (auto-creates forex) | POST `/banking/lc/issue` |
| 11 | Manual forex request (only if LC did not auto-create) | POST `/forex/request` |
| 12 | Examine LC documents | POST `/banking/lc/:id/examine` |
| 13 | Submit customs declaration | POST `/customs/declaration/submit` |
| 14 | Customs review → inspect → complete-inspection → clear | POST `/customs/declaration/:id/{review,inspect,complete-inspection,clear}` |
| 15 | Create shipping booking | POST `/shipping/bookings` |
| 16 | Load → depart → arrive → deliver | POST `/shipping/bookings/:id/{load,depart,arrive,deliver}` |
| 17 | Release LC payment | POST `/banking/lc/:id/release-payment` |
| 18 | NBE approve forex | POST `/nbe/forex/:id/approve` |
| 19 | Record repatriation | POST `/nbe/forex/:id/repatriation` |
| 20 | Verify via portal dashboards / list GETs | GET `/portals/:portal`, GET list endpoints |

Cancel/reject branches (CRUD only): POST `/contracts/:id/cancel`,
POST `/exporters/exporter-applications/:id/reject`, PUT `/quality/inspections/:id/reject`,
POST `/customs/declaration/:id/reject`.

## 3. Endpoint existence cross-check

Mounts (`api/src/server.ts`): `/exporters` → exporters router (:240);
`/applications` → **same** exporters router (:265); `/auth` (:235); `/contracts` (:245);
`/banking` (:246, mounted twice, :253); `/shipments` (:247); `/forex` (:254);
`/nbe` (:255); `/customs` (:256); `/quality` (:261); `/portals` (:343); `/shipping`
(:349); `/users` (:243, behind `authMiddleware`); `/status` (:314). All routes below are
under `/api/v1` + mount prefix.

| # | Endpoint as called by scripts | Route in code | Verdict |
|---|---|---|---|
| E1 | POST `/exporters/exporter-applications` | `exporters.ts:101` | ✅ exists, public |
| E2 | POST `/auth/login` | `auth.ts:111` (manual username+password check) | ✅ exists |
| E3 | POST `/exporters/exporter-applications/:id/approve` | `exporters.ts:306`, `requireRole('ECTA','ECTA_ADMIN')` | ✅ exists |
| E4 | POST `/exporters/exporter-applications/:id/reject` | `exporters.ts:559`, `requireRole('ECTA','ECTA_ADMIN')`, body `reason` required | ✅ exists |
| E5 | POST `/contracts` | `contracts.ts:326` | ✅ exists |
| E6 | POST `/contracts/:id/approve` | `contracts.ts:1311` | ✅ exists |
| E7 | PATCH `/contracts/:id` | `contracts.ts:68` | ✅ exists |
| E8 | POST `/contracts/:id/cancel` | `contracts.ts:1924` | ✅ exists |
| E9 | GET `/contracts` (+ `?contractId=`, `?status=`) | `contracts.ts:623` | ✅ exists, but see M5/M8: handler never reads `contractId` or `status` query params (fixed `WHERE LOWER(c.status) IN (...)`, `contracts.ts:640-660`); returns `data` = bare array, not `{contracts}` |
| E10 | GET `/contracts/:id` | `contracts.ts:1114` | ✅ exists |
| E11 | POST `/shipments` | `shipments.ts:115` | ✅ exists |
| E12 | GET `/shipments?shipmentId=` | `shipments.ts:526` | ✅ exists, but see M6: handler reads only `exporterID`, `eudrCompliant`, `status` query params (`shipments.ts:529`); `shipmentId` ignored; `data` = bare array |
| E13 | POST `/quality/inspections` | `quality.ts:253` | ✅ exists (note duplicate GET `/inspections` at `quality.ts:22` and `:1281` — second unreachable; also both POST `:618` and PUT `:873` approve variants exist) |
| E14 | POST `/quality/inspections/:id/collect-sample` | `quality.ts:1563` | ✅ exists |
| E15 | POST `/quality/inspections/:id/lab-results` | `quality.ts:1631` | ✅ exists |
| E16 | PUT `/quality/inspections/:id/approve` | `quality.ts:873`, `requireRole('ECTA','ECTA_ADMIN')` | ✅ exists |
| E17 | PUT `/quality/inspections/:id/reject` | `quality.ts:1719` | ✅ exists |
| E18 | POST `/banking/lc/issue` | `banking.ts:731`, `requireRole(['BANKS','BANK_ADMIN'])` | ✅ exists |
| E19 | POST `/banking/lc/:id/examine` | `banking.ts:3699` (shim translating `examinationResult`→`compliant` and delegating to `/lc/:lcID/examine-documents`, `banking.ts:3179`) | ✅ exists |
| E20 | POST `/banking/lc/:id/release-payment` | `banking.ts:3264` | ✅ exists |
| E21 | GET `/banking/lc` | `banking.ts:1321` | ✅ exists, but `data` = bare array (`data: lcData`), not `{lcs}` — see M11 |
| E22 | GET `/banking/payments?contractId=` | `banking.ts:1563` | ⚠️ exists but **wrong query param**: handler requires `exporterId`, returns 400 otherwise (`banking.ts:1563-1575`); `contractId` is ignored — see M4 |
| E23 | POST `/forex/request` | `forex.ts:541`, `requireRole(['BANKS','BANK_ADMIN','BANK OFFICER','FOREX OFFICER'])` | ✅ exists |
| E24 | GET `/forex` | `forex.ts:120` (GET `/` and `/allocations`) | ✅ exists, but `data` = bare array, not `{allocations}` — see M12 |
| E25 | GET `/forex/rates` | `forex.ts:207` | ✅ exists |
| E26 | POST `/customs/declaration/submit` | `customs.ts:673` | ✅ exists |
| E27 | POST `/customs/declaration/:id/review` | `customs.ts:1032` | ✅ exists |
| E28 | POST `/customs/declaration/:id/inspect` | `customs.ts:1184` (also `/declarations/:id/inspect`, `:1183`) | ✅ exists |
| E29 | POST `/customs/declaration/:id/complete-inspection` | `customs.ts:1280` | ✅ exists |
| E30 | POST `/customs/declaration/:id/clear` | `customs.ts:1421` | ✅ exists |
| E31 | POST `/customs/declaration/:id/reject` | `customs.ts:1338` | ✅ exists |
| E32 | GET `/customs/declarations` (+ `?status=`) | `customs.ts:140` (first of two duplicate GETs; `:585` unreachable) | ✅ exists; `data` = bare array, not `{declarations}` — see M10; `?status` filter exists in first handler |
| E33 | GET `/customs/declarations/:id` | `customs.ts:855` | ✅ exists |
| E34 | POST `/shipping/bookings` | `shipping.ts:329` | ✅ exists |
| E35 | POST `/shipping/bookings/:id/load|depart|arrive|deliver` | `shipping.ts:400,453,503,553` | ✅ all exist |
| E36 | GET `/shipping/shipments` (+ `?status=`) | `shipping.ts:16` | ✅ exists, but `data` = bare array, not `{shipments}` — see M13 |
| E37 | POST `/nbe/forex/:id/approve` | `nbe.ts:58`, `requireRole('NBE')` | ✅ exists |
| E38 | POST `/nbe/forex/:id/repatriation` | `nbe.ts:114`, `requireRole('NBE')` | ✅ exists |
| E39 | GET `/nbe/lc-monitoring` | `nbe.ts:193` | ✅ exists; returns top-level `count` + `data` array — scripts read `.count` correctly |
| E40 | GET `/portals/:portal` and `/portals/:portal/dashboard` | `portals.ts:63` (alias) and `:16` (dashboard) | ✅ exist; dashboard switch (`:16-45`) covers ecta, banks, nbe, customs, shipping, exporters, ecx — **no `quality` case**; alias switch (`:63-82`) maps `quality` → ECTA dashboard (`:75`). CRUD's `GET /portals/quality` therefore returns the ECTA dashboard, not a quality-specific one |
| E41 | GET `/exporter-applications/:id` (v1/v2 verification, `complete-workflow-test*.sh:488`) | — | ❌ **MISSING**. Only GET list `/exporter-applications` (`exporters.ts:26`, returns `data:{applications,count}`) and GET `/applications/:applicationId` (`exporters.ts:59`, reachable only as `/exporters/applications/:id`) exist. No single-application GET under `/exporter-applications/:id` — see M1 |
| E42 | GET `/applications?status=…` (e2e `:109,:122`) | `exporters.ts:1347` (GET `/` of exporters router, mounted at `/applications` per `server.ts:265`; branches on `status` ∈ pending/approved/rejected to query `exporter_applications`) | ✅ exists, but response shape differs — see M7 |
| E43 | GET `/applications/:id` (e2e `:117`) | — | ❌ **WRONG ROUTE**. Under the `/applications` mount, `/:id` matches GET `/:exporterID` (`exporters.ts:1684`, exporter lookup), not GET `/applications/:applicationId` (`exporters.ts:59`, only reachable under `/exporters`). An `APP-…` id is looked up as an exporter ID — see M2 |
| E44 | GET `/users/exporters` (e2e `:128`) | — | ❌ **MISSING**. `users.ts` has no `/exporters` route; `GET /users/:userId` (`users.ts:463`) would treat `exporters` as a user ID — see M3 |
| E45 | GET `/quality/inspections` (+ `?status=`), GET `/quality/inspections/:id` | `quality.ts:22` (GET list, `status` filter exists), `quality.ts:1482` (GET one) | ✅ exist; `data` = bare array, not `{inspections}` — see M9 |
| E46 | Any `/status/*` call | `status.ts` — see §6 | ⚠️ no script calls `/status/*` at all |

## 4. Required-field cross-check (script payload vs route validation)

"Required" = `express-validator` non-optional rule, or a manual `if (!x)` 400 in the
handler. "Ignored" = sent by the script but neither validated nor destructured/used by
the handler (silently dropped). Many routes have **no** `express-validator` at all
(banking LC issue, forex request, shipping bookings, NBE, customs review/inspect/clear)
and rely on manual checks or none.

| Step (script) | Route requirement | Script sends | Verdict |
|---|---|---|---|
| App submit, v1/v2 | `exporters.ts:101-130`: required companyName, tinNumber, businessLicenseNumber, capitalRequirement, professionalTaster, contactPerson, email (isEmail), phone, address, city; bankAccountNumber if present must match `/^\d{1,13}$/` | All 10 required ✓; bankAccountNumber 13 digits ✓; all other sent fields are in the optional-validated list | ✅ 0 missing, 0 ignored |
| App submit, CRUD #9/#13 | Same as above | All 10 required ✓ (contactPerson, phone present) | ⚠️ see M15: 13 extra fields sent are not validated/stored; `exporterType` never sent → defaults to `company` |
| App approve, v1/v2 + CRUD #11 | `exporters.ts:306-320`: required exporterId, ectaLicenseNumber (`/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/`), licenseExpiryDate (ISO8601); optional bankName, bankAccountNumber, bankBranch, bankBranchCode | v1/v2: all 3 + bankName/bankAccountNumber/bankBranch ✓; CRUD: all 3 ✓ | ✅ 0 missing; CRUD licenceExpiryDate `2025-12-31` is already past at mapping date (2026-11-09) — see M26 |
| App reject, CRUD #14 | `exporters.ts:559-566`: `reason` required | reason ✓ | ✅ |
| Contract create, v1/v2 #5 | `contracts.ts:326-352`: required contractID, exporterID, buyerID, buyerCountry, buyerBank, exporterBank, coffeeType, quantity (numeric), pricePerKg (numeric, ≥ 5.0), currency, eudrRequired (boolean); optional paymentMethod ∈ LC/CAD/TT_ADVANCE/TT_POST/ADVANCE | All required ✓ (pricePerKg 5.50 ✓) | ⚠️ see M16: buyerName, portOfLoading, portOfDestination, deliveryDate, incoterm, specialInstructions, organicCertified, fairTradeCertified are sent but NOT destructured by the create handler (`contracts.ts:360-372` destructures only contractID, exporterID, buyerID, buyerCountry, buyerBank, exporterBank, coffeeType, quantity, pricePerKg, currency, paymentMethod, eudrRequired, documents, supersedesContractID) → dropped at create |
| Contract create, CRUD #15/#19 | Same as above | All required ✓ (pricePerKg 8.5 / 8.0 ✓) | ⚠️ same M16, plus totalValue, contractDate, portOfDischarge dropped (total_value is computed as quantity×pricePerKg server-side) |
| Contract approve, v1/v2 #6, CRUD #17 | `contracts.ts:1311-1313`: only `param('contractID')` validated; handler enforces ECTA org/role and (production only) requires `CONTRACT_SIGNED` + `PROFORMA_INVOICE` documents | approvedBy+comments (v1/v2) / reviewNotes (CRUD) — none read by handler | ⚠️ see M25: body fields ignored; in production the approve would 400 `MISSING_DOCUMENTS` because no script uploads documents |
| Contract PATCH, CRUD #18 | `contracts.ts:68-95`: all fields optional (quantity/pricePerKg numeric if present) | quantity ✓ (numeric); totalValue, amendmentReason sent | ⚠️ see M17: totalValue and amendmentReason are neither validated nor in the PATCH update map (`contracts.ts:130-170`) → ignored; only quantity changes |
| Contract cancel, CRUD #20 | `contracts.ts:1924`: no validator; handler reads `cancellationReason` | cancellationReason ✓ | ✅ |
| Shipment create, v1/v2 #8 | `shipments.ts:115-140`: required shipmentID, contractID, exporterID, buyerID, origin, quantity (numeric), grade, icoNumber, channel, forexRate (numeric), valueUSD (numeric), eudrCompliant (boolean); conditional ecxLotNumber if channel=ECX, unionApprovalReference if Union, bondReference if Direct Export | All 11 required ✓; channel `SEA` → no conditional | ✅ required side clean; extras transportMode, carrier, vesselName, containerNumber, billOfLading, departureDate, estimatedArrival, destination, status are not in the validator (handler persistence not verified in this slice) |
| Shipment create, CRUD #21 | Same as above | All required ✓; channel `ECX` + ecxLotNumber ✓ | ✅ required side clean; extras coffeeType, destination, expectedShipmentDate unvalidated |
| Shipment create (rejection test), CRUD #42 | Same as above | Sends only exporterID, contractID, quantity, unit, destinationCountry, destinationPort, estimatedDepartureDate, ecxLotNumber | ❌ see M14: **9 required fields missing** — shipmentID, buyerID, origin, grade, icoNumber, channel, forexRate, valueUSD, eudrCompliant → 400 `VALIDATION_ERROR`; downstream customs-rejection steps (#43–44) are then skipped |
| Quality inspection create, v1/v2 #9, CRUD #22/#27 | `quality.ts:253-261`: required inspectionID, exporterID, shipmentID, coffeeType, quantity (numeric); handler also uses contractID, sampleSize, requestedDate (optional, defaulted) | All required ✓; v1/v2 also contractID, requestedDate ✓; CRUD also sampleSize, requestedDate ✓ | ⚠️ see M18: v1/v2 extras inspectionType, sampleLocation, requestedBy are not destructured by the handler (`quality.ts:265`) → ignored |
| Quality collect-sample, CRUD #24/#28 | `quality.ts:1563-1568`: required sampleWeight (numeric), collectionDate (notEmpty) | Both ✓ + collectorName, sealNumber | ✅ required clean; collectorName/sealNumber not in validator (handler use not verified in this slice) |
| Quality lab-results, CRUD #25/#29 | `quality.ts:1631-1638`: required moistureContent (numeric), defectCount (numeric); handler destructures cupScore, screenSize, labTechnician, testDate | Both ✓ + cupScore, screenSize, labTechnician, testDate ✓ | ⚠️ see M19: appearance, odor sent but not destructured (`quality.ts:1641-1648`) → ignored |
| Quality PUT approve, CRUD #26 | `quality.ts:873-882`: only `param('inspectionID')`; body certificateNumber/grade/remarks optional with defaults | All three ✓ | ✅; role is ECTA/ECTA_ADMIN and CRUD's "quality" token is an `ecta_admin` login, so the role check passes |
| Quality PUT reject, CRUD #30 | `quality.ts:1719-1724`: `rejectionReason` required | rejectionReason ✓ | ✅ (note the POST variant `quality.ts:927` requires `reason` instead — scripts consistently use PUT) |
| LC issue, v1/v2 #11, CRUD #31 | `banking.ts:731-790`: NO express-validator; manual checks only: lcId/lcID required, amount numeric required. Handler destructures lcId/lcID, lcNumber, contractId/ID, exporterId/ID, issuingBank, advisingBank, beneficiary, applicant, amount, currency, expiryDate, latestShipmentDate, portOfLoading, portOfDischarge, paymentTerms, partialShipment, transhipment, lcType, bankName, shippingTerms | v1/v2: all consumed fields sent ✓; CRUD: all sent fields consumed ✓ (no lcNumber — optional) | ✅; role BANKS/BANK_ADMIN, bank_admin token ✓. Response carries `data.forexAutoCreated` + `data.forexID` (`banking.ts:864-865`) — both scripts read them correctly |
| Forex request, v1/v2 #13 | `forex.ts:541-547`: NO express-validator; manual: forexId + contractId required; exporterId/amount/currency optional (auto-mapped from contract) | forexId, contractId, exporterId, amount, currency ✓ | ⚠️ see M20: requestedBy not destructured → ignored |
| Customs submit, v1/v2 #15, CRUD #36/#43 | `customs.ts:673-679`: required declarationID, shipmentID, exporterID; handler destructures contractID/contractId, declarationType, hsCode, quantity, value, currency, destination, portOfExit, eudrCompliant, additionalNotes | v1/v2: all required + all destructured optionals ✓. CRUD: all required ✓ but **no contractID** in either submit | ✅ no validation failure; minor: CRUD declarations carry no contract link (contractID optional in handler) |
| Customs review, CRUD #38 | `customs.ts:1032-1039`: NO validator; handler destructures assignedInspector, scheduledDate, priorityLevel, location, inspectionType, inspectorNotes | reviewNotes only | ⚠️ see M21: reviewNotes not destructured → ignored; review proceeds with officer = logged-in user |
| Customs inspect, CRUD #39 | `customs.ts:1096-1182` (`inspectHandler`): reads NO body at all (params + DB status → `INSPECTING`) | inspectionResult, inspectorName, inspectionNotes | ⚠️ see M22: entire body ignored |
| Customs complete-inspection, CRUD #40 | `customs.ts:1280-1287`: handler destructures inspectionResult, inspectorComments, completedDate | inspectionResult, inspectorComments ✓ | ✅ |
| Customs clear, CRUD #41 | `customs.ts:1421-1437`: NO validator; handler destructures clearanceNumber, clearedBy, clearanceDate, clearanceType, exportDuty, vatAmount, exitPoint, validityPeriod, transportMode, finalDestinationPort, estimatedDepartureDate, containerNumber, sealNumber, shippingLine, clearanceRemarks, officerNotes | clearanceNotes, customsDuty, otherCharges | ⚠️ see M23: none of the three sent fields is destructured → all ignored; clearance proceeds on defaults |
| Customs reject, CRUD #44 | `customs.ts:1338-1346`: `rejectionReason` required (+ optional rejectedBy) | rejectionReason ✓ | ✅ |
| Shipping booking, CRUD #45 | `shipping.ts:329-347`: NO validation; handler destructures shipmentID, exporterID, shippingLine, vesselName, voyageNumber, containerType, numberOfContainers, portOfLoading, portOfDischarge, estimatedDepartureDate, estimatedArrivalDate; INSERT persists only bookingID, shipmentID (as contract_id), shippingLine (as carrier), portOfLoading (origin), portOfDischarge (destination), dates, status `BOOKED` | All 11 destructured fields ✓ | ⚠️ see M24: containerType, numberOfContainers, exporterID, vesselName, voyageNumber are destructured but NOT persisted (only echoed in the response) |
| Shipping load/depart/arrive/deliver, CRUD #47–50 | `shipping.ts:400,453,503,553`: NO validators; handlers destructure loadingDate/containerNumbers/sealNumbers/loadedBy; departureDate/actualDepartureTime; arrivalDate/actualArrivalTime; deliveryDate/receivedBy/deliveryNotes | All expected fields sent ✓ | ✅ |
| NBE forex approve, CRUD #51 | `nbe.ts:58-61`: NO validator; handler reads approvalNotes only (optional) | approvalNotes ✓ | ✅; role NBE, nbe_admin token ✓ |
| NBE repatriation, CRUD #52 | `nbe.ts:114-120`: NO validator; handler reads repatriationAmount, repatriationDate, bankReference, repatriationMethod (all optional, defaulted) | All four ✓ | ✅ |
| Auth login (all scripts) | `auth.ts:111-122`: manual username + password required | username + password in every login ✓ | ✅ (seed users `ecta_admin`/`admin`/`bank_admin`/etc. are assumed to exist; no seed file was checked in this slice) |

## 5. Licensing pre-step sequence (application → approve → licence → temp credentials → login)

No script exercises the full licensing pre-step end-to-end. The code path, from
`exporters.ts` + `auth.ts`:

| # | Step | Method + path | Required fields / notes |
|---|---|---|---|
| L1 | Submit application (public) | POST `/exporters/exporter-applications` — `exporters.ts:101` | Required: companyName, tinNumber, businessLicenseNumber, capitalRequirement, professionalTaster, contactPerson, email, phone, address, city (`:102-122`). Returns **201** `{data:{applicationId: "APP-<ts>-<rand>", status:"pending", credentials:{username, emailSent}, emailDelivery}}` (`:295-310`). **The temp password is NOT in the response** — it is only emailed (`sendApplicationSubmissionEmail`, `:280-292`); if SMTP is down, `emailSent:false` and the applicant has no way to obtain the password from the API. Scripts read `.data.credentials.username` but never use it further. |
| L2 | (Optional) Check status by email (public) | GET `/exporters/exporter-applications/check/:email` — `exporters.ts:664` | Returns status-only fields (id, application_id, company_name, email, status, submitted_at, rejection_reason, approved_at, license_number, exporter_id). **No script calls it.** |
| L3 | Applicant login with temp credentials | POST `/auth/applicant/login` — `auth.ts:511` | Body `{username, password}` (manual check `:514-522`); verifies via `applicantCredentialsService.verifyCredentials`; returns an **APPLICANT-role token** carrying `applicationId`. **No script calls it.** |
| L4 | Applicant status (applicant token) | GET `/auth/applicant/status` — `auth.ts:608` | Bearer APPLICANT token; returns applicationId, companyName, email, status, rejectionReason, approvedAt, licenseNumber, exporterId. **No script calls it.** |
| L5 | ECTA approves | POST `/exporters/exporter-applications/:applicationId/approve` — `exporters.ts:306` | Auth + `requireRole('ECTA','ECTA_ADMIN')`; required exporterId, ectaLicenseNumber, licenseExpiryDate; optional bankName, bankAccountNumber, bankBranch, bankBranchCode. Requires application status `pending` else 404. Side effects: Fabric `registerExporter`, licence PDF generation, temp account converted to full account (username becomes the `exporterId`), approval email. Returns `{data:{applicationId, exporterId, status:"approved", txId, credentials:{username: exporterId, passwordNote:"Use the password from your application confirmation email"}, license:{licenseNumber, verificationCode, issuedDate, expiryDate, downloadUrl:"/api/v1/exporters/licenses/<n>/download"}}}` (`:512-540`). |
| L6 | Licence verify (public) | GET `/exporters/licenses/:licenseNumber/verify?verificationCode=…` — `exporters.ts:2363` | Returns `{success, verified, data:{licenseNumber, companyName, exporterId, issuedDate, expiryDate, status: VALID\|EXPIRED, verificationCodeMatch}}`. **No script calls it.** |
| L7 | Licence download (auth) | GET `/exporters/licenses/:licenseNumber/download` — `exporters.ts:2293` | `authMiddleware`, no role check; serves the PDF if the file exists, else 404 `LICENSE_NOT_FOUND`. **No script calls it.** |
| L8 | Exporter login (post-approval) | POST `/auth/login` — `auth.ts:111` | Username is now the `exporterId`; password is the **unchanged temp password from the L1 email**. Scripts never do this — they log in as seed admins instead. |
| L9 | Reject path | POST `/exporters/exporter-applications/:applicationId/reject` — `exporters.ts:559` | ECTA only; required `reason`; sets user status `rejected`, rotates the temp password, emails new credentials. |
| L10 | Resubmit path | POST `/exporters/exporter-applications/:applicationId/resubmit` — `exporters.ts:701` | Auth required; only the APPLICANT token for that application or ECTA/ADMIN. Body: `email` is **required** (isEmail); all other fields optional. See M27: the handler looks the application up by **numeric** `id` (`WHERE id = $1 AND status='rejected'`, `exporters.ts:~770`) while the route param is the `APP-…` applicationId, so a resubmit addressed by `APP-…` 404s; and `professionalTaster` is validated `isBoolean` here while submit accepts the string `"yes"`/`"no"`. **No script calls it.** |

Alias: POST `/applications/:applicationId/approve` (`exporters.ts:546`) is a 307 redirect
to the `/exporter-applications/` form. There is no resubmit/check/verify/download coverage
in any of the four scripts.

## 6. `status.ts` — what the "overall status" endpoint returns

There is **no** `GET /status` or single "overall status" endpoint. `api/src/routes/status.ts`
(288 lines, mounted at `/status`, `server.ts:314`) exposes only four routes, all behind
`authMiddleware`:

| Route | Returns |
|---|---|
| GET `/status/transitions/:entityType[?currentStatus=]` — `status.ts:20` | `{data:{entityType, currentStatus?, nextStatuses}}` or `{data:{entityType, transitions}}` |
| GET `/status/:entityType/:entityId/timeline` — `status.ts:77` | `{data:{entityType, entityId, timeline, totalChanges}}` |
| POST `/status/:entityType/:entityId/validate` — `status.ts:121` | Body `{currentStatus, newStatus}` required; returns `{data:{entityType, entityId, currentStatus, newStatus, isValid, allowedNextStatuses}}` |
| GET `/status/workflow/:entityId?type=CONTRACT\|SHIPMENT\|PAYMENT` — `status.ts:176` | **Closest to an "overall status"**: `{data:{rootEntity:{type,id}, statuses:{…}}}` — for `type=CONTRACT`: contract, forex, lc, shipment, payment; for `SHIPMENT`: shipment, quality, phytosanitary, eudr, insurance, landTransport, customs, courier; for `PAYMENT`: payment, swift, documents. Each status is fetched live from Fabric (`getEntityStatus`/`getRelatedStatus`, `status.ts:232-288`); missing entities report `NOT_FOUND`. `type` query param is required (`isIn([...])`). |

**No test script calls any `/status/*` endpoint.**

## 7. Dependency chains

### v1/v2 (client-generated IDs; only `APP_ID` is server-returned)

```text
submit app ──APP_ID──▶ approve app ──┐
                                     │ (NEW_EXPORTER_ID, NEW_CONTRACT_ID, BUYER_ID,
login ecta ──TOKEN_ECTA──▶ approve ──┤  NEW_SHIPMENT_ID, NEW_LC_NUMBER are all
login admin ──TOKEN_ADMIN──▶ create contract ──NEW_CONTRACT_ID──▶ approve contract
                                     │                              │
login shipping ──TOKEN_SHIPPING──▶ create shipment ──NEW_SHIPMENT_ID──▶ quality inspection
login bank ──TOKEN_BANK──▶ issue LC ──.data.forexAutoCreated──▶ (skip|manual forex request)
login customs ──TOKEN_CUSTOMS──▶ submit declaration
verification GETs depend on APP_ID / NEW_CONTRACT_ID / NEW_SHIPMENT_ID + tokens; NBE login ──TOKEN_NBE──▶ GET /nbe/lc-monitoring
```

Weakness: every downstream ID except `APP_ID` is generated locally (`EXP-<ts>`,
`CONT-<ts>`, `SHIP-<ts>`, …), so a failed create still produces IDs that later steps use;
failures surface only as `.success == false` on the later call. Tokens are fetched
just-in-time per phase, with fallback to `TOKEN_ECTA` when a role login fails.

### CRUD (server-returned IDs; tokens all fetched upfront in Phase 1)

```text
logins ×8 ──ADMIN/ECTA/ECX/BANK/QUALITY(=ecta_admin)/CUSTOMS/SHIPPING/NBE tokens──▶ all later steps
submit app ──APPLICATION_ID (.data.applicationId)──▶ approve ──EXPORTER_ID (.data.exporterId)──▶ contract/shipment/quality/LC/customs/booking
create contract ──CONTRACT_ID (.data.contract.contractID)──▶ approve / PATCH / cancel / shipment / quality / LC / customs
create shipment ──SHIPMENT_ID (.data.shipment.shipmentID)──▶ quality / customs / booking
create inspection ──QUALITY_ID (.data.inspection.inspectionID)──▶ collect-sample → lab-results → PUT approve / PUT reject
issue LC ──LC_ID (.data.lcID, fallback sent LC_NUMBER)──▶ examine → release-payment
       └──FOREX_ID (.data.forexID)──▶ NBE approve → repatriation   [both skipped if FOREX_ID empty]
submit declaration ──CUSTOMS_ID (.data.declaration.declarationID)──▶ review → inspect → complete-inspection → clear
create booking ──BOOKING_ID (.data.booking.bookingID)──▶ load → depart → arrive → deliver
```

Single point of fragility: `FOREX_ID` depends on the LC response carrying `forexID`
(`banking.ts:864-865` does return it when `forexAutoCreated`); if LC issuance fails or
returns no forex, steps #51–52 are skipped, not failed. The customs-rejection branch
depends on the broken shipment create #42 (M14).

### e2e (read-only; depends on pre-existing data)

```text
login per portal ──TOKEN_*──▶ list GET ──first-item id (.data.<plural>[0].<id>)──▶ detail GET
```

No creates, so every detail step is conditional on the list being non-empty; with the
response-shape mismatches (M7–M13) the extracted counts are silently 0 and all detail
steps are skipped. `GET /banking/payments?contractId=test` (#25) is independent of any
prior step (hardcoded `test`).

## 8. Mismatch register (29 findings)

Severity: **BLOCKING** = call cannot succeed as written; **WRONG-ASSERT** = endpoint
exists but the script asserts on a key/shape the API never returns (usually silently
reports 0 / passes vacuously); **SILENT-LOSS** = field sent but dropped, or data never
stored; **MINOR/OTHER** = latent defect or data issue.

| ID | Severity | Finding (script → code) |
|---|---|---|
| M1 | BLOCKING | v1/v2 `:488` GET `/exporters/exporter-applications/$APP_ID` — no such route (`exporters.ts` has only list `:26` and GET `/applications/:applicationId` `:59`). Verification step can never return the application. |
| M2 | BLOCKING | e2e `:117` GET `/applications/$APP_ID` — under the `/applications` mount (`server.ts:265`) this hits GET `/:exporterID` (`exporters.ts:1684`, exporter lookup), not the application detail route. |
| M3 | BLOCKING | e2e `:128` GET `/users/exporters` — no such route in `users.ts`; `GET /users/:userId` (`users.ts:463`) treats `exporters` as a user ID. |
| M4 | BLOCKING | e2e `:303` GET `/banking/payments?contractId=test` — handler requires `exporterId` (`banking.ts:1563-1575`), returns 400; `contractId` is ignored. The script's own comment ("requires contractId parameter") names the wrong parameter. |
| M5 | WRONG-ASSERT | v1/v2 `:497` GET `/contracts?contractId=…` — handler (`contracts.ts:623`) never reads `contractId`; returns `data` = bare array. `jq -e '.data'` passes vacuously even when empty. |
| M6 | WRONG-ASSERT | v1/v2 `:506` GET `/shipments?shipmentId=…` — handler (`shipments.ts:526-529`) never reads `shipmentId`; returns `data` = bare array. Same vacuous pass. |
| M7 | WRONG-ASSERT | e2e `:109,:122` GET `/applications?status=…` — handler (`exporters.ts:1347-1370`) returns `data` = applications **array**; script reads `.data.applications \| length` → silently 0, detail step skipped. |
| M8 | WRONG-ASSERT | e2e `:159,:172,:297` GET `/contracts[?status=REGISTERED]` — handler returns `data` = bare array (`contracts.ts:921-933`); script reads `.data.contracts \| length` → silently 0. `?status=` is also ignored by the handler. |
| M9 | WRONG-ASSERT | e2e `:184,:190,:196` GET `/quality/inspections[?status=…]` — handler returns `data` = bare array (`quality.ts:60-66`); script reads `.data.inspections \| length` → silently 0. (`?status=` filter itself exists.) |
| M10 | WRONG-ASSERT | e2e `:227,:233,:239,:245` GET `/customs/declarations[?status=…]` — handler returns `data` = bare array (`customs.ts:200-222`); script reads `.data.declarations \| length` → silently 0. (`?status=` filter exists in the first handler.) |
| M11 | WRONG-ASSERT | e2e `:282` GET `/banking/lc` — handler returns `data` = bare array (`data: lcData`, `banking.ts:1425-1435`); script reads `.data.lcs \| length` and `.data.lcs[0].*` → silently 0 / null fields. |
| M12 | WRONG-ASSERT | e2e `:337` GET `/forex` — handler returns `data` = bare array (`forex.ts:180-190`); script reads `.data.allocations \| length // 0` → silently 0. |
| M13 | WRONG-ASSERT | e2e `:388,:394` GET `/shipping/shipments[?status=pending]` — handler returns `data` = bare array (`shipments.ts:717-726`); script reads `.data.shipments \| length` → silently 0. |
| M14 | BLOCKING | CRUD `:921` rejection-test POST `/shipments` — 9 required fields missing (shipmentID, buyerID, origin, grade, icoNumber, channel, forexRate, valueUSD, eudrCompliant; `shipments.ts:115-140`) → 400; steps #43–44 skipped. |
| M15 | SILENT-LOSS | CRUD `:216,:304` POST `/exporters/exporter-applications` — businessType, registrationNumber, establishmentDate, country, postalCode, primaryPhone, website, numberOfEmployees, productionCapacityKg, warehouseCapacityKg, contactPersonName/Title/Phone/Email are not in the validator (`exporters.ts:101-130`) nor the INSERT (`:170-200`) → never stored; `exporterType` is never sent → defaults to `company`. |
| M16 | SILENT-LOSS | v1/v2 `:191` + CRUD `:360,:443` POST `/contracts` — buyerName, portOfLoading, portOfDestination, deliveryDate, incoterm, specialInstructions, organicCertified, fairTradeCertified (+ CRUD totalValue, contractDate, portOfDischarge) are not destructured by the create handler (`contracts.ts:360-372`) → dropped at create (PATCH handler does accept most of them). |
| M17 | SILENT-LOSS | CRUD `:425` PATCH `/contracts/:id` — totalValue and amendmentReason are neither validated (`contracts.ts:68-95`) nor in the update map (`:130-170`) → ignored; only quantity changes, total_value goes stale. |
| M18 | SILENT-LOSS | v1/v2 `:312` POST `/quality/inspections` — inspectionType, sampleLocation, requestedBy are not destructured by the handler (`quality.ts:265`) → ignored. |
| M19 | SILENT-LOSS | CRUD `:587` POST `/quality/inspections/:id/lab-results` — appearance, odor are not destructured (`quality.ts:1641-1648`) → ignored (other sent fields are consumed). |
| M20 | SILENT-LOSS | v1/v2 `:413` POST `/forex/request` — requestedBy is not destructured (`forex.ts:543`) → ignored. |
| M21 | SILENT-LOSS | CRUD `:847` POST `/customs/declaration/:id/review` — reviewNotes is not destructured; handler expects assignedInspector, scheduledDate, priorityLevel, location, inspectionType, inspectorNotes (`customs.ts:1038`) → reviewNotes ignored, review proceeds with defaults. |
| M22 | SILENT-LOSS | CRUD `:864` POST `/customs/declaration/:id/inspect` — `inspectHandler` (`customs.ts:1096-1182`) reads no request body at all → inspectionResult, inspectorName, inspectionNotes all ignored (status still moves to `INSPECTING`). |
| M23 | SILENT-LOSS | CRUD `:901` POST `/customs/declaration/:id/clear` — clearanceNotes, customsDuty, otherCharges are not among the destructured fields (`customs.ts:1427-1443`: clearanceNumber, clearedBy, clearanceDate, clearanceType, exportDuty, vatAmount, exitPoint, …) → all three ignored. |
| M24 | SILENT-LOSS | CRUD `:988` POST `/shipping/bookings` — containerType, numberOfContainers, exporterID, vesselName, voyageNumber are destructured but NOT persisted by the INSERT (`shipping.ts:347-371`); only echoed in the response. |
| M25 | BLOCKING (prod-only) | v1/v2 `:231` + CRUD `:408` POST `/contracts/:id/approve` — in production the handler 400s `MISSING_DOCUMENTS` unless `CONTRACT_SIGNED` + `PROFORMA_INVOICE` documents exist (`contracts.ts:1340-1375`); no script uploads any document, so approval only passes in non-production. Body fields sent (approvedBy/comments/reviewNotes) are also ignored. |
| M26 | MINOR | CRUD `:271` approve sends `licenseExpiryDate: 2025-12-31T00:00:00.000Z`, already past at mapping date (2026-11-09) — the issued licence would immediately verify as `EXPIRED` (`exporters.ts:2363` verify logic). |
| M27 | MINOR (latent) | Resubmit route (`exporters.ts:701`) — handler looks up by numeric `id` (`WHERE id = $1 AND status='rejected'`) while the route param is the `APP-…` applicationId, so resubmits addressed by `APP-…` 404; `professionalTaster` is validated `isBoolean` here but submit accepts `"yes"`/`"no"`. No script calls resubmit. |
| M28 | OTHER | Licensing gap: the submit response contains no temp password (only username + `emailSent`, `exporters.ts:295-310`), so the applicant-login flow (L3–L4, L8 in §5) cannot be exercised from script outputs; no script calls `/auth/applicant/login`, `/auth/applicant/status`, `check/:email`, licence verify, or licence download. |
| M29 | OTHER | v1/v2 create sample documents in `/tmp/test-documents` (`:20-30`) but never upload them — no `/documents/*` call in any of the four scripts, despite the v1/v2 header claiming "Document Uploads". |

**Mismatch count: 29** — 5 BLOCKING (M1–M4, M14; + M25 in production only), 9 WRONG-ASSERT
(M5–M13), 10 SILENT-LOSS (M15–M24), 5 OTHER/MINOR (M25–M29). Total 5 + 9 + 10 + 5 = 29.

Endpoint-existence summary: of the distinct endpoints the scripts call, **3 do not exist
as called** (M1, M2, M3) and **1 exists but rejects the script's query param** (M4);
all other called endpoints exist. The dominant failure mode is not missing routes but
**response-shape mismatch**: e2e reads `.data.<plural>` on six list endpoints that return
`data` as a bare array, and v1/v2 verification GETs pass vacuously on ignored query params.

## 9. Notes, limits, and items not verified in this slice

- `complete-workflow-test.sh` and `complete-workflow-test-v2.sh` are byte-identical
  (`diff` produced no output); the "V2" filename/header is the only difference.
- Portal-dashboard sub-keys asserted by scripts but **not line-verified** here:
  e2e `.data.statistics.applications.pending_applications` (`:134`),
  `.data.totalLCs` (`:313`), `.data.totalForex` (`:364`), `.data.totalShipments` (`:409`);
  CRUD's portal assertions (`.data.pendingApplications`, `.data.statistics.applications.approved_applications`,
  `.data.availableLots`, `.data.pendingInspections`, `.data.pendingLCs`,
  `.data.pendingForexRequests`, `.data.pendingDeclarations`, `.data.freightBookings`,
  `.data.retentionConversions`) **were** confirmed present in `portals.ts`
  (`:117-119,161,184-193,213,272,306-307,351-352,400,456,485,537`).
- Seed-user existence (`ecta_admin`, `admin`, `ecx_admin`, `bank_admin`, `customs_admin`,
  `shipping_admin`, `nbe_admin`) was not verified — no seed file was read in this slice.
- Whether the shipments POST handler persists the v1/v2 extra fields (transportMode,
  carrier, vesselName, containerNumber, billOfLading, departureDate, estimatedArrival,
  destination, status) and whether the quality collect-sample handler uses
  collectorName/sealNumber were not verified — only the validators were read.
- Status-value casing is inconsistent across scripts and code: quality inspections are
  stored lowercase (`pending`/`approved`, `quality.ts:873-910`) but CRUD asserts
  `"APPROVED"` uppercase (`:611`); e2e queries `?status=approved` (lowercase) for quality
  but `?status=SUBMITTED/UNDER_REVIEW/CLEARED` (uppercase) for customs. Which casing each
  list filter expects was not runtime-verified.
- Duplicate routes noted (not counted as mismatches): GET `/quality/inspections`
  (`quality.ts:22` vs `:1281`), GET `/customs/declarations` (`customs.ts:140` vs `:585`),
  banking router mounted twice (`server.ts:246` and `:253`); the first definition wins in
  each case.
