Customs Commission Portal - Workflow Mapping

Purpose
- Map real-world customs clearance activities (WCO/HMRC-style) into app statuses, endpoints, roles, and UI actions for the Customs portal.

High-level real-world stages -> App mapping

1) Arrival / Pre-Manifest
- Real-world: Vessel/flight/consignment arrival and pre-manifest lodgement.
- App status: `ARRIVED` (informational)
- Endpoints: GET `/customs/shipments?status=ARRIVED`
- Roles: customs_officer, customs_admin

2) Permit Ready / Export Permit Issued
- Real-world: Export permit granted by issuing authority; shipment ready for declaration.
- App status: `PERMIT_READY`
- Endpoints: GET `/customs/permit-ready` (summary), GET `/customs/shipments?status=PERMIT_READY`
- UI: Notification/Badge in Customs portal; button `Start Declaration` lives in Customs portal for permit-ready shipments.
- Roles: customs_officer, exporter (view)

3) Declaration Started (moved to Customs portal)
- Real-world: Declaration creation and submission to Customs.
- App status: `DECLARATION_STARTED` -> `DECLARATION_SUBMITTED`
- Endpoints: POST `/customs/declaration/:shipmentId/start` (creates declaration record), PUT `/customs/declaration/:declarationId/submit`
- UI: Stepper/modal to enter missing fields, validate only complete records allowed to submit.
- Roles: customs_officer (initiates), exporter (may view)

4) Risk Assessment
- Real-world: Automated/manual risk checks (value, HS codes, exporter history).
- App status: `RISK_ASSESSED` with riskLevel: LOW|MEDIUM|HIGH
- Endpoints: POST `/customs/declaration/:declarationId/risk-assess` (exists), POST `/customs/declaration/:declarationId/override-risk` (exists)
- UI: Show risk badge, show details and `Proceed despite risk` option (requires audit log entry).
- Roles: customs_officer, customs_admin (override permission)

5) Inspection Requested & Scheduling
- Real-world: If high risk, schedule physical inspection or documentary check.
- App status: `INSPECTION_REQUESTED` -> `INSPECTION_SCHEDULED`
- Endpoints: POST `/customs/declaration/:declarationId/request-inspection`, POST `/customs/declaration/:declarationId/schedule-inspection`
- UI: Inspector assignment, calendar invite, comments
- Roles: inspector, customs_admin

6) Inspection Outcome
- Real-world: Inspector clears, detains, or requests further action.
- App status: `INSPECTED_CLEARED` | `INSPECTED_DETAINED` | `INSPECTED_ACTION_REQUIRED`
- Endpoints: POST `/customs/declaration/:declarationId/inspection-result` (payload: outcome, notes, attachments)
- UI: Show result, allow release or detention workflows
- Roles: inspector, customs_admin

7) Release / Cleared for Export
- Real-world: Goods released; clearance certificate produced.
- App status: `RELEASED` / `CLEARED`
- Endpoints: POST `/customs/declaration/:declarationId/release`, GET `/customs/cleared-shipments` (with pagination)
- UI: Cleared shipments list (paginated), export document link
- Roles: customs_officer, exporter, banks (for records)

8) Detention / Penalty
- Real-world: Seizure or penalty proceedings.
- App status: `DETAINED` / `PENALTY_PENDING`
- Endpoints: POST `/customs/declaration/:declarationId/detain`, POST `/customs/declaration/:declarationId/penalty`
- UI: Flags on shipment, restricted actions
- Roles: customs_admin, legal

Data completeness requirements
- Only allow `DECLARATION_SUBMITTED` when required fields are complete: consignee, exporter, HS codes, quantities, values, permit reference, transport docs.
- UI validation must show missing fields and prevent submission.

Role model and enforcement
- Roles: `CUSTOMS_OFFICER`, `CUSTOMS_ADMIN`, `INSPECTOR`, `EXPORTER`, `BANKS`.
- `CUSTOMS_ADMIN` can modify risk rules and override HIGH risks.
- `INSPECTOR` can record inspection results.
- `CUSTOMS_OFFICER` can start declarations, request inspections, and release where allowed.

API design notes (minimal set to implement)
- GET `/customs/permit-ready` — return summary count and items (paginated)
- POST `/customs/declaration/:shipmentId/start` — create `DECLARATION_STARTED` record
- POST `/customs/declaration/:declarationId/risk-assess` — compute and persist risk
- POST `/customs/declaration/:declarationId/override-risk` — persist override + audit
- POST `/customs/declaration/:declarationId/request-inspection` — set `INSPECTION_REQUESTED`
- POST `/customs/declaration/:declarationId/inspection-result` — record outcome and transition status
- POST `/customs/declaration/:declarationId/release` — set `RELEASED`
- GET `/customs/shipments?status=...&page=&size=` — paginated lists

UI considerations
- Place `Start Declaration` action on `PERMIT_READY` items in `ui/src/components/portals/CustomsPortal.tsx`.
- Permit-ready notification badge in `NavigationBar` or `NotificationCenter` linking to permit-ready summary.
- `Proceed despite risk` flow must prompt for override reason and persist audit (who, when, reason).
- Add `TablePagination` to permit-ready, inspection, and cleared lists.

Audit & persistence
- Use existing `declaration_risk` table to store risk outcomes and overrides (already implemented).
- Add `declaration_audit` table for override/actions if not present.

Blockchain considerations
- The system is blockchain-powered; key authoritative events should be recorded on-chain via the Fabric network using `FabricService` so stakeholders have an immutable audit trail.
- Recommended on-chain events (chaincode functions):
	- `CreateDeclaration` — when a declaration is created (`DECLARATION_STARTED`).
	- `SubmitDeclaration` — when declaration is submitted for clearance (`DECLARATION_SUBMITTED`).
	- `RecordRiskAssessment` — persist computed riskLevel and ruleVersion for a declaration.
	- `RecordOverride` — persist 'proceed despite risk' with user, timestamp, and reason.
	- `RecordInspection` — inspection scheduling and results (outcome, inspector, notes).
	- `ReleaseShipment` — when goods are released/cleared.
- Non-authoritative or sensitive data (large attachments, intermediate UI-only flags) can remain off-chain in the relational DB with references (hashes) stored on-chain where needed.
- Design notes:
	- Keep on-chain payloads minimal: store essential fields and a content hash when referencing larger off-chain records.
	- Include `ruleVersion` or `riskRulesHash` when recording risk assessments so the rule-set used is auditable.
	- Use existing `FabricService` wrapper in the API to submit transactions; ensure error handling and retry logic.
	- Implement an idempotency key for chain submissions to avoid duplicate ledger entries.

Reconciliation
- Add a periodic reconciliation job (`api/src/services/ledgerReconciler.ts`) to compare DB records with ledger records and surface mismatches to admins.

Next steps
1) Confirm mapping with you and adjust any local/regulatory specifics.
2) Implement minimal API endpoints: start declaration, permit-ready summary, inspection request, inspection result, release.
3) Wire `Start Declaration` UI and permit-ready notification.
4) Add role checks and unit/integration tests.

References
- WCO/HMRC workflow summaries (internal research) and previous fetches stored in session notes.
