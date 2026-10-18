-- Update both inspector and supervisor to have 'ECTA' role
-- This gives them access to all ECTA portal tabs including Sales Contracts

UPDATE users 
SET role = 'ECTA'
WHERE username IN ('ecta_supervisor', 'ecta_inspector');

-- Verify the changes
SELECT 
  username,
  role,
  organization,
  status,
  email
FROM users
WHERE username IN ('ecta_supervisor', 'ecta_inspector', 'ectaAdmin')
ORDER BY username;
