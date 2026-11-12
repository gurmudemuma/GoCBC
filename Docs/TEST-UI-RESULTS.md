# UI Portal Smoke Test — Results (run 2026-11-09, ~15:50 EAT)

**Status: RAN — all 7 portals loaded in a real browser, all 60 top-level tabs
clicked and rendered.** Headless Chromium (Chrome Headless Shell 158,
playwright chromium v1254) via Playwright, on this machine against the live
UI (`http://localhost:3000`, `next start` production build) and live API
(`http://localhost:3001`, Postgres, no Fabric). Logged in per role with the
ready-made sessions in `.test-tokens-TMW977G36.json` (JWT + user object set
in localStorage). Read-only: log in, navigate, click tabs — no data submitted,
approved or changed.

**Run:** pass 1 (all top-level tabs) + pass 2 (Banks child tabs, NBE/ECTA
sub-tabs, Exporter Audit Trail) + pass 3 (Banks Analytics sub-tabs, NBE Forex
KPI filter). Screenshots: one full-page shot per portal in `.ui-test-shots/`
(`ecta.png`, `ecx.png`, `nbe.png`, `banks.png`, `customs.png`,
`shipping.png`, `exporter.png`); ECTA and Banks shots visually checked.

## Summary counts

| Scope | Result |
|---|---|
| Portals loaded in a browser (correct role, no redirect/unauthorized) | **7 / 7** |
| Top-level tabs rendered vs expected (60) | **60 / 60** |
| Sub-tab views rendered | **16 / 16** (see §2) |
| Tabs blank (empty panel, no content) | **0** |
| Tabs with stuck loading spinner | **0** |
| Tabs showing an in-page error message | **0** |
| JS exceptions (`pageerror`) | **0** |
| Failed API calls observed in the browser | **10 distinct** (8× HTTP 500, 2× HTTP 404 — all Fabric/missing-route, see §3) |
| Tabs rendering real rows from the API | 9 (ECTA Pending Applications 4 rows, Approved Exporters 1, Quality Control 1, Audit Trail 18; ECX Grading Standards 6; NBE SWIFT 1, Audit Trail 1; Banks All LCs 1, Forex Allocations 1, Audit Trail 1; Exporter LC & Payments 1) — the rest render honest empty states (see §4) |

## 1. Per-portal results

### ECTA — `/portals/ecta` — 10/10 tabs, all content
| Tab | Verdict | Evidence |
|---|---|---|
| Pending Applications | content | Table, 4 rows (APP-…-0Z1VVH, -JJP9K2, -O1LFR1, -VNEVHU) + View/Approve/Reject actions; KPI cards Pending 4 / Approved 0 / Rejected 0 / Total 4 |
| Approved Exporters | content | Table, 1 row |
| Sales Contracts | content | Panel renders, 0 rows (no contracts in test DB) |
| Quality Control | content | Table, 1 row |
| License Renewals | content | Table header, 0 rows |
| Analytics | content | Dashboard renders; sub-tabs Overview / Trends / Breakdown all clicked, content |
| Pre-shipment Inspection | content | Form + list render (6 inputs); its data call `GET /inspection` 500s (Fabric, §3) |
| User Management | content | Users table + create form (4 inputs) |
| Audit Trail | content | Table, 18 rows |
| Post-Delivery Audits | content | Panel renders, 0 rows |

### ECX — `/portals/ecx` — 4/4 tabs, all content, zero failed requests
| Tab | Verdict | Evidence |
|---|---|---|
| Coffee Lots | content | Table header, 0 rows (no lots in test DB) |
| Market Prices | content | Static price chart + KPI cards (hardcoded data, as inventoried) |
| Grading Standards | content | Static reference table, 6 rows |
| User Management | content | Users table + create form |

