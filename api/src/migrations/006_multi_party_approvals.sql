-- Migration: Multi-Party Approval System
-- Date: 2026-09-19
-- Description: Add support for documents requiring multiple approvals

-- ============================================
-- 1. APPROVAL REQUIREMENTS TABLE
-- ============================================
-- Defines which document types require multiple approvals
CREATE TABLE IF NOT EXISTS approval_requirements (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- LC, CONTRACT, SHIPMENT, CUSTOMS_DECLARATION
    min_approvers INTEGER NOT NULL DEFAULT 1,
    required_roles TEXT[], -- Array of roles that must approve (e.g., ['bank_officer', 'senior_bank_officer'])
    approval_order VARCHAR(50) DEFAULT 'parallel', -- 'parallel' or 'sequential'
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, entity_type)
);

-- ============================================
-- 2. UPDATE DOCUMENT_SIGNATURES TABLE
-- ============================================
-- Add fields to track approval workflow
ALTER TABLE document_signatures 
ADD COLUMN IF NOT EXISTS approval_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS approval_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS signed_by_role VARCHAR(100),
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS requires_further_approval BOOLEAN DEFAULT false;

-- Add index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_doc_signatures_approval 
ON document_signatures(document_id, signature_type, approval_status);

-- ============================================
-- 3. APPROVAL WORKFLOW STATE TABLE
-- ============================================
-- Tracks overall approval progress for each document
CREATE TABLE IF NOT EXISTS approval_workflow_state (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(document_id),
    entity_type VARCHAR(50) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    required_approvals INTEGER NOT NULL DEFAULT 1,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, approved, rejected
    approved_by TEXT[], -- Array of user IDs who approved
    rejected_by VARCHAR(255), -- User who rejected (if any)
    rejection_reason TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id)
);

-- Add index for workflow queries
CREATE INDEX IF NOT EXISTS idx_approval_workflow_status 
ON approval_workflow_state(approval_status);

CREATE INDEX IF NOT EXISTS idx_approval_workflow_document 
ON approval_workflow_state(document_id, approval_status);

-- ============================================
-- 4. INSERT DEFAULT APPROVAL REQUIREMENTS
-- ============================================

-- LC Documents requiring multiple approvals
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('COMMERCIAL_INVOICE', 'LC', 2, ARRAY['bank_officer', 'senior_bank_officer'], 'sequential', 'Commercial invoices require junior and senior bank officer approval'),
    ('BILL_OF_LADING', 'LC', 2, ARRAY['bank_officer', 'senior_bank_officer'], 'sequential', 'Bill of lading requires junior and senior bank officer approval'),
    ('CERTIFICATE_OF_ORIGIN', 'LC', 2, ARRAY['ecta_inspector', 'ecta_supervisor'], 'sequential', 'Certificate of origin requires inspector and supervisor approval'),
    ('QUALITY_CERTIFICATE', 'LC', 2, ARRAY['ecta_inspector', 'ecta_supervisor'], 'sequential', 'Quality certificate requires inspector and supervisor approval'),
    ('INSURANCE_CERTIFICATE', 'LC', 1, ARRAY['bank_officer'], 'parallel', 'Insurance certificate requires single bank officer approval'),
    ('PACKING_LIST', 'LC', 1, ARRAY['bank_officer'], 'parallel', 'Packing list requires single bank officer approval')
ON CONFLICT (document_type, entity_type) DO NOTHING;

-- Contract Documents
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('SALES_CONTRACT', 'CONTRACT', 2, ARRAY['ecta_inspector', 'ecta_supervisor'], 'sequential', 'Sales contracts require inspector and supervisor approval'),
    ('EXPORT_LICENSE', 'CONTRACT', 2, ARRAY['ecta_inspector', 'ecta_supervisor'], 'sequential', 'Export licenses require inspector and supervisor approval')
ON CONFLICT (document_type, entity_type) DO NOTHING;

