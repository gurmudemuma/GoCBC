# GoCBC cleanup report

Date: 2026-11-10. Branch: `features`. Base HEAD before cleanup: `b9dde44`.
One commit, not pushed. No history rewrite was done (the personal-document purge from history is a separate, later step).

Method: a file was deleted only after proving zero references — whole-repo grep of the file basename (and, for JS/TS, the extensionless stem, to catch extensionless imports) excluding `node_modules`, `.next`, `.git`, `dist`; plus a fixpoint import-graph analysis for TS/TSX (entry points `api/src/server.ts` and `ui/src/pages/`, with `@/` alias and barrel re-exports resolved). Docs/`archive/` mentions were treated as historical evidence, not live use. When in doubt, the file was kept (see “Deliberately kept”).

## Summary

| Category | Files |
|---|---:|
| One-off deploy scripts (scripts/, root) | 4 |
| Backup files (.backup / .bak) | 3 |
| Empty tracked file (kubo/) | 1 |
| Root Go strays | 2 |
| Superseded migration copies (api/src/migrations-backup/, api/src/migrations-BACKUP-20261007/) | 37 |
| Dead API TypeScript (api/src) | 10 |
| Dead UI TypeScript (ui/src) | 57 |
| One-off data scripts (api/scripts/, api/migrations/) | 87 |
| Stale chaincode / channel artifacts | 9 |
| .devrun run logs (tracked) | 4 |
| **Tracked files deleted (git rm)** | **214** |
| Untracked stale token/user files (recoverable trash) | 3 |
| Runtime dirs untracked only — kept on disk (git rm --cached) | 974 |

## Deleted files (tracked, via `git rm`)

### One-off deploy scripts (scripts/, root) — 4 files

Dead: zero references anywhere in the repo (rg basename); superseded by start-all.sh / deploy-chaincode.sh.

- `quick-start.sh`
- `scripts/COMPLETE-BLOCKCHAIN-DEPLOY.sh`
- `scripts/SIMPLE-DEPLOY.sh`
- `scripts/approve-and-commit.sh`

### Backup files (.backup / .bak) — 3 files

Dead: stale backup copies; the live files they back up are unchanged and remain.

- `api/scripts/maintenance/.dockerignore.bak`
- `scripts/backup/migrate-db-pg.js.backup`
- `tests/complete-workflow-test.sh.backup`

### Empty tracked file (kubo/) — 1 files

Broken/empty: 0-byte tracked file; kubo/ is IPFS installer leftovers with no ipfs binary in the repo.

- `kubo/build-log`

### Root Go strays — 2 files

Dead: main.go is 2 bytes (a single space); root go.mod (module github.com/ethiopian-coffee/cecbs) is self-referenced only — no tooling, script, compose file or doc reads it; the real chaincode go.mod is chaincodes/coffee/go.mod.

- `go.mod`
- `main.go`

### Superseded migration copies (api/src/migrations-backup/, api/src/migrations-BACKUP-20261007/) — 37 files

Dead: the migration runner (api/src/utils/runMigrations.ts:31) reads only api/src/migrations; zero references to either backup dir anywhere in the repo.

