-- Migration 062: add the ECX lot rejection reason to the mirror table.
--
-- GradeECXLot sets RejectionReason on-chain when moisture exceeds 12%
-- (and the new RejectECXLot does so for any other cause), but ecx_lots
-- had no column for it, so the PG mirror — and therefore GET /ecx/lots
-- and the ECX portal — could never show why a lot was rejected.
-- Follows the same pattern as 030/036 (rejection_reason on contracts/LCs).
ALTER TABLE IF EXISTS ecx_lots
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
