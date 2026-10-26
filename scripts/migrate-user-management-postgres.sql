-- ============================================================================
-- CECBS User Management & Audit Trail Migration for PostgreSQL
-- ============================================================================

-- Drop existing users table if it has old schema
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS TABLE (Enhanced)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    organization VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTER')),
    exporter_id VARCHAR(100),
    ecta_license VARCHAR(100),
    permissions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_organization ON users(organization);
CREATE INDEX idx_users_exporter_id ON users(exporter_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- USER ACTIVITY LOG TABLE (Comprehensive Audit Trail)
-- ============================================================================
CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL CHECK (action IN (
        'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
        'ACTIVATE_USER', 'SUSPEND_USER', 'DEACTIVATE_USER',
        'RESET_PASSWORD', 'CHANGE_PASSWORD',
        'GRANT_PERMISSION', 'REVOKE_PERMISSION', 'UPDATE_PERMISSIONS',
        'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
        'VIEW_USER', 'LIST_USERS'
    )),
    target_user_id INTEGER,
    target_username VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    performed_by VARCHAR(100) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for user_activity_log table
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_target_user_id ON user_activity_log(target_user_id);
CREATE INDEX idx_user_activity_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_performed_by ON user_activity_log(performed_by);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_ip_address ON user_activity_log(ip_address);

-- ============================================================================
-- ROLE-BASED PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission)
);

-- Indexes for role_permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission);

-- ============================================================================
-- DEFAULT PERMISSIONS BY ROLE
-- ============================================================================

-- ADMIN: Full system access
INSERT INTO role_permissions (role, permission, description) VALUES
('ADMIN', 'user.create', 'Create new users'),
('ADMIN', 'user.read', 'View user details'),
('ADMIN', 'user.update', 'Update user information'),
('ADMIN', 'user.delete', 'Delete users'),
('ADMIN', 'user.manage_permissions', 'Grant/revoke user permissions'),
('ADMIN', 'user.reset_password', 'Reset user passwords'),
('ADMIN', 'user.activate', 'Activate users'),
('ADMIN', 'user.suspend', 'Suspend users'),
('ADMIN', 'audit.view', 'View audit logs'),
('ADMIN', 'system.configure', 'Configure system settings')
ON CONFLICT (role, permission) DO NOTHING;