- `api/src/migrations-BACKUP-20261007/001_add_exporter_applications_columns.sql`
- `api/src/migrations-BACKUP-20261007/014_add_post_delivery_tracking.sql`
- `api/src/migrations-BACKUP-20261007/015_add_audit_logs_and_notifications.sql`
- `api/src/migrations-BACKUP-20261007/016_create_audit_log_table.sql`
- `api/src/migrations-BACKUP-20261007/017_create_blockchain_sync_tables.sql`
- `api/src/migrations-BACKUP-20261007/018_update_users_table_schema.sql`
- `api/src/migrations-BACKUP-20261007/019_create_repatriation_table.sql`
- `api/src/migrations-BACKUP-20261007/020_create_inspection_table.sql`
- `api/src/migrations-BACKUP-20261007/021_create_border_crossing_table.sql`
- `api/src/migrations-BACKUP-20261007/022_add_lc_discrepancies.sql`
- `api/src/migrations-backup/000_initial_schema.sql`
- `api/src/migrations-backup/001_add_exporter_applications_columns.sql`
- `api/src/migrations-backup/002_add_applicant_credentials.sql`
- `api/src/migrations-backup/002_add_quality_control_tables.sql`
- `api/src/migrations-backup/002_add_shipment_id_to_customs_declarations.sql`
- `api/src/migrations-backup/003_add_document_management_tables.sql`
- `api/src/migrations-backup/003_expand_customs_declarations.sql`
- `api/src/migrations-backup/004_add_customs_tables.sql`
- `api/src/migrations-backup/004_webhooks_and_notifications.sql`
- `api/src/migrations-backup/005_add_exit_point_to_customs_clearances.sql`
- `api/src/migrations-backup/005_add_lc_actor_fields.sql`
- `api/src/migrations-backup/005_add_shipment_tracking_tables.sql`
- `api/src/migrations-backup/005_update_audit_trail_table.sql`
- `api/src/migrations-backup/006_add_payment_enhancements.sql`
- `api/src/migrations-backup/006_multi_party_approvals.sql`
- `api/src/migrations-backup/007_add_forex_confirmation_fields.sql`
- `api/src/migrations-backup/007_create_payments_table.sql`
- `api/src/migrations-backup/008_add_documents_file_path.sql`
- `api/src/migrations-backup/014_add_post_delivery_tracking.sql`
- `api/src/migrations-backup/015_add_audit_logs_and_notifications.sql`
- `api/src/migrations-backup/016_create_audit_log_table.sql`
- `api/src/migrations-backup/017_create_blockchain_sync_tables.sql`
- `api/src/migrations-backup/018_update_users_table_schema.sql`
- `api/src/migrations-backup/019_create_repatriation_table.sql`
- `api/src/migrations-backup/020_create_inspection_table.sql`
- `api/src/migrations-backup/021_create_border_crossing_table.sql`
- `api/src/migrations-backup/022_add_lc_discrepancies.sql`

### Dead API TypeScript (api/src) — 10 files

Dead: unreachable from the fixpoint import graph rooted at api/src/server.ts (with barrel/export-from resolution); whole-repo grep confirms no importer and no live reference.

- `api/src/middleware/audit.ts`
- `api/src/middleware/statusVerification.ts`
- `api/src/services/couchdbSignatureService.ts`
- `api/src/services/documentStorageService.ts`
- `api/src/services/qualityService.ts`
- `api/src/services/riskService.ts`
- `api/src/services/transactionEndorserService.ts`
- `api/src/utils/responseBuilder.ts`
- `api/src/utils/validators.ts`
- `api/src/verify-permanence.ts`

### Dead UI TypeScript (ui/src) — 57 files

Dead: unreachable from the fixpoint import graph rooted at ui/src/pages/ (Pages Router; @/ alias resolved; barrel/export-from resolved); whole-repo grep confirms no importer and no live reference. Includes all 18 per-portal utils/ files — no portal imports them (portals load data inline) — and all 8 bank panels + all 3 ECX tabs.

