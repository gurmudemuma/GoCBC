# Cleanup + Reorg Report — GoCBC

**Date:** 2026-11-12 · **Branch:** `features` · **Base HEAD:** `1a7b7343`
**Task:** "push everything but make sure you cleaned the codebase's unnecessary files and put all the documents under Docs folder and tests under test folder"
**Result:** two local commits on top of `1a7b7343` (see §8). Nothing pushed — the parent pushes after verifying. Docker host untouched. No stored data altered. No chaincode or API/UI behaviour changed — moves + deletions + reference fixes only.

Inventory evidence: `~/pwtest/cleanup/inventory-docs.md`, `~/pwtest/cleanup/inventory-tests.md`, `~/pwtest/cleanup/inventory-dead.md`, `~/pwtest/cleanup/moves-log.md`.

## 1. Inventory summary

| Area | Finding |
|---|---|
| `.md` docs outside `Docs/` | **120** project-owned (107 tracked, 13 untracked at root; 30,164 lines). Root 46; `archive/deprecated/` 37; `tests/` 23; `api/` 6; `nginx-configs/` 4; `scripts/` 3; `kubo/` 1. `Docs/` already held 611 `.md` (629 files total), all flat. `chaincodes/` and `ui/` hold zero project `.md` outside `node_modules/`. |
| Name collisions | **11 files / 6 basenames** if moved flat (`README.md` ×6, `AUDIT-TRAIL-QUICK-REFERENCE.md`, `DEPLOYMENT-CHECKLIST.md`, `FINAL-FIX-SUMMARY.md`, `FIXES-APPLIED.md`, `SYSTEM-STATUS.md`); `TEST-RESULTS-SUMMARY.md` ×2 would also collide with each other. |
| Zero-reference docs | 55 of 120; 12 cited as evidence in past reports/memory. |
| `tests/` tree | **281 entries** (269 tracked, 3 untracked), 3.4 MB: 233 real test scripts (130 `.js`, 96 `.sh`, 6 `.ts`, 1 `.py`), 30 run logs/results, 4 docs, 5 config/helpers. Subdirs: `e2e/`, `helpers/`, `integration/`, `moved-from-root/` (77 probe `.js`), `scripts/` (59), `test-results/` (21), `ui/`, `workflows/`. |
| Test files outside `tests/` | **148**, dominated by a second tree **`api/tests/` (99 files, all tracked) which must NOT be renamed** (its references are `api/`-relative). Also `scripts/` 22, `api/` 12, root 2, chaincode `response_schema_test.go`, UI 2, `archive/deprecated/` 3, `.devrun/` drivers 7. |
| `tests/` references | **358 lines in 119 files** (repo) + 90 lines in 7 files under `~/pwtest/` (only 5 lines functional). |
| Dead-file candidates | Tier 1 confirmed dead: **11** (see §2). Tier 2: 5 run-output `.txt`. Tiers 3–4: 112 standalone scripts with zero refs (weak evidence — hand-run scripts) + 68 referenced only by Docs prose. |
| Protection audit | All present: `start-all.sh`, `deploy-chaincode.sh`, `README.md` (root), 62 files under `api/src/migrations/`, 23 `.go` files under `chaincodes/coffee/`, 7 `.env*` files (only the 4 `*.example` tracked; `api/.env.blockchain` + `.fixed` present on disk, untracked — the known pull hazard), 1,048 files under `blockchain/organizations/`. |
| `.gitignore` gaps | `api/dist` ✅ covered, `ui/.next` ✅ covered; **`.devrun/`, `test-results/`, `.ui-test-shots/`, compiled `chaincodes/coffee/coffee` (19.7 MB, untracked) NOT covered** — fixed in §5. |

## 2. Deletions (commit 1 — 16 files, 6,051 deletions)

Every file was re-grepped immediately before deleting; every hit was only the file itself + its barrel re-export (+ the `InspectionRequestsTab.tsx:48-55` comment stating the 3 dialogs are dead code).

