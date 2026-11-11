-- ============================================================================
-- 067b_create_gocbc_app_role.sql
-- ============================================================================
-- The 066-070 migrations (068, 069, 070) GRANT table/sequence permissions TO
-- role gocbc_app, but no migration, compose file, or init script ever created
-- that role. On a fresh database 068 failed with:
--   ERROR: role "gocbc_app" does not exist (at the first GRANT)
-- and the whole migration rolled back, so the API could not start. The Docker
-- host runs Postgres as POSTGRES_USER=cecbs, so it would fail the same way.
--
-- Nothing connects to the database as gocbc_app: the API connects as cecbs
-- (DATABASE_URL). The role only needs to exist as a GRANT target, so it is
-- created NOLOGIN with no password.
--
-- File name 067b sorts after 067_add_advanced_shipping_tables.sql and before
-- 068_add_customs_extended_tables.sql, so the role exists before the first
-- GRANT runs. The runner tracks migrations by filename, so this also applies
-- on databases where 000-067 are already recorded.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gocbc_app') THEN
    CREATE ROLE gocbc_app NOLOGIN;
  END IF;
END
$$;
