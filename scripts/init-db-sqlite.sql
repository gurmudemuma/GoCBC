-- CECBS SQLite Database Initialization
-- Exporter Applications Table

CREATE TABLE IF NOT EXISTS exporter_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    tin_number TEXT NOT NULL,
    business_license_number TEXT NOT NULL,
    registration_date TEXT,
    capital_requirement TEXT NOT NULL,
    professional_taster TEXT NOT NULL,
    taster_certificate TEXT NOT NULL,
    laboratory_facility TEXT DEFAULT 'no',
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    comments TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    exporter_id TEXT,
    reviewed_by TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exporter_applications_status ON exporter_applications(status);
CREATE INDEX IF NOT EXISTS idx_exporter_applications_email ON exporter_applications(email);
CREATE INDEX IF NOT EXISTS idx_exporter_applications_submitted ON exporter_applications(submitted_at);
