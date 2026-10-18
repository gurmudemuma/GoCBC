-- Verify ECTA users exist and show their details

SELECT 
  username,
  role,
  email,
  organization,
  status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM users
WHERE organization = 'ECTAMSP' OR username LIKE '%ecta%'
ORDER BY created_at DESC;
