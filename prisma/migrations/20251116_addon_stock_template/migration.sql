-- Add stock template fields to addon_items
-- This enables addon items to have the same auto-reset stock functionality as menu items

-- Add new columns
ALTER TABLE addon_items 
  ADD COLUMN daily_stock_template INTEGER,
  ADD COLUMN auto_reset_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN last_stock_reset_at TIMESTAMPTZ;

-- Create index for auto-reset query optimization
CREATE INDEX idx_addon_items_auto_reset 
  ON addon_items(auto_reset_stock, last_stock_reset_at)
  WHERE auto_reset_stock = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN addon_items.daily_stock_template IS 'Template value for daily stock reset';
COMMENT ON COLUMN addon_items.auto_reset_stock IS 'Enable automatic daily stock reset to template value';
COMMENT ON COLUMN addon_items.last_stock_reset_at IS 'Timestamp of last automatic stock reset';
