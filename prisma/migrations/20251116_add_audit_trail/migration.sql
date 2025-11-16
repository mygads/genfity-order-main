-- Add audit trail fields to all menu management tables
-- This enables tracking who created, updated, and deleted items

-- Add audit trail to menus table
ALTER TABLE menus 
  ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by_user_id BIGINT REFERENCES users(id);

-- Add audit trail to addon_items table
ALTER TABLE addon_items 
  ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by_user_id BIGINT REFERENCES users(id);

-- Add audit trail to menu_categories table
ALTER TABLE menu_categories 
  ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by_user_id BIGINT REFERENCES users(id);

-- Add audit trail to addon_categories table
ALTER TABLE addon_categories 
  ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by_user_id BIGINT REFERENCES users(id);

-- Create indexes for soft delete queries
CREATE INDEX idx_menus_deleted_at ON menus(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_addon_items_deleted_at ON addon_items(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_menu_categories_deleted_at ON menu_categories(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_addon_categories_deleted_at ON addon_categories(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create indexes for audit queries
CREATE INDEX idx_menus_created_by ON menus(created_by_user_id);
CREATE INDEX idx_menus_updated_by ON menus(updated_by_user_id);
CREATE INDEX idx_addon_items_created_by ON addon_items(created_by_user_id);
CREATE INDEX idx_addon_items_updated_by ON addon_items(updated_by_user_id);

-- Add comments
COMMENT ON COLUMN menus.created_by_user_id IS 'User who created this menu item';
COMMENT ON COLUMN menus.updated_by_user_id IS 'User who last updated this menu item';
COMMENT ON COLUMN menus.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN menus.deleted_by_user_id IS 'User who deleted this menu item';
