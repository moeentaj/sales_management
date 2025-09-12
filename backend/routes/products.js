// routes/products.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createProductValidation = [
    body('product_name').notEmpty().withMessage('Product name is required'),
    body('product_code').optional().isLength({ max: 50 }).withMessage('Product code too long'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
    body('unit_of_measure').optional().isLength({ max: 50 }).withMessage('Unit of measure too long'),
    body('category').optional().isLength({ max: 100 }).withMessage('Category too long'),
    body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
];

const updateProductValidation = [
    body('product_name').optional().notEmpty().withMessage('Product name cannot be empty'),
    body('product_code').optional().isLength({ max: 50 }).withMessage('Product code too long'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('Valid unit price is required'),
    body('unit_of_measure').optional().isLength({ max: 50 }).withMessage('Unit of measure too long'),
    body('category').optional().isLength({ max: 100 }).withMessage('Category too long'),
    body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
];

// GET /api/products - Get all products
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const isActive = req.query.is_active;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (product_name ILIKE $${paramIndex} OR product_code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (category) {
            whereClause += ` AND category ILIKE $${paramIndex}`;
            params.push(`%${category}%`);
            paramIndex++;
        }

        if (isActive !== undefined) {
            whereClause += ` AND is_active = $${paramIndex}`;
            params.push(isActive === 'true');
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM products ${whereClause}`,
            params
        );
        const totalProducts = parseInt(countResult.rows[0].count);

        // Get products with pagination
        const result = await query(
            `SELECT product_id, product_name, product_code, description, unit_price, 
                    unit_of_measure, category, tax_rate, is_active, created_at, updated_at,
                    (SELECT COUNT(*) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = products.product_id) as times_sold,
                    (SELECT COALESCE(SUM(ii.quantity), 0) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = products.product_id AND i.status != 'cancelled') as total_quantity_sold,
                    (SELECT COALESCE(SUM(ii.line_total), 0) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = products.product_id AND i.status != 'cancelled') as total_revenue
             FROM products 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                products: result.rows,
                pagination: {
                    page,
                    limit,
                    total: totalProducts,
                    pages: Math.ceil(totalProducts / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/products/:id - Get specific product
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.id;

        const result = await query(
            `SELECT p.product_id, p.product_name, p.product_code, p.description, 
                    p.unit_price, p.unit_of_measure, p.category, p.tax_rate, 
                    p.is_active, p.created_at, p.updated_at,
                    (SELECT COUNT(*) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = p.product_id) as times_sold,
                    (SELECT COALESCE(SUM(ii.quantity), 0) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = p.product_id AND i.status != 'cancelled') as total_quantity_sold,
                    (SELECT COALESCE(SUM(ii.line_total), 0) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     WHERE ii.product_id = p.product_id AND i.status != 'cancelled') as total_revenue,
                    (SELECT json_agg(json_build_object(
                        'invoice_id', i.invoice_id,
                        'invoice_number', i.invoice_number,
                        'invoice_date', i.invoice_date,
                        'quantity', ii.quantity,
                        'unit_price', ii.unit_price,
                        'line_total', ii.line_total,
                        'distributor_name', d.distributor_name
                    )) FROM invoice_items ii 
                     JOIN invoices i ON i.invoice_id = ii.invoice_id 
                     JOIN distributors d ON d.distributor_id = i.distributor_id
                     WHERE ii.product_id = p.product_id 
                     ORDER BY i.invoice_date DESC 
                     LIMIT 10) as recent_sales
             FROM products p 
             WHERE p.product_id = $1`,
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/products - Create new product
router.post('/', authenticateToken, requireRole('admin'), createProductValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            product_name, product_code, description, unit_price, 
            unit_of_measure, category, tax_rate
        } = req.body;

        const result = await query(
            `INSERT INTO products (product_name, product_code, description, unit_price, 
                                 unit_of_measure, category, tax_rate)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING product_id, product_name, product_code, description, unit_price, 
                       unit_of_measure, category, tax_rate, is_active, created_at`,
            [product_name, product_code, description, unit_price, 
             unit_of_measure || 'piece', category, tax_rate || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create product error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                message: 'Product code already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticateToken, requireRole('admin'), updateProductValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const productId = req.params.id;
        const {
            product_name, product_code, description, unit_price, 
            unit_of_measure, category, tax_rate
        } = req.body;

        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (product_name !== undefined) {
            updates.push(`product_name = $${paramIndex++}`);
            params.push(product_name);
        }
        if (product_code !== undefined) {
            updates.push(`product_code = $${paramIndex++}`);
            params.push(product_code);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description);
        }
        if (unit_price !== undefined) {
            updates.push(`unit_price = $${paramIndex++}`);
            params.push(unit_price);
        }
        if (unit_of_measure !== undefined) {
            updates.push(`unit_of_measure = $${paramIndex++}`);
            params.push(unit_of_measure);
        }
        if (category !== undefined) {
            updates.push(`category = $${paramIndex++}`);
            params.push(category);
        }
        if (tax_rate !== undefined) {
            updates.push(`tax_rate = $${paramIndex++}`);
            params.push(tax_rate);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(productId);

        const result = await query(
            `UPDATE products SET ${updates.join(', ')} 
             WHERE product_id = $${paramIndex}
             RETURNING product_id, product_name, product_code, description, unit_price, 
                       unit_of_measure, category, tax_rate, is_active, updated_at`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const productId = req.params.id;

        // Check if product exists
        const existingProduct = await query(
            'SELECT product_id, product_name FROM products WHERE product_id = $1',
            [productId]
        );

        if (existingProduct.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const productName = existingProduct.rows[0].product_name;

        // Check if product is used in any invoices
        const invoiceCheck = await query(
            'SELECT COUNT(*) FROM invoice_items WHERE product_id = $1',
            [productId]
        );

        const invoiceCount = parseInt(invoiceCheck.rows[0].count);

        if (invoiceCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete product "${productName}". It is used in ${invoiceCount} invoice(s). Consider deactivating instead.`,
                data: { invoiceCount }
            });
        }

        // Delete the product
        await query('DELETE FROM products WHERE product_id = $1', [productId]);

        res.json({
            success: true,
            message: `Product "${productName}" deleted successfully`
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/products/:id/activate - Activate product
router.post('/:id/activate', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const productId = req.params.id;

        const result = await query(
            'UPDATE products SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE product_id = $1 RETURNING product_id, product_name',
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product activated successfully'
        });

    } catch (error) {
        console.error('Activate product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/products/categories/list - Get all product categories
router.get('/categories/list', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT DISTINCT category, COUNT(*) as product_count
             FROM products 
             WHERE category IS NOT NULL AND category != '' AND is_active = true
             GROUP BY category
             ORDER BY category`,
            []
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get product categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/products/search/suggestions - Get product suggestions for search
router.get('/search/suggestions', authenticateToken, async (req, res) => {
    try {
        const search = req.query.q || '';
        
        if (search.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await query(
            `SELECT product_id, product_name, product_code, unit_price, unit_of_measure, category
             FROM products 
             WHERE is_active = true 
             AND (product_name ILIKE $1 OR product_code ILIKE $1)
             ORDER BY product_name
             LIMIT 10`,
            [`%${search}%`]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get product suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/products/bulk-import - Bulk import products (Admin only)
router.post('/bulk-import', authenticateToken, requireRole('admin'), async (req, res) => {
    const client = await getClient();
    
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required'
            });
        }

        await client.query('BEGIN');

        const importResults = {
            successful: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            try {
                // Validate required fields
                if (!product.product_name || product.unit_price === undefined) {
                    importResults.failed++;
                    importResults.errors.push({
                        row: i + 1,
                        error: 'Product name and unit price are required'
                    });
                    continue;
                }

                // Insert product
                await client.query(
                    `INSERT INTO products (product_name, product_code, description, unit_price, 
                                         unit_of_measure, category, tax_rate)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        product.product_name,
                        product.product_code || null,
                        product.description || null,
                        product.unit_price,
                        product.unit_of_measure || 'piece',
                        product.category || null,
                        product.tax_rate || 0
                    ]
                );

                importResults.successful++;

            } catch (error) {
                importResults.failed++;
                
                if (error.code === '23505') { // Unique violation
                    importResults.errors.push({
                        row: i + 1,
                        error: `Product code '${product.product_code}' already exists`
                    });
                } else {
                    importResults.errors.push({
                        row: i + 1,
                        error: error.message
                    });
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Bulk import completed. ${importResults.successful} products imported successfully, ${importResults.failed} failed.`,
            data: importResults
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk import products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
});

// GET /api/products/analytics/summary - Get product analytics summary
router.get('/analytics/summary', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                COUNT(*) as total_products,
                COUNT(*) FILTER (WHERE is_active = true) as active_products,
                COUNT(*) FILTER (WHERE is_active = false) as inactive_products,
                COUNT(DISTINCT category) FILTER (WHERE category IS NOT NULL) as total_categories,
                AVG(unit_price) as average_price,
                MIN(unit_price) as min_price,
                MAX(unit_price) as max_price,
                (SELECT COUNT(*) FROM products p 
                 WHERE p.product_id IN (
                     SELECT DISTINCT ii.product_id FROM invoice_items ii
                     JOIN invoices i ON i.invoice_id = ii.invoice_id
                     WHERE i.status != 'cancelled'
                 )) as products_with_sales,
                (SELECT p.product_name FROM products p
                 LEFT JOIN invoice_items ii ON ii.product_id = p.product_id
                 LEFT JOIN invoices i ON i.invoice_id = ii.invoice_id AND i.status != 'cancelled'
                 WHERE p.is_active = true
                 GROUP BY p.product_id, p.product_name
                 ORDER BY COALESCE(SUM(ii.quantity), 0) DESC
                 LIMIT 1) as top_selling_product,
                (SELECT COALESCE(SUM(ii.quantity), 0) FROM invoice_items ii
                 JOIN invoices i ON i.invoice_id = ii.invoice_id
                 WHERE i.status != 'cancelled') as total_quantity_sold,
                (SELECT COALESCE(SUM(ii.line_total), 0) FROM invoice_items ii
                 JOIN invoices i ON i.invoice_id = ii.invoice_id
                 WHERE i.status != 'cancelled') as total_revenue
             FROM products`,
            []
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get product analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/products/analytics/top-selling - Get top selling products
router.get('/analytics/top-selling', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const period = req.query.period || 'all'; // all, today, week, month, year

        let dateFilter = '';
        if (period === 'today') {
            dateFilter = "AND i.invoice_date = CURRENT_DATE";
        } else if (period === 'week') {
            dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '7 days'";
        } else if (period === 'month') {
            dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'";
        } else if (period === 'year') {
            dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '365 days'";
        }

        const result = await query(
            `SELECT 
                p.product_id, p.product_name, p.product_code, p.unit_price, p.category,
                COALESCE(SUM(ii.quantity), 0) as total_quantity_sold,
                COALESCE(SUM(ii.line_total), 0) as total_revenue,
                COUNT(DISTINCT i.invoice_id) as times_sold,
                AVG(ii.unit_price) as average_selling_price
             FROM products p
             LEFT JOIN invoice_items ii ON ii.product_id = p.product_id
             LEFT JOIN invoices i ON i.invoice_id = ii.invoice_id AND i.status != 'cancelled' ${dateFilter}
             WHERE p.is_active = true
             GROUP BY p.product_id, p.product_name, p.product_code, p.unit_price, p.category
             ORDER BY total_quantity_sold DESC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get top selling products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;