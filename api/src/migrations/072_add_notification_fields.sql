-- Migration 072: in-app notifications — click-to-detail fields + audience model
--
-- The `notifications` table (000_initial_schema.sql) has existed since the
-- start but nothing ever wrote to it: a repo-wide grep finds zero
-- `INSERT INTO notifications`, and the UI NotificationCenter synthesised
-- its lists from contracts/shipments/payments instead. This migration adds
-- the columns the persisted feed + click-to-detail UI need. No stored rows
-- exist, so no backfill is required and no data is altered.
--
-- ADDRESSING MODEL (decided 2026-11-12, W1 notifications backend)
-- ----------------------------------------------------------------
-- A notification row is addressed in exactly one of three ways; the feed
-- (GET /api/v1/notifications) only ever returns rows the caller may see:
--
--   1. user_id INTEGER  — one specific user, the numeric users.id. The
--      JWT carries username/exporterId/role, NOT the numeric id, so this
--      is resolved best-effort (users lookup by exporter_id/username) and
--      may stay NULL. It is a precision aid, never the sole audience key.
--   2. role VARCHAR(50) — a CANONICAL BASE role audience: one of ECTA,
--      ECX, NBE, BANKS, CUSTOMS, SHIPPING, EXPORTER, ADMIN. Role variants
--      in users.role (ECTA_ADMIN, BANK_ADMIN, BANK, NBE OFFICER, ...) are
--      normalised to the base role on both write and read
--      (notificationService.normalizeNotificationRole), so an ECTA_ADMIN
--      sees rows addressed to ECTA and a BANK_ADMIN sees BANKS rows.
--      A row with role set and exporter_id NULL is a broadcast to every
--      user of that role.
--   3. exporter_id VARCHAR(100) — an exporter-scoped audience. Exporter
--      rows ALWAYS carry exporter_id (even when user_id could not be
--      resolved) so they can never leak to other exporters: the feed
--      matches it against the caller's JWT exporterId/username. The row's
--      role is 'EXPORTER' in that case.
--
-- An ADMIN caller sees every row (super-admin read-all). Every other
-- caller sees rows where user_id = their numeric id OR exporter_id =
-- their exporter id OR role = their base role. Rows with no audience at
-- all (legacy/unknown) are visible to nobody.
--
-- CLICK-TO-DETAIL
-- --------------
--   entity_type / entity_id — the workflow entity (contract, lc, forex,
--     inspection, shipment, payment, customs_declaration, permit, swift,
--     application) the notification is about; the UI uses these to open
--     the right detail view.
--   action_url — portal deep link in the form the UI already uses
--     (/portals/<portal>?tab=<tab>, cf. NotificationCenter.tsx), e.g.
--     /portals/ecta?tab=contracts. It is a navigation HINT: the UI owns
--     tab resolution and may remap it; entity_type/entity_id are the
--     authoritative link.
--   severity — info | success | warning | critical (UI badge colour).
--
-- The runner (api/src/utils/runMigrations.ts) reads this directory sorted
-- by filename and tracks applied files by name in _schema_migrations, so
-- 072 runs once, after 071. NOT applied by this change — file only; the
-- live database picks it up on the next API restart (coordinator-owned).

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100);

-- Feed reads filter on audience + recency; one index per predicate keeps
-- the role/exporter/user lookups off a sequential scan.
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_notifications_exporter_id ON notifications(exporter_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read, created_at DESC);
