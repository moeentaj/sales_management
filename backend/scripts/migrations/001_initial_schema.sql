 -- Database Schema for Field Sales Management System
-- File: scripts/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Staff table with enhanced fields
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'sales_staff')) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    id_card_number VARCHAR(50),
    id_card_image_url VARCHAR(500),
    profile_image_url VARCHAR(500),
    date_of_birth DATE,
    hire_date DATE,
    salary DECIMAL(10,2),
    commission_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff documents storage
CREATE TABLE staff_documents (
    document_id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'id_card', 'contract', 'bank_details', 'photo'
    document_name VARCHAR(200),
    document_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distributors table
CREATE TABLE distributors (
    distributor_id SERIAL PRIMARY KEY,
    distributor_name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    ntn_number VARCHAR(50),
    primary_contact_person VARCHAR(100),
    primary_whatsapp_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id)
);

-- Multiple contacts per distributor
CREATE TABLE distributor_contacts (
    contact_id SERIAL PRIMARY KEY,
    distributor_id INTEGER REFERENCES distributors(distributor_id) ON DELETE CASCADE,
    contact_person_name VARCHAR(100) NOT NULL,
    whatsapp_number VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    designation VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales staff to distributor assignments (many-to-many)
CREATE TABLE sales_staff_distributors (
    assignment_id SERIAL PRIMARY KEY,
    sales_staff_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    distributor_id INTEGER REFERENCES distributors(distributor_id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(sales_staff_id, distributor_id)
);

-- Products catalog
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(50) UNIQUE,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'piece',
    category VARCHAR(100),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    distributor_id INTEGER REFERENCES distributors(distributor_id),
    sales_staff_id INTEGER REFERENCES users(user_id),
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    notes TEXT,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL
);

-- Payments
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id),
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'online')) NOT NULL,
    check_number VARCHAR(50),
    check_image_url VARCHAR(500),
    bank_reference VARCHAR(100),
    collected_by INTEGER REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales targets for staff
CREATE TABLE sales_targets (
    target_id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    target_month DATE NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    achieved_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, target_month)
);

-- System settings
CREATE TABLE system_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_distributors_name ON distributors(distributor_name);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_distributor ON invoices(distributor_id);
CREATE INDEX idx_invoices_staff ON invoices(sales_staff_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributors_updated_at BEFORE UPDATE ON distributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    invoice_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-%';
    
    invoice_num := 'INV-' || LPAD(next_num::TEXT, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals when payments are added
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    status = CASE 
        WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)) >= total_amount THEN 'paid'
        WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)) > 0 THEN 'partial_paid'
        ELSE status
    END
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_paid_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_paid_amount();

-- Insert default admin user
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('admin', 'admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeLoWsFZ8PU5UGrPC', 'admin', 'System Administrator', true);
-- Default password is 'admin123' - should be changed in production

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'Your Company Name', 'Company name for invoices'),
('company_address', 'Company Address', 'Company address for invoices'),
('tax_rate', '17', 'Default tax rate percentage'),
('invoice_terms', 'Payment due within 30 days', 'Default invoice terms'),
('whatsapp_api_key', '', 'WhatsApp Business API key'),
('aws_s3_bucket', '', 'AWS S3 bucket for file storage');