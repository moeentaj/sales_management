// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, generateToken, generateRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    })
];

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const result = await query(
            'SELECT user_id, username, email, password_hash, role, full_name, is_active FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate tokens
        const accessToken = generateToken(user.user_id, user.email, user.role);
        const refreshToken = generateRefreshToken(user.user_id);

        // Update last login time
        await query(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
            [user.user_id]
        );

        // Remove password hash from response
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + 'refresh');

        // Get user details
        const result = await query(
            'SELECT user_id, username, email, role, full_name, is_active FROM users WHERE user_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const user = result.rows[0];

        // Generate new access token
        const accessToken = generateToken(user.user_id, user.email, user.role);

        res.json({
            success: true,
            data: {
                accessToken,
                user
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, changePasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.user_id;

        // Get current password hash
        const result = await query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [userId]
        );

        const user = result.rows[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const result = await query(
            `SELECT u.user_id, u.username, u.email, u.role, u.full_name, u.phone_number, 
                    u.address, u.id_card_number, u.profile_image_url, u.date_of_birth, 
                    u.hire_date, u.commission_rate, u.is_active,
                    CASE 
                        WHEN u.role = 'sales_staff' THEN (
                            SELECT COUNT(*) FROM sales_staff_distributors 
                            WHERE sales_staff_id = u.user_id AND is_active = true
                        )
                        ELSE 0
                    END as assigned_distributors_count
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
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
    // In a production environment, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;