- `ui/src/components/BlockchainMonitor.tsx`
- `ui/src/components/Dashboard.tsx`
- `ui/src/components/PageTransition.tsx`
- `ui/src/components/admin/index.ts`
- `ui/src/components/bank/AdvancePaymentPanel.tsx`
- `ui/src/components/bank/CADManagementPanel.tsx`
- `ui/src/components/bank/ConsignmentPanel.tsx`
- `ui/src/components/bank/CreateSWIFTMessage.tsx`
- `ui/src/components/bank/DocumentExaminationPanel.tsx`
- `ui/src/components/bank/ForexDetailsDialog.tsx`
- `ui/src/components/bank/LCAmendmentDialog.tsx`
- `ui/src/components/bank/PaymentReleasePanel.tsx`
- `ui/src/components/common/EmptyState.tsx`
- `ui/src/components/common/LoadingOverlay.tsx`
- `ui/src/components/common/PaymentMethodSelector.tsx`
- `ui/src/components/common/PaymentStatusBadge.tsx`
- `ui/src/components/common/PortalHeader.tsx`
- `ui/src/components/documents/DocumentListWithSignatures.tsx`
- `ui/src/components/exporter/ModernDataGrid.tsx`
- `ui/src/components/exporter/ProfessionalChart.tsx`
- `ui/src/components/portals/InsuranceCertificates.tsx`
- `ui/src/components/portals/PaymentInitiationDialog.tsx`
- `ui/src/components/portals/PaymentProcessingTab.tsx`
- `ui/src/components/portals/banks/utils/dataLoader.ts`
- `ui/src/components/portals/banks/utils/kpiConfig.ts`
- `ui/src/components/portals/banks/utils/tabConfig.tsx`
- `ui/src/components/portals/customs/utils/dataLoader.ts`
- `ui/src/components/portals/customs/utils/kpiConfig.ts`
- `ui/src/components/portals/customs/utils/tabConfig.tsx`
- `ui/src/components/portals/ecta/utils/dataLoader.ts`
- `ui/src/components/portals/ecta/utils/kpiConfig.ts`
- `ui/src/components/portals/ecta/utils/tabConfig.tsx`
- `ui/src/components/portals/ecx/tabs/GradingStandardsTab.tsx`
- `ui/src/components/portals/ecx/tabs/LotManagementTab.tsx`
- `ui/src/components/portals/ecx/tabs/MarketPricesTab.tsx`
- `ui/src/components/portals/ecx/utils/dataLoader.ts`
- `ui/src/components/portals/ecx/utils/kpiConfig.ts`
- `ui/src/components/portals/ecx/utils/tabConfig.tsx`
- `ui/src/components/portals/exporter/utils/dataLoader.ts`
- `ui/src/components/portals/exporter/utils/kpiConfig.ts`
- `ui/src/components/portals/exporter/utils/tabConfig.tsx`
- `ui/src/components/portals/index.ts`
- `ui/src/components/portals/nbe/utils/dataLoader.ts`
- `ui/src/components/portals/nbe/utils/kpiConfig.ts`
- `ui/src/components/portals/nbe/utils/tabConfig.tsx`
- `ui/src/components/portals/shared/StandardPortalLayout.tsx`
- `ui/src/components/portals/shipping/utils/dataLoader.ts`
- `ui/src/components/portals/shipping/utils/kpiConfig.ts`
- `ui/src/components/portals/shipping/utils/tabConfig.tsx`
- `ui/src/hooks/usePortalState.ts`
- `ui/src/hooks/useSWIFTWebSocket.ts`
- `ui/src/services/swiftApi.ts`
- `ui/src/services/swiftWebSocket.ts`
- `ui/src/styles/exporterPortalStyles.ts`
- `ui/src/utils/buyers.ts`
- `ui/src/utils/portalDataLoader.ts`
- `ui/src/utils/responsiveHelpers.ts`

### One-off data scripts (api/scripts/, api/migrations/) — 87 files

Dead: one-off data fix/migration/check scripts from past incidents; zero references to the file name or its extensionless stem anywhere outside api/scripts/ + api/migrations/ (no package.json, .devrun, start-all.sh, compose or api/src reference); the fixes they performed are already applied or superseded by api/src/migrations.

