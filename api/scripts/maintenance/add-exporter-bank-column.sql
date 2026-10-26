-- Add exporter_bank column to sales_contracts table
ALTER TABLE sales_contracts ADD COLUMN IF NOT EXISTS exporter_bank VARCHAR(255);

-- Add advising_bank column to letters_of_credit table
ALTER TABLE letters_of_credit ADD COLUMN IF NOT EXISTS advising_bank VARCHAR(255);

-- Update exporter_bank with default banks based on exporter_id pattern
UPDATE sales_contracts 
SET exporter_bank = 'Commercial Bank of Ethiopia'
WHERE exporter_bank IS NULL AND exporter_id LIKE 'EXP%';

-- Update advising_bank from exporter_bank via contract
UPDATE letters_of_credit lc
SET advising_bank = sc.exporter_bank
FROM sales_contracts sc
WHERE lc.contract_id = sc.contract_id AND lc.advising_bank IS NULL;

-- Show results
SELECT 'sales_contracts' as table_name, COUNT(*) as total, COUNT(exporter_bank) as with_exporter_bank FROM sales_contracts
UNION ALL
SELECT 'letters_of_credit', COUNT(*), COUNT(advising_bank) FROM letters_of_credit;
