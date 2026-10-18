-- Check what users exist in the system

\echo '=== All Users in System ==='
SELECT 
  user_id,
  username, 
  role, 
  organization,
  status
FROM users
ORDER BY organization, role;

\echo ''
\echo '=== ECTA Users ==='
SELECT 
  user_id,
  username, 
  role,
  status
FROM users
WHERE organization = 'ECTAMSP' 
   OR role LIKE '%ECTA%'
   OR username LIKE '%ecta%';

\echo ''
\echo '=== Summary by Organization ==='
SELECT 
  organization,
  COUNT(*) as user_count,
  STRING_AGG(DISTINCT role, ', ') as roles
FROM users
GROUP BY organization
ORDER BY organization;
