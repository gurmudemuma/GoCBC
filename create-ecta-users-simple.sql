-- Create ECTA users with simple approach

-- Check if pgcrypto extension exists, if not create it
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ECTA Inspector
INSERT INTO users (
  user_id, username, email, password_hash, role, 
  organization, status, created_at
) 
SELECT 
  'USER_ECTA_INSPECTOR',
  'ecta_inspector',
  'inspector@ecta.gov.et',
  crypt('inspector123', gen_salt('bf')),
  'ECTA_INSPECTOR',
  'ECTAMSP',
  'active',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'ecta_inspector'
);

-- Create ECTA Supervisor  
INSERT INTO users (
  user_id, username, email, password_hash, role, 
  organization, status, created_at
)
SELECT
  'USER_ECTA_SUPERVISOR',
  'ecta_supervisor',
  'supervisor@ecta.gov.et',
  crypt('supervisor123', gen_salt('bf')),
  'ECTA_SUPERVISOR',
  'ECTAMSP',
  'active',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'ecta_supervisor'
);

-- Create ECTA Admin if doesn't exist
INSERT INTO users (
  user_id, username, email, password_hash, role, 
  organization, status, created_at
)
SELECT
  'USER_ECTA_ADMIN',
  'ecta_admin',
  'admin@ecta.gov.et',
  crypt('ecta123', gen_salt('bf')),
  'ECTA_ADMIN',
  'ECTAMSP',
  'active',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'ecta_admin'
);

-- Show results
SELECT 
  username,
  role,
  email,
  organization,
  status
FROM users
WHERE organization = 'ECTAMSP' OR username LIKE '%ecta%'
ORDER BY username;
