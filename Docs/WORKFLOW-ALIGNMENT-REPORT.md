# GoCBC — Workflow-Path Alignment Report (full workflow, every ending)

**Date:** 2026-11-12 (runs 05:53–07:01 UTC / 08:53–10:01 EAT)
**Repo:** `~/workspace/GoCBC`, branch `features`
**HEAD at start:** `88684454` · **HEAD at end:** `af0f6e39` (3 new local commits, **NOT pushed**; remote still `0c13b72d`)
**Stack:** native Fabric (orderer + 6 peers + 6 CouchDB + chaincode coffee v2.3 seq 3) + API :3001 + UI :3000, on this VM.
**Task (user's words):** test the workflow paths from the beginning to the last, covering every possible end, checking smart contract, API, UI and all the system working together aligned from one step to the other, agreeing on the status transitions.

**Method:** four workers ran in parallel (namespaces `ALN-HAPPY-*`, `ALN-REJ-*`, `ALN-PAY-*`, `ALN-UI-*`), each driving paths live through API + peer-CLI ledger reads (≥2 peers) + Postgres + headless Playwright UI. A step is PASS only when chaincode, API response, Postgres mirror and portal UI all show the SAME status. An API 200 with no ledger entry is a FAIL (phantom), never a pass. Reference maps: `TEST-WORKFLOW-MAP.md` (26 steps, 174 transitions), `TEST-STATUS-MATRIX.md` (15 entities, 121 transitions), `TEST-PORTAL-HANDOFFS.md` (H1–H14).

**Environment incidents during this round:** the VM was replaced at ~06:10 UTC, killing 3 of 4 workers mid-run (W1, W3, W4); all were re-spawned as W1b/W3b/W4b from their surviving artifacts in `~/pwtest/alignment/`. The login rate limiter (10 logins / 15 min per IP+username, `api/src/routes/auth.ts:31-32`) repeatedly blocked seeded logins while workers shared one VM IP — suites were re-run with fresh role-equivalent users where needed. Suite totals below are the re-runs against the current build, not the stale pre-reboot logs.

## 1. Summary table

### Suites (current build, HEAD af0f6e39)

| Suite | Result | Note |
|---|---|---|
| Flagship `tests/complete-workflow-test.sh` | **15 passed / 1 failed** (adapted identities; original aborted step 2 on rate-limited login) | The 1 failure is customs submit — the script has **no permit-issue step** and its shipment is INSPECTION_PENDING (M6). Was 16/0 at 88684454: the drop is the `f258dc0e` honest-failure fix exposing the script gap, not a product regression. No PG declaration row was created (fail-honest verified). |
| Missing-steps `tests/missing-workflow-steps-test.sh` | **89 passed / 0 failed / 1 blocked** | Blocked = applicant login (temp password is email-only). |
| Tabs `tests/verify-all-portal-tabs.sh` | **70/70 true** (adapted run 69/1; the 1 "fail" was a rate-limited `exporter_test` login, endpoint verified 200 separately) | Original run 30/40 — all 40 fails were rate-limited logins, not product failures. |

### Per-worker results

| Worker | Scope | Checks | Aligned (PASS) | Misaligned (FAIL) | Blocked |
|---|---|---|---|---|---|
| W1b | Happy path, 58-step four-layer driver + H1–H10 | 58 steps | 47 | 11 | 0 |
| W1b | UI spot-checks (6 probes) | 6 | 6 | 0 | 0 |
| W2 | 6 rejection paths (run 3) | 51 checks | 44 | 7 → **6 fixed, 1 remains (F-7)** | 0 |
| W2 | Re-verification + submit-503 proof | 14 checks | 12 | 2 (both = F-7 re-checks) | 0 |
| W3b | Payment/SWIFT/settlement ends + guards | 84 rows | 59 | 12 true FAILs (6 defects) + 11 superseded driver artifacts | 2 (UI) |
| W4b | UI alignment, 8 paths | ~27 actions | ~20 | 1 misaligned + 3 missing controls | 3 partial/blocked |

Counts overlap across workers (e.g. ECX reject was driven by both W2 and W4b; SWIFT reject by W3b and W4b), so no single grand total is claimed. The consolidated defect register (§3) is deduplicated.

### Handoffs H1–H10 (W1b)

| Handoff | Verdict | Note |
|---|---|---|
| H1 App approved → exporter/contract | PASS | |
| H2 Contract approved → ECX lot / forex | PASS | |
| H3 Forex CONFIRMED → LC / allocate | PASS | |
| H4 LC released → payment | PASS (payment leg) / NOT EXERCISED (LC-release leg — LC stays FOREX_ALLOCATED after settle; no step invokes UTILIZED → PAYMENT_RELEASED) | |
| H5 Quality approved → permit | **FAIL** (M1) | |
| H6 Permit issued → shipment / customs | **FAIL** literal / PASS alternate order (M1) | |
| H7 Shipment created → customs | **FAIL** literal / PASS alternate order (M1) | |
| H8 Customs cleared → freight booking | **FAIL** (M2) | |
| H9 Freight booked → delivery | **FAIL** literal / delivery chain PASS alternate order (M2/M3) | |
| H10 Delivery → post-delivery / settlement | **FAIL** terminal close only (M5); payment/retention legs PASS | |

## 2. Per-path results

### Path 1 — Happy path (W1b, 58 steps, namespace ALN-HAPPY-1794466211)
47 PASS / 11 FAIL. Every step from application → contract → forex → LC → shipment → quality → permit → customs → freight → delivery → phyto → payment → SWIFT → settle → repatriation → retention → post-delivery close was driven live; full table in `~/pwtest/alignment/W1-happy-handoffs.md` §4. The 11 FAILs are M1 (steps 16–20, customs unreachable for an inspected shipment), M2 (step 22, land transport blocked by booking mirror), M3 (step 29b, booking regresses DELIVERED), M4 (steps 35–38, intermediate payment PG states), M5 (step 46, close-contract). The delivery chain itself (port → stuff → load → depart → in-transit → arrive → deliver) is 8/8 four-layer PASS on the alternate order (permit before inspection, land transport before booking). UI spot-checks 6/6 PASS.

### Path 2 — ECX lot REJECTED (W2 6/6 + W4b 2/2, all PASS)
Grade at 13.5% moisture → REJECTED on-chain (tx `fb0c52ee…`) + PG with reason `Moisture content 13.5% exceeds 12% export limit`; terminal — re-grade/assign/release all 400. Explicit `POST /ecx/lots/:lotId/reject` also works (tx `31031427…`). UI: REJECTED chip + moisture shown, row actions empty after rejection. UI wart: lot detail dialog shows a misleading "No Blockchain Signatures Found" banner for a lot whose rejection IS on-chain (U-1).

### Path 3 — Contract REJECTED (W2 7/7 PASS, W4b UI PASS)
ECTA reject → REJECTED on chain + PG + UI (tx `3993914e…`); re-approve fails honestly (500, wart F-8). Correction via `supersedesContractID` works, source stays REJECTED. Chaincode `ResubmitRejectedContract` exists but has **no API route** and no PG mirror (F-1); no resubmit/correct control in the ECTA UI either. Rejection reason not shown in the contract Details dialog (W4 #1). No rejected-applications view in the ECTA portal (W4 #2).

### Path 4 — LC / forex REJECTED (W2 9/10 → fixed, W4b UI PASS)
LC reject → REJECTED; approve/issue/allocate from REJECTED all fail honestly. Forex reject → REJECTED, gone from NBE pending (API filter proof; NBE portal list is PG-backed, U-4). NBE approve of a REJECTED forex **was** a phantom (200 + PG flipped to CONFIRMED, ledger REJECTED) — **fixed in `f258dc0e`**, now 503 `FOREX_CONFIRM_FAILED`, re-verified (R1). UI gap: **no Reject control for a REQUESTED LC anywhere** in the Banks portal (W4 #3, `BanksPortal.tsx:6220-6243`).

### Path 5 — Quality FAILED / REJECTED (W2 9/10 → fixed, W4b UI PASS)
14% moisture → 503 `INSPECTION_PERFORM_FAILED`, no phantom; valid perform → approve → APPROVED; separate inspection → REJECTED, terminal (no REWORK path — matrix §5a confirmed live). Pre-shipment FAIL → COMPLETED-with-failed-result (no FAILED status exists, O-4). Inspection schedule/reject with missing fields **was** a 500 TypeError — **fixed in `f258dc0e`**, now 400 `VALIDATION_ERROR`, re-verified (R2). UI: invalid 14.5% fails honestly in the dialog; valid 11.0% performs and approves with certificate `CERT1794466012488` (PG-only — ledger `certificateNo` is empty, W4 P4c).

### Path 6 — Customs declaration REJECTED (W2 1/6 → 5 fixed, 1 dead-end; W4b submit-half PASS, reject-half BLOCKED)
Clean-order reject → REJECTED + shipment CUSTOMS_REJECTED; clear of a rejected declaration fails honestly. Submit/review **were** phantoms (200 + PG SUBMITTED/UNDER_INSPECTION while the ledger had no declaration) — **fixed in `f258dc0e`**, now 503s with no PG write, re-verified (R3 + S503 direct proof). **Genuine dead-end F-7 remains:** re-submit after rejection → 400 `DECLARATION_EXISTS` (`customs.ts:717`); shipment stuck at CUSTOMS_REJECTED with no recovery path. UI: all three submit attempts fail honestly at the right guard; reject half BLOCKED because no SUBMITTED declaration can exist for an inspected shipment (consequence of M1/#8).

### Path 7 — Permit / phyto REVOKED (W2 4/4 PASS)
Permit REVOKED is **unreachable** — no revoke/cancel function exists anywhere in chaincode (`permit.go`: Issue/Utilize/Settle/Read/Query only); EXPIRED/CANCELLED are dead states. No revoke control in the Banks UI either. Phyto ISSUED → REVOKED works end-to-end and is terminal (tx `dce9c5eb…`). Banks "Issue Export Permit" button is **unreachable** in the UI: it renders only on delivered-shipment cards, but `loadBankingData` overwrites the delivered list with only PAYMENT_RELEASED/SETTLED-LC shipments (`BanksPortal.tsx:905-921`) — the two DELIVERED shipments never appear (W4 #5).

### Path 8 — Payment discrepancy (W3b 9/9 PASS)
Report discrepancy OPEN → resolve RESOLVED → waive WAIVED → reject LC documents → LC EXPIRED, all on-chain + PG + UI (discrepancies tab shows both, Resolved/Waived). Re-resolve fails honestly (500). Initiate payment on an EXPIRED LC refused (400, chaincode message). UI BLOCKED once: LC EXPIRED row not surfaced (All LCs paginates 5/page over 86, no search box found).

### Path 9 — SWIFT rejected (W3b 8 PASS / 3 FAIL; W4b UI PASS incl. compose/approve/send)
DRAFT → (NBE approve **FAILs, B1**) → Banks approve → APPROVED → reject → REJECTED → send-from-REJECTED fails honestly → re-reject fails honestly (terminal). UI: compose dialog now closes on success (known leftover FIXED); **SWIFT list goes stale after Approve** — row still shows DRAFT until reload (W4 #4). **Settle succeeds against a REJECTED SWIFT message (C1)** — `payments.ts:716-870` never reads message state.

### Path 10 — Settlement ends (W3b 8/8 PASS after correction)
Wrong-state settle (DOCUMENTS_SUBMITTED) → 400 `INVALID_TRANSITION`, ledger + PG unchanged. VERIFIED → SETTLED and SWIFT_RECEIVED → SETTLED both work. ConfirmSettlement → CONFIRMED reachable live (tx `3ff63feb…`); re-confirm fails honestly. ReleaseDocumentsToBuyer reachable (DocumentsHeldBy=RELEASED, Status unchanged — matrix §8). UI BLOCKED: no Banks-portal tab lists initiate-path payments.

### Path 11 — SUSPENDED / REVOKED terminals (W3b 4 PASS / 2 FAIL)
Licence suspend → SUSPENDED works; reactivation SUSPENDED → ACTIVE works; REVOKED → ACTIVE fails honestly (terminal). **FAILs A1/A2: a SUSPENDED exporter can still create contracts (201) and forex requests (201)** — no licence check anywhere on those paths.

### Path 12 — Fail-closed validateTransition (W3b 12/12 PASS after driver correction)
4 illegal moves (`SHIPMENT CREATED→SETTLED`, `CONTRACT APPROVED→REGISTERED`, `PAYMENT PENDING→SETTLED`, `LC REQUESTED→SETTLED`) all `isValid:false`; legal control `true`; live re-approve guards hold (re-approve COMPLETED contract refused; approve FOREX_ALLOCATED LC refused 400).

### Path 13 — RBAC gates (W3b 6/6 PASS)
Settle as ECTA 403, permit issue as ECTA 403, forex confirm as Banks 403, SWIFT approve as NBE 403, LC examine as ECTA 403, repatriation verify as Banks 403 — all with the ledger unchanged.

### Path 14 — Repatriation / retention ends (W3b 8 PASS / 5 FAIL)
Retention record → COMPLIED (stored = read), re-record on COMPLIED fails honestly, policy set works, settle does not clobber `retention_status` (migration 063 split holds). **FAIL D1: repatriation initiate never succeeds live** — (a) chaincode requires status exactly SETTLED, so CONFIRMED payments are dead-ended (`repatriation.go:~160`); (b) on a correct SETTLED payment the MSP race struck (submitted as ECTAMSP, `repatriation.ts:217-218`). Record/verify are knock-ons. **FAIL F1: NBE 60% release 500s** on a SETTLED payment — `releasePayment` unconditionally re-calls SettlePayment (`paymentService.ts:360-375`). §9 OVERDUE read-time quirk unverifiable (no live repatriation record exists).

### Path 15 — Post-delivery close (W3b 1 PASS / 2 FAIL; W1b step 46 FAIL)
Close with missing steps refuses with ISSUE (400) — correct. **FAIL E1/M5: close with all steps returns 200 "Contract closed successfully" with `blockchainSynced:false`, flips PG to COMPLETED, while the contract stays APPROVED on-chain** — the close invoke was signed as NBEMSP; chaincode requires ECTA/Admin (`UpdateContractStatus`). **FAIL E2: re-close of a COMPLETED record also returns 200** — no idempotency guard.

### Path 16 — Cross-portal agreement (W4b 5/5 PASS)
One chain opened in all five portals: ECTA contract APPROVED, Banks LC FOREX_ALLOCATED, NBE forex Allocated, Shipping Pre-Shipping tab INSPECTION_PENDING, Customs correctly excludes the permit-less inspection — all agree with the ledger. No stale or synthetic status found for this chain.

## 3. Consolidated defect register (deduplicated)

### A. Chaincode-level — need a chaincode change + redeploy (report-only this round)

| ID | Defect | Root cause (file:line) | Evidence |
|---|---|---|---|
| M1 | **Inspected shipments can never reach customs** — the literal happy-path order (quality → permit → customs) dead-ends. H5/H6/H7 FAIL. | `chaincodes/coffee/quality.go:172` sets shipment INSPECTION_PENDING on inspection request; `chaincodes/coffee/permit.go:224-242` (`:236` `if shipment.Status != "CREATED"`) cascades only CREATED shipments to PERMIT_ISSUED; no quality function moves the shipment back; `SubmitCustomsDeclaration` requires PERMIT_ISSUED (`customs.go:276-278`). Only escape is the admin reconcile-status override (a bypass, not a workflow step). | W1b steps 16–20 (503, no declaration row); W2 ordering finding; W4 #8 (UI mechanism: ECTA Issue Permit is PG-only, `quality.ts:1222`, so the ledger `exportPermitNo` stays empty and the Customs guard can never pass). |
| A1/A2 | Suspended exporter can create contracts + forex requests | No licence check in `RegisterSalesContract` (`main.go:337`), `RequestForex` (`forex.go:108`), `routes/contracts.ts`, `routes/forex.ts`, `services/contractService.ts`. | W3b P4: CNT-ALN-PAY-…-SUSP 201, FX-ALN-PAY-…-SUSP 201 while licence SUSPENDED. |
| D1a | Repatriation requires status exactly SETTLED — CONFIRMED payments dead-ended | `chaincodes/coffee/repatriation.go:~160` (`InitiateRepatriation` guard). | W3b P7: initiate on CONFIRMED PAY_C1 → 500. Chaincode decision needed: accept SETTLED or CONFIRMED. |
| F-1 | `ResubmitRejectedContract` has no API route; peer-invoke resubmit leaves PG REJECTED | `chaincodes/coffee/main.go:1185` (function exists, ECTAMSP); no route invokes it; `statusManager.ts` only documents it. | W2 step 2d: ledger REGISTERED via peer CLI, PG stays REJECTED. |
| F-7 | **Re-submit after a REJECTED customs declaration is impossible** — shipment stuck CUSTOMS_REJECTED, no recovery path | `api/src/routes/customs.ts:717` — submit guard (`DECLARATION_EXISTS`, ~707-725) checks PG existence regardless of status. (Listed here because the fix is a product decision about the guard/amend endpoint, though the code is API-side.) | W2 step 5f, re-verified R3 5f on a clean REJECTED declaration. |
| — | Permit REVOKED unreachable by design | No cancel/revoke function in `chaincodes/coffee/permit.go` (Issue/Utilize/Settle/Read/Query only); EXPIRED/CANCELLED dead states. | W2 step 6a: all revoke/cancel routes 404. |
| — | Pre-shipment FAIL has no FAILED status | `RecordInspectionResults` sets COMPLETED with `overallResult: FAIL`. Any gate looking for FAILED finds nothing. | W2 step 4i. |
| — | Quality approve does not advance the shipment | `ApproveQualityInspection`/`PerformInspection` never touch shipment status. | W4 P4: shipment stays INSPECTION_PENDING after approval. |

### B. API-level, MSP signing race — one-line pins ready, NOT applied (need user go-ahead + rebuild + restart)

Root cause (shared): `api/src/server.ts:116-122` — the per-request Fabric MSP isolation middleware is DISABLED, so `fabricService.requestContext` is never established and unpinned invokes sign with whatever org the shared gateway last connected as (`fabricService.ts:99,640-645`). Commit `cb12f0b4` added the race-free `submitTransactionAs(mspId, …)` / `invokeChaincode(..., mspId?)` (`fabricService.ts:646-650, 2894-2900`) and pinned the rejection paths; the three below were never pinned. The trust-layer worker the same morning independently confirmed the race still live in general at HEAD `f258dc0e` (`~/pwtest/FABRIC-TRUST-REPORT.md`).

| ID | Defect | Fix (one line each, `cb12f0b4` precedent) | Evidence |
|---|---|---|---|
| B1 | SWIFT NBE approval (`NBE_APPROVED`) unreachable via API — 6 attempts, 0 successes | `invokeChaincode('NBEApproveSWIFTMessage', […], 'NBEMSP')` in `api/src/routes/swift.ts:618`. | W3b P2: "only NBE can approve SWIFT messages, got: BanksMSP" then "got: ECTAMSP". (Banks DRAFT→APPROVED directly is by design, `swift.go:691-739` — NBE gate optional.) |
| D1b | Repatriation initiate MSP race | `submitTransactionAs('BanksMSP', 'InitiateRepatriation', …)` in `api/src/routes/repatriation.ts:217-218`. | W3b P7 follow-up: "only a bank can initiate repatriation (caller MSP: ECTAMSP)" on a correct SETTLED payment. |
| E1/M5 | Post-delivery close signed as NBEMSP; PG COMPLETED while contract stays APPROVED on-chain | Pass `'ECTAMSP'` at `api/src/services/postDeliveryWorkflowService.ts:556` (close is ECTA-only, `routes/postDeliveryWorkflow.ts:368-371`). | W3b P8 + W1b step 46: 200 + `blockchainSynced:false`, warning "only ECTA and Admin can update contract status, got: NBEMSP". |
| Residual | Unpinned routes still race | Quality approve recorded `approvedByMsp:"NBEMSP"` for an ECTA-token approve (W2 O-2, W4 P4c). Audit-trail inaccuracy, not a status failure. | W2 step 4d; W4 P4c. |

**Deeper question for the user (E1):** whether a best-effort close that reports `blockchainSynced:false` should still mark PG COMPLETED. E2 (re-close returns 200, no idempotency guard, `postDeliveryWorkflowService.ts:506-600`) masks E1.

### C. API-level, other — open, not fixed this round

| ID | Defect | Root cause (file:line) | Evidence |
|---|---|---|---|
| M2/M3 | Freight booking mirror breaks land transport and regresses delivery | `api/src/routes/shipping.ts:464-488` unconditionally mirrors FREIGHT_BOOKED onto the shipment (PG `:475`, chain `:488`); `StartLandTransport` requires CUSTOMS_CLEARED exactly. Booking after delivery moved DELIVERED → FREIGHT_BOOKED on chain + PG. | W1b steps 22, 29b. Behavior decision needed (from-state check on booking, or booking must not mirror). |
| C1 | Settle succeeds against a REJECTED SWIFT message | `api/src/routes/payments.ts:716-870` treats `swiftReference` as free text; never reads the SWIFT message or checks its status. | W3b P2: PAY_C1 settled 200 while its SWIFT ref belonged to a REJECTED message. Product decision + API change. |
| F1 | NBE 60% release 500s on a SETTLED payment | `api/src/services/paymentService.ts:327+` `releasePayment` unconditionally calls `settleOnChain` → `SettlePayment` (`:360-375`), which chaincode rejects for an already-SETTLED payment. Fix sketch: settle only if VERIFIED/SWIFT_RECEIVED; when already SETTLED, proceed to the PG update. Also flagged (unverified): hardcoded `exchangeRate: '120.5'` at `paymentService.ts:~366` vs live 57.25. | W3b P7: release on SETTLED PAY_C4 → 500, PG unchanged. |
| M4 | Intermediate payment states have no PG mirror | `api/src/routes/payments.ts:358-761` (documents/verify/swift handlers) contain zero Postgres writes; PG stays PENDING until settle. Chain-only by the codebase's own pattern (mirrors only at initiate/settle). | W1b steps 35–38. No phantom (API 200s backed by real ledger entries); mirror-only gap. |
| F-8 | Honest failures returned as HTTP 500 instead of 4xx | Re-approve REJECTED contract (W2 2c), allocate from REJECTED forex (W2 3i), clear REJECTED declaration (W2 5d/R3 5d). Ledger/PG unchanged — honest, wrong code. | W2. |
| O-1/D5 | Shipment PG mirror goes stale after creation | PG `shipments.status` stays CREATED while the ledger moves (PERMIT_ISSUED / CUSTOMS_REJECTED / INSPECTION_PENDING). Quality-request route does not mirror the shipment status change to PG. | W2 O-1 (SHP-RV-1794464640-5 ledger CUSTOMS_REJECTED, PG CREATED); W1b D5; W4 (SHIP4 ledger INSPECTION_PENDING, PG CREATED). |
| O-3 | API returns lowercase `pending` for a REGISTERED contract | Minor status-string mismatch between API and ledger. | W2 step 2a. |
| O-5 | Same-class best-effort residuals NOT fixed | `customs.ts` complete-inspection route (~1884, best-effort mirror); `nbe.ts` retention-penalty (~609) and waiver-requests (~794, ~958) routes. | W2. |
| — | `GET /payments/initiate`-path payments have no PG row by design (not a defect) | `routes/payments.ts:75-189` invokes chaincode only; `payments` table written only by `/payments/record` and settle's best-effort UPDATE. List endpoint reads chaincode directly. | W3b method note 1; W1b F1 added the initiate mirror (see §4). |

### D. UI-level

| ID | Defect | Root cause (file:line) | Evidence |
|---|---|---|---|
| W4 #3 | **No Reject control for a REQUESTED LC** anywhere in the Banks portal | All LCs row has only View Details + Approve LC (`BanksPortal.tsx:6220-6243`); Details dialog has only Close. Only Reject-LC wiring (`:3280-3312`, `:5554-5605`) is reachable via `UnifiedPaymentWorkflow.tsx:761`, whose Reject button renders only for contract rows. | W4b P3a. (API reject works — W2 step 3b.) |
| W4 #4 | SWIFT list does not refresh after Approve — row still shows DRAFT until reload | `BanksPortal.tsx` SWIFT Messages tab (no refetch after approve). | W4b P3d (ledger already APPROVED at +4 s). |
| W4 #5 | Banks "Issue Export Permit" unreachable | Renders only on delivered-shipment cards (`BanksPortal.tsx:6490`), but `loadBankingData` overwrites the delivered list with only PAYMENT_RELEASED/SETTLED-LC shipments (`:905-921`). | W4b P6a (0 delivered shown; 2 DELIVERED on ledger). |
| W4 #1 | No resubmit control for a REJECTED contract; rejection reason not shown in Details dialog | `ECTAPortal.tsx` contract Details dialog (only Close). | W4b P2a-ii. |
| W4 #2 | No rejected-applications view — rejected applications vanish from Pending with nowhere to see them | `ECTAPortal.tsx` tab list (Pending / Approved Exporters / …; no Rejected/All view). KPI shows REJECTED 2 but no list. | W4b P2b-ii. |
| W4 #6 | ECTA reject dialogs give no progress feedback during a ~10–35 s chaincode round-trip | `ECTAPortal.tsx:1298-1342` (reject contract), `:1186-1231` (reject application). Form sits unchanged, looks stuck; success confirmation replaces it only after the round-trip. (CORRECTION: an interim note in this round called the dialogs "stuck with no toast" — that was a false positive from a +4 s observation; with a 30 s window they complete correctly.) | W4b P2a/P2b. |
| W4 #7 | ECTA "Issue Permit" is PG-only and its success dialog overstates the outcome | `ECTAPortal.tsx:2833` (`handleIssueExportPermit`); `api/src/routes/quality.ts:1222`. Sets PG PERMIT_ISSUED, writes nothing to the ledger (`exportPermitNo: ''`), no `export_permits` row; dialog claims "Customs declaration workflow has been automatically initiated" while 0 declarations are created. | W4b P4e. |
| U-1 | ECX lot detail shows misleading "No Blockchain Signatures Found" banner for an on-chain lot | Portal signature lookup does not find ECX lot transactions (not traced to a line in this round). | W2 UI (tx `fb0c52ee…` verified on ecta + banks). |
| — | NBE forex list is a full monitoring list, not REQUESTED-only pending | NBE Forex Monitoring mixes Allocated/Confirmed/Rejected/Requested. Whether a REQUESTED-only view exists elsewhere was not established. | W4b P7c (partial). |
| — | SWIFT compose dialog now closes on success | Known leftover FIXED in this form (form closes; confirmation dialog requiring OK remains). | W4b P3c. |
| — | ECX console error on portal load | `Abort fetching component for route: "/portals/ecx"` (Next.js chunk fetch; portal still renders). Every portal load logs one such error. | W4b P1; W4 notes. |

## 4. Fixes made in this round (local commits, NOT pushed)

| Commit | Change | Re-verification |
|---|---|---|
| `cb12f0b4` | Pin Fabric signing MSP per invoke on the rejection paths; forex-reject → 503 `FOREX_REJECT_FAILED` with no PG mirror; customs clear throws before PG mirror on chain failure. 10 files, +90/−37. | W2 run 3 (ECTA reject 200, was 500 as BanksMSP; forex reject `blockchainSynced:true`) + R3 5d. API rebuilt + restarted ~06:22. |
| `f258dc0e` | NBE forex-confirm → 503 `FOREX_CONFIRM_FAILED`, no PG mirror (`nbe.ts:160`); customs submit → 503 `CUSTOMS_SUBMIT_FAILED`, no PG insert (`customs.ts:766`); customs review → 503 `CUSTOMS_REVIEW_FAILED`, no PG update (`customs.ts:1695`); inspection schedule/reject → 400 `VALIDATION_ERROR` on missing fields (`inspection.ts:309,497`). 3 files, +97/−35. | W2 R1 (3j → 503, PG REJECTED; control still 200 CONFIRMED), R2 (4j → 200 REJECTED on ledger; validation 400s), R3 (5b/5c/5d/5e honest), S503 (submit for CREATED shipment, no permit → 503, no PG row, no ledger entry). API rebuilt + restarted ~06:22:41. |
| `af0f6e39` | Mirror payment initiate + phyto issue to Postgres (ledger-first, best-effort): `POST /payments/initiate` now INSERTs the `payments` row (`routes/payments.ts` ~190); phyto issue now UPDATEs PG to ISSUED on the chain-success branch (`routes/phytosanitary.ts` ~407). 2 files, +31. | W1b run-2 full driver re-run (rows 32, 33, 39 flipped NO-ROW → PASS). API rebuilt (tsc clean) + restarted ~06:49. |

Total unpushed commits on `features`: 12 (remote still `0c13b72d`). **Pushing needs the user's explicit approval — none given in this round.**

## 5. Blocked steps (with reason — not failures)

| Step | Reason |
|---|---|
| Applicant login, positive path | Temp password is random, bcrypt-hashed, email-only (email unconfigured) — cannot be scripted. Carries over from every prior round. |
| UI re-checks (ECTA rejected-contract pagination, Banks LC/forex/permit rows, Customs declaration row, phyto REVOKED row) | Login rate limiter: `POST /auth/login` → 429 `TOO_MANY_LOGIN_ATTEMPTS`, 15-min window, shared across workers on one VM IP. Needs a quiet 15-min window, not a code fix. |
| LC EXPIRED row in Banks UI; settled-payment row in Banks UI | Pagination (All LCs 5/page over 86, no search box found) / no Banks tab lists initiate-path payments. |
| Customs reject via UI (W4b P5b) | No SUBMITTED declaration can exist for an inspected shipment in this build (consequence of M1/#8) — not a UI defect. |
| §9 OVERDUE read-time quirk (stored vs read status) | Unverifiable — no live repatriation record exists (initiate never succeeded, D1). |
| Permit utilize (W2 6b) | Informational 400, no verdict recorded. |
| NBE retention-policy submit | Intentionally not exercised (would supersede the live 40% policy). |

## 6. Polluted rows left behind (reported, NOT cleaned up)

| Table | Row | PG status | Ledger status | Cause |
|---|---|---|---|---|
| `forex_allocations` | `FX-ALN-REJ-1794464066-3B` | CONFIRMED | REJECTED | F-2 phantom (pre-fix); fix prevents recurrence, does not repair the row. |
| `customs_declarations` | `DEC-ALN-REJ-1794464066-5` | UNDER_INSPECTION | does not exist | F-4 + F-5 phantoms (pre-fix). |
| `shipments` | `SHP-RV-1794464640-5`, `SHP-ALN-REJ-1794464066-4` | CREATED | CUSTOMS_REJECTED / INSPECTION_PENDING | O-1 stale mirror (pre-existing class). |

## 7. Decisions needed from the user (in recommended order)

1. **Apply the three one-line MSP pins?** B1 (`swift.ts:618` → `'NBEMSP'`), D1b (`repatriation.ts:217-218` → `submitTransactionAs('BanksMSP', …)`), E1 (`postDeliveryWorkflowService.ts:556` → `'ECTAMSP'`). Each needs a dist rebuild + API restart; the workers deliberately did not apply them while siblings tested against the shared API. Also decide the E1 policy question: should a best-effort close that reports `blockchainSynced:false` still mark PG COMPLETED?
2. **M1 — the inspected-shipment dead-end (chaincode):** quality sets INSPECTION_PENDING, the permit cascade only advances CREATED, customs requires PERMIT_ISSUED. Fix options: permit cascade accepts INSPECTION_PENDING (or APPROVED-inspection) shipments; or quality approve moves the shipment back to a permit-eligible state; or the workflow order is officially permit-before-inspection. Needs a chaincode change + redeploy (v2.3/seq 4 on this VM; seq 22 on the Docker host).
3. **F-7 — customs re-submit after rejection:** allow a new declaration when the existing one is REJECTED, or add a resubmit/amend endpoint; and let the shipment leave CUSTOMS_REJECTED.
4. **M2/M3 — booking mirror:** add a from-state check to booking-create (e.g. only from CUSTOMS_CLEARED, and never regress DELIVERED), or stop mirroring FREIGHT_BOOKED onto the shipment.
5. **C1 — settle vs REJECTED SWIFT:** should settle read the SWIFT message and refuse unless APPROVED?
6. **A1/A2 — suspended exporter:** should contract/forex creation check `LicenseStatus == ACTIVE` (chaincode + API)?
7. **D1a — repatriation from CONFIRMED:** accept SETTLED or CONFIRMED in `InitiateRepatriation`?
8. **F1 — NBE 60% release:** settle-only-if-VERIFIED/SWIFT_RECEIVED fix sketch (also verify the hardcoded `120.5` rate).
9. **F-1 — contract resubmit:** add an API route for `ResubmitRejectedContract` + PG mirror, and/or expose the `supersedesContractID` correction in the ECTA UI.
10. **M6 — flagship script:** add a permit-issue step between quality-approve and customs-submit (and quality perform/approve, which it skips).
11. **Push?** 12 local commits, HEAD `af0f6e39`, remote `0c13b72d` — push needs explicit approval.

## 8. Evidence index

- Worker reports: `~/pwtest/alignment/W1-happy-handoffs.md`, `W2-rejections.md`, `W3-payment-ends.md`, `W4-ui-alignment.md`
- Drivers/logs: `~/pwtest/alignment/` (`w1b-*`, `w2-*`, `w2b-*`, `w3b-*`, `w4*`, `suite-*.log`, `W*-results*.txt`)
- Screenshots: `~/pwtest/alignment-shots/` (`w1b-*`, `w2-*`, `w2b-*`, `w3b-*`, `w4-*`, `w4b-*` — 75+ shots)
- Reference maps: `~/workspace/GoCBC/TEST-WORKFLOW-MAP.md`, `TEST-STATUS-MATRIX.md`, `TEST-PORTAL-HANDOFFS.md`
- Related: `~/pwtest/FABRIC-TRUST-REPORT.md` (MSP race, same morning), `~/pwtest/ledger-proof/LEDGER-PROOF-REPORT.md`
- Stack healthy at finish: API `/health` 200 (database+blockchain true), UI `/login` 200, HEAD `af0f6e39`, working tree clean of tracked modifications (untracked run artifacts only).
