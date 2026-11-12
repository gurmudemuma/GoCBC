-- Migration 074: server-generated approval IDs + licence uniqueness (LEG 1 / F7)
--
-- ECTA approval used to invent exporterId (`EXP` + 7 random digits) and
-- ectaLicenseNumber (`ECTA-LIC-<year>-<3 digits>`, 900 possibilities a
-- year) in the browser, with no uniqueness check anywhere, so two
-- approvals could mint the same licence number. The API now generates
-- both IDs from these sequences (exporters.ts approve route) and
-- pre-checks collisions; the unique indexes below are the backstop.
-- Idempotent: IF NOT EXISTS throughout, no data is altered.
-- Verified against the live dev database before landing: no duplicate
-- license_number or exporter_id values exist, so the indexes build
-- cleanly. Sequence starts are above every existing value shape
-- (existing EXP ids are EXT/timestamp forms, never 7-digit sequences).

CREATE SEQUENCE IF NOT EXISTS exporter_id_seq START WITH 1000000;
CREATE SEQUENCE IF NOT EXISTS ecta_license_seq START WITH 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exporter_applications_exporter_id_unique
  ON exporter_applications (exporter_id)
  WHERE exporter_id IS NOT NULL AND exporter_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exporter_applications_license_number_unique
  ON exporter_applications (license_number)
  WHERE license_number IS NOT NULL AND license_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exporter_applications_ecta_license_number_unique
  ON exporter_applications (ecta_license_number)
  WHERE ecta_license_number IS NOT NULL AND ecta_license_number <> '';
