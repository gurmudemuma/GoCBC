-- Create approval workflow tables

-- ==================== CREATE APPROVAL_REQUIREMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS approval_requirements (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    min_approvers INTEGER NOT NULL DEFAULT 1,
    required_roles TEXT[] NOT NULL,
    approval_order VARCHAR(20) NOT NULL DEFAULT 'parallel' CHECK (approval_order IN ('parallel', 'sequential')),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, entity_type)
);

-- ==================== CREATE APPROVAL_WORKFLOW_STATE TABLE ====================
CREATE TABLE IF NOT EXISTS approval_workflow_state (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    required_approvals INTEGER NOT NULL DEFAULT 1,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'in_progress', 'approved', 'rejected')),
    approved_by TEXT[] DEFAULT ARRAY[]::TEXT[],
    rejected_by VARCHAR(255),
    rejection_reason TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ADD INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_approval_req_doc_type ON approval_requirements(document_type);
CREATE INDEX IF NOT EXISTS idx_approval_req_entity_type ON approval_requirements(entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_req_active ON approval_requirements(active);

CREATE INDEX IF NOT EXISTS idx_approval_workflow_doc_id ON approval_workflow_state(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_status ON approval_workflow_state(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_entity ON approval_workflow_state(entity_type);

-- ==================== ADD FOREIGN KEY ====================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_workflow_document'
    ) THEN
        ALTER TABLE approval_workflow_state 
        ADD CONSTRAINT fk_approval_workflow_document 
        FOREIGN KEY (document_id) 
        REFERENCES documents(document_id) 
        ON DELETE CASCADE;
    END IF;
END$$;

-- ==================== ADD MISSING COLUMNS TO DOCUMENT_SIGNATURES ====================
DO $$
BEGIN
    -- Add approval_order column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='document_signatures' AND column_name='approval_order'
    ) THEN
        ALTER TABLE document_signatures ADD COLUMN approval_order INTEGER DEFAULT 1;
    END IF;
END$$;

-- ==================== INSERT DEFAULT APPROVAL REQUIREMENTS ====================

-- ECTA Quality Certificate - Sequential approval (Inspector first, then Supervisor)
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('QUALITY_CERTIFICATE', 'CONTRACT', 2, ARRAY['ECTA_INSPECTOR', 'ECTA_SUPERVISOR'], 'sequential', 
     'ECTA Quality Certificate requires sequential approval: Inspector reviews first, then Supervisor signs')
ON CONFLICT (document_type, entity_type) DO UPDATE SET
    min_approvers = EXCLUDED.min_approvers,
    required_roles = EXCLUDED.required_roles,
    approval_order = EXCLUDED.approval_order,
    description = EXCLUDED.description;

-- Certificate of Origin - Sequential approval (Inspector first, then Supervisor)
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('CERTIFICATE_OF_ORIGIN', 'CONTRACT', 2, ARRAY['ECTA_INSPECTOR', 'ECTA_SUPERVISOR'], 'sequential',
     'Certificate of Origin requires sequential approval: Inspector verifies first, then Supervisor approves')
ON CONFLICT (document_type, entity_type) DO UPDATE SET
    min_approvers = EXCLUDED.min_approvers,
    required_roles = EXCLUDED.required_roles,
    approval_order = EXCLUDED.approval_order,
    description = EXCLUDED.description;

-- Export Permit - Sequential approval (Inspector first, then Supervisor)
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('EXPORT_PERMIT', 'CONTRACT', 2, ARRAY['ECTA_INSPECTOR', 'ECTA_SUPERVISOR'], 'sequential',
     'Export Permit requires sequential approval: Inspector checks first, then Supervisor authorizes')
ON CONFLICT (document_type, entity_type) DO UPDATE SET
    min_approvers = EXCLUDED.min_approvers,
    required_roles = EXCLUDED.required_roles,
    approval_order = EXCLUDED.approval_order,
    description = EXCLUDED.description;

-- Contract Signed - Single approval by exporter (no multi-party)
-- No entry needed - single approval is the default

-- ==================== ADD COMMENTS ====================
COMMENT ON TABLE approval_requirements IS 'Defines which document types require multi-party approval';
COMMENT ON TABLE approval_workflow_state IS 'Tracks the current state of approval workflows for documents';

COMMENT ON COLUMN approval_requirements.min_approvers IS 'Minimum number of approvals required';
COMMENT ON COLUMN approval_requirements.required_roles IS 'Array of roles that must approve';
COMMENT ON COLUMN approval_requirements.approval_order IS 'parallel (any order) or sequential (specific order)';

COMMENT ON COLUMN approval_workflow_state.current_approvals IS 'Number of approvals received so far';
COMMENT ON COLUMN approval_workflow_state.approved_by IS 'Array of user IDs who have approved';

-- ==================== SUCCESS MESSAGE ====================
DO $$
BEGIN
    RAISE NOTICE '✅ Approval workflow tables created successfully!';
    RAISE NOTICE '   - approval_requirements table created with ECTA rules';
    RAISE NOTICE '   - approval_workflow_state table created';
    RAISE NOTICE '   - Sequential approval configured for ECTA documents';
    RAISE NOTICE '   - Inspector must approve first, then Supervisor';
END$$;
