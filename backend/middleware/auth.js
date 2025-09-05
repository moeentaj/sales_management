 // middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token is required'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists and is active
        const result = await query(
            'SELECT user_id, username, email, role, full_name, is_active FROM users WHERE user_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Distributor not assigned to you'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking distributor access:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking access permissions'
        });
    }
};

// Generate JWT token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { 
            userId, 
            email, 
            role,
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'sales-management-system'
        }
    );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        JWT_SECRET + 'refresh',
        { expiresIn: '7d' }
    );
};

// Require specific role
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${role} role required.`
            });
        }

        next();
    };
};

// Check if user has access to specific distributor
const checkDistributorAccess = async (req, res, next) => {
    try {
        const distributorId = req.params.distributorId || req.params.id || req.body.distributor_id;
        const userId = req.user.user_id;

        // Admin has access to all distributors
        if (req.user.role === 'admin') {
            return next();
        }

        // Sales staff can only access assigned distributors
        if (req.user.role === 'sales_staff') {
            const result = await query(
                `SELECT 1 FROM sales_staff_distributors 
                 WHERE sales_staff_id = $1 AND distributor_id = $2 AND is_active = true`,
                [userId, distributorId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Distributor not assigned to you'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error checking distributor access:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking access permissions'
        });
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    checkDistributorAccess,
    generateToken,
    generateRefreshToken
};