-- backend/scripts/migrations/002_categories_table.sql
-- Category Management System Migration
-- Fixed version with proper column references

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(category_name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);

-- Insert some default categories (only if they don't exist)
INSERT INTO categories (category_name, description, display_order, is_active) 
SELECT * FROM (VALUES
    ('Electronics', 'Electronic products and gadgets', 1, true),
    ('Food & Beverages', 'Food items and beverages', 2, true),
    ('Clothing', 'Apparel and fashion items', 3, true),
    ('Home & Garden', 'Home improvement and garden products', 4, true),
    ('Health & Beauty', 'Health care and beauty products', 5, true),
    ('Sports & Outdoors', 'Sports equipment and outdoor gear', 6, true),
    ('Books & Media', 'Books, music, and media products', 7, true),
    ('Automotive', 'Car parts and automotive accessories', 8, true),
    ('Office Supplies', 'Office and business supplies', 9, true),
    ('Toys & Games', 'Toys, games, and entertainment products', 10, true)
) AS v(category_name, description, display_order, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE categories.category_name = v.category_name
);

-- Migrate existing product categories to the new categories table
-- This will create categories for any existing distinct category values in products table
INSERT INTO categories (category_name, description, display_order, is_active)
WITH base AS (
  SELECT COALESCE(MAX(display_order), 0) AS base_order
  FROM categories
),
to_import AS (
  SELECT DISTINCT p.category AS category_name
  FROM products p
  WHERE p.category IS NOT NULL
    AND p.category <> ''
    AND NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.category_name = p.category
    )
)
SELECT
  ti.category_name,
  'Imported from existing products' AS description,
  b.base_order + ROW_NUMBER() OVER (ORDER BY ti.category_name) AS display_order,
  true AS is_active
FROM to_import ti
CROSS JOIN base b
ORDER BY ti.category_name;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Comments for documentation
COMMENT ON TABLE categories IS 'Product categories management table';
COMMENT ON COLUMN categories.category_id IS 'Primary key for categories';
COMMENT ON COLUMN categories.category_name IS 'Unique name of the category';
COMMENT ON COLUMN categories.description IS 'Optional description of the category';
COMMENT ON COLUMN categories.display_order IS 'Order for displaying categories (lower number = higher priority)';
COMMENT ON COLUMN categories.is_active IS 'Whether the category is active and can be used';
COMMENT ON COLUMN categories.created_at IS 'Timestamp when category was created';
COMMENT ON COLUMN categories.updated_at IS 'Timestamp when category was last updated';