| File | Evidence |
|---|---|
| `ui/src/components/inspection/InspectionSchedulingDialog.tsx` (406 lines) | 0 live uses |
| `ui/src/components/inspection/InspectionConductDialog.tsx` (152) | 0 live uses |
| `ui/src/components/inspection/InspectionReportDialog.tsx` (143) | 0 live uses |
| `ui/src/components/blockchain/BlockchainSignatureCard.tsx` (287) | 0 live uses |
| `ui/src/components/blockchain/EntityBlockchainVerification.tsx` (439) | 0 live uses |
| `ui/src/components/documents/CryptographicSignatureVerification.tsx` (560) | 0 live uses |
| `ui/src/components/modern/FilterPanel.tsx` (172) | 0 live uses (`FilterOption`/`FilterConfig` also 0 external) |
| `api/src/routes/users.ts.backup` | 0 matches anywhere (stale duplicate, 23-line diff vs live `users.ts`) |
| `ui/src/components/portals/BanksPortal_FOREX_DIALOG_FIX.txt` (46 lines) | 0 matches outside the file |
| `scripts/utility/payment-result.txt`, `portal-check.txt`, `test-doc.txt`, `test-upload.txt`, `workflow-result.txt` | Only refs are Docs prose; contents are generated run output (ANSI banners, terminal captures) |
| `scripts/backup/migrate-db-pg.js.broken` | Only `.broken`/`.bak`/`.orig` file in the repo |
| `scripts/CLEANUP-AND-ORGANIZE.sh` | One-shot organizer, already executed, **0 references anywhere** (coordinator's own grep); re-running would re-create `tests/`; also references stale `/home/guda/` paths |

Also removed: the now-dangling barrel re-exports in `ui/src/components/{inspection,blockchain,documents,modern}/index.ts` (part of commit 1).

## 3. Docs → `Docs/` (56 files; `Docs/` now 668 `.md` — 667 from the moves plus this report, was 611)

- **Moved:** 45 from repo root (except `README.md`) + 3 from `api/` + 4 from `nginx-configs/` + 3 from `scripts/` + 1 from `kubo/`. Tracked via `git mv` (43); untracked via `mv` + `git add` (13). Repo root now holds only `README.md` as a `.md` file.
- **Collisions — all 7 diffs DIFFERENT (none byte-identical, so no duplicates dropped), renamed with source-dir prefix:** `FINAL-FIX-SUMMARY.md` → `Docs/root-FINAL-FIX-SUMMARY.md`; `FIXES-APPLIED.md` → `Docs/root-FIXES-APPLIED.md`; `api/AUDIT-TRAIL-QUICK-REFERENCE.md` → `Docs/api-AUDIT-TRAIL-QUICK-REFERENCE.md`; `nginx-configs/DEPLOYMENT-CHECKLIST.md` → `Docs/nginx-configs-DEPLOYMENT-CHECKLIST.md`; `kubo/README.md` → `Docs/kubo-README.md`; `nginx-configs/README.md` → `Docs/nginx-configs-README.md`; `scripts/README.md` → `Docs/scripts-README.md`.
- **Secret scan (all 56, before staging):** NO private keys, NO tokens/API keys, NO `.env.blockchain` file contents. `.env.blockchain` hits are prose path/rotation discussion only. Single credential-like hit: `COMPLETE-CRUD-TEST-RESULTS.md:78` `password: "password123"` — the standard test-seed password, already in tracked test scripts and history. No doc withheld from staging.
- **Reference updates:** one live link needed fixing — `Docs/MIGRATION-COMPLETE.md:186` `./scripts/README.md` → `scripts-README.md`. No `../<moved-doc>.md` links exist anywhere; no README/code references to moved docs. Historical report prose left as-is.
- **Flagged, left as-is:** `Docs/INDEX.md:120` `[FIXES-APPLIED.md](FIXES-APPLIED.md)` — it pointed at the pre-existing `Docs/FIXES-APPLIED.md`; ambiguous which file was meant. `Docs/MIGRATION-COMPLETE.md:184-185` links (`./Docs/DATA-ARCHITECTURE-EXPLAINED.md` etc. from inside `Docs/`) were already broken before this task.

## 4. Tests → `test/` (269 tracked files renamed)

- `git mv tests test` — 269 tracked files renamed (R entries); `tests/` no longer exists. The 3 untracked `test/test-results/` files moved physically and **stay untracked** (run logs, never committed).
- `api/tests/` untouched (0 status entries).
- **Functional reference updates (verified by grep after edit):** `scripts/deployment/preflight-check.sh:161,163,267`; `test/integration/FRONTEND-BACKEND-INTEGRATION-ANALYSIS.sh:30,31`; `test/integration/catalog-all-endpoints.js:174`; `test/integration/fix-integration-issues.js:16,258`; `test/ui/RUN-PORTAL-VALIDATION.sh:43` (`/home/guda/GoCBC/tests/ui` → `.../test/ui`); `test/ui/README.md:64,92`; `~/pwtest/proof-fixes.sh:88,89`; `verify-migrations.sh:150`; `api/src/routes/banking.ts:1188` (comment only); `scripts/CLEANUP-AND-ORGANIZE.sh` was updated then deleted (§2 — the update did not make it safe to re-run). In-tree comment updates in `test/helpers/api-client.ts`, `test/validate-banks-portal-integration.js`, `test/verify-all-portal-tabs.sh`, `test/missing-workflow-steps-test.sh`, `test/quick-integration-test.js`, `test/test-bank-workflow-exp4886039.js`, `test/test-banks-portal-complete-workflow.js`, `test/banks-portal-automated.test.js`.
- **Live-instruction docs updated** (`tests/`→`test/`, with `api/tests/` protected by negative lookbehind — verified zero `api/test/` corruption): root `README.md` (8 refs) and 20 `Docs/` guides (incl. `Docs/BANKS-PORTAL-TESTING-COMPLETE.md` 22, `Docs/CODEBASE-ORGANIZATION.md` 10, `Docs/TESTING-EXECUTION-GUIDE.md` 6).
- **Deliberately NOT updated:** `api/tests/detailed/validate.sh:138,141`, `api/tests/verify-workflow-logic.js:354` (`api/`-relative), `api/dist/routes/banking.js` (generated build output), all historical report prose (`Docs/*` reports, `archive/*`, root `test-results/*.txt`, `test/TEST-RESULTS-SUMMARY.md:120`), `~/pwtest` report `.md` files, `~/pwtest/alignment/verify-all-portal-tabs-w1b.sh` comments.
- **Pre-existing `bash -n` failure (NOT fixed, out of scope):** `test/integration/FRONTEND-BACKEND-INTEGRATION-ANALYSIS.sh:84` ("unexpected EOF while looking for matching `'`") — the HEAD version fails identically (exit 2); the reorg diff touches only lines 30–31.

## 5. `.gitignore`

- `tests/**/*.log` → `test/**/*.log`; added `test-results/`, `.devrun/`, `.ui-test-shots/`, `chaincodes/coffee/coffee` (verified via `git check-ignore -v`). `.devrun/retest.sh` + `.devrun/run-handoff.sh` remain tracked.

## 6. Deliberately kept (with reasons)

- **`api/src/services/auditTrailHelper.ts` + `api/src/types/auditTrail.types.ts`** — 0 code imports, BUT their logic is NOT in `auditService.ts` (its `logContractApproval` / `logContractRejection` / `logDocumentSignature` / `logDocumentView` / `logAuditTrail` have no counterpart; the types file's `toAuditJsonbValue` returns an object while auditService's local one returns `string|null`). Deleting them would discard the unwired JSONB-safe audit writer for the `audit_trail` table (the FABRIC-TRUST-REPORT loss). Wiring it in is a follow-up, not a deletion.
- **112 standalone scripts (Tier 3) + 68 referenced only by Docs prose** — 0 references does not prove nobody hand-runs them; no bulk delete. Full list in `~/pwtest/cleanup/inventory-dead.md` §5a.
- **`tests/*.md` (23)** — stay with the test tree (they document the suite).
- **`archive/` (37 `.md`)** — already organised as deprecated; moving them flat into `Docs/` would mix deprecated docs with live ones.
- **`api/public/samples/*.md`** — API-served sample contents, not reports (`ExporterPortal.tsx:4047,4056,4065` link `/samples/*.md`).
- **Root `README.md`**, **`api/tests/`**, **`.devrun/` on disk** (735-file harness, invoked manually/by agents; no repo code references it), **root `test-results/` (103 untracked logs) + `.ui-test-shots/`** (run evidence, untracked, now gitignored).
- **`docker-host-check.sh`** (untracked at root, pre-existing) — left as-is.
- **`InspectionRequestsTab.tsx:48-55`** stale dead-code comment (says the 3 dialogs "can be deleted" — they now are) — left, cosmetic.

## 7. Verification (all on this VM, after the moves)

| Check | Result | Evidence |
|---|---|---|
| `bash -n` (98 `.sh` files: `test/**/*.sh` + preflight + verify-migrations) | 97 PASS, 1 FAIL (pre-existing, §4) | `~/pwtest/cleanup/bash-n-results.txt` |
| API `tsc --noEmit` | exit 0 | verification worker report |
| UI `tsc --noEmit` | exit 0 | verification worker report |
| Chaincode `go vet` + `go build` | exit 0 | verification worker report |
| Stale `tests/` sweep (live code paths) | **0 functional stale references** (only gitignored historical `test-results/` prose remains; `--skip-tests` in `start-all.sh` is a CLI flag, not a path) | `~/pwtest/cleanup/stale-sweep.txt` |
| Flagship `test/complete-workflow-test.sh` (new path, live) | **20 passed / 0 failed**, exit 0 (literal inspect → permit → customs completed: SHIP-20261112110212, PERMIT-20261112110222, DECL-1794481347416) | `~/pwtest/cleanup/verify-flagship.log` |
| Tabs `test/verify-all-portal-tabs.sh` (new path, live) | **70 passed / 0 failed**, 0 uncovered, 0 blocked | `~/pwtest/cleanup/verify-tabs.log` |
| Rebuild + restart | `npm run build` (api) exit 0; `next build` (ui) exit 0; API `/health` 200 (database+blockchain true), UI `/login` 200, smoke login + `GET /shipments?limit=1` → 200 | `~/pwtest/cleanup/api-build.log`, `~/pwtest/cleanup/ui-build.log` |

Incidents during verification (both recovered, no impact on results): one restart exec was SIGTERM'd when `pkill -f 'node dist/server.js'` matched its own shell command line (the known self-match hazard — kill by PID instead); one exec hit an output-drain timeout and was retried. The verification worker also noted `~/fabric-native/STACK-STATUS.md` still says chaincode seq 1 (stale — the live chaincode is seq 7; not fixed, out of scope).

## 8. Commits (local, NOT pushed)

- Commit 1 — `dab9d432` "Clean dead files" (20 files, 6,051 deletions).
- Commit 2 — "Move docs to Docs/ and tests to test/" (350 files changed; this report file was amended into it — see `git log --oneline -3` for its final hash).

After both commits: `git status` clean except untracked `docker-host-check.sh` (pre-existing). `git diff HEAD -- start-all.sh deploy-chaincode.sh` is empty (byte-identical). Remote is still `f7c4d77d`; the branch is now 20 commits ahead (18 + these 2).

## 9. Not done / open items

- No push (parent pushes after verifying).
- No Tier-3 script deletions; no audit-file deletions (see §6).
- `Docs/INDEX.md:120` ambiguous link; `Docs/MIGRATION-COMPLETE.md:184-185` already-broken links; `InspectionRequestsTab.tsx:48-55` stale comment — all flagged above, left untouched.
- `FRONTEND-BACKEND-INTEGRATION-ANALYSIS.sh:84` pre-existing `bash -n` failure — not fixed.
- `~/fabric-native/STACK-STATUS.md` stale (says seq 1, live is seq 7) — not fixed.
- Historical report prose still cites old `tests/` paths (by design — records, not instructions).
- `~/pwtest` report `.md` files keep old `tests/` paths (outside the repo).