-- Customs Documents
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('CUSTOMS_DECLARATION', 'CUSTOMS_DECLARATION', 2, ARRAY['customs_officer', 'senior_customs_officer'], 'sequential', 'Customs declarations require officer and senior officer approval'),
    ('DUTY_ASSESSMENT', 'CUSTOMS_DECLARATION', 2, ARRAY['customs_officer', 'senior_customs_officer'], 'sequential', 'Duty assessments require officer and senior officer approval')
ON CONFLICT (document_type, entity_type) DO NOTHING;

-- Shipment Documents
INSERT INTO approval_requirements (document_type, entity_type, min_approvers, required_roles, approval_order, description)
VALUES 
    ('SHIPPING_MANIFEST', 'SHIPMENT', 1, ARRAY['shipping_agent'], 'parallel', 'Shipping manifest requires shipping agent approval'),
    ('CONTAINER_SEAL', 'SHIPMENT', 2, ARRAY['shipping_agent', 'customs_officer'], 'parallel', 'Container sealing requires shipping agent and customs officer')
ON CONFLICT (document_type, entity_type) DO NOTHING;

-- ============================================
-- 5. FUNCTION: Check if document has all required approvals
-- ============================================
CREATE OR REPLACE FUNCTION check_approval_complete(doc_id VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    workflow_record RECORD;
BEGIN
    SELECT * INTO workflow_record 
    FROM approval_workflow_state 
    WHERE document_id = doc_id;
    
    IF workflow_record IS NULL THEN
        RETURN true; -- No workflow, consider approved
    END IF;
    
    RETURN workflow_record.current_approvals >= workflow_record.required_approvals;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGER: Update workflow state on signature
-- ============================================
CREATE OR REPLACE FUNCTION update_approval_workflow()
RETURNS TRIGGER AS $$
DECLARE
    workflow_id INTEGER;
    required_count INTEGER;
BEGIN
    -- Only process approval signatures
    IF NEW.signature_type = 'approve' AND NEW.approval_status = 'approved' THEN
        -- Check if workflow exists
        SELECT id, required_approvals INTO workflow_id, required_count
        FROM approval_workflow_state
        WHERE document_id = NEW.document_id;
        
        IF workflow_id IS NOT NULL THEN
            -- Update workflow state
            UPDATE approval_workflow_state
            SET 
                current_approvals = current_approvals + 1,
                approved_by = array_append(approved_by, NEW.signed_by),
                approval_status = CASE 
                    WHEN current_approvals + 1 >= required_approvals THEN 'approved'
                    ELSE 'in_progress'
                END,
                completed_at = CASE 
                    WHEN current_approvals + 1 >= required_approvals THEN NOW()
                    ELSE NULL
                END,
                updated_at = NOW()
            WHERE id = workflow_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_approval_workflow ON document_signatures;
CREATE TRIGGER trigger_update_approval_workflow
    AFTER INSERT ON document_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_workflow();

-- ============================================
-- 7. VIEW: Document Approval Status
-- ============================================
CREATE OR REPLACE VIEW document_approval_status AS
SELECT 
    d.document_id,
    d.entity_type,
    d.entity_id,
    d.document_type,
    d.file_name,
    d.status as document_status,
    aws.required_approvals,
    aws.current_approvals,
    aws.approval_status,
    aws.approved_by,
    aws.rejected_by,
    aws.rejection_reason,
    ar.required_roles,
    ar.approval_order,
    CASE 
        WHEN aws.current_approvals >= aws.required_approvals THEN true
        ELSE false
    END as is_fully_approved,
    d.uploaded_at,
    aws.updated_at as approval_updated_at
FROM documents d
LEFT JOIN approval_workflow_state aws ON d.document_id = aws.document_id
LEFT JOIN approval_requirements ar ON d.document_type = ar.document_type AND d.entity_type = ar.entity_type
WHERE d.status != 'deleted';

COMMENT ON VIEW document_approval_status IS 'Comprehensive view of document approval progress';

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_approval_requirements_type 
ON approval_requirements(document_type, entity_type, active);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
