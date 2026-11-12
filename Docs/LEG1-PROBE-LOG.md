# LEG 1 — form→API audit: live probes of the CURRENT (broken) behaviour

Probed 2026-11-12 ~17:04–17:09 EAT against the running stack
(API http://localhost:3001, main-repo code at HEAD a08922e7, chaincode
coffee v2.3 seq 7). Fixtures created by these probes are prefixed LEG1
and live in the shared dev database; the coordinator may reuse them for
the post-fix probes (see "Post-fix probes" in the final report).

## F1 — resubmit by APP-… id
- Register: POST /exporters/exporter-applications → 201,
  applicationId `APP-1794503079388-T4CMZ3`.
- Reject as ecta_admin → 200, status rejected.
- Check endpoint: GET /exporter-applications/check/<email> → 200 but only
  10 columns (id, application_id, company_name, email, status,
  submitted_at, rejection_reason, approved_at, license_number,
  exporter_id). No phone/tin/bank fields — the resubmit form loads blank.
- Resubmit as ECTA:
  `POST /exporters/exporter-applications/APP-1794503079388-T4CMZ3/resubmit`
  → **HTTP 500** `{"success":false,"error":{"code":"RESUBMIT_FAILED"}}`.
  API log: `invalid input syntax for type integer:
  "APP-1794503079388-T4CMZ3"` (PG 22P02) — the lookup passes the APP-…
  string to the numeric `id` column (exporters.ts, resubmit handler).
  The audit said 404; live it is a 500.

## F2 — capital minimums ignored server-side
- Register with capitalRequirement 100, exporterType individual
  (UI minimum 10,000,000 ETB) → **201 created**,
  applicationId `APP-1794503214966-4N6CV1`. The minimum is UI-only.
- Same registration response shows `emailDelivery: "failed"` and
  credentials.username — both are discarded by the UI success screen,
  which instead shows an invented `APP-<Date.now()>`.

## F3 — contract trade fields dropped
- POST /contracts (ECTA) with buyerEmail, buyerPhone, organicCertified,
  fairTradeCertified, portOfLoading, portOfDestination, deliveryDate,
  incoterm, specialInstructions → **201**, blockchainSynced true,
  contract `CONTRACT-LEG1-1794503118`.
- PG row: organic_certified `f`, fair_trade `f`, ports/delivery/incoterm/
  instructions all empty. Ledger record (GET /contracts/:id, source
  blockchain): none of the 9 fields present.
- PATCH same contract with the 5 trade fields → **200**
  "Contract updated successfully". PG updated; ledger still has none of
  the fields — ledger diverges.

## F4 — contract resubmit is ECTA-only
- `POST /contracts/CONTRACT-LEG1C-1794503256/resubmit` as EXPORTER
  (exporter1) → **403** `{"code":"FORBIDDEN","message":"Only ECTA users
  can resubmit sales contracts"}`. Fixture contract is REJECTED in PG
  and on the ledger (rejected via the actionable-feedback format
  `Field to correct: …\nRequired change: …`).

## F5a/F5b — forex request
- POST /forex/request as EXPORTER → **403** FORBIDDEN (requires BANKS
  family). No exporter forex form exists in ExporterPortal.
- POST /forex/request as BANKS with lcId `LC-LEG1B-1794503178` → **201**,
  forexId `FOREX-LEG1B-PROBE`. PG row: **lc_id empty** (NULL) — the
  route drops lcId and its INSERT has no lc_id column.

## F5c — confirm mirror misses LC-issue rows
- PG: 39 forex_allocations rows have
  `allocation_id = forex_id || '-ALLOC'` (auto-created by LC issue,
  banking.ts). The confirm route UPDATEs
  `WHERE allocation_id = $forexId`, which matches **0 rows** for those.

## F6a — LC request banks/fields
- Approved CAD contract `CONTRACT-LEG1B-1794503178` (no auto LC
  handoff for CAD), then POST /banking/lc/request with 17 fields
  (bankName=CBE/advising, issuingBank=Deutsche Bank AG,
  beneficiary, terms, transportMode, ports, dates, …) → **201**,
  `LC-LEG1B-1794503178`.
- PG row: issuing_bank = **Commercial Bank of Ethiopia** (the advising
  bank — wrong), advising_bank empty, beneficiary empty, terms empty.
- Ledger LC: issuingBank/advisingBank correct (auto-mapped from the
  contract), but beneficiary `''`, terms `''`.

## F6b — LC issue auto-forex
- POST /banking/lc/LC-LEG1B-1794503178/approve (bank) → 200.
- POST /banking/lc/LC-LEG1B-1794503178/issue `{terms}` → **200**,
  LC ISSUED. Auto-created forex `FOREX_LC-LEG1B-1794503178_REQUEST`
  (deterministic scheme) with allocation_id `…-ALLOC`.
- The other issue route (POST /banking/lc/issue via LCService) uses
  `FOREX-${Date.now()}` — the two schemes diverge (code).
- The "auto-forex failure only logs a warning" path could not be
  triggered live (getLC succeeded); it is code-verified.
- Banks LC Terms dialog: already review-only with an explanatory
  banner and only a Close button (side-chat fix); its fields are still
  editable inputs — made read-only by this leg.

## F7 — approval IDs
- PG: no unique constraint/index on
  exporter_applications.license_number or exporter_id (only the
  application_id key). No duplicate licence numbers exist yet in data,
  but nothing prevents them.
- ECTAPortal generateApprovalData invents `EXP` + 7 random digits and
  `ECTA-LIC-<year>-<3 digits>` (900 possibilities/year) client-side.

## F5e — exchange rates
- GET /exchange-rates/history → **404**
  `{"code":"CURRENCY_NOT_FOUND","message":"Exchange rate for history
  not found"}` — /history is defined after /:currency and matches it.
- GET /exchange-rates → 200 from the ledger (real rates exist, so the
  hardcoded USD 162.49 fallback is not exercised live); the fallback
  code path is verified by reading exchangeRates.ts:18-90.
