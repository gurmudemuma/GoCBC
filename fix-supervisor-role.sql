-- Update supervisor role to 'ECTA' so they can access Sales Contracts tab

UPDATE users 
SET role = 'ECTA'
WHERE username = 'ecta_supervisor';

-- Verify the change
SELECT username, role, organization, status
FROM users
WHERE username IN ('ecta_supervisor', 'ecta_inspector', 'ectaAdmin')
ORDER BY username;
