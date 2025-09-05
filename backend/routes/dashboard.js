// routes/dashboard.js
const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;
        
        // Base statistics that apply to all users
        let statsQuery = '';
        let params = [];
        
        if (userRole === 'admin') {
            // Admin sees all data
            statsQuery = `
                SELECT 
                    -- User Statistics
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'sales_staff' AND is_active = true) as total_sales_staff,
                    
                    -- Distributor Statistics
                    (SELECT COUNT(*) FROM distributors WHERE is_active = true) as total_distributors,
                    (SELECT COUNT(*) FROM distributors WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_distributors_this_month,
                    
                    -- Product Statistics
                    (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
                    (SELECT COUNT(DISTINCT category) FROM products WHERE category IS NOT NULL AND is_active = true) as total_categories,
                    
                    -- Invoice Statistics
                    (SELECT COUNT(*) FROM invoices) as total_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as paid_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE status IN ('sent', 'partial_paid', 'overdue')) as pending_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE invoice_date = CURRENT_DATE) as today_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE invoice_date >= CURRENT_DATE - INTERVAL '7 days') as week_invoices,
                    (SELECT COUNT(*) FROM invoices WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days') as month_invoices,
                    
                    -- Revenue Statistics
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status != 'cancelled') as total_revenue,
                    (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices) as total_paid,
                    (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices WHERE status != 'cancelled' AND status != 'paid') as total_pending,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE invoice_date = CURRENT_DATE) as today_revenue,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE invoice_date >= CURRENT_DATE - INTERVAL '7 days') as week_revenue,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days') as month_revenue,
                    (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days') as month_collected,
                    
                    -- Payment Statistics
                    (SELECT COUNT(*) FROM payments WHERE payment_date = CURRENT_DATE) as today_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date = CURRENT_DATE) as today_collections,
                    (SELECT COUNT(*) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days') as week_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days') as week_collections,
                    (SELECT COUNT(*) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days') as month_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days') as month_collections
            `;
        } else {
            // Sales staff sees only their assigned data
            statsQuery = `
                SELECT 
                    -- Assigned Distributors
                    (SELECT COUNT(*) FROM sales_staff_distributors ssd 
                     JOIN distributors d ON d.distributor_id = ssd.distributor_id
                     WHERE ssd.sales_staff_id = $1 AND ssd.is_active = true AND d.is_active = true) as assigned_distributors,
                    
                    -- Invoice Statistics (only for assigned distributors)
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1) as total_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.status = 'paid') as paid_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.status IN ('sent', 'partial_paid', 'overdue')) as pending_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.status = 'overdue') as overdue_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date = CURRENT_DATE) as today_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date >= CURRENT_DATE - INTERVAL '7 days') as week_invoices,
                    (SELECT COUNT(*) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days') as month_invoices,
                    
                    -- Revenue Statistics (only for their invoices)
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.status != 'cancelled') as total_revenue,
                    (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1) as total_paid,
                    (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.status != 'cancelled' AND i.status != 'paid') as total_pending,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date = CURRENT_DATE) as today_revenue,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date >= CURRENT_DATE - INTERVAL '7 days') as week_revenue,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices i
                     WHERE i.sales_staff_id = $1 AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days') as month_revenue,
                    
                    -- Payment Statistics (only for their collections)
                    (SELECT COUNT(*) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date = CURRENT_DATE) as today_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date = CURRENT_DATE) as today_collections,
                    (SELECT COUNT(*) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date >= CURRENT_DATE - INTERVAL '7 days') as week_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date >= CURRENT_DATE - INTERVAL '7 days') as week_collections,
                    (SELECT COUNT(*) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date >= CURRENT_DATE - INTERVAL '30 days') as month_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments p
                     WHERE p.collected_by = $1 AND p.payment_date >= CURRENT_DATE - INTERVAL '30 days') as month_collections
            `;
            params = [userId];
        }

        const result = await query(statsQuery, params);
        
        res.json({
            success: true,
            data: {
                stats: result.rows[0],
                user_role: userRole
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/dashboard/recent-activities - Get recent activities
router.get('/recent-activities', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;
        const limit = parseInt(req.query.limit) || 10;

        let activitiesQuery = '';
        let params = [limit];

        if (userRole === 'admin') {
            // Admin sees all activities
            activitiesQuery = `
                (SELECT 'invoice_created' as activity_type, i.invoice_id as record_id, 
                        i.invoice_number as title, d.distributor_name as description,
                        u.full_name as performed_by, i.created_at as activity_date,
                        i.total_amount as amount
                 FROM invoices i
                 JOIN distributors d ON d.distributor_id = i.distributor_id
                 LEFT JOIN users u ON u.user_id = i.sales_staff_id
                 ORDER BY i.created_at DESC LIMIT $1)
                UNION ALL
                (SELECT 'payment_received' as activity_type, p.payment_id as record_id,
                        'Payment #' || p.payment_id as title, 
                        'Invoice: ' || i.invoice_number || ' - ' || d.distributor_name as description,
                        u.full_name as performed_by, p.created_at as activity_date,
                        p.amount as amount
                 FROM payments p
                 JOIN invoices i ON i.invoice_id = p.invoice_id
                 JOIN distributors d ON d.distributor_id = i.distributor_id
                 LEFT JOIN users u ON u.user_id = p.collected_by
                 ORDER BY p.created_at DESC LIMIT $1)
                UNION ALL
                (SELECT 'distributor_added' as activity_type, d.distributor_id as record_id,
                        d.distributor_name as title, 'New distributor added' as description,
                        u.full_name as performed_by, d.created_at as activity_date,
                        NULL as amount
                 FROM distributors d
                 LEFT JOIN users u ON u.user_id = d.created_by
                 ORDER BY d.created_at DESC LIMIT $1)
                ORDER BY activity_date DESC LIMIT $1
            `;
        } else {
            // Sales staff sees only their activities
            activitiesQuery = `
                (SELECT 'invoice_created' as activity_type, i.invoice_id as record_id, 
                        i.invoice_number as title, d.distributor_name as description,
                        'You' as performed_by, i.created_at as activity_date,
                        i.total_amount as amount
                 FROM invoices i
                 JOIN distributors d ON d.distributor_id = i.distributor_id
                 WHERE i.sales_staff_id = $2
                 ORDER BY i.created_at DESC LIMIT $1)
                UNION ALL
                (SELECT 'payment_received' as activity_type, p.payment_id as record_id,
                        'Payment #' || p.payment_id as title, 
                        'Invoice: ' || i.invoice_number || ' - ' || d.distributor_name as description,
                        'You' as performed_by, p.created_at as activity_date,
                        p.amount as amount
                 FROM payments p
                 JOIN invoices i ON i.invoice_id = p.invoice_id
                 JOIN distributors d ON d.distributor_id = i.distributor_id
                 WHERE p.collected_by = $2
                 ORDER BY p.created_at DESC LIMIT $1)
                ORDER BY activity_date DESC LIMIT $1
            `;
            params = [limit, userId];
        }

        const result = await query(activitiesQuery, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/dashboard/charts/revenue - Get revenue chart data
router.get('/charts/revenue', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;
        const period = req.query.period || 'month'; // day, week, month, year
        
        let chartQuery = '';
        let groupBy = '';
        let dateFormat = '';
        let params = [];

        // Determine grouping and date format based on period
        switch (period) {
            case 'day':
                groupBy = "DATE_TRUNC('hour', invoice_date)";
                dateFormat = "TO_CHAR(DATE_TRUNC('hour', invoice_date), 'HH24:00')";
                break;
            case 'week':
                groupBy = "DATE_TRUNC('day', invoice_date)";
                dateFormat = "TO_CHAR(DATE_TRUNC('day', invoice_date), 'Mon DD')";
                break;
            case 'month':
                groupBy = "DATE_TRUNC('day', invoice_date)";
                dateFormat = "TO_CHAR(DATE_TRUNC('day', invoice_date), 'MM-DD')";
                break;
            case 'year':
                groupBy = "DATE_TRUNC('month', invoice_date)";
                dateFormat = "TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon YYYY')";
                break;
            default:
                groupBy = "DATE_TRUNC('day', invoice_date)";
                dateFormat = "TO_CHAR(DATE_TRUNC('day', invoice_date), 'MM-DD')";
        }

        if (userRole === 'admin') {
            chartQuery = `
                SELECT ${dateFormat} as period_label,
                       ${groupBy} as period_date,
                       COUNT(*) as invoice_count,
                       COALESCE(SUM(total_amount), 0) as total_revenue,
                       COALESCE(SUM(paid_amount), 0) as total_collected
                FROM invoices
                WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days'
                AND status != 'cancelled'
                GROUP BY ${groupBy}
                ORDER BY ${groupBy}
            `;
        } else {
            chartQuery = `
                SELECT ${dateFormat} as period_label,
                       ${groupBy} as period_date,
                       COUNT(*) as invoice_count,
                       COALESCE(SUM(total_amount), 0) as total_revenue,
                       COALESCE(SUM(paid_amount), 0) as total_collected
                FROM invoices
                WHERE sales_staff_id = $1
                AND invoice_date >= CURRENT_DATE - INTERVAL '30 days'
                AND status != 'cancelled'
                GROUP BY ${groupBy}
                ORDER BY ${groupBy}
            `;
            params = [userId];
        }

        const result = await query(chartQuery, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get revenue chart error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/dashboard/charts/top-distributors - Get top distributors chart data
router.get('/charts/top-distributors', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;
        const limit = parseInt(req.query.limit) || 10;

        let chartQuery = '';
        let params = [limit];

        if (userRole === 'admin') {
            chartQuery = `
                SELECT d.distributor_name,
                       COUNT(i.invoice_id) as invoice_count,
                       COALESCE(SUM(i.total_amount), 0) as total_revenue,
                       COALESCE(SUM(i.paid_amount), 0) as total_collected,
                    ROUND(COALESCE(SUM(i.paid_amount), 0) * 100.0 / NULLIF(SUM(i.total_amount), 0), 2) as collection_rate,
                    COUNT(*) / NULLIF(COUNT(DISTINCT i.sales_staff_id), 0) as avg_invoices_per_staff,
                    COALESCE(SUM(i.total_amount), 0) / NULLIF(COUNT(DISTINCT i.sales_staff_id), 0) as avg_revenue_per_staff,
                    COUNT(DISTINCT i.distributor_id) as active_distributors,
                    COUNT(*) / NULLIF(COUNT(DISTINCT DATE(i.created_at)), 0) as avg_invoices_per_day
                FROM invoices i
                WHERE i.status != 'cancelled' ${dateFilter}
            `;
        } else {
            // Individual sales staff performance
            performanceQuery = `
                SELECT 
                    'individual' as scope,
                    1 as active_staff,
                    COUNT(*) as total_invoices,
                    COALESCE(SUM(i.total_amount), 0) as total_revenue,
                    COALESCE(SUM(i.paid_amount), 0) as total_collected,
                    ROUND(COALESCE(SUM(i.paid_amount), 0) * 100.0 / NULLIF(SUM(i.total_amount), 0), 2) as collection_rate,
                    COUNT(*) as avg_invoices_per_staff,
                    COALESCE(SUM(i.total_amount), 0) as avg_revenue_per_staff,
                    COUNT(DISTINCT i.distributor_id) as active_distributors,
                    COUNT(*) / NULLIF(COUNT(DISTINCT DATE(i.created_at)), 0) as avg_invoices_per_day,
                    -- Additional individual metrics
                    (SELECT COUNT(*) FROM payments p WHERE p.collected_by = $1 ${dateFilter.replace('created_at', 'payment_date')}) as payments_collected,
                    (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.collected_by = $1 ${dateFilter.replace('created_at', 'payment_date')}) as amount_collected
                FROM invoices i
                WHERE i.sales_staff_id = $1 AND i.status != 'cancelled' ${dateFilter}
            `;
            params = [userId];
        }

        const result = await query(performanceQuery, params);

        // Get comparison with previous period
        let previousPeriodQuery = '';
        let previousDateFilter = '';

        switch (period) {
            case 'week':
                previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'";
                break;
            case 'month':
                previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'";
                break;
            case 'quarter':
                previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '180 days' AND created_at < CURRENT_DATE - INTERVAL '90 days'";
                break;
            case 'year':
                previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '730 days' AND created_at < CURRENT_DATE - INTERVAL '365 days'";
                break;
            default:
                previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'";
        }

        if (userRole === 'admin') {
            previousPeriodQuery = `
                SELECT 
                    COUNT(*) as prev_total_invoices,
                    COALESCE(SUM(total_amount), 0) as prev_total_revenue
                FROM invoices
                WHERE status != 'cancelled' ${previousDateFilter}
            `;
        } else {
            previousPeriodQuery = `
                SELECT 
                    COUNT(*) as prev_total_invoices,
                    COALESCE(SUM(total_amount), 0) as prev_total_revenue
                FROM invoices
                WHERE sales_staff_id = $1 AND status != 'cancelled' ${previousDateFilter}
            `;
        }

        const previousResult = await query(previousPeriodQuery, params);

        const current = result.rows[0];
        const previous = previousResult.rows[0];

        // Calculate growth percentages
        const invoiceGrowth = previous.prev_total_invoices > 0 
            ? ((current.total_invoices - previous.prev_total_invoices) / previous.prev_total_invoices * 100).toFixed(2)
            : 0;

        const revenueGrowth = previous.prev_total_revenue > 0
            ? ((current.total_revenue - previous.prev_total_revenue) / previous.prev_total_revenue * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            data: {
                current_period: current,
                previous_period: previous,
                growth: {
                    invoice_growth: parseFloat(invoiceGrowth),
                    revenue_growth: parseFloat(revenueGrowth)
                },
                period: period
            }
        });

    } catch (error) {
        console.error('Get performance metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;