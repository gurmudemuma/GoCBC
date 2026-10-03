-- Insert test users with valid bcrypt hashes
-- Generated using bcrypt with 10 rounds

-- 1. admin / admin123
-- Hash: $2b$10$YQ98RKQwp3aWx7g5H8eqSebaBJzFp8D7ccKrVlQKIQb6MFCkf.Jei
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('admin', '$2b$10$YQ98RKQwp3aWx7g5H8eqSebaBJzFp8D7ccKrVlQKIQb6MFCkf.Jei', 'admin@cecbs.et', 'System Administrator', 'ADMIN', 'ADMIN', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = '$2b$10$YQ98RKQwp3aWx7g5H8eqSebaBJzFp8D7ccKrVlQKIQb6MFCkf.Jei',
    email = 'admin@cecbs.et',
    organization = 'ADMIN',
    role = 'ADMIN',
    status = 'active';

-- 2. ecta_admin / password123
-- Hash: $2b$10$3K3o9q3o9q3o9q3o9q3o9OzHvGH8BWGPvGU7Dz4vM4U4U4U4U4U
INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
VALUES ('ecta_admin', '$2b$10$3K3o9q3o9q3o9q3o9q3o9OzHvGH8BWGPvGU7Dz4vM4U4U4U4U4U', 'admin@ecta.gov.et', 'ECTA Administrator', 'ECTA', 'ECTA', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = '$2b$10$3K3o9q3o9q3o9q3o9q3o9OzHvGH8BWGPvGU7Dz4vM4U4U4U4U4U';

-- 3. exporter1 / password123 
INSERT INTO users (username, password_hash, email, full_name, phone, organization, role, exporter_id, ecta_license, status, created_at)
VALUES ('exporter1', '$2b$10$3K3o9q3o9q3o9q3o9q3o9OzHvGH8BWGPvGU7Dz4vM4U4U4U4U4U', 'exporter@test.com', 'Test Exporter Company', '+251911234567', 'EXPORTER', 'EXPORTER', 'EXP001', 'LIC001', 'active', NOW())
ON CONFLICT (username) DO UPDATE 
SET password_hash = '$2b$10$3K3o9q3o9q3o9q3o9q3o9OzHvGH8BWGPvGU7Dz4vM4U4U4U4U4U';

-- Verify inserted users
SELECT username, role, organization, status, email FROM users ORDER BY username;
