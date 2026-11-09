# REM7 live verification — remaining-7 fixes + lot-reject path

Run `REM71730` (2026-11-09 ~17:30 EAT) against the rebuilt local environment:
PostgreSQL 16.15 (fresh `cecbs` DB, 54 migrations applied incl. new 063 + 064),
API on port 3001 (`/health` 200, database:true, blockchain:true — gateway
initialises, chain calls fail honestly with peer errors), UI on port 3000 (200).
Fresh test users `test_<role>_TMW977G36` (all 8 roles + suspended; password only
in `/tmp/cecbs-test-users.txt`). No Fabric network here, so every chaincode-only
step is marked STATIC-ONLY and was never claimed as proven on-chain.

Seed rows are namespaced `REM71730` (payments PAY-REM71730-A/B/C, quality
Q-REM71730-1..5, lots LOT-REM71730-OK/REJ, shipment SHP-REM71730-1). Raw
request/response log: `/tmp/rem7-output.txt`, `/tmp/rem7b-output.txt`
(harness scripts `/tmp/rem7-test.sh`, `/tmp/rem7b-test.sh`).

## Per-item verdicts

### #8 Payments dual machine — VERIFIED LIVE (PG side)
- R-20 `GET /payments/PAY-REM71730-A` → 200, body carries both
  `status: "VERIFIED"` and `retention_status: "RECEIVED"`.
- R-21b `POST /payments/PAY-REM71730-B/release` (row: status VERIFIED,
  retention RELEASED) → **400 `ALREADY_RELEASED`**. The guard reads
  `retention_status`: a status-based guard would not have fired, because the
  settlement status is still VERIFIED. This is the decisive live proof the
  split works.
- R-23 `GET /portals/nbe/dashboard` → 200, `retentionConversions: 1`
  containing PAY-REM71730-A (retention RECEIVED). The NBE query reads
  `retention_status`.
- R-22 settle on PAY-REM71730-A → 404 "Payment not found": the settle route
  is chain-first (`ReadPayment` on-chain) so it cannot run without peers —
  BLOCKED, pre-existing design, not a regression. The PG row was verified
  unchanged afterwards (VERIFIED/RECEIVED) — no clobber on the failed path.
- DB after all steps: A VERIFIED/RECEIVED, B VERIFIED/RELEASED,
  C SETTLED/RELEASED — the backfill/split holds.
- First-round R-21 returned 400 `VALIDATION_ERROR` only because the test
  body was `{}` (the route validates `exporterID` + `amount` before the
  guard); re-run with a valid body gave the `ALREADY_RELEASED` above.

### #12 Fail-open validateTransition — VERIFIED LIVE
- R-01 SHIPMENT CREATED → SETTLED → `isValid: false` (was true before the
  fix — the fail-open case).
- R-02 SHIPMENT CREATED → FREIGHT_BOOKED → `isValid: true`.
- R-03 unknown entity FOO → `isValid: false`, `allowedNextStatuses: []`.
- R-04 unknown current status BOGUS → `isValid: false`.
- R-05 EXPORTER SUSPENDED → ACTIVE → `isValid: true` (new table).
- R-06 EXPORTER REVOKED → ACTIVE → `isValid: false`.
- R-07 PAYMENT VERIFIED → SETTLED → `isValid: true`.

### #14 Duplicate handlers — VERIFIED LIVE
- R-10 `POST /customs/declarations/<id>/clear` → **404** `NOT_FOUND`
  ("Route … not found") — the plural clear route is gone.
- R-11 `POST /contracts/approve` (body form) → **404** "Route … not found".
  R-11b `POST /contracts/CONTRACT-REM71730/approve` → 404 "Contract not
  found" — the canonical param route exists and is the only approve.
- R-12 `PUT /shipments/<id>/status` without token → **401**. (Note: the
  `/shipments` mount already carries `authMiddleware`, so the route-level
  addition is hardening, not a behaviour change.)
