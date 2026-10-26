-- SQL Script to Update Old Approved Applications
-- Run this in DB Browser for SQLite or any SQLite tool
-- Database: api/cecbs.db

-- First, let's see what needs to be updated
SELECT 
    application_id,
    company_name,
    exporter_id,
    ecta_license_number,
    license_expiry_date,
    exporter_type,
    approved_at
FROM exporter_applications 
WHERE status = 'approved'
ORDER BY approved_at DESC;

-- Update all approved applications with missing data
-- This will set default values for exporter_type, license number, and expiry date

UPDATE exporter_applications 
SET 
    exporter_type = CASE 
        WHEN exporter_type IS NULL OR exporter_type = '' THEN 'private'
        ELSE exporter_type
    END,
    ecta_license_number = CASE 
        WHEN ecta_license_number IS NULL OR ecta_license_number = '' 
        THEN 'ECTA-LIC-2026-' || substr('000' || rowid, -3)
        ELSE ecta_license_number
    END,
    license_expiry_date = CASE 
        WHEN license_expiry_date IS NULL OR license_expiry_date = '' 
        THEN date('now', '+1 year')
        ELSE license_expiry_date
    END
WHERE status = 'approved';

-- Verify the updates
SELECT 
    application_id,
    company_name,
    exporter_id,
    ecta_license_number,
    license_expiry_date,
    exporter_type,
    approved_at,
    status
FROM exporter_applications 
WHERE status = 'approved'
ORDER BY approved_at DESC;
