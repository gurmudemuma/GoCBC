-- Create ECTA users matching the existing ectaAdmin structure

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert Inspector
INSERT INTO users (
  user_id, username, email, password_hash, role, 
  organization, status, created_at, updated_at
) VALUES (
  'USER_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_INSP',
  'ecta_inspector',
  'inspector@ecta.gov.et',
  crypt('inspector123', gen_salt('bf')),
  'ECTA_INSPECTOR',
  'ECTA',  -- Same as ectaAdmin
  'active',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Insert Supervisor
INSERT INTO users (
  user_id, username, email, password_hash, role, 
  organization, status, created_at, updated_at
) VALUES (
  'USER_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_SUP',
  'ecta_supervisor',
  'supervisor@ecta.gov.et',
  crypt('supervisor123', gen_salt('bf')),
  'ECTA_SUPERVISOR',
  'ECTA',  -- Same as ectaAdmin
  'active',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Show all ECTA users
SELECT username, role, organization, status, created_at::DATE 
FROM users 
WHERE organization = 'ECTA' 
ORDER BY created_at DESC;
