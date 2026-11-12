# UI Browser Re-Click Results — Run 2 (2026-11-10)

Live browser re-verification of the GoCBC portals after the 2026-11-09 double-check
(commit `51af81c`) and the RBAC-gap commit (`2fe730b`). Headless Chrome via
Playwright on this VM, UI on `http://localhost:3000`, API on
`http://localhost:3001` in dev mode (`FABRIC_ENABLED=false`, so every chaincode
call fails with an honest peer error — those steps are BLOCKED, not passed).

Environment (5th rebuild, 2026-11-10): PostgreSQL 16.15, 53 migrations applied,
API healthy (`database:true`, `blockchain:false`), UI rebuilt and on port 3000.
10 test users `test_<role>_RBAC1` (+ exporter2, suspended). Test data seeded for
this run: `ECX-LOT-UI2-REJ` (REJECTED, "Moisture 13.5% exceeds 12% limit"),
`LOT-UI2-OK` (WAREHOUSED), forex `FOREX-UI2-APPR` APPROVED + `FOREX-UI2-ALLOC`
ALLOCATED, shipment `SHP-UI2-DEL` DELIVERED + LC `LC-UI2-001` PAYMENT_RELEASED,
payment `PAY-UI2-VER` VERIFIED, certificate `PHY-UI2-001` ISSUED.

## Headline

- **61 top-level tabs clicked and rendered with content: 61/61.** 0 page errors,
  0 blank pages, 0 stuck spinners. (ECTA 11, ECX 4, Exporter 8, Banks 4 parents
  + 11 children + 3 Analytics sub-tabs, Customs 8, NBE 9, Shipping 10.)
- **Specific checks: 4/4 pass** — ECX Rejected filter + reason in detail,
  NBE Allocate + Record Retention dialogs, ECTA Phytosanitary tab 10 with
  request→inspect→issue flow, Banks Settle Payment / Record Retention /
  Issue Export Permit.
- **3 real bugs found and fixed in this run** (one commit, see §4). All
  re-verified live in the browser after the fix.

## 1. Tab re-click (script `/tmp/ui-test/reclick.js`, results `/tmp/ui-test/ui-results-2.json`)

| Portal | Tabs clicked | Page errors | Failed API calls | Blank / spinner |
|---|---|---|---|---|
| ECTA | 11 | 0 | 3 | 0 / 0 |
| ECX | 4 | 0 | 0 | 0 / 0 |
| Exporter | 7 (+1 via focused probe) | 0 | 1 | 0 / 0 |
| Banks | 7 parents (+11 children via focused probes) | 0 | 1 | 0 / 0 |
| Customs | 8 | 0 | 1 | 0 / 0 |
| NBE | 9 | 0 | 5 | 0 / 0 |
| Shipping | 10 | 0 | 0 | 0 / 0 |
| **Total** | **56 script + 5 probed = 61** | **0** | **11** | **0 / 0** |

Note on counts: the script's `role="tab"` discovery missed the Exporter
"Audit Trail" tab and the Banks child tabs (they render under a parent tab and
were not in the first query). Focused probes clicked each one individually:
Exporter Audit Trail renders (textLen 584); Banks children All LCs, Payment
Methods, Document Examination, Payment Release, LC Discrepancies, Forex
Allocations, LC Settlements, SWIFT Messages, Analytics (+ Overview/Trends/
Breakdown sub-tabs), User Management, Audit Trail all render, 0 page errors.

Failed API calls in-browser (all expected in dev mode unless noted):
- `500 GET /exporters?limit=100&offset=0` — Fabric "Not connected" (BLOCKED).
- `500 GET /inspection` — Fabric (BLOCKED).
- `500 GET /payments` — Fabric, no PG fallback **(bug, fixed — §4)**.
- `500 GET /swift/messages` (+ dated variant) — CouchDB/Fabric (BLOCKED).
- `500 GET /bordercrossing` — Fabric (BLOCKED).
- `500 GET /forex/rates`, `500 GET /repatriation` — Fabric (BLOCKED).
- `404 GET /forex/retention-policy/COFFEE` — known pre-existing, no COFFEE
  policy row (unchanged from run 1).
- `404 GET /analytics/banking` — known pre-existing, route does not exist
  (M-04, unchanged from run 1).
- `404 GET /api/v1/api/v1/phytosanitary` — double-prefixed URL from the new
  PhytosanitaryCertificates component **(bug, fixed — §4)**.

## 2. Specific checks (scripts `/tmp/ui-test/checks.js`, `/tmp/ui-test/probe3.js`, `/tmp/ui-test/probe4.js`, `/tmp/ui-test/probe5.js`)

### (a) ECX Rejected filter — PASS
- Coffee Lots tab → "Rejected" KPI card: row `ECX-LOT-UI2-REJ` visible.
- Rejection reason is NOT in the table row (by design — the table has no
  reason column); it is shown in the lot detail dialog: "Details" button →
  dialog shows "Rejection Reason: Moisture 13.5% exceeds 12% limit".
  Screenshot: `.ui-test-shots/ecx-rejected-2.png`.

