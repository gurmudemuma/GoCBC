-- 055: Missing blockchain_tx_id on exporter_applications
--
-- Fixing the exporter-reject 500 (auditService.recordAudit did not
-- exist — fixed by adding the adapter in api/src/services/
-- auditService.ts) exposed the next failure in the same handler:
-- the reject UPDATE in api/src/routes/exporters.ts writes
-- blockchain_tx_id, but no migration ever created that column on
-- exporter_applications, so every reject still 500'd with
-- `column "blockchain_tx_id" of relation "exporter_applications"
-- does not exist`. The approve handler does not write this column,
-- so reject was the only writer.
--
-- The value is the Fabric transaction id of the on-ledger rejection
-- audit record, or NULL when Fabric is not connected (the audit is
-- still cached in PostgreSQL by AuditService.log).

ALTER TABLE exporter_applications
    ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);
