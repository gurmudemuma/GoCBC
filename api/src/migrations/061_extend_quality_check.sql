-- 061_extend_quality_check.sql
-- Tab-to-tab audit finding: chk_quality_inspections_status (059) omits
-- 'SCHEDULED', but it is a real, written status:
--   * chaincode inspection.go ScheduleInspection guard REQUESTED -> SCHEDULED
--     (inspection.go:196, assign :215), struct comment lists
--     REQUESTED, SCHEDULED, IN_PROGRESS, COMPLETED, APPROVED, REJECTED;
--   * api/src/services/qualityService.ts:97 mirrors SCHEDULED into PG on
--     schedule, and the Pre-shipment Inspection tab filters on it.
-- Without this, the schedule action's PG mirror violates the CHECK.
-- IN_PROGRESS is deliberately NOT added: it is comment-only in the
-- chaincode and never assigned by any writer (matrix §5b).
ALTER TABLE quality_inspections DROP CONSTRAINT IF EXISTS chk_quality_inspections_status;
ALTER TABLE quality_inspections
  ADD CONSTRAINT chk_quality_inspections_status
  CHECK (status IN ('PENDING', 'REQUESTED', 'SCHEDULED', 'SAMPLE_COLLECTED', 'INSPECTED',
                    'APPROVED', 'REJECTED', 'PERMIT_ISSUED', 'CERTIFICATE_ISSUED',
                    'COMPLETED'));