- R-13 POST quality approve on seeded INSPECTED row → 200 APPROVED
  (`certificateNo`, `blockchainSynced: false` with the honest peer error).
- R-14 PUT quality approve → 200 APPROVED (`certificateNumber`).
- R-15 POST quality reject → 200 REJECTED. R-16b PUT quality reject (with
  `rejectionReason`) → 200 REJECTED. (First-round R-16 sent `remarks`/
  `reason` and got 400 `VALIDATION_ERROR` — the PUT validator requires
  `rejectionReason`; test-script bug, not a code bug.)
- DB: Q-REM71730-1 APPROVED, Q-2 APPROVED, Q-3 REJECTED, Q-4 REJECTED.
- Payments settle/release share `settleOnChain` (code-verified); the live
  settle call is BLOCKED per R-22 above and the release call reaches the
  guard (R-21b) before any chain call.

### #16 Licence/lot/DRAFT decisions — VERIFIED LIVE (table + route gate)
- R-05/R-06 above: the EXPORTER table is live in the validator
  (SUSPENDED → ACTIVE allowed, REVOKED → ACTIVE rejected).
- R-30 `PUT /exporters/EXP-NONEXISTENT-REM71730/status` (ECTA) → 404 with
  the chain-query error: the route now reads the licence from the ledger
  before validating. The 400 `INVALID_TRANSITION` path itself needs a real
  on-chain exporter, so it is STATIC-ONLY.
- REJECTED lots terminal: LOT-REM71730-REJ stays REJECTED with no re-entry
  route (see lot-reject section); DRAFT remains UI-only (no route writes it).

### #17 RecordCADPayment guard — VERIFIED LIVE (role gate); STATIC-ONLY (chain guard)
- R-40 `POST /banking/cad/CAD-REM71730/payment` as ECTA → **403**
  "Required role: BANKS or BANK_ADMIN. Your role: ECTA".
- R-41b same call as BANKS with a valid body → 400 `CAD_PAYMENT_FAILED`
  with the honest peer errors — the role gate and validation pass and the
  call reaches the chaincode invocation. The on-chain BanksMSP + from-state
  guard is STATIC-ONLY (needs v2.3/seq 22 redeploy + a peer).

### #18 Inspection key namespaces — VERIFIED LIVE (PG/API side); STATIC-ONLY (ledger keys)
- R-50b `POST /quality/inspections` (full body) → 200 PENDING
  (`couchdbSynced: false`, PG row saved). DB: Q-REM71730-5 PENDING.
  (First-round R-50 sent an incomplete body and got 400 — test-script bug.)
- R-51 `GET /inspection/` → 500 with the honest chain error: the
  pre-shipment list is chain-sourced, so no quality row can leak into it
  from Postgres. The `PREINSPECTION_` key separation itself is STATIC-ONLY.
- Quality approve/reject (R-13..R-16b) all operate on `INSPECTION_` keys
  and work unchanged.

### #19 Booking dual-row shape — VERIFIED LIVE (full lifecycle)
- R-60b `POST /shipments` → **202 CREATED** (`blockchainSynced: false`).
  (First-round R-60 omitted `exporterID`/`quantity` and got 400.)
- Booking create → 200 `BOOKED` with all five previously-dropped fields
  persisted (vessel `MV REM71730`, voyage `VYG-REM71730`, `20FT`, 2
  containers — verified in `shipping_bookings`, not just the response).
- R-62 `GET /shipping/bookings` → 200, only bookings (bare `BOOK-…` ids,
  real `shipmentId`), no shipment rows leaked. Follow-up fix found live:
  the response carried only a two-value `bookingStatus` display label, so
  the raw lifecycle `status` is now included too — re-verified: the list
  shows `status: BOOKED` / `status: DELIVERED` next to
  `bookingStatus: PENDING`.
- R-63 lifecycle on `BOOK-0000` → **404** "Booking not found" (was a
  phantom 200).
