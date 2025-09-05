// routes/distributors.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole, checkDistributorAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createDistributorValidation = [
    body('distributor_name').notEmpty().withMessage('Distributor name is required'),
    body('address').optional().isLength({ max: 500 }).withMessage('Address too long'),
    body('city').optional().isLength({ max: 100 }).withMessage('City name too long'),
    body('ntn_number').optional().isLength({ max: 50 }).withMessage('NTN number too long'),
    body('primary_contact_person').notEmpty().withMessage('Primary contact person is required'),
    body('primary_whatsapp_number').optional().isMobilePhone().withMessage('Valid WhatsApp number required')
];

const updateDistributorValidation = [
    body('distributor_name').optional().notEmpty().withMessage('Distributor name cannot be empty'),
    body('address').optional().isLength({ max: 500 }).withMessage('Address too long'),
    body('city').optional().isLength({ max: 100 }).withMessage('City name too long'),
    body('ntn_number').optional().isLength({ max: 50 }).withMessage('NTN number too long'),
    body('primary_contact_person').optional().notEmpty().withMessage('Primary contact person cannot be empty'),
    body('primary_whatsapp_number').optional().isMobilePhone().withMessage('Valid WhatsApp number required')
];

// GET /api/distributors - Get all distributors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const city = req.query.city || '';
        const isActive = req.query.is_active;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // For sales staff, only show assigned distributors
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND d.distributor_id IN (
                SELECT distributor_id FROM sales_staff_distributors 
                WHERE sales_staff_id = $${paramIndex} AND is_active = true
            )`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (d.distributor_name ILIKE $${paramIndex} OR d.primary_contact_person ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (city) {
            whereClause += ` AND d.city ILIKE $${paramIndex}`;
            params.push(`%${city}%`);
            paramIndex++;
        }

        if (isActive !== undefined) {
            whereClause += ` AND d.is_active = $${paramIndex}`;
            params.push(isActive === 'true');
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM distributors d ${whereClause}`,
            params
        );
        const totalDistributors = parseInt(countResult.rows[0].count);

        // Get distributors with pagination
        const result = await query(
            `SELECT 
                d.distributor_id, d.distributor_name, d.address, d.city, d.state, 
                d.postal_code, d.ntn_number, d.primary_contact_person, 
                d.primary_whatsapp_number, d.is_active, d.created_at, d.updated_at,
                u.full_name as created_by_name,
                (SELECT json_agg(json_build_object(
                    'contact_id', dc.contact_id,
                    'contact_person_name', dc.contact_person_name,
                    'whatsapp_number', dc.whatsapp_number,
                    'phone_number', dc.phone_number,
                    'email', dc.email,
                    'designation', dc.designation,
                    'is_primary', dc.is_primary
                )) FROM distributor_contacts dc WHERE dc.distributor_id = d.distributor_id) as contacts,
                (SELECT json_agg(json_build_object(
                    'sales_staff_id', ssd.sales_staff_id,
                    'full_name', us.full_name,
                    'email', us.email,
                    'assigned_date', ssd.assigned_date,
                    'is_active', ssd.is_active
                )) FROM sales_staff_distributors ssd
                 JOIN users us ON us.user_id = ssd.sales_staff_id
                 WHERE ssd.distributor_id = d.distributor_id) as assigned_staff,
                (SELECT COUNT(*) FROM invoices WHERE distributor_id = d.distributor_id) as total_invoices,
                (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE distributor_id = d.distributor_id) as total_amount,
                (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE distributor_id = d.distributor_id) as paid_amount,
                (SELECT COUNT(*) FROM invoices WHERE distributor_id = d.distributor_id AND status IN ('sent', 'partial_paid', 'overdue')) as pending_invoices
             FROM distributors d
             LEFT JOIN users u ON u.user_id = d.created_by
             WHERE d.distributor_id = $1`,
            [distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/distributors - Create new distributor
router.post('/', authenticateToken, requireRole('admin'), createDistributorValidation, async (req, res) => {
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
            distributor_name, address, city, state, postal_code, ntn_number,
            primary_contact_person, primary_whatsapp_number, contacts = [], assigned_staff = []
        } = req.body;

        // Insert distributor
        const distributorResult = await client.query(
            `INSERT INTO distributors (distributor_name, address, city, state, postal_code, 
                                     ntn_number, primary_contact_person, primary_whatsapp_number, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING distributor_id, distributor_name, address, city, state, postal_code, 
                       ntn_number, primary_contact_person, primary_whatsapp_number, 
                       is_active, created_at`,
            [distributor_name, address, city, state, postal_code, ntn_number,
             primary_contact_person, primary_whatsapp_number, req.user.user_id]
        );

        const distributor = distributorResult.rows[0];

        // Insert additional contacts
        if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
                await client.query(
                    `INSERT INTO distributor_contacts (distributor_id, contact_person_name, 
                                                     whatsapp_number, phone_number, email, designation, is_primary)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [distributor.distributor_id, contact.contact_person_name, contact.whatsapp_number,
                     contact.phone_number, contact.email, contact.designation, contact.is_primary || false]
                );
            }
        }

        // Assign sales staff
        if (assigned_staff && assigned_staff.length > 0) {
            for (const staffId of assigned_staff) {
                await client.query(
                    `INSERT INTO sales_staff_distributors (sales_staff_id, distributor_id)
                     VALUES ($1, $2)`,
                    [staffId, distributor.distributor_id]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Distributor created successfully',
            data: distributor
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create distributor error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                message: 'Distributor with this name already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// PUT /api/distributors/:id - Update distributor
router.put('/:id', authenticateToken, requireRole('admin'), updateDistributorValidation, async (req, res) => {
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

        const distributorId = req.params.id;

        await client.query('BEGIN');

        const {
            distributor_name, address, city, state, postal_code, ntn_number,
            primary_contact_person, primary_whatsapp_number, contacts, assigned_staff
        } = req.body;

        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (distributor_name !== undefined) {
            updates.push(`distributor_name = ${paramIndex++}`);
            params.push(distributor_name);
        }
        if (address !== undefined) {
            updates.push(`address = ${paramIndex++}`);
            params.push(address);
        }
        if (city !== undefined) {
            updates.push(`city = ${paramIndex++}`);
            params.push(city);
        }
        if (state !== undefined) {
            updates.push(`state = ${paramIndex++}`);
            params.push(state);
        }
        if (postal_code !== undefined) {
            updates.push(`postal_code = ${paramIndex++}`);
            params.push(postal_code);
        }
        if (ntn_number !== undefined) {
            updates.push(`ntn_number = ${paramIndex++}`);
            params.push(ntn_number);
        }
        if (primary_contact_person !== undefined) {
            updates.push(`primary_contact_person = ${paramIndex++}`);
            params.push(primary_contact_person);
        }
        if (primary_whatsapp_number !== undefined) {
            updates.push(`primary_whatsapp_number = ${paramIndex++}`);
            params.push(primary_whatsapp_number);
        }

        if (updates.length === 0 && !contacts && !assigned_staff) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // Update distributor if there are field updates
        if (updates.length > 0) {
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            params.push(distributorId);

            await client.query(
                `UPDATE distributors SET ${updates.join(', ')} WHERE distributor_id = ${paramIndex}`,
                params
            );
        }

        // Update contacts if provided
        if (contacts !== undefined) {
            // Delete existing contacts
            await client.query(
                'DELETE FROM distributor_contacts WHERE distributor_id = $1',
                [distributorId]
            );

            // Insert new contacts
            for (const contact of contacts) {
                await client.query(
                    `INSERT INTO distributor_contacts (distributor_id, contact_person_name, 
                                                     whatsapp_number, phone_number, email, designation, is_primary)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [distributorId, contact.contact_person_name, contact.whatsapp_number,
                     contact.phone_number, contact.email, contact.designation, contact.is_primary || false]
                );
            }
        }

        // Update staff assignments if provided
        if (assigned_staff !== undefined) {
            // Deactivate existing assignments
            await client.query(
                'UPDATE sales_staff_distributors SET is_active = false WHERE distributor_id = $1',
                [distributorId]
            );

            // Insert new assignments
            for (const staffId of assigned_staff) {
                await client.query(
                    `INSERT INTO sales_staff_distributors (sales_staff_id, distributor_id)
                     VALUES ($1, $2)
                     ON CONFLICT (sales_staff_id, distributor_id) 
                     DO UPDATE SET is_active = true, assigned_date = CURRENT_DATE`,
                    [staffId, distributorId]
                );
            }
        }

        // Get updated distributor
        const result = await client.query(
            `SELECT distributor_id, distributor_name, address, city, state, postal_code, 
                    ntn_number, primary_contact_person, primary_whatsapp_number, 
                    is_active, updated_at
             FROM distributors WHERE distributor_id = $1`,
            [distributorId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Distributor updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update distributor error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                message: 'Distributor with this name already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// DELETE /api/distributors/:id - Deactivate distributor
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const distributorId = req.params.id;

        const result = await query(
            'UPDATE distributors SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE distributor_id = $1 RETURNING distributor_id, distributor_name',
            [distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        res.json({
            success: true,
            message: 'Distributor deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/distributors/:id/activate - Activate distributor
router.post('/:id/activate', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const distributorId = req.params.id;

        const result = await query(
            'UPDATE distributors SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE distributor_id = $1 RETURNING distributor_id, distributor_name',
            [distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        res.json({
            success: true,
            message: 'Distributor activated successfully'
        });

    } catch (error) {
        console.error('Activate distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/distributors/:id/invoices - Get distributor invoices
router.get('/:id/invoices', authenticateToken, checkDistributorAccess, async (req, res) => {
    try {
        const distributorId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;

        let whereClause = 'WHERE i.distributor_id = $1';
        const params = [distributorId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND i.status = ${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM invoices i ${whereClause}`,
            params
        );
        const totalInvoices = parseInt(countResult.rows[0].count);

        // Get invoices
        const result = await query(
            `SELECT i.invoice_id, i.invoice_number, i.invoice_date, i.due_date,
                    i.subtotal, i.tax_amount, i.discount_amount, i.total_amount,
                    i.paid_amount, i.status, i.notes,
                    u.full_name as sales_staff_name
             FROM invoices i
             LEFT JOIN users u ON u.user_id = i.sales_staff_id
             ${whereClause}
             ORDER BY i.created_at DESC
             LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
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
        console.error('Get distributor invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/distributors/search/suggestions - Get distributor suggestions for search
router.get('/search/suggestions', authenticateToken, async (req, res) => {
    try {
        const search = req.query.q || '';
        
        if (search.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        let whereClause = 'WHERE d.is_active = true';
        const params = [];
        let paramIndex = 1;

        // For sales staff, only show assigned distributors
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND d.distributor_id IN (
                SELECT distributor_id FROM sales_staff_distributors 
                WHERE sales_staff_id = ${paramIndex} AND is_active = true
            )`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        whereClause += ` AND (d.distributor_name ILIKE ${paramIndex} OR d.primary_contact_person ILIKE ${paramIndex})`;
        params.push(`%${search}%`);

        const result = await query(
            `SELECT d.distributor_id, d.distributor_name, d.city, d.primary_contact_person
             FROM distributors d
             ${whereClause}
             ORDER BY d.distributor_name
             LIMIT 10`,
            params
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get distributor suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;