ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);
