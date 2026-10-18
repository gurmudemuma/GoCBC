-- Create ECTA Inspector and Supervisor users if they don't exist

DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_password_hash TEXT;
BEGIN
  RAISE NOTICE '=== Checking/Creating ECTA Users ===';
  
  -- Create ECTA Inspector
  SELECT EXISTS(SELECT 1 FROM users WHERE username = 'ecta_inspector') INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    -- Hash for password "inspector123" (you should change this in production)
    v_password_hash := crypt('inspector123', gen_salt('bf'));
    
    INSERT INTO users (
      user_id, username, email, password_hash, role, 
      organization, status, created_at
    ) VALUES (
      'USER_ECTA_INSPECTOR',
      'ecta_inspector',
      'inspector@ecta.gov.et',
      v_password_hash,
      'ECTA_INSPECTOR',
      'ECTAMSP',
      'active',
      NOW()
    );
    RAISE NOTICE '✓ Created ECTA Inspector user';
    RAISE NOTICE '  Username: ecta_inspector';
    RAISE NOTICE '  Password: inspector123';
  ELSE
    RAISE NOTICE '⏭ ECTA Inspector already exists';
  END IF;
  
  -- Create ECTA Supervisor
  SELECT EXISTS(SELECT 1 FROM users WHERE username = 'ecta_supervisor') INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    -- Hash for password "supervisor123" (you should change this in production)
    v_password_hash := crypt('supervisor123', gen_salt('bf'));
    
    INSERT INTO users (
      user_id, username, email, password_hash, role, 
      organization, status, created_at
    ) VALUES (
      'USER_ECTA_SUPERVISOR',
      'ecta_supervisor',
      'supervisor@ecta.gov.et',
      v_password_hash,
      'ECTA_SUPERVISOR',
      'ECTAMSP',
      'active',
      NOW()
    );
    RAISE NOTICE '✓ Created ECTA Supervisor user';
    RAISE NOTICE '  Username: ecta_supervisor';
    RAISE NOTICE '  Password: supervisor123';
  ELSE
    RAISE NOTICE '⏭ ECTA Supervisor already exists';
  END IF;
  
  -- Create ECTA Admin (if doesn't exist)
  SELECT EXISTS(SELECT 1 FROM users WHERE username = 'ecta_admin') INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    v_password_hash := crypt('ecta123', gen_salt('bf'));
    
    INSERT INTO users (
      user_id, username, email, password_hash, role, 
      organization, status, created_at
    ) VALUES (
      'USER_ECTA_ADMIN',
      'ecta_admin',
      'admin@ecta.gov.et',
      v_password_hash,
      'ECTA_ADMIN',
      'ECTAMSP',
      'active',
      NOW()
    );
    RAISE NOTICE '✓ Created ECTA Admin user';
    RAISE NOTICE '  Username: ecta_admin';
    RAISE NOTICE '  Password: ecta123';
  ELSE
    RAISE NOTICE '⏭ ECTA Admin already exists';
  END IF;
  
END $$;

-- Show all ECTA users
\echo ''
\echo '=== Current ECTA Users ==='
SELECT 
  username,
  role,
  email,
  status,
  created_at::DATE as created_date
FROM users
WHERE organization = 'ECTAMSP'
ORDER BY role;

\echo ''
\echo '=== Login Credentials (Change passwords in production!) ==='
\echo 'Inspector: ecta_inspector / inspector123'
\echo 'Supervisor: ecta_supervisor / supervisor123'
\echo 'Admin: ecta_admin / ecta123'
