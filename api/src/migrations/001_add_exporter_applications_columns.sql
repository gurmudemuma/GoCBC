-- Migration: Add missing columns to exporter_applications table
-- Date: 2026-08-06
-- Description: Adds bank_branch, bank_branch_code, documents, and other missing columns

-- Add bank_branch column
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255);

-- Add bank_branch_code column  
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50);

-- Add documents column for storing uploaded documents
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add ECTA license information
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS ecta_license_number VARCHAR(100);

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- Add laboratory certificate number
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS laboratory_certificate_number VARCHAR(100);

-- Add exporter type classification
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS exporter_type VARCHAR(50) DEFAULT 'STANDARD';

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_exporter_applications_status ON exporter_applications(status);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_exporter_applications_submitted_at ON exporter_applications(submitted_at);
