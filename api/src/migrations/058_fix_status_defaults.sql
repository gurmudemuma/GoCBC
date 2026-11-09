-- Migration 058: fix misleading status column defaults.
--
-- Several tables default new rows to a status no state machine produces,
-- so a row inserted without an explicit status looked like a state that
-- can never occur:
--   export_permits.status      'APPROVED' -> a permit that was never issued
--   phytosanitary_certificates 'ISSUED'   -> a certificate never requested
--   contracts.status           'draft'    -> chaincode starts at PENDING
--   letters_of_credit.status   'draft'    -> chaincode starts at PENDING
--   shipments.status           'draft'    -> chaincode starts at CREATED
--   payments.status            'pending'  -> chaincode starts at PENDING
-- The routes that insert these rows pass an explicit status today, so the
-- defaults are nearly dead — but any future insert that omits the column
-- would silently create a phantom state. This only changes the default for
-- future rows; existing rows are untouched.
ALTER TABLE export_permits ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE phytosanitary_certificates ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE letters_of_credit ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE shipments ALTER COLUMN status SET DEFAULT 'CREATED';
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'PENDING';