- `api/migrations/add-crypto-signature-column.sql`
- `api/scripts/add-user-activity-log.sql`
- `api/scripts/analyze-customs-fields.js`
- `api/scripts/careful-postgres-convert.js`
- `api/scripts/check-all-peer-couchdbs.js`
- `api/scripts/check-contract-banks.js`
- `api/scripts/check-inspection-data.js`
- `api/scripts/check-ship-documents.js`
- `api/scripts/check-shipment-statuses.js`
- `api/scripts/check-shipping-data.js`
- `api/scripts/check-user-statuses.js`
- `api/scripts/check-user-token.js`
- `api/scripts/cleanup-duplicate-lcs.js`
- `api/scripts/complete-pending-inspections.js`
- `api/scripts/convert-exporters-to-postgres.js`
- `api/scripts/create-forex-for-existing-lcs.js`
- `api/scripts/create-missing-users.js`
- `api/scripts/database/backfill-applications-to-blockchain.js`
- `api/scripts/database/backfill-blockchain-signatures-from-fabric.js`
- `api/scripts/database/backfill-shipment-contracts.js`
- `api/scripts/database/backfill-shipment-ids.js`
- `api/scripts/database/sync-all.ts`
- `api/scripts/database/sync-buyers-to-blockchain.js`
- `api/scripts/database/sync-lc-blockchain-to-postgres.js`
- `api/scripts/database/sync-old-shipments-blockchain.js`
- `api/scripts/delete-duplicate-lcs.js`
- `api/scripts/diagnose-data-issue.js`
- `api/scripts/final-callback-fix.js`
- `api/scripts/find-all-doc-types.js`
- `api/scripts/find-duplicate-shipments.js`
- `api/scripts/fix-customs-riskfactors.js`
- `api/scripts/fix-forex-schema.js`
- `api/scripts/fix-lc-approval.js`
- `api/scripts/fix-missing-data.js`
- `api/scripts/fix-remaining-callbacks.js`
- `api/scripts/fix-shipment-null-arrays.js`
- `api/scripts/fix-shipment-nulls-couchdb.js`
- `api/scripts/inspect-couchdb.js`
- `api/scripts/list-all-lcs.js`
- `api/scripts/maintenance/add-banks-to-contract.js`
- `api/scripts/maintenance/create-full-registered-contract.ts`
- `api/scripts/maintenance/create-sample-document-files.js`
- `api/scripts/maintenance/fix-admin-wallet.js`
- `api/scripts/maintenance/fix-all-audit-trail-columns.sql`
- `api/scripts/maintenance/fix-all-routes-postgres.js`
- `api/scripts/maintenance/fix-audit-columns-now.js`
- `api/scripts/maintenance/fix-audit-trail-json-syntax.sql`
- `api/scripts/maintenance/fix-audit-trail-reason-column.sql`
- `api/scripts/maintenance/fix-contract-buyer-id.js`
- `api/scripts/maintenance/fix-contract-document-type.js`
- `api/scripts/maintenance/fix-document-file-paths.js`
- `api/scripts/maintenance/fix-exporter-applications-table.js`
- `api/scripts/maintenance/fix-missing-updated-at.sql`
- `api/scripts/maintenance/link-shipments-to-contracts.js`
- `api/scripts/maintenance/migrate-sales-contract-to-contract-signed.js`
- `api/scripts/maintenance/reset-exporter-password.js`
- `api/scripts/maintenance/update-contracts-with-banks.js`
- `api/scripts/migrate-customs-direct.js`
- `api/scripts/migrate-db-columns.js`
- `api/scripts/migrate-forex-to-v2.js`
- `api/scripts/migrate-rejected-status.js`
- `api/scripts/migrate-sqlite-to-postgres.js`
- `api/scripts/migrate-user-status-v2.js`
- `api/scripts/migrate-user-status.js`
- `api/scripts/migrations/run-blockchain-signatures-migration.js`
- `api/scripts/migrations/run-contract-migration-pg.js`
- `api/scripts/migrations/run-crypto-signature-migration.js`
- `api/scripts/migrations/run-migration-003.js`
- `api/scripts/migrations/run-migration-004.js`
- `api/scripts/migrations/run-migration-007.js`
- `api/scripts/recreate-forex-requests.js`
- `api/scripts/remove-sqlite-callbacks.js`
- `api/scripts/run-customs-migration.js`
- `api/scripts/run-shipment-migration.js`
- `api/scripts/sync-exporters-from-blockchain.js`
- `api/scripts/sync-exporters-to-blockchain.js`
- `api/scripts/sync-lc-blockchain.js`
- `api/scripts/test-forex-query.js`
- `api/scripts/test-inspection-api.js`
- `api/scripts/test-new-forex.js`
- `api/scripts/test-shipments-api.js`
- `api/scripts/test-shipments-fixed.js`
- `api/scripts/update-exporters-postgres.js`
- `api/scripts/validate-blockchain-data.js`
- `api/scripts/verify-customs-fix.js`
- `api/scripts/verify-data-flow.js`
- `api/scripts/verify-shipment-1784702923390.js`

### Stale chaincode / channel artifacts — 9 files

Dead/broken: tracked build outputs and stale packages (see notes per file in the list).

- `blockchain/channel-artifacts/coffee_1.73.tgz`
- `blockchain/channel-artifacts/coffee_2.0-deployment.json`
- `blockchain/channel-artifacts/coffee_2.0-source.sha256`
- `blockchain/channel-artifacts/test_extract/connection.json`
- `blockchain/channel-artifacts/test_extract/metadata.json`
- `chaincodes/coffee/blockchain/channel-artifacts/coffee_1.73.tgz`
- `chaincodes/coffee/coffee`
- `chaincodes/coffee/coffee-chaincode`
- `chaincodes/coffee/package-and-deploy.sh`

### .devrun run logs (tracked) — 4 files

Dead: old run logs; no harness script reads them and no report cites them.

