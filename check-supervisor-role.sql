-- Check supervisor user role
SELECT username, role, organization, status
FROM users
WHERE username = 'ecta_supervisor';
