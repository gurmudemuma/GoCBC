-- Migration 078: create user_activity_log (round 3, Area 1)
--
-- api/src/routes/users.ts logUserActivity() INSERTs into user_activity_log
-- on every user-management action (create/update/status/reset/delete/
-- permissions) and GET /users/activity-log SELECTs from it — but no
-- migration ever created the table. Every audit write therefore failed
-- with `relation "user_activity_log" does not exist` (105 such errors in
-- api/logs/error.log at 2026-11-13), silently swallowed by the helper's
-- try/catch, so admin actions claimed success and left NO audit row, and
-- the activity-log endpoint itself 500ed. This creates the table exactly
-- as the existing INSERT/SELECT code expects it.
-- Idempotent: IF NOT EXISTS, no data is altered.
CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  username VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_user_id INTEGER,
  target_username VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  performed_by VARCHAR(255),
  performed_by_role VARCHAR(50),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_target ON user_activity_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON user_activity_log(created_at DESC);
