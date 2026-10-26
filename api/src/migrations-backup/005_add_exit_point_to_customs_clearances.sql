-- Add exit_point column to customs_clearances table

ALTER TABLE customs_clearances 
ADD COLUMN IF NOT EXISTS exit_point VARCHAR(100);

-- Add index for exit_point
CREATE INDEX IF NOT EXISTS idx_clearances_exit_point ON customs_clearances(exit_point);
