-- Migration 016: Add missing application_id column to exporter_applications
-- This column is required by the API routes but was missing from the initial schema

-- Add application_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'application_id'
    ) THEN
        ALTER TABLE exporter_applications 
        ADD COLUMN application_id VARCHAR(100) UNIQUE;
        
        -- Generate application_id for existing rows
        UPDATE exporter_applications 
        SET application_id = 'APP-' || LPAD(id::TEXT, 8, '0')
        WHERE application_id IS NULL;
        
        -- Make it NOT NULL after populating
        ALTER TABLE exporter_applications 
        ALTER COLUMN application_id SET NOT NULL;
        
        RAISE NOTICE 'Added application_id column to exporter_applications';
    ELSE
        RAISE NOTICE 'application_id column already exists';
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$ 
BEGIN
    -- tin_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'tin_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN tin_number VARCHAR(50);
    END IF;
    
    -- business_license_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'business_license_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN business_license_number VARCHAR(100);
    END IF;
    
    -- registration_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'registration_date'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN registration_date DATE;
    END IF;
    
    -- capital_requirement
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'capital_requirement'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN capital_requirement VARCHAR(50);
    END IF;
    
    -- professional_taster
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'professional_taster'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN professional_taster VARCHAR(100);
    END IF;
    
    -- taster_certificate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'taster_certificate'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN taster_certificate VARCHAR(100);
    END IF;
    
    -- laboratory_facility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'laboratory_facility'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN laboratory_facility VARCHAR(10) DEFAULT 'no';
    END IF;
    
    -- laboratory_certificate_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'laboratory_certificate_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN laboratory_certificate_number VARCHAR(100);
    END IF;
    
    -- contact_person (rename if exists as different column)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN contact_person VARCHAR(100);
    END IF;
    
    -- city
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- region
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'region'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN region VARCHAR(100);
    END IF;
    
    -- bank_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_name VARCHAR(100);
    END IF;
    
    -- bank_account_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'bank_account_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_account_number VARCHAR(100);
    END IF;
    
    -- bank_branch
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'bank_branch'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_branch VARCHAR(255);
    END IF;
    
    -- bank_branch_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'bank_branch_code'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_branch_code VARCHAR(50);
    END IF;
    
    -- comments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'comments'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN comments TEXT;
    END IF;
    
    -- documents
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'documents'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- exporter_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'exporter_type'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN exporter_type VARCHAR(20) DEFAULT 'company';
    END IF;
    
    -- submitted_at (alias for submitted_date)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- approved_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN approved_at TIMESTAMP;
    END IF;
    
    -- rejected_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN rejected_at TIMESTAMP;
    END IF;
    
    -- exporter_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'exporter_id'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN exporter_id VARCHAR(100);
    END IF;
    
    -- account_created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'account_created'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN account_created BOOLEAN DEFAULT false;
    END IF;
    
    -- license_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'license_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN license_number VARCHAR(100);
    END IF;
    
    -- ecta_license_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'ecta_license_number'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN ecta_license_number VARCHAR(100);
    END IF;
    
    -- license_issued_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'license_issued_date'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN license_issued_date TIMESTAMP;
    END IF;
    
    -- license_expiry_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'license_expiry_date'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN license_expiry_date TIMESTAMP;
    END IF;
    
    -- digital_signature
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'digital_signature'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN digital_signature TEXT;
    END IF;
    
    -- verification_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exporter_applications' 
        AND column_name = 'verification_code'
    ) THEN
        ALTER TABLE exporter_applications ADD COLUMN verification_code VARCHAR(50);
    END IF;
END $$;

-- Create index on application_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_exporter_applications_application_id 
ON exporter_applications(application_id);

-- Create index on status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_exporter_applications_status 
ON exporter_applications(status);

-- Create index on email if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_exporter_applications_email 
ON exporter_applications(email);
