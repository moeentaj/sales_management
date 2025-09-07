// routes/invoices.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole, checkDistributorAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createInvoiceValidation = [
    body('distributor_id').isInt({ min: 1 }).withMessage('Valid distributor ID is required'),
    body('due_date').optional().isISO8601().withMessage('Valid due date is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
    body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be valid'),
    body('items.*.discount_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
    body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be valid'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
];

const updateInvoiceValidation = [
    body('due_date').optional().isISO8601().withMessage('Valid due date is required'),
    body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').optional().isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('items.*.quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
    body('items.*.unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be valid'),
    body('items.*.discount_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
    body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be valid'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
];

// GET /api/invoices - Get all invoices
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const distributorId = req.query.distributor_id || '';
        const startDate = req.query.start_date || '';
        const endDate = req.query.end_date || '';

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // For sales staff, only show their invoices
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND i.sales_staff_id = $${paramIndex}`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR d.distributor_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND i.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (distributorId) {
            whereClause += ` AND i.distributor_id = $${paramIndex}`;
            params.push(distributorId);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND i.invoice_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND i.invoice_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM invoices i 
             JOIN distributors d ON d.distributor_id = i.distributor_id
             ${whereClause}`,
            params
        );
        const totalInvoices = parseInt(countResult.rows[0].count);

        // Get invoices with pagination
        const result = await query(
            `SELECT 
                i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                i.subtotal, i.tax_amount, i.discount_amount, i.total_amount,
                i.paid_amount, i.status, i.notes, i.pdf_url, i.created_at, i.updated_at,
                d.distributor_id, d.distributor_name, d.city, d.primary_contact_person,
                u.full_name as sales_staff_name,
                (i.total_amount - i.paid_amount) as balance_amount,
                CASE 
                    WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date)
                    ELSE 0
                END as days_overdue,
                (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.invoice_id) as item_count
             FROM invoices i
             JOIN distributors d ON d.distributor_id = i.distributor_id
             LEFT JOIN users u ON u.user_id = i.sales_staff_id
             ${whereClause}
             ORDER BY i.created_at DESC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                invoices: result.rows,
                pagination: {
                    page,
                    limit,
                    total: totalInvoices,
                    pages: Math.ceil(totalInvoices / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // Base query
        let invoiceQuery = `
            SELECT 
                i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                i.subtotal, i.tax_amount, i.discount_amount, i.total_amount,
                i.paid_amount, i.status, i.notes, i.pdf_url, i.created_at, i.updated_at,
                d.distributor_id, d.distributor_name, d.address, d.city, d.state,
                d.postal_code, d.ntn_number, d.primary_contact_person, d.primary_whatsapp_number,
                u.full_name as sales_staff_name, u.email as sales_staff_email,
                (i.total_amount - i.paid_amount) as balance_amount,
                CASE 
                    WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date)
                    ELSE 0
                END as days_overdue
            FROM invoices i
            JOIN distributors d ON d.distributor_id = i.distributor_id
            LEFT JOIN users u ON u.user_id = i.sales_staff_id
            WHERE i.invoice_id = $1
        `;

        // Check access permissions
        if (req.user.role === 'sales_staff') {
            invoiceQuery += ` AND i.sales_staff_id = $2`;
        }

        const params = req.user.role === 'sales_staff' 
            ? [invoiceId, req.user.user_id] 
            : [invoiceId];

        const result = await query(invoiceQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or access denied'
            });
        }

        const invoice = result.rows[0];

        // Get invoice items
        const itemsResult = await query(
            `SELECT 
                ii.item_id, ii.product_id, ii.quantity, ii.unit_price, 
                ii.discount_percentage, ii.tax_rate, ii.line_total,
                p.product_name, p.product_code, p.unit_of_measure, p.category
             FROM invoice_items ii
             JOIN products p ON p.product_id = ii.product_id
             WHERE ii.invoice_id = $1
             ORDER BY ii.item_id`,
            [invoiceId]
        );

        // Get payment history
        const paymentsResult = await query(
            `SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.check_image_url, p.bank_reference, p.notes,
                u.full_name as collected_by_name
             FROM payments p
             LEFT JOIN users u ON u.user_id = p.collected_by
             WHERE p.invoice_id = $1
             ORDER BY p.payment_date DESC`,
            [invoiceId]
        );

        invoice.items = itemsResult.rows;
        invoice.payments = paymentsResult.rows;

        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/invoices - Create new invoice
router.post('/', authenticateToken, createInvoiceValidation, async (req, res) => {
    const client = await getClient();
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await client.query('BEGIN');

        const {
            distributor_id, due_date, items, discount_amount = 0, notes
        } = req.body;

        // Check distributor access for sales staff
        if (req.user.role === 'sales_staff') {
            const accessCheck = await client.query(
                `SELECT 1 FROM sales_staff_distributors 
                 WHERE sales_staff_id = $1 AND distributor_id = $2 AND is_active = true`,
                [req.user.user_id, distributor_id]
            );

            if (accessCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Distributor not assigned to you'
                });
            }
        }

        // Generate invoice number
        const invoiceNumberResult = await client.query(
            'SELECT generate_invoice_number() as invoice_number'
        );
        const invoiceNumber = invoiceNumberResult.rows[0].invoice_number;

        // Calculate invoice totals
        let subtotal = 0;
        let totalTaxAmount = 0;

        // Validate products and calculate totals
        for (const item of items) {
            const productResult = await client.query(
                'SELECT product_id, unit_price, tax_rate FROM products WHERE product_id = $1 AND is_active = true',
                [item.product_id]
            );

            if (productResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Product ID ${item.product_id} not found or inactive`
                });
            }

            const product = productResult.rows[0];
            const linePrice = item.unit_price || product.unit_price;
            const taxRate = item.tax_rate !== undefined ? item.tax_rate : product.tax_rate;
            const discountAmount = (linePrice * item.quantity * (item.discount_percentage || 0)) / 100;
            const lineSubtotal = (linePrice * item.quantity) - discountAmount;
            const lineTaxAmount = (lineSubtotal * taxRate) / 100;
            
            subtotal += lineSubtotal;
            totalTaxAmount += lineTaxAmount;
        }

        const totalAmount = subtotal + totalTaxAmount - discount_amount;

        // Calculate due date if not provided
        const invoiceDate = new Date();
        const calculatedDueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (
                invoice_number, distributor_id, sales_staff_id, invoice_date, due_date,
                subtotal, tax_amount, discount_amount, total_amount, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING invoice_id, invoice_number, invoice_date, due_date, subtotal, 
                       tax_amount, discount_amount, total_amount, status, created_at`,
            [invoiceNumber, distributor_id, req.user.user_id, invoiceDate, calculatedDueDate,
             subtotal, totalTaxAmount, discount_amount, totalAmount, notes]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice items
        for (const item of items) {
            const productResult = await client.query(
                'SELECT unit_price, tax_rate FROM products WHERE product_id = $1',
                [item.product_id]
            );
            
            const product = productResult.rows[0];
            const linePrice = item.unit_price || product.unit_price;
            const taxRate = item.tax_rate !== undefined ? item.tax_rate : product.tax_rate;
            const discountAmount = (linePrice * item.quantity * (item.discount_percentage || 0)) / 100;
            const lineSubtotal = (linePrice * item.quantity) - discountAmount;
            const lineTaxAmount = (lineSubtotal * taxRate) / 100;
            const lineTotal = lineSubtotal + lineTaxAmount;

            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, product_id, quantity, unit_price, discount_percentage, 
                    tax_rate, line_total
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [invoice.invoice_id, item.product_id, item.quantity, linePrice,
                 item.discount_percentage || 0, taxRate, lineTotal]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoice
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create invoice error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// PUT /api/invoices/:id - Update invoice (draft only)
router.put('/:id', authenticateToken, updateInvoiceValidation, async (req, res) => {
    const client = await getClient();
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const invoiceId = req.params.id;

        await client.query('BEGIN');

        // Check if invoice exists and is editable
        let invoiceCheck = `
            SELECT i.invoice_id, i.status, i.sales_staff_id 
            FROM invoices i 
            WHERE i.invoice_id = $1 AND i.status = 'draft'
        `;
        let checkParams = [invoiceId];

        if (req.user.role === 'sales_staff') {
            invoiceCheck += ` AND i.sales_staff_id = $2`;
            checkParams.push(req.user.user_id);
        }

        const invoiceResult = await client.query(invoiceCheck, checkParams);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Invoice not found, not editable, or access denied'
            });
        }

        const { due_date, items, discount_amount, notes } = req.body;

        // If items are being updated, recalculate totals
        if (items) {
            // Delete existing items
            await client.query(
                'DELETE FROM invoice_items WHERE invoice_id = $1',
                [invoiceId]
            );

            // Calculate new totals
            let subtotal = 0;
            let totalTaxAmount = 0;

            // Validate products and calculate totals
            for (const item of items) {
                const productResult = await client.query(
                    'SELECT product_id, unit_price, tax_rate FROM products WHERE product_id = $1 AND is_active = true',
                    [item.product_id]
                );

                if (productResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: `Product ID ${item.product_id} not found or inactive`
                    });
                }

                const product = productResult.rows[0];
                const linePrice = item.unit_price || product.unit_price;
                const taxRate = item.tax_rate !== undefined ? item.tax_rate : product.tax_rate;
                const discountAmount = (linePrice * item.quantity * (item.discount_percentage || 0)) / 100;
                const lineSubtotal = (linePrice * item.quantity) - discountAmount;
                const lineTaxAmount = (lineSubtotal * taxRate) / 100;
                
                subtotal += lineSubtotal;
                totalTaxAmount += lineTaxAmount;
            }

            const totalAmount = subtotal + totalTaxAmount - (discount_amount || 0);

            // Update invoice totals
            await client.query(
                `UPDATE invoices SET 
                    subtotal = $1, tax_amount = $2, discount_amount = $3, total_amount = $4,
                    due_date = COALESCE($5, due_date), notes = COALESCE($6, notes), 
                    updated_at = CURRENT_TIMESTAMP
                 WHERE invoice_id = $7`,
                [subtotal, totalTaxAmount, discount_amount || 0, totalAmount, 
                 due_date, notes, invoiceId]
            );

            // Create new invoice items
            for (const item of items) {
                const productResult = await client.query(
                    'SELECT unit_price, tax_rate FROM products WHERE product_id = $1',
                    [item.product_id]
                );
                
                const product = productResult.rows[0];
                const linePrice = item.unit_price || product.unit_price;
                const taxRate = item.tax_rate !== undefined ? item.tax_rate : product.tax_rate;
                const discountAmount = (linePrice * item.quantity * (item.discount_percentage || 0)) / 100;
                const lineSubtotal = (linePrice * item.quantity) - discountAmount;
                const lineTaxAmount = (lineSubtotal * taxRate) / 100;
                const lineTotal = lineSubtotal + lineTaxAmount;

                await client.query(
                    `INSERT INTO invoice_items (
                        invoice_id, product_id, quantity, unit_price, discount_percentage, 
                        tax_rate, line_total
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [invoiceId, item.product_id, item.quantity, linePrice,
                     item.discount_percentage || 0, taxRate, lineTotal]
                );
            }
        } else {
            // Update only invoice fields
            const updates = [];
            const params = [];
            let paramIndex = 1;

            if (due_date !== undefined) {
                updates.push(`due_date = $${paramIndex++}`);
                params.push(due_date);
            }
            if (discount_amount !== undefined) {
                updates.push(`discount_amount = $${paramIndex++}`);
                params.push(discount_amount);
                
                // Recalculate total
                const currentTotals = await client.query(
                    'SELECT subtotal, tax_amount FROM invoices WHERE invoice_id = $1',
                    [invoiceId]
                );
                const { subtotal, tax_amount } = currentTotals.rows[0];
                const newTotal = parseFloat(subtotal) + parseFloat(tax_amount) - parseFloat(discount_amount);
                
                updates.push(`total_amount = $${paramIndex++}`);
                params.push(newTotal);
            }
            if (notes !== undefined) {
                updates.push(`notes = $${paramIndex++}`);
                params.push(notes);
            }

            if (updates.length > 0) {
                updates.push(`updated_at = CURRENT_TIMESTAMP`);
                params.push(invoiceId);

                await client.query(
                    `UPDATE invoices SET ${updates.join(', ')} WHERE invoice_id = $${paramIndex}`,
                    params
                );
            }
        }

        // Get updated invoice
        const result = await client.query(
            `SELECT invoice_id, invoice_number, invoice_date, due_date, subtotal, 
                    tax_amount, discount_amount, total_amount, status, updated_at
             FROM invoices WHERE invoice_id = $1`,
            [invoiceId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Invoice updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// DELETE /api/invoices/:id - Cancel invoice
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // Check if invoice can be cancelled
        let cancelCheck = `
            SELECT i.invoice_id, i.status, i.paid_amount 
            FROM invoices i 
            WHERE i.invoice_id = $1 AND i.status IN ('draft', 'sent') AND i.paid_amount = 0
        `;
        let checkParams = [invoiceId];

        if (req.user.role === 'sales_staff') {
            cancelCheck += ` AND i.sales_staff_id = $2`;
            checkParams.push(req.user.user_id);
        }

        const invoiceResult = await query(cancelCheck, checkParams);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found, cannot be cancelled, or access denied'
            });
        }

        // Cancel the invoice
        const result = await query(
            `UPDATE invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
             WHERE invoice_id = $1 
             RETURNING invoice_id, invoice_number, status`,
            [invoiceId]
        );

        res.json({
            success: true,
            message: 'Invoice cancelled successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Cancel invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/invoices/:id/send - Send invoice to distributor
router.post('/:id/send', authenticateToken, async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // Check if invoice can be sent
        let sendCheck = `
            SELECT i.invoice_id, i.status 
            FROM invoices i 
            WHERE i.invoice_id = $1 AND i.status = 'draft'
        `;
        let checkParams = [invoiceId];

        if (req.user.role === 'sales_staff') {
            sendCheck += ` AND i.sales_staff_id = $2`;
            checkParams.push(req.user.user_id);
        }

        const invoiceResult = await query(sendCheck, checkParams);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found, already sent, or access denied'
            });
        }

        // Update status to sent
        const result = await query(
            `UPDATE invoices SET status = 'sent', updated_at = CURRENT_TIMESTAMP 
             WHERE invoice_id = $1 
             RETURNING invoice_id, invoice_number, status`,
            [invoiceId]
        );

        // TODO: Implement actual sending logic (email, WhatsApp, etc.)
        // This could include PDF generation and sending

        res.json({
            success: true,
            message: 'Invoice sent successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Send invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/invoices/:id/pdf - Generate PDF invoice
router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // Check access permissions
        let pdfCheck = `
            SELECT i.invoice_id 
            FROM invoices i 
            WHERE i.invoice_id = $1
        `;
        let checkParams = [invoiceId];

        if (req.user.role === 'sales_staff') {
            pdfCheck += ` AND i.sales_staff_id = $2`;
            checkParams.push(req.user.user_id);
        }

        const invoiceResult = await query(pdfCheck, checkParams);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or access denied'
            });
        }

        // TODO: Implement PDF generation
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'PDF generation is under development',
            data: {
                pdf_url: `/invoices/${invoiceId}/pdf`
            }
        });

    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/invoices/:id/duplicate - Duplicate existing invoice
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    const client = await getClient();
    
    try {
        const sourceInvoiceId = req.params.id;

        await client.query('BEGIN');

        // Get source invoice
        let sourceQuery = `
            SELECT i.distributor_id, i.due_date, i.discount_amount, i.notes
            FROM invoices i 
            WHERE i.invoice_id = $1
        `;
        let sourceParams = [sourceInvoiceId];

        if (req.user.role === 'sales_staff') {
            sourceQuery += ` AND i.sales_staff_id = $2`;
            sourceParams.push(req.user.user_id);
        }

        const sourceResult = await client.query(sourceQuery, sourceParams);

        if (sourceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Source invoice not found or access denied'
            });
        }

        const sourceInvoice = sourceResult.rows[0];

        // Get source invoice items
        const itemsResult = await client.query(
            `SELECT ii.product_id, ii.quantity, ii.unit_price, ii.discount_percentage, ii.tax_rate
             FROM invoice_items ii
             WHERE ii.invoice_id = $1`,
            [sourceInvoiceId]
        );

        // Generate new invoice number
        const invoiceNumberResult = await client.query(
            'SELECT generate_invoice_number() as invoice_number'
        );
        const invoiceNumber = invoiceNumberResult.rows[0].invoice_number;

        // Calculate totals
        let subtotal = 0;
        let totalTaxAmount = 0;

        for (const item of itemsResult.rows) {
            const discountAmount = (item.unit_price * item.quantity * item.discount_percentage) / 100;
            const lineSubtotal = (item.unit_price * item.quantity) - discountAmount;
            const lineTaxAmount = (lineSubtotal * item.tax_rate) / 100;
            
            subtotal += lineSubtotal;
            totalTaxAmount += lineTaxAmount;
        }

        const totalAmount = subtotal + totalTaxAmount - sourceInvoice.discount_amount;

        // Create new invoice
        const newInvoiceResult = await client.query(
            `INSERT INTO invoices (
                invoice_number, distributor_id, sales_staff_id, invoice_date, due_date,
                subtotal, tax_amount, discount_amount, total_amount, notes
             ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9)
             RETURNING invoice_id, invoice_number, invoice_date, due_date, subtotal, 
                       tax_amount, discount_amount, total_amount, status, created_at`,
            [invoiceNumber, sourceInvoice.distributor_id, req.user.user_id, 
             sourceInvoice.due_date, subtotal, totalTaxAmount, sourceInvoice.discount_amount, 
             totalAmount, sourceInvoice.notes]
        );

        const newInvoice = newInvoiceResult.rows[0];

        // Copy invoice items
        for (const item of itemsResult.rows) {
            const discountAmount = (item.unit_price * item.quantity * item.discount_percentage) / 100;
            const lineSubtotal = (item.unit_price * item.quantity) - discountAmount;
            const lineTaxAmount = (lineSubtotal * item.tax_rate) / 100;
            const lineTotal = lineSubtotal + lineTaxAmount;

            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, product_id, quantity, unit_price, discount_percentage, 
                    tax_rate, line_total
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newInvoice.invoice_id, item.product_id, item.quantity, item.unit_price,
                 item.discount_percentage, item.tax_rate, lineTotal]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Invoice duplicated successfully',
            data: newInvoice
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Duplicate invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// GET /api/invoices/number/next - Get next invoice number
router.get('/number/next', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT generate_invoice_number() as invoice_number');
        
        res.json({
            success: true,
            data: {
                next_invoice_number: result.rows[0].invoice_number
            }
        });

    } catch (error) {
        console.error('Get next invoice number error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/invoices/stats/summary - Get invoice statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;

        let statsQuery = '';
        let params = [];

        if (userRole === 'admin') {
            statsQuery = `
                SELECT 
                    COUNT(*) AS total_invoices,
                    SUM(CASE WHEN status = 'draft'         THEN 1 ELSE 0 END) AS draft_invoices,
                    SUM(CASE WHEN status = 'sent'          THEN 1 ELSE 0 END) AS sent_invoices,
                    SUM(CASE WHEN status = 'partial_paid'  THEN 1 ELSE 0 END) AS partial_paid_invoices,
                    SUM(CASE WHEN status = 'paid'          THEN 1 ELSE 0 END) AS paid_invoices,
                    SUM(CASE WHEN status = 'overdue'       THEN 1 ELSE 0 END) AS overdue_invoices,
                    SUM(CASE WHEN status = 'cancelled'     THEN 1 ELSE 0 END) AS cancelled_invoices,
                    COALESCE(SUM(total_amount), 0) AS total_amount,
                    COALESCE(SUM(paid_amount), 0)  AS total_paid,
                    COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN (total_amount - paid_amount) ELSE 0 END), 0) AS total_outstanding,
                    COALESCE(AVG(total_amount), 0) AS average_invoice_amount,
                    SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE THEN 1 ELSE 0 END) AS today_invoices,
                    COALESCE(SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS today_amount
                FROM invoices
            `;
        } else {
            statsQuery = `
                SELECT 
                    COUNT(*) AS total_invoices,
                    SUM(CASE WHEN status = 'draft'         THEN 1 ELSE 0 END) AS draft_invoices,
                    SUM(CASE WHEN status = 'sent'          THEN 1 ELSE 0 END) AS sent_invoices,
                    SUM(CASE WHEN status = 'partial_paid'  THEN 1 ELSE 0 END) AS partial_paid_invoices,
                    SUM(CASE WHEN status = 'paid'          THEN 1 ELSE 0 END) AS paid_invoices,
                    SUM(CASE WHEN status = 'overdue'       THEN 1 ELSE 0 END) AS overdue_invoices,
                    SUM(CASE WHEN status = 'cancelled'     THEN 1 ELSE 0 END) AS cancelled_invoices,
                    COALESCE(SUM(total_amount), 0) AS total_amount,
                    COALESCE(SUM(paid_amount), 0)  AS total_paid,
                    COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN (total_amount - paid_amount) ELSE 0 END), 0) AS total_outstanding,
                    COALESCE(AVG(total_amount), 0) AS average_invoice_amount,
                    SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE THEN 1 ELSE 0 END) AS today_invoices,
                    COALESCE(SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS today_amount
                FROM invoices
                WHERE sales_staff_id = $1
            `;
            params = [userId];
        }

        const result = await query(statsQuery, params);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get invoice stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/invoices/overdue/list - Get overdue invoices
router.get('/overdue/list', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        let overdueQuery = `
            SELECT 
                i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                i.total_amount, i.paid_amount, (i.total_amount - i.paid_amount) as balance_amount,
                (CURRENT_DATE - i.due_date) as days_overdue,
                d.distributor_name, d.primary_contact_person, d.primary_whatsapp_number,
                u.full_name as sales_staff_name
            FROM invoices i
            JOIN distributors d ON d.distributor_id = i.distributor_id
            LEFT JOIN users u ON u.user_id = i.sales_staff_id
            WHERE i.status = 'overdue'
        `;
        let params = [];

        if (req.user.role === 'sales_staff') {
            overdueQuery += ` AND i.sales_staff_id = $1`;
            params.push(req.user.user_id);
        }

        overdueQuery += ` ORDER BY (CURRENT_DATE - i.due_date) DESC LIMIT ${params.length + 1}`;
        params.push(limit);

        const result = await query(overdueQuery, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get overdue invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;