- `.devrun/handoff-run.log`
- `.devrun/retest-run-2.log`
- `.devrun/retest-run-3.log`
- `.devrun/retest-run.log`

## Untracked stale token files (recoverable trash, not `rm`)

- `.test-tokens-STMATRIX1.json` — stale test tokens; all tokens from before the VM replacements are invalid. Trash id `20261110-055946-e3034c6550964800af06593c1b1b6491`, expires 2026-12-10.
- `.test-tokens-TMW977G36.json` — stale test tokens; same reason. Trash id `20261110-055946-bc28fe7afd7d450bb7335d32779e8503`, expires 2026-12-10.
- `.test-users-TMW977G36.txt` — stale test-user list (credential material, contents not inspected or printed). Trash id `20261110-055946-437aef05f419492aabeda5effa7ab658`, expires 2026-12-10.

## Untracked from git only — kept on disk (`git rm --cached`)

These are runtime directories read from disk by the document/license download routes. They were tracked in git; they are now ignored (`.gitignore` rules added) and removed from the index only. **No file was deleted from disk.** Counts are tracked files removed from the index; on-disk counts are higher (untracked files were already present).

- `api/uploads/` — 497 files untracked, 503 files on disk.
- `api/licenses/` — 293 files untracked, 293 files on disk (generated licence PDFs).
- `api/storage/` — 184 files untracked, 184 files on disk.

**Pull hazard (same as the `api/.env.blockchain` files):** on the Docker host, back up these three directories OUTSIDE the repo BEFORE pulling this change — git will delete the clean tracked copies on pull; restore them afterwards. The history purge that follows this commit does not cover these directories (purge scope is only the resume/marriage files).

## Verification after deletion (all passed)

- API `npx tsc --noEmit` — clean, exit 0.
- API `npm run build` — passes, exit 0 (build runs `tsc && node scripts/copy-migrations.js`; `copy-migrations.js` is live and was kept).
- UI `npx tsc --noEmit` — clean, exit 0.
- UI `next build` — passes, exit 0; all routes build (7 portals, admin, login, register-exporter, etc.).
- Chaincode `go vet ./...` — clean, exit 0; `go build` — clean, exit 0. (Go was not installed on this VM after the replacements; `golang-go` 1.22.2 was installed via apt to run these checks.)
- API healthy on 3001 (`/health` returns healthy, database true) and UI 200 on 3000 after the builds. The running servers were not restarted; the builds did not disturb them.

## Deliberately kept (and why)

