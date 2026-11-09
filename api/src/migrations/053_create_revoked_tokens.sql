-- 053: JWT token revocation (logout / refresh rotation)
--
-- Previously logout was client-side only and /auth/refresh re-issued
-- from any unexpired token with no database check, so a token kept
-- working (and could be extended) after logout or after the account
-- was suspended. Tokens now carry a jti (see api/src/routes/auth.ts);
-- authMiddleware rejects any jti present in this table, and logout /
-- refresh insert the old token's jti here.
--
-- Rows are kept until the token would have expired anyway, so the
-- table stays small; a periodic cleanup can delete expired rows.

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
    ON revoked_tokens (expires_at);
