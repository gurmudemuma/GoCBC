-- Migration 073: phytosanitary certificate detail fields (leg2 audit #10)
-- The form collects placeOfOrigin, pointOfEntry, packagingType,
-- numberOfPackages, distinguishingMarks, meansOfConveyance and
-- validityPeriod on every phyto step, and the chaincode struct already
-- carries them, but the Postgres mirror had nowhere to store them (the
-- API dropped them before they reached the ledger). Also adds the
-- shipment/exporter linkage the request mirror now writes.
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS shipment_id VARCHAR(100);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS place_of_origin VARCHAR(255);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS point_of_entry VARCHAR(255);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(100);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS number_of_packages INTEGER;
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS distinguishing_marks VARCHAR(255);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS means_of_conveyance VARCHAR(255);
ALTER TABLE phytosanitary_certificates ADD COLUMN IF NOT EXISTS validity_period VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_phyto_shipment ON phytosanitary_certificates(shipment_id);
