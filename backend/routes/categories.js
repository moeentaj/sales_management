// backend/routes/categories.js - Complete Category Management API
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
    body('category_name').notEmpty().withMessage('Category name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer')
];

const updateCategoryValidation = [
    body('category_name').optional().notEmpty().withMessage('Category name cannot be empty')
        .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer')
];

// GET /api/categories - Get all categories
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const isActive = req.query.is_active;
        const includeStats = req.query.include_stats === 'true';

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (category_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (isActive !== undefined) {
            whereClause += ` AND is_active = $${paramIndex}`;
            params.push(isActive === 'true');
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM categories ${whereClause}`,
            params
        );
        const totalCategories = parseInt(countResult.rows[0].count);

        // Base query for categories
        let selectQuery = `
            SELECT category_id, category_name, description, display_order, 
                   is_active, created_at, updated_at
        `;

        // Add product stats if requested
        if (includeStats) {
            selectQuery += `,
                (SELECT COUNT(*) FROM products p 
                 WHERE p.category = c.category_name AND p.is_active = true) as active_products_count,
                (SELECT COUNT(*) FROM products p 
                 WHERE p.category = c.category_name) as total_products_count,
                (SELECT COALESCE(AVG(p.unit_price), 0) FROM products p 
                 WHERE p.category = c.category_name AND p.is_active = true) as avg_product_price
            `;
        }

        selectQuery += ` FROM categories c ${whereClause}`;

        // Get categories with pagination
        const result = await query(
            `${selectQuery}
             ORDER BY display_order ASC, category_name ASC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                categories: result.rows,
                pagination: {
                    page,
                    limit,
                    total: totalCategories,
                    pages: Math.ceil(totalCategories / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/categories/:id - Get specific category
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const categoryId = req.params.id;

        const result = await query(
            `SELECT c.category_id, c.category_name, c.description, c.display_order, 
                    c.is_active, c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM products p 
                     WHERE p.category = c.category_name AND p.is_active = true) as active_products_count,
                    (SELECT COUNT(*) FROM products p 
                     WHERE p.category = c.category_name) as total_products_count,
                    (SELECT COALESCE(AVG(p.unit_price), 0) FROM products p 
                     WHERE p.category = c.category_name AND p.is_active = true) as avg_product_price,
                    (SELECT COALESCE(SUM(ii.line_total), 0) FROM invoice_items ii 
                     JOIN products p ON p.product_id = ii.product_id 
                     WHERE p.category = c.category_name) as total_revenue
             FROM categories c 
             WHERE c.category_id = $1`,
            [categoryId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/categories - Create new category (Admin only)
router.post('/', authenticateToken, requireRole('admin'), createCategoryValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { category_name, description, display_order } = req.body;

        // Check if category name already exists
        const existingCategory = await query(
            'SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER($1)',
            [category_name]
        );

        if (existingCategory.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        // Get next display order if not provided
        let finalDisplayOrder = display_order;
        if (!finalDisplayOrder) {
            const maxOrderResult = await query(
                'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM categories'
            );
            finalDisplayOrder = maxOrderResult.rows[0].next_order;
        }

        const result = await query(
            `INSERT INTO categories (category_name, description, display_order, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING category_id, category_name, description, display_order, is_active, created_at, updated_at`,
            [category_name, description, finalDisplayOrder]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/categories/:id - Update category (Admin only)
router.put('/:id', authenticateToken, requireRole('admin'), updateCategoryValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const categoryId = req.params.id;
        const { category_name, description, display_order } = req.body;

        // Check if category exists
        const existingCategory = await query(
            'SELECT category_id, category_name FROM categories WHERE category_id = $1',
            [categoryId]
        );

        if (existingCategory.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if new category name conflicts with existing (if name is being changed)
        if (category_name && category_name !== existingCategory.rows[0].category_name) {
            const nameConflict = await query(
                'SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER($1) AND category_id != $2',
                [category_name, categoryId]
            );

            if (nameConflict.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        const oldCategoryName = existingCategory.rows[0].category_name;

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (category_name !== undefined) {
            updateFields.push(`category_name = $${paramIndex}`);
            updateValues.push(category_name);
            paramIndex++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }

        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex}`);
            updateValues.push(display_order);
            paramIndex++;
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(categoryId);

        const client = await getClient();
        
        try {
            await client.query('BEGIN');

            // Update category
            const result = await client.query(
                `UPDATE categories 
                 SET ${updateFields.join(', ')}
                 WHERE category_id = $${paramIndex}
                 RETURNING category_id, category_name, description, display_order, is_active, created_at, updated_at`,
                updateValues
            );

            // If category name changed, update all products that use this category
            if (category_name && category_name !== oldCategoryName) {
                await client.query(
                    'UPDATE products SET category = $1 WHERE category = $2',
                    [category_name, oldCategoryName]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Category updated successfully',
                data: result.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/categories/:id - Delete category (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Check if category exists
        const existingCategory = await query(
            'SELECT category_name FROM categories WHERE category_id = $1',
            [categoryId]
        );

        if (existingCategory.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const categoryName = existingCategory.rows[0].category_name;

        // Check if any products use this category
        const productsUsingCategory = await query(
            'SELECT COUNT(*) FROM products WHERE category = $1',
            [categoryName]
        );

        const productCount = parseInt(productsUsingCategory.rows[0].count);

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. ${productCount} products are using this category. Please reassign products to another category first.`,
                data: { productCount }
            });
        }

        // Delete category
        await query('DELETE FROM categories WHERE category_id = $1', [categoryId]);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PATCH /api/categories/:id/toggle-status - Toggle category status (Admin only)
router.patch('/:id/toggle-status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const categoryId = req.params.id;

        const result = await query(
            `UPDATE categories 
             SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
             WHERE category_id = $1
             RETURNING category_id, category_name, is_active`,
            [categoryId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const category = result.rows[0];
        const action = category.is_active ? 'activated' : 'deactivated';

        res.json({
            success: true,
            message: `Category ${action} successfully`,
            data: category
        });

    } catch (error) {
        console.error('Toggle category status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/categories/reorder - Reorder categories (Admin only)
router.put('/reorder', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { categoryOrders } = req.body; // Array of { category_id, display_order }

        if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category orders array is required'
            });
        }

        const client = await getClient();

        try {
            await client.query('BEGIN');

            // Update display orders
            for (const item of categoryOrders) {
                await client.query(
                    'UPDATE categories SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE category_id = $2',
                    [item.display_order, item.category_id]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Categories reordered successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Reorder categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                COUNT(*) as total_categories,
                COUNT(*) FILTER (WHERE is_active = true) as active_categories,
                COUNT(*) FILTER (WHERE is_active = false) as inactive_categories,
                (SELECT COUNT(DISTINCT category) FROM products WHERE category IS NOT NULL) as categories_with_products,
                (SELECT category_name FROM categories ORDER BY created_at DESC LIMIT 1) as latest_category
            FROM categories
        `);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get category stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;