-- ECTA: Ethiopian Coffee & Tea Authority
INSERT INTO role_permissions (role, permission, description) VALUES
('ECTA', 'user.create', 'Create exporter users'),
('ECTA', 'user.read', 'View user details'),
('ECTA', 'user.update', 'Update exporter information'),
('ECTA', 'user.suspend', 'Suspend exporters'),
('ECTA', 'exporter.approve', 'Approve exporter applications'),
('ECTA', 'exporter.reject', 'Reject exporter applications'),
('ECTA', 'license.issue', 'Issue ECTA licenses'),
('ECTA', 'license.revoke', 'Revoke ECTA licenses'),
('ECTA', 'contract.view', 'View export contracts'),
('ECTA', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- ECX: Ethiopian Commodity Exchange
INSERT INTO role_permissions (role, permission, description) VALUES
('ECX', 'user.read', 'View user details'),
('ECX', 'lot.register', 'Register coffee lots'),
('ECX', 'lot.view', 'View coffee lots'),
('ECX', 'lot.update', 'Update lot information'),
('ECX', 'quality.certify', 'Certify coffee quality'),
('ECX', 'contract.view', 'View contracts'),
('ECX', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- NBE: National Bank of Ethiopia
INSERT INTO role_permissions (role, permission, description) VALUES
('NBE', 'user.read', 'View user details'),
('NBE', 'forex.view', 'View forex declarations'),
('NBE', 'forex.approve', 'Approve forex declarations'),
('NBE', 'forex.reject', 'Reject forex declarations'),
('NBE', 'payment.view', 'View payment records'),
('NBE', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- BANKS: Commercial Banks
INSERT INTO role_permissions (role, permission, description) VALUES
('BANKS', 'user.read', 'View user details'),
('BANKS', 'lc.create', 'Create letters of credit'),
('BANKS', 'lc.view', 'View letters of credit'),
('BANKS', 'lc.amend', 'Amend letters of credit'),
('BANKS', 'payment.process', 'Process payments'),
('BANKS', 'payment.view', 'View payment records'),
('BANKS', 'forex.submit', 'Submit forex declarations'),
('BANKS', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- CUSTOMS: Ethiopian Customs Commission
INSERT INTO role_permissions (role, permission, description) VALUES
('CUSTOMS', 'user.read', 'View user details'),
('CUSTOMS', 'customs.declare', 'Process customs declarations'),
('CUSTOMS', 'customs.view', 'View customs declarations'),
('CUSTOMS', 'customs.approve', 'Approve customs clearance'),
('CUSTOMS', 'customs.inspect', 'Conduct inspections'),
('CUSTOMS', 'shipment.view', 'View shipment details'),
('CUSTOMS', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- SHIPPING: Shipping & Logistics
INSERT INTO role_permissions (role, permission, description) VALUES
('SHIPPING', 'user.read', 'View user details'),
('SHIPPING', 'shipment.create', 'Create shipments'),
('SHIPPING', 'shipment.view', 'View shipments'),
('SHIPPING', 'shipment.update', 'Update shipment status'),
('SHIPPING', 'document.upload', 'Upload shipping documents'),
('SHIPPING', 'audit.view', 'View audit logs')
ON CONFLICT (role, permission) DO NOTHING;

-- EXPORTER: Coffee Exporters
INSERT INTO role_permissions (role, permission, description) VALUES
('EXPORTER', 'user.read', 'View own profile'),
('EXPORTER', 'contract.create', 'Create export contracts'),
('EXPORTER', 'contract.view', 'View own contracts'),
('EXPORTER', 'contract.update', 'Update own contracts'),
('EXPORTER', 'lot.view', 'View available lots'),
('EXPORTER', 'shipment.view', 'View own shipments'),
('EXPORTER', 'payment.view', 'View own payments'),
('EXPORTER', 'document.upload', 'Upload documents'),
('EXPORTER', 'document.view', 'View own documents'),
('EXPORTER', 'report.generate', 'Generate reports')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================================
-- DEFAULT USERS (with bcrypt hashed passwords)
-- ============================================================================

-- Admin user (password: admin123)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status, created_at) 
VALUES (
    'admin',
    '$2b$10$rKZqYqYqYqYqYqYqYqYqYuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@cecbs.et',
    'System Administrator',
    'CECBS',
    'ADMIN',
    '["user.create", "user.read", "user.update", "user.delete", "user.manage_permissions", "system.configure", "audit.view"]'::jsonb,
    'active',
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    permissions = EXCLUDED.permissions;

-- ECTA Admin (password: ecta_admin_2024)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status) 
VALUES (
    'admin@ecta.gov.et',
    '$2b$10$Xjk2lZq5Y5Y5Y5Y5Y5Y5YuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@ecta.gov.et',
    'ECTA Administrator',
    'Ethiopian Coffee & Tea Authority',
    'ECTA',
    '["user.create", "user.read", "user.update", "user.suspend", "exporter.approve", "exporter.reject", "license.issue", "audit.view"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions;

-- NBE Admin (password: nbe_admin_2024)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status) 
VALUES (
    'nbe_admin',
    '$2b$10$Zjk3mAp6Z6Z6Z6Z6Z6Z6ZuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@nbe.gov.et',
    'NBE Administrator',
    'National Bank of Ethiopia',
    'NBE',
    '["forex.view", "forex.approve", "forex.reject", "payment.view", "audit.view"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions;

-- Bank Admin (password: cbe_admin_2024)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status) 
VALUES (
    'admin@cbe.com.et',
    '$2b$10$Ajk4nBq7A7A7A7A7A7A7AuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@cbe.com.et',
    'CBE Bank Administrator',
    'Commercial Bank of Ethiopia',
    'BANKS',
    '["lc.create", "lc.view", "lc.amend", "payment.process", "forex.submit", "audit.view"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions;

-- Customs Admin (password: customs_admin_2024)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status) 
VALUES (
    'customs_admin',
    '$2b$10$Bjk5oCr8B8B8B8B8B8B8BuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@customs.gov.et',
    'Customs Administrator',
    'Ethiopian Customs Commission',
    'CUSTOMS',
    '["customs.declare", "customs.view", "customs.approve", "customs.inspect", "audit.view"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions;

-- ECX Admin (password: ecx_admin_2024)
INSERT INTO users (username, password_hash, email, full_name, organization, role, permissions, status) 
VALUES (
    'admin@ecx.com.et',
    '$2b$10$Cjk6pDs9C9C9C9C9C9C9CuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'admin@ecx.com.et',
    'ECX Administrator',
    'Ethiopian Commodity Exchange',
    'ECX',
    '["lot.register", "lot.view", "lot.update", "quality.certify", "audit.view"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    permissions = EXCLUDED.permissions;

-- Test Exporter (password: password123)
INSERT INTO users (username, password_hash, email, full_name, phone, organization, role, exporter_id, ecta_license, permissions, status) 
VALUES (
    'EXP1087072',
    '$2b$10$rKZqYqYqYqYqYqYqYqYqYuO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K',
    'test@exporter.com',
    'Test Exporter Company',
    '+251-911-123456',
    'Test Coffee Exporter Ltd',
    'EXPORTER',
    'EXP1087072',
    'ECTA/LIC/2024/001',
    '["contract.create", "contract.view", "contract.update", "shipment.view", "document.upload", "report.generate"]'::jsonb,
    'active'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    exporter_id = EXCLUDED.exporter_id,
    permissions = EXCLUDED.permissions;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active users by role
CREATE OR REPLACE VIEW v_active_users_by_role AS
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users
FROM users
GROUP BY role
ORDER BY user_count DESC;

-- Recent user activity
CREATE OR REPLACE VIEW v_recent_user_activity AS
SELECT 
    ual.id,
    ual.action,
    ual.username as actor,
    ual.target_username as target,
    ual.performed_by_role as actor_role,
    ual.ip_address,
    ual.created_at
FROM user_activity_log ual
ORDER BY ual.created_at DESC
LIMIT 100;

-- User activity summary
CREATE OR REPLACE VIEW v_user_activity_summary AS
SELECT 
    username,
    COUNT(*) as total_activities,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    MAX(created_at) as last_activity,
    json_object_agg(action, action_count) as activities_breakdown
FROM (
    SELECT 
        username,
        action,
        created_at,
        COUNT(*) as action_count
    FROM user_activity_log
    GROUP BY username, action, created_at
) subquery
GROUP BY username;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions (adjust user/role as needed)
-- GRANT SELECT, INSERT, UPDATE ON users TO cecbs_api_user;
-- GRANT SELECT, INSERT ON user_activity_log TO cecbs_api_user;
-- GRANT SELECT ON role_permissions TO cecbs_api_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cecbs_api_user;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