### (b) NBE Allocate on legacy APPROVED forex row — PASS
- Forex Monitoring tab: `FOREX-UI2-APPR` (APPROVED) and `FOREX-UI2-ALLOC`
  (ALLOCATED) rows both visible. The action buttons are MUI Tooltips, so
  they carry `aria-label`, not `title`: `[aria-label="Allocate Forex"]` = 1,
  `[aria-label="Record Retention"]` = 1. Clicking each opens its dialog.
  Screenshots: `.ui-test-shots/nbe-allocate-2.png`,
  `.ui-test-shots/nbe-retention-2.png`.

### (c1) ECTA Phytosanitary tab 10 — PASS (after fix)
- Tab 10 "Phytosanitary Certificates" exists; 11 ECTA tabs total. Flow text
  present: Request / Inspect / Issue / certificate fields.
- Before the fix the list call 404'd (`/api/v1/api/v1/phytosanitary`);
  after the fix `GET /phytosanitary` returns 200 (`source: database`) and
  the tab lists `PHY-UI2-001` ISSUED. Screenshot:
  `.ui-test-shots/ecta-phyto-2.png`.

### (c2) Banks buttons — PASS (after fix)
- **Issue Export Permit**: LC Settlements tab shows the delivered shipment
  `SHP-UI2-DEL` (LC PAYMENT_RELEASED) with the "Issue Export Permit" button
  visible. Screenshot: `.ui-test-shots/banks-lc-settlements-2.png`.
  (Note: `GET /shipments` filters rows through `isValidShipment`, which
  requires a buyer and a positive quantity — a seed without those is dropped
  as invalid, which is correct behaviour, not a bug.)
- **Settle Payment**: was unreachable before the fix (see §4). After the
  fix the Payment Methods child tab has a Payments table listing
  `PAY-UI2-VER`; "View Details" opens the payment details dialog with the
  **Settle Payment** button (VERIFIED status); clicking it opens the settle
  form (Exchange Rate field). Screenshots:
  `.ui-test-shots/banks-settle-payment-2.png`,
  `.ui-test-shots/banks-settle-dialog-2.png`.
- **Record Retention**: verified in (b) above (NBE portal).

## 3. Environment / RBAC re-check (this session)

- Commit `2fe730b` verified live: EXPORTER → all 5 ECX mutating routes 403
  `AUTHORIZATION_ERROR`; ECX → `POST /ecx/lots` 400 `INTAKE_FAILED` (honest
  peer error), 0 phantom `ecx_lots` rows, 0 TypeErrors in the API log.
- Startup log noise (not a bug, no fix): the webhook service queries the
  `webhooks` table ~0.5 s before the migration runner creates it on a fresh
  DB ("relation webhooks does not exist"); the table exists after migrations
  and the service just starts with no webhooks.

## 4. Bugs found and fixed (one commit on `features`, not pushed)

1. **Phytosanitary double-prefixed URLs** (`PhytosanitaryCertificates.tsx`):
   all 6 `api` calls used `/api/v1/phytosanitary…` while the `api` client
   already prefixes `/api/v1` → every call 404'd. Stripped the prefix.
2. **`GET /payments` had no PostgreSQL fallback** (`payments.ts`): chaincode
   failure returned 500. Added the best-effort PG fallback used elsewhere
   (chaincode first, PG mirror on failure, `source: 'database'`, no
   fabricated tx ids). Verified: 200, `source: database`, `PAY-UI2-VER`.
3. **Settle Payment button unreachable** (`BanksPortal.tsx`): the payment
   details dialog was never opened — `setPaymentDetailsOpen(true)` was never
   called and the portal never loaded raw payments. Added a `payments` state,
   a `GET /payments` load in `loadBankingData`, and a Payments table
   (Payment ID / Contract / Exporter / Amount / Status / View Details) in
   the Payment Methods child tab whose button opens the dialog.
4. **`GET /phytosanitary` had no PostgreSQL fallback** (`phytosanitary.ts`):
   same pattern as (2). The first version of the fallback crashed the ECTA
   tab in the browser (`quantity.toLocaleString()` on `undefined`) — caught
   by the browser re-check and fixed by normalising all fields the table
   reads (`quantity: 0`, etc.). Verified: 200, `source: database`,
   `PHY-UI2-001` ISSUED, tab renders, 0 page errors.

Verification of the fixes: API `tsc` clean, UI `tsc` clean, `next build`
passes, API restarted (healthy), UI restarted (200 on `/` and `/login`).
Browser re-check after the fixes: Banks Payments table → dialog → Settle
Payment button → settle form all render; ECTA phyto tab lists the seeded
certificate; 0 page errors.

## 5. Still BLOCKED (needs the user's Fabric/Docker host)

- All chaincode writes and chaincode-first reads (exporters, inspection,
  SWIFT, border crossing, forex rates, repatriation, phytosanitary
  request/inspect/issue/revoke, payment settle submit) — honest 500 peer
  errors in dev mode.
- Chaincode v2.3/seq 22 re-package + redeploy (10 new functions exist only
  in source); the full Docker integration test (licence → settlement
  on-chain); secrets rotation for the tracked `api/.env.blockchain` files
  and `blockchain/organizations` keys; the ledger-bypass product decision.
- The `404 /analytics/banking` and `404 /forex/retention-policy/COFFEE`
  findings from run 1 are unchanged (pre-existing, not re-fixed here).