- R-64 booking without `shipmentID` → **500** NOT NULL violation
  (documented behaviour change — previously succeeded with a warning).
- Full lifecycle on `BOOK-1794245551618` (all 200, both rows read back
  from Postgres after each step):
  load → booking LOADED / shipment LOADED;
  depart → IN_TRANSIT / IN_TRANSIT;
  arrive → ARRIVED / ARRIVED;
  deliver → DELIVERED / DELIVERED.
- Final DB check: `shipments` has **0** `BOOK-%` rows. The one pre-existing
  phantom row from the earlier environment does not exist in this fresh DB
  (migration 064's move step ran on an empty table — the move itself was
  already syntax-checked in a rolled-back transaction against the old DB).

## Lot-reject path — VERIFIED LIVE (API + PG); browser re-check still owed
- R-70 `POST /ecx/lots/LOT-REM71730-OK/reject` as EXPORTER → **403**
  "Required role: ECX or ECX_ADMIN".
- R-71 same call as ECX → 400 `REJECT_FAILED` with honest peer errors
  (no peers). DB afterwards: LOT-REM71730-OK still **WAREHOUSED** — no
  phantom PG mirror on chain failure.
- R-72b `GET /ecx/lots` → 200 (PG fallback, `source: database`):
  LOT-REM71730-REJ present with `"status": "REJECTED"` and
  `"rejectionReason": "Moisture 13.5% exceeds 12% limit"` — the ECX
  portal's Rejected filter reads this list, so the data it needs is there.
- R-73b grade at 13.5% moisture (full body) → 400 `GRADE_FAILED` with
  peer errors — the call reaches `GradeECXLot` instead of the old
  `MOISTURE_EXCEEDED` 400 (LOTREJ1 re-confirmed).
- R-74 `POST /ecx/lots` (create) → 400 `INTAKE_FAILED`: "Cannot read
  properties of undefined (reading 'toString'). Transaction outcome is
  unknown; check transaction 852b66bc…". **Finding (pre-existing, not
  introduced here):** when the Fabric submit fails with no peers, the
  create route's error path surfaces a JS TypeError from inside
  `fabricService` (`fabricService.ts:833` — the "outcome unknown" branch).
  The reject and grade routes return the clean peer error for the same
  failure, so this is specific to the create/submit path. It is
  dev-mode-only in effect (with live peers the submit succeeds) and was
  NOT fixed here — fixing Fabric commit handling without peers to test
  against is out of scope. The lot-reject verification used a seeded lot,
  as the task allows. Needs a live-peer check on the Docker host.
- Browser check not done in this run (no live browser in this session):
  the ECX portal's Rejected filter/card still needs a browser re-click
  with the seeded REJECTED lot present.

## Environment notes (this run)
- VM replacement #3 wiped the environment again; rebuilt from scratch:
  `apt-get update` was timing out at 240s because `ubuntu.sources` listed
  a second, near-dead mirror (`mirror.cogentco.com`) — removed it, update
  now takes ~10s. PostgreSQL 16.15 installed, cluster started manually
  (`pg_ctlcluster 16 main start`; systemd auto-start is denied here).
  Fresh `/tmp/cecbs-api.env` (new JWT secret, PORT 3001) and fresh test
  password (only in `/tmp/cecbs-test-users.txt`, chmod 600).
- Builds re-verified after the final edit: api `tsc --noEmit` clean,
  `npm run build` passes; ui `tsc --noEmit` clean, `next build` passes
  (from the earlier round, no UI code changed since); chaincode
  `go vet` + `go build` clean (Go 1.22.2 at `~/go1.22.2`).
- The tracked `chaincodes/coffee/coffee` binary was rebuilt by `go build`
  and restored (`git checkout`) so the commit does not include it.
- Test data namespaced REM71730; the API and UI were left running
  (API pid 9624 on 3001, UI on 3000).
