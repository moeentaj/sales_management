-- backend/scripts/migrations/002_distributor_features.sql
-- Migration to add missing distributor features

-- Create distributor_contacts table
CREATE TABLE IF NOT EXISTS distributor_contacts (
    contact_id SERIAL PRIMARY KEY,
    distributor_id INTEGER NOT NULL REFERENCES distributors(distributor_id) ON DELETE CASCADE,
    contact_person_name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    designation VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_distributor_contacts_distributor_id ON distributor_contacts(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_contacts_is_primary ON distributor_contacts(distributor_id, is_primary);

-- Create sales_staff_distributors table for staff assignments
CREATE TABLE IF NOT EXISTS sales_staff_distributors (
    assignment_id SERIAL PRIMARY KEY,
    sales_staff_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    distributor_id INTEGER NOT NULL REFERENCES distributors(distributor_id) ON DELETE CASCADE,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sales_staff_id, distributor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_staff_distributors_staff_id ON sales_staff_distributors(sales_staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_staff_distributors_distributor_id ON sales_staff_distributors(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sales_staff_distributors_active ON sales_staff_distributors(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need updated_at
DROP TRIGGER IF EXISTS update_distributor_contacts_updated_at ON distributor_contacts;
CREATE TRIGGER update_distributor_contacts_updated_at
    BEFORE UPDATE ON distributor_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_staff_distributors_updated_at ON sales_staff_distributors;
CREATE TRIGGER update_sales_staff_distributors_updated_at
    BEFORE UPDATE ON sales_staff_distributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix the invoices table issue (the 500 error is likely due to missing LEFT JOIN)
-- Add created_by and updated_at columns to distributors if they don't exist
ALTER TABLE distributors 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have updated_at
UPDATE distributors SET updated_at = created_at WHERE updated_at IS NULL;

-- Add trigger for distributors updated_at
DROP TRIGGER IF EXISTS update_distributors_updated_at ON distributors;
CREATE TRIGGER update_distributors_updated_at
    BEFORE UPDATE ON distributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for distributor summary with stats (optional but useful)
CREATE OR REPLACE VIEW distributor_summary AS
SELECT 
    d.distributor_id,
    d.distributor_name,
    d.address,
    d.city,
    d.state,
    d.postal_code,
    d.ntn_number,
    d.primary_contact_person,
    d.primary_whatsapp_number,
    d.is_active,
    d.created_at,
    d.updated_at,
    u.full_name as created_by_name,
    COALESCE(invoice_stats.total_invoices, 0) as total_invoices,
    COALESCE(invoice_stats.total_amount, 0) as total_amount,
    COALESCE(invoice_stats.paid_amount, 0) as paid_amount,
    COALESCE(invoice_stats.balance_amount, 0) as balance_amount,
    COALESCE(contact_count.total_contacts, 0) as total_contacts,
    COALESCE(staff_count.total_staff, 0) as total_assigned_staff
FROM distributors d
LEFT JOIN users u ON u.user_id = d.created_by
LEFT JOIN (
    SELECT 
        distributor_id,
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(paid_amount) as paid_amount,
        SUM(total_amount - paid_amount) as balance_amount
    FROM invoices 
    GROUP BY distributor_id
) invoice_stats ON invoice_stats.distributor_id = d.distributor_id
LEFT JOIN (
    SELECT 
        distributor_id,
        COUNT(*) as total_contacts
    FROM distributor_contacts 
    GROUP BY distributor_id
) contact_count ON contact_count.distributor_id = d.distributor_id
LEFT JOIN (
    SELECT 
        distributor_id,
        COUNT(*) as total_staff
    FROM sales_staff_distributors 
    WHERE is_active = true
    GROUP BY distributor_id
) staff_count ON staff_count.distributor_id = d.distributor_id;