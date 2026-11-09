# GoCBC — Portal-to-Portal Handoffs (TEST-PORTAL-HANDOFFS)

**Branch:** `fix/auth-chaincode-audit` · **Handoff audit commit:** the single commit containing this file (see `git log` — author Gurmu Demuma)
**Purpose:** for every boundary where one portal finishes and another takes over,
record the producer's output status and the consumer's expected input status
IN EACH LAYER (chaincode, API, Postgres, UI). Acceptance rule: no handoff may
have a producer status the consumer rejects in any layer.
**Verification:** `LIVE` = exercised against the local API (port 3001, Postgres,
no Fabric) in the HANDOFF run (namespace HANDOFF1447, 90 checks) and the
RETEST run (namespace RETEST1508, after the fixes below); `STATIC-ONLY` =
verified in code only (needs a live peer); `BLOCKED` = the step needs
Fabric/CouchDB/IPFS absent here.
**HANDOFF1447 tally (90 checks):** 41 PASS (2xx) + 13 expected-error PASS
(401/403/404/400 guards) + 4 phantom-guard PASS (404 with no tracking row)
= 58 pass-equivalent; 25 BLOCKED (Fabric/CouchDB/IPFS); 1 FAIL (step 33,
booking-arrive 500 on `chk_shipments_status` — migration 060 omitted
`ARRIVED`); 6 seed-artifact 404s (the post-delivery seed's `ON CONFLICT
(shipment_id)` failed — no unique constraint existed; migration 060 adds
`uq_post_delivery_tracking_shipment_id`). Both FAILs were fixed and
re-verified live in RETEST1508 (see the per-handoff Live rows).

## H1 — Application approved (ECTA) → exporter record / contract (ECTA, Exporter)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | No chaincode entity for applications (PG-only by design) | — | n/a |
| API | `POST /exporter-applications/:id/approve` → `approved` (lowercase, `exporter_applications.status`); licence status changes via `PUT /exporters/:exporterID/status` now validate against the EXPORTER table (SUSPENDED → ACTIVE reactivation allowed for ECTA, REVOKED terminal — matrix §16 #40) | Contract create takes `exporterID` (no status read); ECTA portal lists `approved` | ✅ |
| Postgres | `exporter_applications.status = 'approved'`; CHECK `chk_license_status` now includes `REVOKED` (migration 059) | Same column read by check-by-email + portal | ✅ |
| UI | ECTA Approve/Reject buttons render only for `status === 'pending'`; approved rows show an Approved chip | Exporter portal reads the licence as `ACTIVE` once issued | ✅ |
| Live (HANDOFF1447) | App submit 201, check-by-email 200, reject 200, resubmit 200/403 (wrong app), no-token resubmit 401. Approve itself 400 `BLOCKCHAIN_ERROR` — the route is chain-authoritative by design (on-chain registration is step 1, marked CRITICAL), so in dev mode no application can be approved and it stays `pending` (ECTA portal still lists it pending). Not a status mismatch: the PG state is consistent with the chain step not having happened. | | BLOCKED (needs Fabric) |

## H2 — Contract approved (ECTA) → ECX lot / forex (ECX, Banks)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `ApproveSalesContract` REGISTERED → APPROVED (guard added this audit; was unguarded) | `CreateLot`/`AllocateForex` read the contract; `AllocateForex` requires the contract to exist | ✅ |
| API | `POST /contracts/:id/approve` validates REGISTERED → APPROVED via statusManager, mirrors PG `APPROVED` | ECX lot intake takes `contractId` (no status read); forex request takes `contractId` | ✅ |
| Postgres | No `contracts` table row (contract creation is chain-only by design); approve writes the PG mirror `APPROVED` where a row exists; CHECK (059 + 060 adds `COMPLETED`) | Forex/ECX flows read `contractId` only | ✅ |
| UI | Contract Approve/Reject buttons gated on `REGISTERED`; `AWAITING_LC` synthetic status removed — approved rows keep real `APPROVED` + `isContract` | ECX portal shows lots by contract; Banks LC flow keys on contract | ✅ |
| Live (HANDOFF1447) | Contract create 500 (Fabric), approve 404 (cascade — no contract exists), ECX lot intake 400 (Fabric), ECX portal 200. Nothing in this handoff can run without a peer. | | BLOCKED |

## H3 — Forex approved (NBE) → LC / banking (Banks)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `ConfirmForex` REQUESTED → CONFIRMED; `RejectForex` (new) REQUESTED/CONFIRMED → REJECTED | `AllocateForex` from CONFIRMED (forexService guard allows REQUESTED/CONFIRMED/APPROVED-legacy) | ✅ |
| API | `POST /nbe/forex/:id/approve` best-effort `ConfirmForex` + PG `CONFIRMED`; `POST /banking/forex/:id/reject` (BANKS-only) best-effort `RejectForex` + PG `REJECTED` mirror (added this audit — was chain-only, so a rejected allocation kept showing in the NBE pending list); statusManager FOREX gained REQUESTED/CONFIRMED → REJECTED | LC issue/examine read the allocation by ID; `forexService.allocateForex` guards from-state | ✅ |
| Postgres | `forex_allocations.status = 'CONFIRMED'` / `'REJECTED'`; CHECK (059 + 060 adds `REJECTED`) allows CONFIRMED + legacy APPROVED/REPATRIATED | `pendingForexRequests` = status `REQUESTED`; portal `recentAllocations` shows CONFIRMED rows | ✅ |
| UI | Banks forex filter `APPROVED_OR_ALLOCATED` → `CONFIRMED_OR_ALLOCATED`; NBE portal pending list = REQUESTED only | LC flow shows CONFIRMED allocations as available | ✅ |
| Live (HANDOFF1447 + RETEST1508) | Approve-nonexistent 404, approve-real 200 `CONFIRMED`, repatriation 200 `COMPLETED`; seeded REQUESTED row appears in `pendingForexRequests` and leaves it after approve (warning-3 anomaly NOT reproduced). Reject: old route 400 (Fabric, chain-authoritative); new route re-tested live — 200 `REJECTED`, PG row `REJECTED`, rejected allocation gone from NBE pending (0). | | ✅ LIVE |

## H4 — LC released (Banks) → payment (Banks, NBE)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | LC `UTILIZED → PAYMENT_RELEASED` (banking.go UTILIZED row now `{PAYMENT_RELEASED, EXPIRED}`); payment `VERIFIED → SETTLED` accepted by `SettlePayment`; `ConfirmSettlement` (new) SETTLED → CONFIRMED; `RecordCADPayment` now BanksMSP-only and PRESENTED/ACCEPTED → PAID only (was unguarded — matrix §16 #41) | `SettlePayment` accepts VERIFIED and SWIFT_RECEIVED; `ReleaseDocumentsToBuyer` now also accepts CONFIRMED | ✅ |
| API | statusManager PAYMENT: `VERIFIED → SWIFT_INITIATED/SETTLED`, `SETTLED → DOCUMENTS_RELEASED/CONFIRMED`, `CONFIRMED → DOCUMENTS_RELEASED`; settle mirrors PG `SETTLED`; settle route + NBE release now share one canonical `settleOnChain` (matrix §16 #39); CAD payment route now requires BANKS/BANK_ADMIN (was auth-only) | Payment initiate/record/settle/confirm routes validate via statusManager | ✅ |
| Postgres | `letters_of_credit.status` LC machine; `payments.status` is now the settlement machine ONLY — migration 063 split the retention machine into `retention_status` (RECEIVED/SPLIT/RETENTION_CONVERTED/RELEASED) with a backfill, so the settle mirror can no longer clobber a retention state (matrix §16 #37 — the §17 #8 split is done) | Retention flow reads `retention_status` for RECEIVED; settle flow reads `status` VERIFIED | ✅ |
| UI | LC unions now the real set incl. `PAYMENT_RELEASED/SETTLED`; PaymentStatusBadge + `VERIFIED`; `PAID` → `SETTLED` everywhere | Banks/NBE payment views filter on SETTLED/CONFIRMED | ✅ |
| Live (HANDOFF1447) | LC issue 500, examine 400, release-payment 400, forex-request 400 (all Fabric); payment initiate 400, record 500, settle 404, release-NBE 404 (cascades — no LC/payment exists on-chain); status-payment table 200 (`VERIFIED → SWIFT_INITIATED/SETTLED`, `SETTLED → DOCUMENTS_RELEASED/CONFIRMED`). No step in this handoff can run without a peer. | | BLOCKED |

## H5 — Quality approved (ECTA) → permit (ECTA)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `ApproveQualityInspection` (new, quality.go) INSPECTED → APPROVED; `RejectQualityInspection` (new) INSPECTED → REJECTED; `PerformInspection` PENDING → INSPECTED. Key namespaces separated (matrix §16 #42): quality inspections keep `INSPECTION_`, pre-shipment inspections now live under `PREINSPECTION_` (new helper + rich-query filter on `inspectionAgency`), so the two entities can never collide | Permit issue reads the inspection certificate (`certificateID`); `SubmitCustomsDeclaration` sets shipment PERMIT_ISSUED → CUSTOMS_DECLARED | ✅ |
| API | All four quality approve/reject handlers now share one core, `decideQualityInspection` (guard + PG write + best-effort chain sync — matrix §16 #39); POST approve keeps its CouchDB write + document signing, PUT approve keeps its response shape; PG `APPROVED` (uppercase) | Permit issue mirrors PG `ISSUED`; customs permit-ready query now uppercase `PERMIT_ISSUED` (was lowercase, always 0 rows) | ✅ |
| Postgres | `quality_inspections.status = 'APPROVED'`; CHECK (059) | `export_permits` + customs queries read `APPROVED`/`PERMIT_ISSUED` | ✅ |
| UI | ECTA inspection filter + `PERMIT_ISSUED`, lowercase comparisons uppercased; dead `SCHEDULED`/`UNDER_REVIEW` filter values removed | Permit tab shows approved inspections as permit-ready | ✅ |
| Live (HANDOFF1447 + RETEST1508) | HANDOFF: create 500 `socket hang up` — the route wrote to CouchDB first and threw on failure, so no PG row existed (step 18 approve-real 404 cascade); seeded INSPECTED approve 200 `APPROVED`, re-approve 400 `INVALID_STATUS`. Fixed this audit: the CouchDB write is now best-effort (like the perform route and shipment-create) and the PG insert always runs. RETEST: create 200 `PENDING` (`couchdbSynced:false` + warning), perform 200 `INSPECTED`, approve 200 `APPROVED` — the full chain runs in dev mode. | | ✅ LIVE |

## H6 — Permit issued (Banks) → shipment (Shipping, Exporter)

> **Owner correction (this audit):** the workflow map step 11 says ECTA issues the
> export permit, but `IssueCBEExportPermit` is BanksMSP-only on-chain ("Only
> Banks can issue export permits") — this is the CBE payment-authorisation
> permit, not the ECTA licence — and the Banks portal owns the issue action.
> The API role check (`BANKS`/`BANK_ADMIN`) follows the chaincode; the map's
> owner label is stale. The ECTA side of this boundary is the quality
> approval (H5), which makes the shipment permit-ready.

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `IssueCBEExportPermit` now cascades CREATED shipments under its ContractID → PERMIT_ISSUED (best-effort); `SubmitCustomsDeclaration` sets shipment PERMIT_ISSUED → CUSTOMS_DECLARED | `CreateShipment` / `PickupShipment` read shipment status; `PickupShipment` requires CUSTOMS_CLEARED or PERMIT_ISSUED as from-state | ✅ |
| API | Permit issue mirrors PG `ISSUED` on both handlers; wrapper returns uppercase `ISSUED`; permits routes now auth + `requireRole('BANKS','BANK_ADMIN')` for issue/utilise/settle | Shipment create writes PG `CREATED`; shipment status routes validate via statusManager | ✅ |
| Postgres | `export_permits.status = 'ISSUED'`; CHECK (059); `shipments.status` PERMIT_ISSUED via the cascade mirror | Shipment queries filter PERMIT_ISSUED | ✅ |
| UI | Permit status unions include ISSUED | Shipping portal shows permit-issued shipments as ready | ✅ |
| Live (HANDOFF1447 + RETEST1508) | HANDOFF: issue as ECTA 403 (correct — role gate), list-noauth 401, issue-noauth 401. RETEST: issue as BANKS passes the gate and reaches the chain call (400 Fabric) — the gate is role-correct. The on-chain issue + cascade need a peer. | | BLOCKED (on-chain part) |

## H7 — Shipment created (Exporter/Shipping) → customs (Customs)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `CreateShipment` → CREATED (the auto-created pre-shipment inspection now uses the raw shipment ID — was double-prefixed `INSPECTION_INSPECTION_…`, matrix §16 #42); `SubmitCustomsDeclaration` now reads the shipment under the `SHIPMENT_` prefix (was bare key, guard never fired) and sets PERMIT_ISSUED → CUSTOMS_DECLARED | Customs declaration requires the shipment to exist; `ClearCustomsDeclaration` cascades the linked shipment → CUSTOMS_CLEARED | ✅ |
| API | Shipment create writes PG `CREATED` (was lowercase `pending`); `mirrorShipmentStatusPG` on all 13 lifecycle handlers | Customs submit writes PG `SUBMITTED`; review → `UNDER_INSPECTION`; inspect → `UNDER_INSPECTION`; complete → `UNDER_REVIEW`; clear takes 4 args (was 7 vs a 4-arg function) | ✅ |
| Postgres | `shipments.status = 'CREATED'`; CHECK (059) incl. legacy `BOOKED`/`REGISTERED` with comments | `customs_declarations.status` CHECK (059); portal reads SUBMITTED/UNDER_INSPECTION/UNDER_REVIEW/CLEARED | ✅ |
| UI | Shipment unions widened (+FREIGHT_BOOKED, LAND_TRANSPORT, PORT_ARRIVED, CONTAINER_STUFFED, VESSEL_LOADED, DESTINATION_ARRIVED, INSPECTION_PENDING, CUSTOMS_REJECTED) | Customs portal filters on the same values | ✅ |
| Live (HANDOFF1447) | Shipment create 202 `CREATED` (`blockchainSynced:false`); customs submit 200 `SUBMITTED`, review 200 `UNDER_INSPECTION`, inspect 200 `UNDER_INSPECTION`, complete-inspection 200 `UNDER_REVIEW`, clear 200 `CLEARED`; customs portal 200 (pendingReview 1, scheduledInspections 1). The full customs chain runs in dev mode. | | ✅ LIVE |

## H8 — Customs cleared (Customs) → shipping / freight (Shipping)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `ClearCustomsDeclaration` → declaration CLEARED + cascades linked shipment → CUSTOMS_CLEARED; `ClearDeclaration` (duplicate) same cascade | Book-freight requires shipment CUSTOMS_CLEARED as from-state; `PickupShipment` requires CUSTOMS_CLEARED or PERMIT_ISSUED | ✅ |
| API | Customs clear mirrors PG `CLEARED` (duplicate `/declarations/:id/clear` fixed from lowercase `'cleared'` in the CouchDB doc); the plural clear route was removed entirely in the remaining-7 pass (no callers, no chaincode call, no from-state guard — matrix §16 #39), so the singular `/declaration/:declarationId/clear` is the only clear; booking sets shipment PG `FREIGHT_BOOKED` + best-effort chain `UpdateShipmentStatus` | Shipping portal `freightBookings` = shipments WHERE status `FREIGHT_BOOKED` | ✅ |
| Postgres | `customs_declarations.status = 'CLEARED'`; `shipments.status = 'FREIGHT_BOOKED'` after booking; CHECKs (059) | Portal queries read both | ✅ |
| UI | Customs `DRAFT` kept as UI-only pre-submit state (no route writes it); `HELD` removed (no transition produces it) | Shipping portal shows FREIGHT_BOOKED shipments | ✅ |
| Live (HANDOFF1447) | Customs clear 200 `CLEARED` (step 42); booking create 200 `BOOKED` and the Shipping portal shows it in `freightBookings` (4); book-freight 404 (reads the shipment on-chain — needs Fabric). The PG side of the handoff works; the chain side needs a peer. | | ✅ LIVE (PG) / BLOCKED (chain) |

## H9 — Freight booked (Shipping) → delivery (Shipping, Exporter)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `StuffContainer` (PORT_ARRIVED → CONTAINER_STUFFED) — the API's `RecordContainerStuffing` call now targets it with the 6-arg form; `LoadOnVessel` CONTAINER_STUFFED → VESSEL_LOADED; `DepartFromPort` VESSEL_LOADED → DEPARTED; `ArriveAtDestination` IN_TRANSIT → DESTINATION_ARRIVED; `RecordVesselLoading/Departure/DestinationArrival` (new) delegate to those three | Each step guards its from-state; `CompleteDelivery` from the arrival state | ✅ |
| API | Book-freight → FREIGHT_BOOKED; load/depart/arrive/deliver handlers mirror PG on every step — **fixed in the remaining-7 pass (matrix §16 #43):** bookings now live in their own `shipping_bookings` table (migration 064) instead of a second `shipments` row; create persists the carrier/vessel/voyage/container fields it used to drop, `GET /bookings` reads the new table (was returning every shipment, mislabelled, with doubled `BOOK-BOOK-…` ids), and lifecycle calls 404 when the booking does not exist (was a phantom 200). All four handlers still mirror the status (+ dates/container/seal) onto the real shipment row, with a best-effort `UpdateShipmentStatus` chain sync, the same pattern booking-create uses for FREIGHT_BOOKED. | Shipment status route validates via statusManager | ✅ |
| Postgres | `shipping_bookings` (migration 064: booking_id PK, shipment_id NOT NULL, carrier/vessel/voyage/container fields, status CHECK BOOKED/LOADED/IN_TRANSIT/ARRIVED/DELIVERED) + the existing `BOOK-%` rows moved out of `shipments` on apply; `shipments.status` follows the lifecycle on the REAL row (FREIGHT_BOOKED → LOADED → IN_TRANSIT → ARRIVED → DELIVERED); CHECK (059 + 060 adds `ARRIVED` + `CUSTOMS_DECLARED`) | Delivery/arrival queries read the same column | ✅ |
| UI | ShippingPortal + SHIPPED/LOADED/BOOKED/CREATED/ARRIVED/CONFIRMED | Exporter shipment tracking reads the same values | ✅ |
| Live (HANDOFF1447 + RETEST1508 + REM71730) | HANDOFF: booking create 200, load 200 `LOADED`, depart 200 `IN_TRANSIT`, arrive 500 `chk_shipments_status` (migration 060 omitted `ARRIVED` — the only FAIL in the run), deliver 200. RETEST: load/depart/arrive/deliver all 200, and the REAL shipment row now reads `ARRIVED` after arrive and `DELIVERED` after deliver (was stuck at `FREIGHT_BOOKED`). Stuff-container 400 (Fabric — the route now calls `StuffContainer` with 6 args). REM71730 (new table): migration 064 applied at startup; create 200 with all five fields persisted in `shipping_bookings`; full lifecycle load → depart → arrive → deliver all 200 with the booking row AND the real shipment row advancing in lockstep; `GET /bookings` returns only bookings (bare `BOOK-…` ids) and now also exposes the raw `status` (follow-up fix — the response had hidden the lifecycle status behind a two-value display label); lifecycle on `BOOK-0000` → 404; booking without `shipmentID` → 500 NOT NULL. Final DB check: 0 `BOOK-%` rows in `shipments`. | | ✅ LIVE |

## H10 — Delivery (Shipping) → post-delivery / payment settlement (Banks, NBE)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | Delivery completes the shipment on-chain; post-delivery has NO chaincode entity (PG-only by design) | Settlement reads the payment (SETTLED/CONFIRMED); `RecordForexRepatriation` (new, payment.go) from SETTLED/CONFIRMED, NBEMSP | ✅ |
| API | Post-delivery record functions advance PENDING → IN_PROGRESS, 404 when no tracking row exists; close verifies all four steps (payment, forex, LC-if-used, ECTA audit) then best-effort `CompleteContract` [contractId, userId] → `UpdateContractStatus` [contractId, 'COMPLETED']; `calculateCompletionPercentage` counts the LC step only when an LC was used (was 5/4 = 125%) | Payment settle mirrors PG `SETTLED`; `RecordForexRepatriation` route passes (paymentID, amount, currency, exchangeRate, swiftReference, nbeApprovalRef) | ✅ |
| Postgres | `post_delivery_tracking.overall_status` PENDING/IN_PROGRESS/COMPLETED/ISSUE + DELAYED at read time (no background job); CHECK (059); one row per shipment enforced by `uq_post_delivery_tracking_shipment_id` (060 — the seed's `ON CONFLICT (shipment_id)` failed without it) | Dashboard views read the same columns | ✅ |
| UI | Post-delivery tab reads overall_status + completionPercentage (now ≤ 100) | — | ✅ |
| Live (HANDOFF1447 + RETEST1508) | HANDOFF: no-row record endpoints all 404 (phantom fix holds); the seeded-row retests 404'd only because the seed INSERT failed (no unique constraint — harness artifact, not a product bug). RETEST: seed INSERT 0 1, row count 1; payment/forex/LC/audit record calls all 200, close 200, status 200 (`paymentReceived:true`, `completionPercentage` now ≤ 100). | | ✅ LIVE |

## H11 — Settlement (Banks) → repatriation (NBE)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `ConfirmSettlement` (new) SETTLED → CONFIRMED, confirmationType ∈ {BANK_VERIFICATION, NBE_APPROVAL, FOREX_REPATRIATION}; `RecordForexRepatriation` (new) from SETTLED/CONFIRMED; `InitiateRepatriation` + `RecordRepatriation` (existing, now guarded — cannot resurrect COMPLIED) | Repatriation verify/penalty guards apply the same OVERDUE derivation the read path uses, so stored and read status agree | ✅ |
| API | NBE repatriation handler best-effort syncs Initiate → Record via BanksMSP, never fails the request, reports `blockchainSynced`; payments repatriation route passes the new function's args | NBE portal counts real repatriations via `GET /repatriation/` (test fixed — was counting `retentionConversions`) | ✅ |
| Postgres | `forex_repatriations` row (migration 057); `payments.status` CONFIRMED where applicable (settlement machine); `payments.retention_status` is the retention machine (migration 063 — the NBE retention/repatriation queries read `retention_status`, not `status`); CHECKs (059 + 060 adds `CONFIRMED` to payments) | NBE portal retention/repatriation queries | ✅ |
| UI | Repatriation tab reads the repatriation list; NBE SWIFT flow DRAFT → NBE_APPROVED → APPROVED | — | ✅ |
| Live (HANDOFF1447) | NBE forex approve 200 `CONFIRMED`, repatriation 200 `COMPLETED` (PG path, `blockchainSynced:false`); NBE portal 200 (totalAllocations 4). The on-chain `RecordForexRepatriation` / `Initiate → Record` sync needs a peer. | | ✅ LIVE (PG) / STATIC-ONLY (chain) |

## H12 — SWIFT message (Banks) → NBE approval → send (NBE, Banks)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `NBEApproveSWIFTMessage` (new) DRAFT → NBE_APPROVED (dedicated `NBEApproval*` fields survive later transitions); `ApproveSWIFTMessage` now accepts DRAFT or NBE_APPROVED; `AddSWIFTDocuments` (new) DRAFT/NBE_APPROVED; `LinkSWIFTMessageToPayment` (new) + `LinkSWIFTMessageToLC` (existing) | Send requires APPROVED; `RejectSWIFTMessage` refuses terminal SETTLED/REJECTED/CANCELLED/FAILED | ✅ |
| API | NBE-approve route passes (messageID, approvedBy, amlCheck, sanctionScreening, comments, timestamp); add-documents + link-to-payment routes pass the new functions' args (were fire-and-forget, failures swallowed) | statusManager SWIFT: DRAFT → NBE_APPROVED/APPROVED/REJECTED, NBE_APPROVED → APPROVED/REJECTED | ✅ |
| Postgres | **No `swift_messages` table exists** (verified in the live DB) — SWIFT messages are chaincode-only; there is no PG mirror and no CHECK to add. The draft's earlier "CHECK (059)" claim was wrong. | SWIFT dashboard reads on-chain state via the API | ⚠️ chaincode-only by design (no PG mirror) |
| UI | Dead `PENDING_APPROVAL` removed from Banks SWIFT filters (still present in 5 other SWIFT files — out of scope, noted in matrix §17); `PAID` → `SETTLED` in SWIFT views | NBE SWIFT monitoring reads NBE_APPROVED | ✅ |
| Live (HANDOFF1447) | SWIFT create 400 (Fabric); status-swift table 200 (`DRAFT → NBE_APPROVED/APPROVED/REJECTED`, `NBE_APPROVED → APPROVED/REJECTED`). No SWIFT step can run without a peer. | | BLOCKED (needs Fabric) |

## H13 — Phytosanitary (ECTA) → permit/customs (ECTA, Customs)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `RequestPhytosanitaryCertificate` (new) → PENDING; `InspectPhytosanitaryCertificate` (new) PENDING → INSPECTED (FAILED if pests/disease); `IssuePhytosanitaryCertificate` now issues an existing INSPECTED cert in place (was error) and sets AMENDED-era fields; revoke ISSUED → REVOKED (PG mirror) | `SubmitCustomsDeclaration` / permit flows read the certificate status | ✅ |
| API | Issue route now reads the certificate on-chain first and passes all 14 args (was 5 vs 14 — arity error); returns the chaincode-generated number/validity; statusManager PHYTOSANITARY now PENDING → INSPECTED → ISSUED → REVOKED | Inspect route passes the new function's 6 args; revoke mirrors PG REVOKED | ✅ |
| Postgres | `phytosanitary_certificates.status` CHECK (059 + 060 adds `INSPECTED`); defaults fixed PENDING (was ISSUED) | Customs/quality queries read ISSUED | ✅ |
| UI | Phyto tab statuses from the real set | — | ✅ |
| Live (HANDOFF1447) | Phyto request 400 (Fabric); phyto-issue with no certificate 400 with the clear "must be requested and inspected first" message; status-phyto table 200 (`PENDING → INSPECTED → ISSUED → REVOKED`). The request/inspect/issue chain needs a peer. | | BLOCKED (needs Fabric) |

## H14 — Border crossing (Customs/Shipping) → arrival (Shipping)

| Layer | Producer output | Consumer expects | Match? |
|---|---|---|---|
| Chaincode | `InitiateBorderCrossing` → PENDING; `ClearForExit` PENDING → CLEARED_EXIT; `RecordDeparture` PENDING/CLEARED_EXIT → IN_TRANSIT; `RecordBorderCrossing` IN_TRANSIT → CROSSED; `RecordArrival` CROSSED → ARRIVED; `ClearBorderCrossing` / `DetainBorderCrossing` / `RecordBorderInspection` / `VerifyCompliance` all guarded (added this audit) | `RecordArrival` requires CROSSED; land-transport record requires IN_TRANSIT | ✅ |
| API | Land-transport border-crossing route now looks up the shipment's IN_TRANSIT crossing first and calls `RecordBorderCrossing` with the crossing ID (was passing the shipment ID as the crossing key + wrong trailing args) | Border portal reads the crossing machine | ✅ |
| Postgres | **No `border_crossings` table exists** (verified in the live DB) — border crossings are chaincode-only; there is no PG mirror and no CHECK to add. The draft's earlier "CHECK (059)" claim was wrong. | Border portal reads on-chain state via the API | ⚠️ chaincode-only by design (no PG mirror) |
| UI | BorderCrossingTab rewired to PENDING → INSPECTED/INSPECTION_FAILED → CLEARED/DETAINED; dialogs PUT → POST | — | ✅ |
| Live (HANDOFF1447) | Border initiate 500 (Fabric); land-transport crossing 400 with the clear "Could not list border crossings for shipment" message (the route now looks up the IN_TRANSIT crossing first instead of passing the shipment ID as the crossing key). The crossing chain needs a peer. | | BLOCKED (needs Fabric) |

## Known remaining gaps (not handoff-blocking, recorded in the matrix)

Resolved in the remaining-7 pass (2026-11-09, matrix §16 #37–#43 — re-verify live after the API restart; the chaincode parts are STATIC-ONLY until v2.3/seq 22 redeploy):

- ~~Freight bookings stored as a second `shipments` row~~ — now a `shipping_bookings` table (migration 064; §16 #43).
- ~~`payments.status` carries two machines~~ — split into `status` (settlement) + `retention_status` (migration 063; §16 #37).
- ~~Licence reactivation / REJECTED lots / DRAFT undecided~~ — decisions recorded and implemented: SUSPENDED → ACTIVE allowed (ECTA), REVOKED terminal, REJECTED lots terminal, DRAFT UI-only (§16 #40).
- ~~`statusManager.validateTransition` fail-open~~ — now fail-closed, bogus call sites removed, dead cascade removed (§16 #38).
- ~~Two inspection entities share the `INSPECTION_` key space~~ — pre-shipment now under `PREINSPECTION_` (§16 #42).
- ~~Duplicate handlers unmerged~~ — contracts body-approve + customs plural clear removed; quality, shipments and payments share one canonical handler each (§16 #39).
- ~~`RecordCADPayment` unguarded~~ — now BanksMSP-only, PRESENTED/ACCEPTED → PAID only (§16 #41).

Still open (deliberate or out of scope):

- `MigrateLCStatus` deliberately unguarded (migration helper, no API route calls it).
- `UpdateShipmentStatus` / `UpdateShipmentLocation` validate the target value only, no from-state guard — the reconcile-status admin override force-sets any status through `UpdateShipmentStatus`, so a from-state guard would break it.
- Dead `PENDING_APPROVAL` still exists in five other SWIFT files (`SWIFTDashboard.tsx`, `SWIFTMessageDetail.tsx`, `SWIFTNotifications.tsx`, `SWIFTStatistics.tsx`, `nbe/SWIFTMonitoring.tsx`).
- The `collection.go` vs `payment.go` CAD key-space split (`COLLECTION_` vs `CAD_` for the same entity).
