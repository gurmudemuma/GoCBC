-- Migration: Update Users Table Schema
-- Description: Add missing columns to users table for full user management functionality
-- Date: 2026-10-03
-- Version: 1.0

-- Add full_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
    END IF;
END $$;

-- Add exporter_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='exporter_id') THEN
        ALTER TABLE users ADD COLUMN exporter_id VARCHAR(50);
    END IF;
END $$;

-- Add ecta_license column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='ecta_license') THEN
        ALTER TABLE users ADD COLUMN ecta_license VARCHAR(100);
    END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    END IF;
END $$;

-- Add bank_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='bank_name') THEN
        ALTER TABLE users ADD COLUMN bank_name VARCHAR(255);
    END IF;
END $$;

-- Add bank_account_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='bank_account_number') THEN
        ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(100);
    END IF;
END $$;

-- Add bank_branch column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='bank_branch') THEN
        ALTER TABLE users ADD COLUMN bank_branch VARCHAR(255);
    END IF;
END $$;

-- Add bank_branch_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='bank_branch_code') THEN
        ALTER TABLE users ADD COLUMN bank_branch_code VARCHAR(50);
    END IF;
END $$;

-- Update permissions column type if it exists and is wrong type
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='users' AND column_name='permissions' AND data_type != 'text') THEN
        -- For PostgreSQL, we can try to convert the column
        ALTER TABLE users ALTER COLUMN permissions TYPE TEXT;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='permissions') THEN
        ALTER TABLE users ADD COLUMN permissions TEXT;
    END IF;
END $$;

-- Add last_login column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Rename password to password_hash if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='users' AND column_name='password') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE users RENAME COLUMN password TO password_hash;
    END IF;
END $$;

-- Ensure email is unique and not null
DO $$ 
BEGIN
    -- Make email NOT NULL if it's nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='users' AND column_name='email' AND is_nullable='YES') THEN
        -- First set empty emails to a placeholder
        UPDATE users SET email = username || '@cecbs.et' WHERE email IS NULL OR email = '';
        -- Then make it NOT NULL
        ALTER TABLE users ALTER COLUMN email SET NOT NULL;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                   WHERE conname = 'users_email_key' AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- Ensure organization is NOT NULL
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='users' AND column_name='organization' AND is_nullable='YES') THEN
        -- First set empty organizations to 'UNKNOWN'
        UPDATE users SET organization = 'UNKNOWN' WHERE organization IS NULL OR organization = '';
        -- Then make it NOT NULL
        ALTER TABLE users ALTER COLUMN organization SET NOT NULL;
    END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on organization for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create index on exporter_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_exporter_id ON users(exporter_id);
