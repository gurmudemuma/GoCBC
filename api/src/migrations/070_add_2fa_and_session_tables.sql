-- Migration 070: Add 2FA and session management tables
-- Created: 2026-11-10
-- Purpose: Support two-factor authentication and user session tracking

-- ============================================================================
-- 1. User 2FA Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- TOTP (Time-based One-Time Password) settings
    totp_secret VARCHAR(255), -- Base32 encoded secret
    is_enabled BOOLEAN DEFAULT false,
    
    -- Backup codes (hashed)
    backup_codes JSONB, -- Array of hashed backup codes
    backup_codes_used JSONB DEFAULT '[]', -- Array of used backup code indices
    
    -- Timestamps
    setup_at TIMESTAMP,
    verified_at TIMESTAMP,
    disabled_at TIMESTAMP,
    last_used_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_2fa_settings_backup_codes_valid 
        CHECK (backup_codes IS NULL OR jsonb_typeof(backup_codes) = 'array'),
    CONSTRAINT user_2fa_settings_backup_codes_used_valid 
        CHECK (jsonb_typeof(backup_codes_used) = 'array')
);

CREATE INDEX idx_user_2fa_settings_user ON user_2fa_settings(user_id);
CREATE INDEX idx_user_2fa_settings_enabled ON user_2fa_settings(is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- 2. User Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session details
    token_hash VARCHAR(255), -- Hashed JWT token for revocation
    refresh_token_hash VARCHAR(255), -- Hashed refresh token
    
    -- Device/browser information
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet', 'unknown'
    browser VARCHAR(100),
    os VARCHAR(100),
    location VARCHAR(255), -- City, Country (from IP geolocation)
    
    -- Session status
    is_active BOOLEAN DEFAULT true,
    is_current BOOLEAN DEFAULT false, -- Mark the current session
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    
    -- Revocation details
    revoked_by INTEGER REFERENCES users(id),
    revocation_reason VARCHAR(255),
    
    CONSTRAINT valid_device_type CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown'))
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);

-- ============================================================================
-- 3. 2FA Verification Log Table (optional - for audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_2fa_verification_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Verification details
    verification_method VARCHAR(50) NOT NULL, -- 'totp', 'backup_code', 'sms', 'email'
    was_successful BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    
    -- Request details
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Timestamp
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_verification_method CHECK (verification_method IN (
        'totp', 'backup_code', 'sms', 'email', 'recovery'
    ))
);

CREATE INDEX idx_2fa_verification_log_user ON user_2fa_verification_log(user_id);
CREATE INDEX idx_2fa_verification_log_attempted ON user_2fa_verification_log(attempted_at);
CREATE INDEX idx_2fa_verification_log_success ON user_2fa_verification_log(was_successful);

-- ============================================================================
-- 4. Add 2FA column to users table if not exists
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- 5. Session Activity Log Table (optional - for detailed tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_activity_log (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    status_code INTEGER,
    
    -- Request details
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Timing
    duration_ms INTEGER, -- Request duration in milliseconds
    
    -- Timestamp
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'login', 'logout', 'api_call', 'page_view', 'action', 'error'
    )),
    CONSTRAINT valid_http_method CHECK (http_method IN (
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
    ))
);

CREATE INDEX idx_session_activity_log_session ON session_activity_log(session_id);
CREATE INDEX idx_session_activity_log_user ON session_activity_log(user_id);
CREATE INDEX idx_session_activity_log_occurred ON session_activity_log(occurred_at);
CREATE INDEX idx_session_activity_log_type ON session_activity_log(activity_type);

-- ============================================================================
-- 6. Trusted Devices Table (optional - for "Remember this device" feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_trusted_devices (
    device_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device identification
    device_fingerprint VARCHAR(255) NOT NULL, -- Hash of device characteristics
    device_name VARCHAR(255), -- User-friendly name
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Trust status
    is_trusted BOOLEAN DEFAULT true,
    trust_level VARCHAR(50) DEFAULT 'STANDARD', -- 'STANDARD', 'HIGH', 'REVOKED'
    
    -- Timestamps
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional trust expiration
    revoked_at TIMESTAMP,
    
    -- Metadata
    ip_address VARCHAR(50),
    location VARCHAR(255),
    
    CONSTRAINT valid_trust_level CHECK (trust_level IN ('STANDARD', 'HIGH', 'REVOKED'))
);

CREATE INDEX idx_trusted_devices_user ON user_trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_fingerprint ON user_trusted_devices(device_fingerprint);
CREATE INDEX idx_trusted_devices_trusted ON user_trusted_devices(is_trusted) WHERE is_trusted = true;
CREATE INDEX idx_trusted_devices_expires ON user_trusted_devices(expires_at);

-- ============================================================================
-- 7. Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_2fa_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_2fa_settings_updated
    BEFORE UPDATE ON user_2fa_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_2fa_session_timestamp();

-- ============================================================================
-- 8. Trigger to update last_activity on session updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true AND OLD.is_active = true THEN
        NEW.last_activity = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_sessions_activity
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_last_activity();

-- ============================================================================
-- 9. Function to cleanup expired sessions (can be called periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = false, 
        revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = 'expired'
    WHERE is_active = true 
      AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_2fa_settings TO gocbc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO gocbc_app;
GRANT SELECT, INSERT ON user_2fa_verification_log TO gocbc_app;
GRANT SELECT, INSERT ON session_activity_log TO gocbc_app;
GRANT SELECT, INSERT, UPDATE ON user_trusted_devices TO gocbc_app;

GRANT USAGE, SELECT ON SEQUENCE user_2fa_settings_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE user_2fa_verification_log_id_seq TO gocbc_app;
GRANT USAGE, SELECT ON SEQUENCE session_activity_log_id_seq TO gocbc_app;

-- Also grant UPDATE on users table for two_factor_enabled column
GRANT UPDATE (two_factor_enabled) ON users TO gocbc_app;

-- ============================================================================
-- 11. Create view for active sessions summary
-- ============================================================================

CREATE OR REPLACE VIEW user_active_sessions_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    COUNT(us.session_id) as active_session_count,
    MAX(us.last_activity) as last_activity,
    ARRAY_AGG(
        jsonb_build_object(
            'session_id', us.session_id,
            'ip_address', us.ip_address,
            'device_type', us.device_type,
            'location', us.location,
            'last_activity', us.last_activity
        ) ORDER BY us.last_activity DESC
    ) FILTER (WHERE us.session_id IS NOT NULL) as sessions
FROM users u
LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = true
WHERE u.status = 'active'
GROUP BY u.id, u.username, u.email, u.role;

GRANT SELECT ON user_active_sessions_summary TO gocbc_app;

-- ============================================================================
-- 12. Create view for 2FA status
-- ============================================================================

CREATE OR REPLACE VIEW user_2fa_status_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    u.two_factor_enabled,
    s.is_enabled as settings_enabled,
    s.setup_at,
    s.verified_at,
    s.last_used_at,
    CASE 
        WHEN s.is_enabled = true AND u.two_factor_enabled = true THEN 'enabled'
        WHEN s.totp_secret IS NOT NULL AND s.is_enabled = false THEN 'setup_incomplete'
        ELSE 'disabled'
    END as status
FROM users u
LEFT JOIN user_2fa_settings s ON u.id = s.user_id
WHERE u.status = 'active';

GRANT SELECT ON user_2fa_status_summary TO gocbc_app;

-- ============================================================================
-- Migration complete
-- ============================================================================
