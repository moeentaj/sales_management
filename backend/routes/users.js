 // routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createUserValidation = [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('role').isIn(['admin', 'sales_staff']).withMessage('Valid role is required'),
    body('phone_number').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('commission_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100')
];

const updateUserValidation = [
    body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('phone_number').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('commission_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100')
];

// GET /api/users - Get all users (Admin only)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const role = req.query.role || '';

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (role) {
            whereClause += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM users ${whereClause}`,
            params
        );
        const totalUsers = parseInt(countResult.rows[0].count);

        // Get users with pagination
        const result = await query(
            `SELECT u.user_id, u.username, u.email, u.role, u.full_name, u.phone_number, 
                    u.address, u.id_card_number, u.profile_image_url, u.date_of_birth, 
                    u.hire_date, u.commission_rate, u.is_active, u.created_at,
                    CASE 
                        WHEN u.role = 'sales_staff' THEN (
                            SELECT COUNT(*) FROM sales_staff_distributors 
                            WHERE sales_staff_id = u.user_id AND is_active = true
                        )
                        ELSE 0
                    END as assigned_distributors_count
             FROM users u 
             ${whereClause}
             ORDER BY u.created_at DESC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    page,
                    limit,
                    total: totalUsers,
                    pages: Math.ceil(totalUsers / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/users/:id - Get specific user
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user can access this profile
        if (req.user.role !== 'admin' && req.user.user_id != userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const result = await query(
            `SELECT u.user_id, u.username, u.email, u.role, u.full_name, u.phone_number, 
                    u.address, u.id_card_number, u.profile_image_url, u.date_of_birth, 
                    u.hire_date, u.salary, u.commission_rate, u.is_active, u.created_at,
                    (SELECT json_agg(json_build_object(
                        'document_id', sd.document_id,
                        'document_type', sd.document_type,
                        'document_name', sd.document_name,
                        'document_url', sd.document_url,
                        'uploaded_at', sd.uploaded_at
                    )) FROM staff_documents sd WHERE sd.staff_id = u.user_id) as documents,
                    CASE 
                        WHEN u.role = 'sales_staff' THEN (
                            SELECT json_agg(json_build_object(
                                'distributor_id', d.distributor_id,
                                'distributor_name', d.distributor_name,
                                'assigned_date', ssd.assigned_date
                            ))
                            FROM sales_staff_distributors ssd
                            JOIN distributors d ON d.distributor_id = ssd.distributor_id
                            WHERE ssd.sales_staff_id = u.user_id AND ssd.is_active = true
                        )
                        ELSE NULL
                    END as assigned_distributors
             FROM users u 
             WHERE u.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, requireRole('admin'), createUserValidation, async (req, res) => {
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
            username, email, password, full_name, role, phone_number,
            address, id_card_number, date_of_birth, hire_date,
            salary, commission_rate
        } = req.body;

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const result = await client.query(
            `INSERT INTO users (username, email, password_hash, role, full_name, phone_number, 
                               address, id_card_number, date_of_birth, hire_date, salary, commission_rate)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING user_id, username, email, role, full_name, phone_number, 
                       address, id_card_number, date_of_birth, hire_date, 
                       salary, commission_rate, is_active, created_at`,
            [username, email, passwordHash, role, full_name, phone_number,
             address, id_card_number, date_of_birth, hire_date, salary, commission_rate]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create user error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
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

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, updateUserValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.params.id;

        // Check if user can update this profile
        if (req.user.role !== 'admin' && req.user.user_id != userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            username, email, full_name, phone_number, address,
            id_card_number, date_of_birth, hire_date, salary, commission_rate
        } = req.body;

        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (username !== undefined) {
            updates.push(`username = $${paramIndex++}`);
            params.push(username);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            params.push(email);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            params.push(full_name);
        }
        if (phone_number !== undefined) {
            updates.push(`phone_number = $${paramIndex++}`);
            params.push(phone_number);
        }
        if (address !== undefined) {
            updates.push(`address = $${paramIndex++}`);
            params.push(address);
        }
        if (id_card_number !== undefined) {
            updates.push(`id_card_number = $${paramIndex++}`);
            params.push(id_card_number);
        }
        if (date_of_birth !== undefined) {
            updates.push(`date_of_birth = $${paramIndex++}`);
            params.push(date_of_birth);
        }

        // Only admin can update these fields
        if (req.user.role === 'admin') {
            if (hire_date !== undefined) {
                updates.push(`hire_date = $${paramIndex++}`);
                params.push(hire_date);
            }
            if (salary !== undefined) {
                updates.push(`salary = $${paramIndex++}`);
                params.push(salary);
            }
            if (commission_rate !== undefined) {
                updates.push(`commission_rate = $${paramIndex++}`);
                params.push(commission_rate);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(userId);

        const result = await query(
            `UPDATE users SET ${updates.join(', ')} 
             WHERE user_id = $${paramIndex}
             RETURNING user_id, username, email, role, full_name, phone_number, 
                       address, id_card_number, date_of_birth, hire_date, 
                       salary, commission_rate, is_active, updated_at`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Don't allow deleting the current admin user
        if (req.user.user_id == userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        const result = await query(
            'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id, full_name',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/users/:id/activate - Activate user (Admin only)
router.post('/:id/activate', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        const result = await query(
            'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id, full_name',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User activated successfully'
        });

    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/users/sales-staff/list - Get all sales staff for assignments
router.get('/sales-staff/list', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await query(
            `SELECT user_id, full_name, email, phone_number,
                    (SELECT COUNT(*) FROM sales_staff_distributors 
                     WHERE sales_staff_id = users.user_id AND is_active = true) as assigned_count
             FROM users 
             WHERE role = 'sales_staff' AND is_active = true 
             ORDER BY full_name`
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get sales staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;