- `start-all.sh`, `deploy-chaincode.sh` — explicitly confirmed by the user; untouched.
- `Docs/`, `archive/`, all root `TEST-*.md`, `DOUBLE-CHECK-REPORT.md`, `FINAL-TEST-REPORT.md`, `DOCKER-INTEGRATION-RUNBOOK.md` — historical/audit evidence; kept.
- The rest of `scripts/` (including `scripts/deployment/COMPLETE-DEPLOYMENT.sh`, referenced by the README Quick Deploy section, and `scripts/create-channel.sh`) — kept per the verified inventory; only the 4 zero-reference scripts listed above were removed.
- `tests/` (247 files) — kept except the `.backup` file: the user runs tests manually on their host, so which scripts they run cannot be proven from references; doubt → keep. `tests/helpers/` are used by `tests/workflows/*.test.ts`.
- `api/scripts/` files with any live reference: `copy-migrations.js` (api `package.json` build script), `register-missing-exporters.js` (named in a live BanksPortal error message telling ECTA to run it), `add-bank-columns.js` / `add-new-columns.js` (referenced by kept `scripts/cleanup-sqlite.sh`), `create-test-data-exp4886039.js` (referenced by kept `tests/moved-from-root/*.js`), `run-migration-016.js` (referenced by kept `scripts/maintenance/fix-application-id.sh`), `run-migrations.js` (referenced by kept `scripts/complete-db-setup.sh`), `migrate-old-applications.js` (referenced by kept `api/scripts/add-new-columns.js`), plus the 71 files whose only references are in `Docs/` (historical mentions — kept on doubt).
- `api/tests/` (99 files) — kept: the 7 jest `.test.ts`/`.test.js` files are the test suite, and the 87 `.js` one-off check scripts are in the same doubt class as `tests/` (the user runs checks manually).
- `blockchain/channel-artifacts/coffeechannel.tx` — **kept (survey correction):** `scripts/create-channel.sh:21` uses it (`-f blockchain/channel-artifacts/${CHANNEL_NAME}.tx`), and it is also referenced by kept deploy scripts.
- `blockchain/channel-artifacts/coffeechannel_genesis.block` — **kept (survey correction):** kept `scripts/deployment/COMPLETE-DEPLOYMENT.sh` checks for it, generates it if missing, and uses it to create/join the channel; `scripts/join-orderer.py` also uses it. The md5 difference from `coffeechannel.block` is expected (genesis vs channel block).
- `blockchain/channel-artifacts/connection.json` + `metadata.json` (label `coffee_1.73`) — **kept (survey correction):** kept `scripts/upgrade-seq2.sh` writes both files fresh; the double-check also deliberately left them.
- `blockchain/channel-artifacts/coffee_2.2-deployment.json` + `coffee_2.2-source.sha256` — kept: sole on-disk record of the committed chaincode package ID (`coffee_2.2:c748a1d9…`); re-evaluate after chaincode v2.3 is committed.
- `blockchain/channel-artifacts/coffeechannel.block`, `peer-tls/` — live channel artifacts; kept.
- `chaincodes/coffee/META-INF/` (CouchDB indexes) and `chaincodes/coffee/tls/` (contains private keys) — kept: `META-INF` is never packaged by `deploy-chaincode.sh` (dead files or a packaging gap — needs a decision, not a silent delete); `tls/` holds private keys and deleting from the worktree would not purge git history.
- `.devrun/` env files (`run.env`, `run2.env`, `run3.env`, `handoff.env`) — **kept (survey correction):** the live harness scripts source them (`run-dev-e2e.sh`, `run-dev-e2e-2.sh`, `run-dev-e2e-3.sh`, `run-handoff.sh`).
- `.devrun/out2/`, `out3/`, `out4/`, `out-run3/` — **kept (survey correction):** live harness output dirs, referenced by the kept harness scripts; they hold the raw evidence behind the dev-mode test reports.
- `.devrun/rbac/` (scripts, snapshots, `plan.txt`) — kept: the working tools and before/after evidence of the RBAC gap fix; untracked, so it costs nothing in the repo.
- `.devrun` harness scripts (`run-dev-e2e*.sh`, `run-followups*.sh`, `retest.sh`, `run-handoff.sh`) and `test-doc.pdf` — kept: the live dev-mode E2E harness.
- `.ui-test-shots/` — kept: no clear candidates; the latest screenshot set is cited by `TEST-UI-RESULTS-2.md`.
- `api/*.sh` (6 files), the rest of `kubo/`, `portal-verification-results.txt`, `docker-host-check.sh` — kept on doubt (stale references only, but no proof of deadness that meets the bar, or referenced by a kept report).
- `api/uploads/`, `api/licenses/`, `api/storage/` contents — kept on disk (see untrack-only section above).
- `blockchain/organizations/` (tracked private keys) — kept; rotation = network rebuild.

## Notes

- `tests/complete-workflow-test.sh.backup` is mentioned in `COMPLETE-WORKFLOW-TEST-SUCCESS.md` and `api/scripts/maintenance/.dockerignore.bak` in `Docs/FILE-ORGANIZATION-REPORT.md`; both are historical mentions of backup copies, not live use — the live files remain.
- `ui/src/components/common/PaymentMethodSelector.tsx` was deleted as dead code; two kept test scripts (`tests/quick-verify.js`, `tests/validate-full-integration.js`) check for its existence as a feature proxy and will now report it missing — correct, since no portal renders it.
- The double-check's `nbe/utils/dataLoader.ts` fix edited dead code with no runtime effect (no portal imports the per-portal `utils/` files); the live NBE fix was the `NBEPortal.tsx` button rendering. Deleting these files removes that confusion.
- No file under `chaincodes/coffee/*.go`, `api/src/migrations/*`, `connection.json`/`metadata.json` (live copies), `Dockerfile`, `docker-compose-fabric.yml`, `stop-all.sh`, any `.env*`, `package.json`/`package-lock.json`/`tsconfig*`, or `go.mod`/`go.sum` (chaincode copy) was touched.
- Deletions are recoverable: tracked files via git history; trashed files via the trash ids above (30 days).
