// routes/payments.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createPaymentValidation = [
    body('invoice_id').isInt({ min: 1 }).withMessage('Valid invoice ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('payment_method').isIn(['cash', 'check', 'bank_transfer', 'online']).withMessage('Valid payment method is required'),
    body('payment_date').optional().isISO8601().withMessage('Valid payment date is required'),
    body('check_number').optional().isLength({ max: 50 }).withMessage('Check number too long'),
    body('bank_reference').optional().isLength({ max: 100 }).withMessage('Bank reference too long'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
];

const updatePaymentValidation = [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('payment_method').optional().isIn(['cash', 'check', 'bank_transfer', 'online']).withMessage('Valid payment method is required'),
    body('payment_date').optional().isISO8601().withMessage('Valid payment date is required'),
    body('check_number').optional().isLength({ max: 50 }).withMessage('Check number too long'),
    body('bank_reference').optional().isLength({ max: 100 }).withMessage('Bank reference too long'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
];

// GET /api/payments - Get all payments
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const paymentMethod = req.query.payment_method || '';
        const startDate = req.query.start_date || '';
        const endDate = req.query.end_date || '';
        const invoiceId = req.query.invoice_id || '';

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // For sales staff, only show their collected payments
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND p.collected_by = $${paramIndex}`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR d.distributor_name ILIKE $${paramIndex} OR p.check_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (paymentMethod) {
            whereClause += ` AND p.payment_method = $${paramIndex}`;
            params.push(paymentMethod);
            paramIndex++;
        }

        if (invoiceId) {
            whereClause += ` AND p.invoice_id = $${paramIndex}`;
            params.push(invoiceId);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND p.payment_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND p.payment_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM payments p 
             JOIN invoices i ON i.invoice_id = p.invoice_id
             JOIN distributors d ON d.distributor_id = i.distributor_id
             ${whereClause}`,
            params
        );
        const totalPayments = parseInt(countResult.rows[0].count);

        // Get payments with pagination
        const result = await query(
            `SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.check_image_url, p.bank_reference, p.notes, p.created_at,
                i.invoice_id, i.invoice_number, i.total_amount, i.paid_amount, i.status,
                d.distributor_id, d.distributor_name, d.city,
                u.full_name as collected_by_name,
                (i.total_amount - i.paid_amount) as remaining_balance
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             JOIN distributors d ON d.distributor_id = i.distributor_id
             LEFT JOIN users u ON u.user_id = p.collected_by
             ${whereClause}
             ORDER BY p.created_at DESC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                payments: result.rows,
                pagination: {
                    page,
                    limit,
                    total: totalPayments,
                    pages: Math.ceil(totalPayments / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/payments/:id - Get specific payment
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const paymentId = req.params.id;

        // Base query
        let paymentQuery = `
            SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.check_image_url, p.bank_reference, p.notes, p.created_at,
                i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                i.total_amount, i.paid_amount, i.status,
                d.distributor_id, d.distributor_name, d.address, d.city,
                d.primary_contact_person, d.primary_whatsapp_number,
                u.full_name as collected_by_name, u.email as collected_by_email
            FROM payments p
            JOIN invoices i ON i.invoice_id = p.invoice_id
            JOIN distributors d ON d.distributor_id = i.distributor_id
            LEFT JOIN users u ON u.user_id = p.collected_by
            WHERE p.payment_id = $1
        `;

        // Check access permissions for sales staff
        if (req.user.role === 'sales_staff') {
            paymentQuery += ` AND p.collected_by = $2`;
        }

        const params = req.user.role === 'sales_staff'
            ? [paymentId, req.user.user_id]
            : [paymentId];

        const result = await query(paymentQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found or access denied'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/payments - Record new payment
router.post('/', authenticateToken, createPaymentValidation, async (req, res) => {
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
            invoice_id, amount, payment_method, payment_date,
            check_number, check_image_url, bank_reference, notes
        } = req.body;

        // Verify invoice exists and get details
        let invoiceQuery = `
            SELECT i.invoice_id, i.total_amount, i.paid_amount, i.status, i.distributor_id
            FROM invoices i 
            WHERE i.invoice_id = $1 AND i.status NOT IN ('cancelled', 'paid')
        `;
        let invoiceParams = [invoice_id];

        // For sales staff, check if they have access to this invoice
        if (req.user.role === 'sales_staff') {
            invoiceQuery += ` AND (i.sales_staff_id = $2 OR EXISTS (
                SELECT 1 FROM sales_staff_distributors ssd 
                WHERE ssd.sales_staff_id = $2 AND ssd.distributor_id = i.distributor_id AND ssd.is_active = true
            ))`;
            invoiceParams.push(req.user.user_id);
        }

        const invoiceResult = await client.query(invoiceQuery, invoiceParams);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Invoice not found, already paid, cancelled, or access denied'
            });
        }

        const invoice = invoiceResult.rows[0];
        const remainingBalance = parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount);

        // Validate payment amount
        if (parseFloat(amount) > remainingBalance) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Payment amount ($${amount}) exceeds remaining balance ($${remainingBalance.toFixed(2)})`
            });
        }

        // Insert payment record
        const paymentResult = await client.query(
            `INSERT INTO payments (
                invoice_id, payment_date, amount, payment_method, check_number,
                check_image_url, bank_reference, collected_by, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING payment_id, payment_date, amount, payment_method, check_number,
                       bank_reference, notes, created_at`,
            [invoice_id, payment_date || new Date(), amount, payment_method,
                check_number, check_image_url, bank_reference, req.user.user_id, notes]
        );

        const payment = paymentResult.rows[0];

        // Update invoice paid amount and status (trigger will handle this automatically)
        // The database trigger update_invoice_paid_amount_trigger handles the calculation

        await client.query('COMMIT');

        // Get updated payment with invoice details for response
        const updatedPaymentResult = await client.query(
            `SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.bank_reference, p.notes, p.created_at,
                i.invoice_number, i.total_amount, i.paid_amount, i.status,
                d.distributor_name
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             JOIN distributors d ON d.distributor_id = i.distributor_id
             WHERE p.payment_id = $1`,
            [payment.payment_id]
        );

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: updatedPaymentResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create payment error:', error);

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', authenticateToken, updatePaymentValidation, async (req, res) => {
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

        const paymentId = req.params.id;

        await client.query('BEGIN');

        // Check if payment exists and user has access
        let paymentCheckQuery = `
            SELECT p.payment_id, p.invoice_id, p.amount as current_amount, p.collected_by,
                   i.total_amount, i.paid_amount, i.status
            FROM payments p
            JOIN invoices i ON i.invoice_id = p.invoice_id
            WHERE p.payment_id = $1
        `;
        let checkParams = [paymentId];

        if (req.user.role === 'sales_staff') {
            paymentCheckQuery += ` AND p.collected_by = $2`;
            checkParams.push(req.user.user_id);
        }

        const paymentCheckResult = await client.query(paymentCheckQuery, checkParams);

        if (paymentCheckResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Payment not found or access denied'
            });
        }

        const existingPayment = paymentCheckResult.rows[0];

        const {
            amount, payment_method, payment_date, check_number,
            check_image_url, bank_reference, notes
        } = req.body;

        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (amount !== undefined) {
            // Validate new amount doesn't exceed invoice total
            const otherPaymentsTotal = parseFloat(existingPayment.paid_amount) - parseFloat(existingPayment.current_amount);
            const newTotalPaid = otherPaymentsTotal + parseFloat(amount);

            if (newTotalPaid > parseFloat(existingPayment.total_amount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Updated payment amount would exceed invoice total`
                });
            }

            updates.push(`amount = $${paramIndex++}`);
            params.push(amount);
        }

        if (payment_method !== undefined) {
            updates.push(`payment_method = $${paramIndex++}`);
            params.push(payment_method);
        }

        if (payment_date !== undefined) {
            updates.push(`payment_date = $${paramIndex++}`);
            params.push(payment_date);
        }

        if (check_number !== undefined) {
            updates.push(`check_number = $${paramIndex++}`);
            params.push(check_number);
        }

        if (check_image_url !== undefined) {
            updates.push(`check_image_url = $${paramIndex++}`);
            params.push(check_image_url);
        }

        if (bank_reference !== undefined) {
            updates.push(`bank_reference = $${paramIndex++}`);
            params.push(bank_reference);
        }

        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            params.push(notes);
        }

        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(paymentId);

        const result = await client.query(
            `UPDATE payments SET ${updates.join(', ')} 
             WHERE payment_id = $${paramIndex}
             RETURNING payment_id, payment_date, amount, payment_method, check_number,
                       bank_reference, notes`,
            params
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Payment updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// DELETE /api/payments/:id - Cancel payment
router.delete('/:id', authenticateToken, async (req, res) => {
    const client = await getClient();

    try {
        const paymentId = req.params.id;

        await client.query('BEGIN');

        // Check if payment exists and user has access
        let paymentCheckQuery = `
            SELECT p.payment_id, p.collected_by, i.status
            FROM payments p
            JOIN invoices i ON i.invoice_id = p.invoice_id
            WHERE p.payment_id = $1
        `;
        let checkParams = [paymentId];

        // Only allow admins or the collector to delete payments
        if (req.user.role === 'sales_staff') {
            paymentCheckQuery += ` AND p.collected_by = $2`;
            checkParams.push(req.user.user_id);
        }

        const paymentCheckResult = await client.query(paymentCheckQuery, checkParams);

        if (paymentCheckResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Payment not found or access denied'
            });
        }

        // Delete the payment (trigger will update invoice totals)
        const result = await client.query(
            'DELETE FROM payments WHERE payment_id = $1 RETURNING payment_id',
            [paymentId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Payment cancelled successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// GET /api/payments/pending - Get pending invoices for payment collection
router.get('/pending/invoices', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const distributorId = req.query.distributor_id || '';

        let whereClause = 'WHERE i.status NOT IN (\'cancelled\', \'paid\') AND (i.total_amount - i.paid_amount) > 0';
        const params = [];
        let paramIndex = 1;

        // For sales staff, only show invoices for their assigned distributors
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND (i.sales_staff_id = $${paramIndex} OR EXISTS (
                SELECT 1 FROM sales_staff_distributors ssd 
                WHERE ssd.sales_staff_id = $${paramIndex} AND ssd.distributor_id = i.distributor_id AND ssd.is_active = true
            ))`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        if (distributorId) {
            whereClause += ` AND i.distributor_id = $${paramIndex}`;
            params.push(distributorId);
            paramIndex++;
        }

        const result = await query(
            `SELECT 
                i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                i.total_amount, i.paid_amount, (i.total_amount - i.paid_amount) as balance_amount,
                i.status, 
                CASE 
                    WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date)
                    ELSE 0
                END as days_overdue,
                d.distributor_id, d.distributor_name, d.city, d.primary_contact_person,
                d.primary_whatsapp_number,
                u.full_name as sales_staff_name,
                (SELECT COUNT(*) FROM payments WHERE invoice_id = i.invoice_id) as payment_count
             FROM invoices i
             JOIN distributors d ON d.distributor_id = i.distributor_id
             LEFT JOIN users u ON u.user_id = i.sales_staff_id
             ${whereClause}
             ORDER BY 
                CASE WHEN i.status = 'overdue' THEN 1 ELSE 2 END,
                i.due_date ASC
             LIMIT $${paramIndex}`,
            [...params, limit]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get pending invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/payments/bulk - Record multiple payments
router.post('/bulk', authenticateToken, async (req, res) => {
    const client = await getClient();

    try {
        const { payments } = req.body;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Payments array is required'
            });
        }

        await client.query('BEGIN');

        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            payments: []
        };

        for (let i = 0; i < payments.length; i++) {
            const paymentData = payments[i];

            try {
                // Validate required fields
                if (!paymentData.invoice_id || !paymentData.amount || !paymentData.payment_method) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        error: 'Invoice ID, amount, and payment method are required'
                    });
                    continue;
                }

                // Verify invoice access (similar to single payment creation)
                let invoiceQuery = `
                    SELECT i.invoice_id, i.total_amount, i.paid_amount, i.status
                    FROM invoices i 
                    WHERE i.invoice_id = $1 AND i.status NOT IN ('cancelled', 'paid')
                `;
                let invoiceParams = [paymentData.invoice_id];

                if (req.user.role === 'sales_staff') {
                    invoiceQuery += ` AND (i.sales_staff_id = $2 OR EXISTS (
                        SELECT 1 FROM sales_staff_distributors ssd 
                        WHERE ssd.sales_staff_id = $2 AND ssd.distributor_id = i.distributor_id AND ssd.is_active = true
                    ))`;
                    invoiceParams.push(req.user.user_id);
                }

                const invoiceResult = await client.query(invoiceQuery, invoiceParams);

                if (invoiceResult.rows.length === 0) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        error: 'Invoice not found or access denied'
                    });
                    continue;
                }

                const invoice = invoiceResult.rows[0];
                const remainingBalance = parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount);

                if (parseFloat(paymentData.amount) > remainingBalance) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        error: `Payment amount exceeds remaining balance`
                    });
                    continue;
                }

                // Insert payment
                const paymentResult = await client.query(
                    `INSERT INTO payments (
                        invoice_id, payment_date, amount, payment_method, check_number,
                        check_image_url, bank_reference, collected_by, notes
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING payment_id, payment_date, amount, payment_method`,
                    [paymentData.invoice_id, paymentData.payment_date || new Date(),
                    paymentData.amount, paymentData.payment_method, paymentData.check_number,
                    paymentData.check_image_url, paymentData.bank_reference, req.user.user_id,
                    paymentData.notes]
                );

                results.successful++;
                results.payments.push(paymentResult.rows[0]);

            } catch (error) {
                results.failed++;
                results.errors.push({
                    index: i,
                    error: error.message
                });
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Bulk payment completed. ${results.successful} successful, ${results.failed} failed.`,
            data: results
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// GET /api/payments/stats/summary - Get payment statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;

        let statsQuery = '';
        let params = [];

        if (userRole === 'admin') {
            statsQuery = `
                SELECT
                    COUNT(*) AS total_payments,
                    COALESCE(SUM(amount), 0) AS total_amount_collected,
                    SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) AS cash_payments,
                    SUM(CASE WHEN payment_method = 'check' THEN 1 ELSE 0 END) AS check_payments,
                    SUM(CASE WHEN payment_method = 'bank_transfer' THEN 1 ELSE 0 END) AS bank_transfer_payments,
                    SUM(CASE WHEN payment_method = 'online' THEN 1 ELSE 0 END) AS online_payments,
                    COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN amount ELSE 0 END), 0) AS today_collections,
                    SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN 1 ELSE 0 END) AS today_payment_count,
                    COALESCE(SUM(CASE WHEN DATE(payment_date) >= CURRENT_DATE - INTERVAL '7 days' THEN amount ELSE 0 END), 0) AS week_collections,
                    COALESCE(SUM(CASE WHEN DATE(payment_date) >= CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END), 0) AS month_collections,
                    COALESCE(AVG(amount), 0) AS average_payment_amount
                FROM payments
            `;
        } else {
            statsQuery = `
                SELECT 
                    COUNT(*) AS total_payments,
                        COALESCE(SUM(amount), 0) AS total_amount_collected,
                        SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) AS cash_payments,
                        SUM(CASE WHEN payment_method = 'check' THEN 1 ELSE 0 END) AS check_payments,
                        SUM(CASE WHEN payment_method = 'bank_transfer' THEN 1 ELSE 0 END) AS bank_transfer_payments,
                        SUM(CASE WHEN payment_method = 'online' THEN 1 ELSE 0 END) AS online_payments,
                        COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN amount ELSE 0 END), 0) AS today_collections,
                        SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN 1 ELSE 0 END) AS today_payment_count,
                        COALESCE(SUM(CASE WHEN DATE(payment_date) >= CURRENT_DATE - INTERVAL '7 days' THEN amount ELSE 0 END), 0) AS week_collections,
                        COALESCE(SUM(CASE WHEN DATE(payment_date) >= CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END), 0) AS month_collections,
                        COALESCE(AVG(amount), 0) AS average_payment_amount
                FROM payments
                WHERE collected_by = $1
            `;
            params = [userId];
        }

        const result = await query(statsQuery, params);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/payments/methods/summary - Get payment method breakdown
router.get('/methods/summary', authenticateToken, async (req, res) => {
    try {
        const period = req.query.period || 'month'; // today, week, month, year, all

        let dateFilter = '';
        switch (period) {
            case 'today':
                dateFilter = "WHERE payment_date = CURRENT_DATE";
                break;
            case 'week':
                dateFilter = "WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            case 'year':
                dateFilter = "WHERE payment_date >= CURRENT_DATE - INTERVAL '365 days'";
                break;
            default:
                dateFilter = "";
        }

        let query_text = `
            SELECT 
                payment_method,
                COUNT(*) as payment_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                ROUND(
                    (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM payments ${dateFilter})) * 100, 2
                ) as percentage_of_payments
            FROM payments
            ${dateFilter}
        `;

        // Add role-based filtering
        if (req.user.role === 'sales_staff') {
            if (dateFilter) {
                query_text += ` AND collected_by = $1`;
            } else {
                query_text += ` WHERE collected_by = $1`;
            }
        }

        query_text += `
            GROUP BY payment_method
            ORDER BY total_amount DESC
        `;

        const params = req.user.role === 'sales_staff' ? [req.user.user_id] : [];

        const result = await query(query_text, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get payment methods summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/payments/recent - Get recent payment activity
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        let recentQuery = `
            SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.created_at,
                i.invoice_number, i.total_amount, i.status,
                d.distributor_name,
                u.full_name as collected_by_name
            FROM payments p
            JOIN invoices i ON i.invoice_id = p.invoice_id
            JOIN distributors d ON d.distributor_id = i.distributor_id
            LEFT JOIN users u ON u.user_id = p.collected_by
        `;

        let params = [];
        if (req.user.role === 'sales_staff') {
            recentQuery += ` WHERE p.collected_by = $1`;
            params.push(req.user.user_id);
        }

        recentQuery += ` ORDER BY p.created_at DESC LIMIT ${params.length + 1}`;
        params.push(limit);

        const result = await query(recentQuery, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get recent payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/payments/upload-check-image - Upload check image
router.post('/upload-check-image', authenticateToken, async (req, res) => {
    try {
        // This endpoint would typically handle file upload
        // For now, return placeholder response
        // TODO: Implement file upload with multer and AWS S3/local storage

        res.json({
            success: true,
            message: 'Check image upload endpoint ready for implementation',
            data: {
                image_url: '/uploads/checks/placeholder.jpg'
            }
        });

    } catch (error) {
        console.error('Upload check image error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/payments/export - Export payments to CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const paymentMethod = req.query.payment_method;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Role-based filtering
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND p.collected_by = ${paramIndex}`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND p.payment_date >= ${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND p.payment_date <= ${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        if (paymentMethod) {
            whereClause += ` AND p.payment_method = ${paramIndex}`;
            params.push(paymentMethod);
            paramIndex++;
        }

        const result = await query(
            `SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.bank_reference, p.notes,
                i.invoice_number, i.total_amount as invoice_total,
                d.distributor_name, d.city,
                u.full_name as collected_by
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             JOIN distributors d ON d.distributor_id = i.distributor_id
             LEFT JOIN users u ON u.user_id = p.collected_by
             ${whereClause}
             ORDER BY p.payment_date DESC`,
            params
        );

        // Convert to CSV format
        const csvHeaders = [
            'Payment ID', 'Date', 'Amount', 'Method', 'Check Number',
            'Bank Reference', 'Notes', 'Invoice Number', 'Invoice Total',
            'Distributor', 'City', 'Collected By'
        ];

        const csvRows = result.rows.map(row => [
            row.payment_id,
            new Date(row.payment_date).toLocaleDateString(),
            row.amount,
            row.payment_method,
            row.check_number || '',
            row.bank_reference || '',
            row.notes || '',
            row.invoice_number,
            row.invoice_total,
            row.distributor_name,
            row.city,
            row.collected_by
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
        res.send(csvContent);

    } catch (error) {
        console.error('Export payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/payments/invoice/:invoice_id - Get payments for specific invoice
router.get('/invoice/:invoice_id', authenticateToken, async (req, res) => {
    try {
        const invoiceId = req.params.invoice_id;

        let paymentQuery = `
            SELECT 
                p.payment_id, p.payment_date, p.amount, p.payment_method,
                p.check_number, p.check_image_url, p.bank_reference, p.notes, p.created_at,
                u.full_name as collected_by_name
            FROM payments p
            LEFT JOIN users u ON u.user_id = p.collected_by
            WHERE p.invoice_id = $1
        `;

        const params = [invoiceId];

        // For sales staff, ensure they have access to this invoice
        if (req.user.role === 'sales_staff') {
            paymentQuery = `
                SELECT 
                    p.payment_id, p.payment_date, p.amount, p.payment_method,
                    p.check_number, p.check_image_url, p.bank_reference, p.notes, p.created_at,
                    u.full_name as collected_by_name
                FROM payments p
                JOIN invoices i ON i.invoice_id = p.invoice_id
                LEFT JOIN users u ON u.user_id = p.collected_by
                WHERE p.invoice_id = $1 
                AND (i.sales_staff_id = $2 OR EXISTS (
                    SELECT 1 FROM sales_staff_distributors ssd 
                    WHERE ssd.sales_staff_id = $2 AND ssd.distributor_id = i.distributor_id AND ssd.is_active = true
                ))
            `;
            params.push(req.user.user_id);
        }

        paymentQuery += ` ORDER BY p.payment_date DESC`;

        const result = await query(paymentQuery, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get invoice payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/payments/validate-amount - Validate payment amount for invoice
router.post('/validate-amount', authenticateToken, async (req, res) => {
    try {
        const { invoice_id, amount } = req.body;

        if (!invoice_id || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Invoice ID and amount are required'
            });
        }

        // Get invoice details
        let invoiceQuery = `
            SELECT i.invoice_id, i.invoice_number, i.total_amount, i.paid_amount, i.status,
                   (i.total_amount - i.paid_amount) as remaining_balance
            FROM invoices i 
            WHERE i.invoice_id = $1 AND i.status NOT IN ('cancelled', 'paid')
        `;
        let params = [invoice_id];

        // Check access for sales staff
        if (req.user.role === 'sales_staff') {
            invoiceQuery += ` AND (i.sales_staff_id = $2 OR EXISTS (
                SELECT 1 FROM sales_staff_distributors ssd 
                WHERE ssd.sales_staff_id = $2 AND ssd.distributor_id = i.distributor_id AND ssd.is_active = true
            ))`;
            params.push(req.user.user_id);
        }

        const result = await query(invoiceQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found, already paid, cancelled, or access denied'
            });
        }

        const invoice = result.rows[0];
        const paymentAmount = parseFloat(amount);
        const remainingBalance = parseFloat(invoice.remaining_balance);

        const validation = {
            valid: paymentAmount > 0 && paymentAmount <= remainingBalance,
            remaining_balance: remainingBalance,
            payment_amount: paymentAmount,
            will_be_fully_paid: paymentAmount === remainingBalance,
            excess_amount: paymentAmount > remainingBalance ? paymentAmount - remainingBalance : 0
        };

        res.json({
            success: true,
            data: {
                invoice: invoice,
                validation: validation
            }
        });

    } catch (error) {
        console.error('Validate payment amount error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;