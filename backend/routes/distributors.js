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

        // Total count
        const countResult = await query(
            `SELECT COUNT(*) FROM distributors d ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // ✅ Main query: no distributorId filter, just use pagination
        const result = await query(
            `SELECT 
         d.distributor_id, d.distributor_name, d.address, d.city, d.state, 
         d.postal_code, d.ntn_number, d.primary_contact_person, 
         d.primary_whatsapp_number, d.is_active, d.created_at, d.updated_at,
         u.full_name as created_by_name
       FROM distributors d
       LEFT JOIN users u ON u.user_id = d.created_by
       ${whereClause}
       ORDER BY d.distributor_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get distributors error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/distributors/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const distributorId = req.params.id;
        const result = await query(
            `SELECT * FROM distributors WHERE distributor_id = $1`,
            [distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Distributor not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get distributor by id error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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

// GET /api/distributors/:id/invoices - Get distributor invoices (FIXED VERSION)
router.get('/:id/invoices', authenticateToken, async (req, res) => {
    try {
        const distributorId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;

        // Check if distributor exists first
        const distributorCheck = await query(
            'SELECT distributor_id FROM distributors WHERE distributor_id = $1',
            [distributorId]
        );

        if (distributorCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        let whereClause = 'WHERE i.distributor_id = $1';
        const params = [distributorId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND i.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Role-based access control
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND i.distributor_id IN (
                SELECT distributor_id FROM sales_staff_distributors 
                WHERE sales_staff_id = $${paramIndex} AND is_active = true
            )`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        try {
            // Get total count first
            const countResult = await query(
                `SELECT COUNT(*) FROM invoices i ${whereClause}`,
                params
            );
            const totalInvoices = parseInt(countResult.rows[0].count);

            // Get invoices with proper LEFT JOIN to handle missing users
            const result = await query(
                `SELECT 
                    i.invoice_id, 
                    i.invoice_number, 
                    i.invoice_date, 
                    i.due_date,
                    i.subtotal, 
                    i.tax_amount, 
                    i.discount_amount, 
                    i.total_amount,
                    i.paid_amount, 
                    i.status, 
                    i.notes,
                    i.created_at,
                    COALESCE(u.full_name, 'System') as sales_staff_name
                 FROM invoices i
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

        } catch (queryError) {
            console.error('Query error in distributor invoices:', queryError);
            
            // If invoices table doesn't exist or has issues, return empty result
            res.json({
                success: true,
                data: {
                    invoices: [],
                    pagination: {
                        page: 1,
                        limit: limit,
                        total: 0,
                        pages: 0
                    }
                }
            });
        }

    } catch (error) {
        console.error('Get distributor invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/distributors/:id/contacts - Get distributor contacts
router.get('/:id/contacts', authenticateToken, async (req, res) => {
    try {
        const distributorId = req.params.id;

        const result = await query(
            `SELECT contact_id, contact_person_name, whatsapp_number, phone_number, 
                    email, designation, is_primary, created_at, updated_at
             FROM distributor_contacts 
             WHERE distributor_id = $1 
             ORDER BY is_primary DESC, contact_person_name ASC`,
            [distributorId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get distributor contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/distributors/:id/contacts - Add distributor contact
router.post('/:id/contacts', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const distributorId = req.params.id;
        const {
            contact_person_name,
            whatsapp_number,
            phone_number,
            email,
            designation,
            is_primary = false
        } = req.body;

        // Validation
        if (!contact_person_name || !contact_person_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Contact person name is required'
            });
        }

        // If this is set as primary, update existing primary contacts
        if (is_primary) {
            await query(
                'UPDATE distributor_contacts SET is_primary = false WHERE distributor_id = $1',
                [distributorId]
            );
        }

        const result = await query(
            `INSERT INTO distributor_contacts 
             (distributor_id, contact_person_name, whatsapp_number, phone_number, email, designation, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING contact_id, contact_person_name, whatsapp_number, phone_number, email, designation, is_primary, created_at`,
            [distributorId, contact_person_name, whatsapp_number, phone_number, email, designation, is_primary]
        );

        res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Add distributor contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/distributors/:id/contacts/:contactId - Update distributor contact
router.put('/:id/contacts/:contactId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id: distributorId, contactId } = req.params;
        const {
            contact_person_name,
            whatsapp_number,
            phone_number,
            email,
            designation,
            is_primary
        } = req.body;

        // If this is set as primary, update existing primary contacts
        if (is_primary) {
            await query(
                'UPDATE distributor_contacts SET is_primary = false WHERE distributor_id = $1 AND contact_id != $2',
                [distributorId, contactId]
            );
        }

        const result = await query(
            `UPDATE distributor_contacts 
             SET contact_person_name = $1, whatsapp_number = $2, phone_number = $3, 
                 email = $4, designation = $5, is_primary = $6, updated_at = CURRENT_TIMESTAMP
             WHERE contact_id = $7 AND distributor_id = $8
             RETURNING contact_id, contact_person_name, whatsapp_number, phone_number, email, designation, is_primary, updated_at`,
            [contact_person_name, whatsapp_number, phone_number, email, designation, is_primary, contactId, distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update distributor contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/distributors/:id/contacts/:contactId - Delete distributor contact
router.delete('/:id/contacts/:contactId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id: distributorId, contactId } = req.params;

        const result = await query(
            'DELETE FROM distributor_contacts WHERE contact_id = $1 AND distributor_id = $2 RETURNING contact_id',
            [contactId, distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        console.error('Delete distributor contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== STAFF ASSIGNMENT ROUTES =====

// GET /api/distributors/:id/staff - Get assigned staff for distributor
router.get('/:id/staff', authenticateToken, async (req, res) => {
    try {
        const distributorId = req.params.id;

        const result = await query(
            `SELECT u.user_id, u.full_name, u.email, u.phone_number, 
                    ssd.assigned_date, ssd.is_active as assignment_active
             FROM sales_staff_distributors ssd
             JOIN users u ON u.user_id = ssd.sales_staff_id
             WHERE ssd.distributor_id = $1 AND ssd.is_active = true
             ORDER BY ssd.assigned_date DESC`,
            [distributorId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get distributor staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/distributors/:id/staff - Assign staff to distributor
router.post('/:id/staff', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const distributorId = req.params.id;
        const { staff_ids } = req.body;

        if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Staff IDs array is required'
            });
        }

        // Verify all staff IDs exist and are sales staff
        const staffCheck = await query(
            'SELECT user_id FROM users WHERE user_id = ANY($1) AND role = $2 AND is_active = true',
            [staff_ids, 'sales_staff']
        );

        if (staffCheck.rows.length !== staff_ids.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more staff IDs are invalid or not active sales staff'
            });
        }

        // Remove existing assignments (soft delete by setting is_active = false)
        await query(
            'UPDATE sales_staff_distributors SET is_active = false WHERE distributor_id = $1',
            [distributorId]
        );

        // Add new assignments
        const insertPromises = staff_ids.map(staffId => 
            query(
                `INSERT INTO sales_staff_distributors (sales_staff_id, distributor_id, assigned_date, is_active)
                 VALUES ($1, $2, CURRENT_TIMESTAMP, true)
                 ON CONFLICT (sales_staff_id, distributor_id) 
                 DO UPDATE SET is_active = true, assigned_date = CURRENT_TIMESTAMP`,
                [staffId, distributorId]
            )
        );

        await Promise.all(insertPromises);

        res.json({
            success: true,
            message: 'Staff assigned successfully'
        });

    } catch (error) {
        console.error('Assign staff to distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/distributors/:id/staff/:staffId - Remove staff assignment
router.delete('/:id/staff/:staffId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id: distributorId, staffId } = req.params;

        const result = await query(
            'UPDATE sales_staff_distributors SET is_active = false WHERE sales_staff_id = $1 AND distributor_id = $2 AND is_active = true RETURNING sales_staff_id',
            [staffId, distributorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Staff assignment not found'
            });
        }

        res.json({
            success: true,
            message: 'Staff assignment removed successfully'
        });

    } catch (error) {
        console.error('Remove staff assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== STATISTICS ROUTE =====

// GET /api/distributors/:id/stats - Get distributor statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const distributorId = req.params.id;
        const period = req.query.period || 'month';
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        let dateCondition = '';
        const params = [distributorId];
        let paramIndex = 2;

        // Build date filter based on period or custom range
        if (startDate && endDate) {
            dateCondition = ` AND i.invoice_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        } else {
            // Use period-based filtering
            switch (period) {
                case 'day':
                    dateCondition = " AND i.invoice_date >= CURRENT_DATE";
                    break;
                case 'week':
                    dateCondition = " AND i.invoice_date >= DATE_TRUNC('week', CURRENT_DATE)";
                    break;
                case 'month':
                    dateCondition = " AND i.invoice_date >= DATE_TRUNC('month', CURRENT_DATE)";
                    break;
                case 'year':
                    dateCondition = " AND i.invoice_date >= DATE_TRUNC('year', CURRENT_DATE)";
                    break;
                default:
                    dateCondition = " AND i.invoice_date >= DATE_TRUNC('month', CURRENT_DATE)";
            }
        }

        // Get invoice statistics
        const invoiceStats = await query(
            `SELECT 
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN status = 'partial_paid' THEN 1 END) as partial_paid_invoices,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(paid_amount), 0) as paid_amount,
                COALESCE(SUM(total_amount - paid_amount), 0) as balance_amount
             FROM invoices i
             WHERE i.distributor_id = $1 ${dateCondition}`,
            params
        );

        // Get payment statistics
        const paymentStats = await query(
            `SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(amount), 0) as total_payment_amount,
                AVG(amount) as average_payment_amount
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             WHERE i.distributor_id = $1 ${dateCondition.replace('i.invoice_date', 'p.payment_date')}`,
            params
        );

        // Get recent activity (last 5 invoices and payments)
        const recentInvoices = await query(
            `SELECT invoice_id, invoice_number, invoice_date, total_amount, status
             FROM invoices 
             WHERE distributor_id = $1 
             ORDER BY invoice_date DESC 
             LIMIT 5`,
            [distributorId]
        );

        const recentPayments = await query(
            `SELECT p.payment_id, p.amount, p.payment_date, p.payment_method, i.invoice_number
             FROM payments p
             JOIN invoices i ON i.invoice_id = p.invoice_id
             WHERE i.distributor_id = $1 
             ORDER BY p.payment_date DESC 
             LIMIT 5`,
            [distributorId]
        );

        const stats = {
            period: period,
            date_range: startDate && endDate ? { start: startDate, end: endDate } : null,
            invoices: {
                total: parseInt(invoiceStats.rows[0].total_invoices),
                paid: parseInt(invoiceStats.rows[0].paid_invoices),
                partial_paid: parseInt(invoiceStats.rows[0].partial_paid_invoices),
                overdue: parseInt(invoiceStats.rows[0].overdue_invoices),
                total_amount: parseFloat(invoiceStats.rows[0].total_amount),
                paid_amount: parseFloat(invoiceStats.rows[0].paid_amount),
                balance_amount: parseFloat(invoiceStats.rows[0].balance_amount)
            },
            payments: {
                total: parseInt(paymentStats.rows[0].total_payments),
                total_amount: parseFloat(paymentStats.rows[0].total_payment_amount),
                average_amount: parseFloat(paymentStats.rows[0].average_payment_amount || 0)
            },
            recent_activity: {
                invoices: recentInvoices.rows,
                payments: recentPayments.rows
            }
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get distributor stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== BULK OPERATIONS =====

// PATCH /api/distributors/bulk/update - Bulk update distributors
router.patch('/bulk/update', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { distributor_ids, update_data } = req.body;

        if (!Array.isArray(distributor_ids) || distributor_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Distributor IDs array is required'
            });
        }

        if (!update_data || typeof update_data !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Update data is required'
            });
        }

        // Build dynamic update query
        const allowedFields = ['is_active', 'city', 'state'];
        const updates = [];
        const params = [];
        let paramIndex = 1;

        Object.keys(update_data).forEach(key => {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${paramIndex}`);
                params.push(update_data[key]);
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(distributor_ids);

        const result = await query(
            `UPDATE distributors 
             SET ${updates.join(', ')}
             WHERE distributor_id = ANY($${paramIndex})
             RETURNING distributor_id, distributor_name`,
            params
        );

        res.json({
            success: true,
            message: `${result.rows.length} distributors updated successfully`,
            data: result.rows
        });

    } catch (error) {
        console.error('Bulk update distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/distributors/bulk/delete - Bulk delete distributors
router.delete('/bulk/delete', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { distributor_ids } = req.body;

        if (!Array.isArray(distributor_ids) || distributor_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Distributor IDs array is required'
            });
        }

        // Soft delete by setting is_active = false
        const result = await query(
            `UPDATE distributors 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE distributor_id = ANY($1)
             RETURNING distributor_id, distributor_name`,
            [distributor_ids]
        );

        res.json({
            success: true,
            message: `${result.rows.length} distributors deleted successfully`,
            data: result.rows
        });

    } catch (error) {
        console.error('Bulk delete distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== EXPORT ROUTE =====

// GET /api/distributors/export - Export distributors to CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const format = req.query.format || 'csv';
        const search = req.query.search || '';
        const city = req.query.city || '';
        const isActive = req.query.is_active;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Role-based filtering
        if (req.user.role === 'sales_staff') {
            whereClause += ` AND d.distributor_id IN (
                SELECT distributor_id FROM sales_staff_distributors 
                WHERE sales_staff_id = $${paramIndex} AND is_active = true
            )`;
            params.push(req.user.user_id);
            paramIndex++;
        }

        // Apply filters
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

        const result = await query(
            `SELECT d.distributor_name, d.address, d.city, d.state, d.postal_code,
                    d.ntn_number, d.primary_contact_person, d.primary_whatsapp_number,
                    d.is_active, d.created_at, u.full_name as created_by
             FROM distributors d
             LEFT JOIN users u ON u.user_id = d.created_by
             ${whereClause}
             ORDER BY d.distributor_name ASC`,
            params
        );

        if (format === 'csv') {
            // Generate CSV
            const headers = [
                'Distributor Name', 'Address', 'City', 'State', 'Postal Code',
                'NTN Number', 'Primary Contact', 'WhatsApp Number', 'Status', 'Created Date', 'Created By'
            ];

            const csvRows = [headers.join(',')];
            
            result.rows.forEach(row => {
                const values = [
                    `"${row.distributor_name || ''}"`,
                    `"${row.address || ''}"`,
                    `"${row.city || ''}"`,
                    `"${row.state || ''}"`,
                    `"${row.postal_code || ''}"`,
                    `"${row.ntn_number || ''}"`,
                    `"${row.primary_contact_person || ''}"`,
                    `"${row.primary_whatsapp_number || ''}"`,
                    `"${row.is_active ? 'Active' : 'Inactive'}"`,
                    `"${new Date(row.created_at).toLocaleDateString()}"`,
                    `"${row.created_by || ''}"`
                ];
                csvRows.push(values.join(','));
            });

            const csvContent = csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="distributors_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            res.status(400).json({
                success: false,
                message: 'Unsupported export format'
            });
        }

    } catch (error) {
        console.error('Export distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;