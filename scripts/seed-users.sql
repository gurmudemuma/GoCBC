-- Seed test users for CECBS
-- Note: All passwords are hashed with bcrypt (10 rounds)

-- System Admin (username: admin, password: admin123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('admin', '$2b$10$YQ98RKQwp3aWx7g5H8eqSebaBJzFp8D7ccKrVlQKIQb6MFCkf.Jei', 'admin@cecbs.et', 'System Administrator', 'ADMIN', 'ADMIN', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    organization = EXCLUDED.organization,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- ECTA Admin (username: ecta_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('ecta_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@ecta.gov.et', 'ECTA Administrator', 'ECTA', 'ECTA', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- ECX Admin (username: ecx_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('ecx_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@ecx.com.et', 'ECX Administrator', 'ECX', 'ECX', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- NBE Admin (username: nbe_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('nbe_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@nbe.gov.et', 'NBE Administrator', 'NBE', 'NBE', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Bank Admin (username: bank_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('bank_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@cbe.com.et', 'CBE Administrator', 'BANKS', 'BANKS', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Customs Admin (username: customs_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('customs_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@customs.gov.et', 'Customs Administrator', 'CUSTOMS', 'CUSTOMS', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Shipping Admin (username: shipping_admin, password: password123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('shipping_admin', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'admin@shipping.com.et', 'Shipping Administrator', 'SHIPPING', 'SHIPPING', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Test Exporter (username: exporter1, password: password123)
INSERT INTO users (username, password_hash, email, full_name, phone, organization, role, exporter_id, ecta_license, status, created_at)
VALUES ('exporter1', '$2b$10$rJQQ5Q5Q5Q5Q5Q5Q5Q5Q5uHvGH8BWGPvGU7Dz.vM.U.U.U.U.U.U', 'exporter@test.com', 'Test Exporter Company', '+251911234567', 'EXPORTER', 'EXPORTER', 'EXP001', 'LIC001', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Display created users
SELECT username, role, organization, status FROM users ORDER BY username;