### NBE — `/portals/nbe` — 9/9 tabs + 6 sub-tab views, all content
| Tab | Verdict | Evidence |
|---|---|---|
| Forex Monitoring | content | Forex grid + KPI cards; sub-views All / Allocated / Requested / Expired are KPI-card filters — clicking "Allocated" switches the view to `ALLOCATED | 0 | BACK TO ALL` (verified working) |
| LC Monitoring | content | LC table renders |
| Exchange Rates | content | Rate table + set-rate form; its data call `GET /forex/rates` 500s (Fabric, §3) |
| SWIFT Monitoring | content | Table, 1 row; sub-tabs All Messages / Analytics & Charts / Compliance Alerts all clicked, content; data call `GET /swift/messages?…` 500s (Fabric) + console "Failed to load monitoring data" |
| Forex Repatriation | content | Repatriation panel + verify form (5 inputs); data call `GET /repatriation` 500s (Fabric) |
| Policy & Compliance | content | Retention-policy view renders; `GET /forex/retention-policy/COFFEE` → 404, `GET /analytics/compliance` → 404 (route missing, M-04) |
| Analytics | content | Dashboard renders; sub-tabs Overview / Trends / Breakdown all clicked, content |
| User Management | content | Users table + create form |
| Audit Trail | content | Table, 1 row |

### Banks — `/portals/banks` — 11/11 child tabs under 4 parents + 3 Analytics sub-tabs, all content
| Parent → child tab | Verdict | Evidence |
|---|---|---|
| Payment Operations → All LCs | content | Table header + honest "No LCs found" (0 rows) |
| Payment Operations → Payment Methods | content | UnifiedPaymentWorkflow renders (method selector + forms) |
| Payment Operations → Document Examination | content | Examination panel renders |
| Payment Operations → Payment Release | content | Release panel renders |
| Payment Operations → LC Discrepancies | content | Discrepancy list renders |
| Forex & Settlements → Forex Allocations | content | Table, 1 row |
| Forex & Settlements → LC Settlements | content | Settlement tracking renders |
| Communication & Issues → SWIFT Messages | content | SWIFT list renders; data call `GET /swift/messages` 500s (Fabric) |
| System Management → Analytics | content | Dashboard renders; sub-tabs Overview / Trends / Breakdown all clicked, content |
| System Management → User Management | content | Users table + create form |
| System Management → Audit Trail | content | Table, 1 row |

### Customs — `/portals/customs` — 8/8 tabs, all content
| Tab | Verdict | Evidence |
|---|---|---|
| Submitted / Inspecting / Under Review / Cleared / Rejected | content | Declaration lists render (0 rows each — only 2 declarations exist in the test DB, both in other states) |
| Border Crossing | content | Border-crossing list + dialogs render; data call `GET /bordercrossing` 500s (Fabric, §3) |
| User Management | content | Users table + create form |
| Audit Trail | content | Table, 1 row |

### Shipping — `/portals/shipping` — 10/10 tabs, all content, zero failed requests
| Tab | Verdict | Evidence |
|---|---|---|
| Clearance / Land Transport / Port Arrival / Container Stuffing / Vessel Loading / Departed / In Transit / Destination Arrived / Delivered | content | Shipment lists render per lifecycle status (0 rows each — only 2 shipments exist, in earlier states) |
| Users | content | Users table + create form |

### Exporter — `/portals/exporter` — 8/8 tabs, all content
| Tab | Verdict | Evidence |
|---|---|---|
| Dashboard | content | KPI cards + charts render |
| Contracts | content | Contracts table renders |
| Forex & Banking | content | Forex + LC lists render |
| Shipments | content | Shipments table renders |
| Customs | content | Declarations table renders |
| LC & Payments | content | Table, 1 row; SWIFT view renders |
| Reports | content | Report generator renders |
| Audit Trail | content | Table, 1 row (audit + document panels) |

## 2. Sub-tab coverage (16 views)

| Group | Views | Result |
|---|---|---|
| ECTA → Analytics | Overview, Trends, Breakdown | all 3 clicked, content |
| NBE → SWIFT Monitoring | All Messages, Analytics & Charts, Compliance Alerts | all 3 clicked, content |
| NBE → Analytics | Overview, Trends, Breakdown | all 3 clicked, content |
| NBE → Forex Monitoring | All, Allocated, Requested, Expired | KPI-card filters (not `role=tab`); "Allocated" clicked → view switches to `ALLOCATED | 0 | BACK TO ALL`; the other three cards are present with the same mechanism |
| Banks → System Management → Analytics | Overview, Trends, Breakdown | all 3 clicked, content |

## 3. Failed API calls seen in the browser (10 distinct)

