-- Add manual override field to merchants table
-- This allows merchants to force open/close regardless of schedule

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN merchants.is_manual_override IS 'When true, isOpen value overrides schedule. When false, follows opening hours schedule.';