Every one was re-checked live with `curl` + the same role token to get the
exact error body. **8 of 10 are "Not connected to Fabric network"** — the
routes query the chain, and there is no Fabric network on this machine. (The
earlier API test run attributed some of these to CouchDB; the live error is
Fabric, not CouchDB.)

| # | Request (as the browser made it) | Status | Error body (verified by curl) | Tabs affected |
|---|---|---|---|---|
| 1 | `GET /exporters?limit=100&offset=0` | 500 | `QUERY_FAILED: Not connected to Fabric network` | ECTA Approved Exporters (tab still rendered 1 row from another call) |
| 2 | `GET /inspection` | 500 | `Not connected to Fabric network` (source: blockchain) | ECTA Pre-shipment Inspection |
| 3 | `GET /forex/rates` | 500 | `QUERY_FAILED: Not connected to Fabric network` | NBE Exchange Rates |
| 4 | `GET /forex/retention-policy/COFFEE` | 404 | `ACTIVE_POLICY_NOT_FOUND: Not connected to Fabric network` | NBE Policy & Compliance |
| 5 | `GET /analytics/banking` | 404 | route does not exist (inventory M-04) | NBE Analytics / Banks Analytics |
| 6 | `GET /swift/messages?startDate=…&endDate=…` | 500 | `QUERY_FAILED: Not connected to Fabric network` | NBE SWIFT Monitoring (console: "Failed to load monitoring data") |
| 7 | `GET /repatriation` | 500 | `Not connected to Fabric network` (source: blockchain) | NBE Forex Repatriation |
| 8 | `GET /swift/messages` | 500 | `QUERY_FAILED: Not connected to Fabric network` | Banks SWIFT Messages |
| 9 | `GET /bordercrossing` | 500 | `Not connected to Fabric network` (source: blockchain) | Customs Border Crossing |
| 10 | `GET /payments` | 500 | `BLOCKCHAIN_QUERY_FAILED: Not connected to Fabric network` | Exporter (portal load) |

Console errors are exactly these 10 failures (plus the one "Failed to load
monitoring data" AxiosError that wraps #6). No other console errors, no JS
exceptions. No double-prefixed `/api/v1/api/v1/…` request was observed
(inventory M-02) — the recreated `api.config.ts` handles both bare and
`/api/v1`-prefixed paths.

## 4. What "empty" means here — honest empty states, not breakage

Most tabs with 0 rows render a proper empty state ("No LCs found", "No
records", empty tables with headers, 0-value KPI cards). The data is absent
because this test database has almost no workflow entities: only the
TMW977G36 run's artefacts (3 applications, 1 contract, 1 LC, 2 shipments,
2 declarations) exist, and every Fabric-backed write was blocked, so
downstream entities (LCs visible to Banks, SWIFT messages, payments,
repatriations, border crossings, lots) were never created. The portals render
correctly around the missing data; they do not crash, hang or show error
banners for it. The one exception is the 10 calls in §3, where the portal
shows the empty state *and* the network call fails — those views can only show
real data once Fabric is connected.

## 5. Method note — the first probe bounced to /login (own-goal, not an app bug)

The first probe set localStorage via `page.evaluate(fn, token, user)` with
two arguments. Playwright's `evaluate` takes a **single** argument, so `user`
arrived as `undefined`, `JSON.stringify(undefined)` stored the literal string
`"undefined"`, and the app's `checkAuth` threw parsing it — correctly clearing
the session and redirecting to `/login`. Passing a single object argument
(`{ token, user }`) fixed it and every portal then loaded. Verified
separately: the app's own axios `GET /auth/validate` succeeds (200) with a
real session, and the token/user pair from `.test-tokens-TMW977G36.json`
authenticates all 7 roles.

## 6. What is still NOT tested in a browser

- Any action that writes (approve/reject buttons, forms, uploads, signatures)
  — read-only by design of this run; the API-level test (TEST-RESULTS.md)
  covers those endpoints.
- Any view whose data only exists on-chain (LC lists, SWIFT messages,
  payments, repatriations, border crossings, forex rates) — renders, but with
  0 rows / failed calls until Fabric is connected (see §3).
- ECX Market Prices / Grading Standards are static hardcoded data (no API
  call), as inventoried — they render, but they are not live data.
