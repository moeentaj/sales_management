// backend/server.js - Complete Updated Server with Categories Route
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:3002',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin) return cb(null, true); // allow curl/Postman
    if (allowed.includes(origin) || /^http:\/\/localhost:3\d{3}$/.test(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Import routes - core routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Import the implemented API routes
let distributorRoutes, productRoutes, categoriesRoutes, dashboardRoutes, invoiceRoutes, paymentRoutes;

try {
    distributorRoutes = require('./routes/distributors');
    console.log('✅ Distributors route loaded successfully');
} catch (error) {
    console.log('⚠️ distributors.js route not found or has errors:', error.message);
}

try {
    productRoutes = require('./routes/products');
    console.log('✅ Products route loaded successfully');
} catch (error) {
    console.log('⚠️ products.js route not found or has errors:', error.message);
}

try {
    categoriesRoutes = require('./routes/categories');
    console.log('✅ Categories route loaded successfully');
} catch (error) {
    console.log('⚠️ categories.js route not found or has errors:', error.message);
}

try {
    dashboardRoutes = require('./routes/dashboard');
    console.log('✅ Dashboard route loaded successfully');
} catch (error) {
    console.log('⚠️ dashboard.js route not found or has errors:', error.message);
}

try {
    invoiceRoutes = require('./routes/invoices');
    console.log('✅ Invoices route loaded successfully');
} catch (error) {
    console.log('⚠️ invoices.js route not found or has errors:', error.message);
}

try {
    paymentRoutes = require('./routes/payments');
    console.log('✅ Payments route loaded successfully');
} catch (error) {
    console.log('⚠️ payments.js route not found or has errors:', error.message);
}

// Import remaining routes (placeholders)
let reportRoutes, uploadRoutes;

try {
    reportRoutes = require('./routes/reports');
    console.log('✅ Reports route loaded successfully');
} catch (error) {
    console.log('⚠️ reports.js route not found or has errors:', error.message);
}

try {
    uploadRoutes = require('./routes/upload');
    console.log('✅ Upload route loaded successfully');
} catch (error) {
    console.log('⚠️ upload.js route not found or has errors:', error.message);
}

// API routes - only use routes that loaded successfully
console.log('\n🛣️ Registering API Routes:');

// Core authentication and user management (always available)
app.use('/api/auth', authRoutes);
console.log('   ✅ /api/auth - Authentication routes');

app.use('/api/users', userRoutes);
console.log('   ✅ /api/users - User management routes');

// Business logic routes (conditionally loaded)
if (distributorRoutes) {
    app.use('/api/distributors', distributorRoutes);
    console.log('   ✅ /api/distributors - Distributor management routes');
}

if (productRoutes) {
    app.use('/api/products', productRoutes);
    console.log('   ✅ /api/products - Product management routes');
}

if (categoriesRoutes) {
    app.use('/api/categories', categoriesRoutes);
    console.log('   ✅ /api/categories - Category management routes');
}

if (dashboardRoutes) {
    app.use('/api/dashboard', dashboardRoutes);
    console.log('   ✅ /api/dashboard - Dashboard analytics routes');
}

if (invoiceRoutes) {
    app.use('/api/invoices', invoiceRoutes);
    console.log('   ✅ /api/invoices - Invoice management routes');
}

if (paymentRoutes) {
    app.use('/api/payments', paymentRoutes);
    console.log('   ✅ /api/payments - Payment collection routes');
}

if (reportRoutes) {
    app.use('/api/reports', reportRoutes);
    console.log('   ✅ /api/reports - Reporting routes');
}

if (uploadRoutes) {
    app.use('/api/upload', uploadRoutes);
    console.log('   ✅ /api/upload - File upload routes');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        routes: {
            auth: '✅',
            users: '✅',
            distributors: distributorRoutes ? '✅' : '❌',
            products: productRoutes ? '✅' : '❌',
            categories: categoriesRoutes ? '✅' : '❌',
            dashboard: dashboardRoutes ? '✅' : '❌',
            invoices: invoiceRoutes ? '✅' : '❌',
            payments: paymentRoutes ? '✅' : '❌',
            reports: reportRoutes ? '✅' : '❌',
            uploads: uploadRoutes ? '✅' : '❌'
        },
        database: {
            status: 'Connected',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'sales_management'
        }
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    const availableEndpoints = [];
    
    // Core endpoints
    availableEndpoints.push(
        { method: 'POST', path: '/api/auth/login', description: 'User authentication' },
        { method: 'GET', path: '/api/auth/me', description: 'Get current user info' },
        { method: 'GET', path: '/api/users', description: 'Get all users (Admin only)' },
        { method: 'POST', path: '/api/users', description: 'Create new user (Admin only)' }
    );

    // Conditional endpoints based on loaded routes
    if (distributorRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/distributors', description: 'Get all distributors' },
            { method: 'POST', path: '/api/distributors', description: 'Create new distributor' }
        );
    }

    if (productRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/products', description: 'Get all products' },
            { method: 'POST', path: '/api/products', description: 'Create new product' },
            { method: 'GET', path: '/api/products/categories/list', description: 'Get product categories' }
        );
    }

    if (categoriesRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/categories', description: 'Get all categories' },
            { method: 'POST', path: '/api/categories', description: 'Create new category (Admin only)' },
            { method: 'PUT', path: '/api/categories/:id', description: 'Update category (Admin only)' },
            { method: 'DELETE', path: '/api/categories/:id', description: 'Delete category (Admin only)' },
            { method: 'PATCH', path: '/api/categories/:id/toggle-status', description: 'Toggle category status' },
            { method: 'PUT', path: '/api/categories/reorder', description: 'Reorder categories' },
            { method: 'GET', path: '/api/categories/stats/summary', description: 'Get category statistics' }
        );
    }

    if (dashboardRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/dashboard/stats', description: 'Get dashboard statistics' }
        );
    }

    if (invoiceRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/invoices', description: 'Get all invoices' },
            { method: 'POST', path: '/api/invoices', description: 'Create new invoice' }
        );
    }

    if (paymentRoutes) {
        availableEndpoints.push(
            { method: 'GET', path: '/api/payments', description: 'Get all payments' },
            { method: 'POST', path: '/api/payments', description: 'Record new payment' }
        );
    }

    res.json({
        title: 'Sales Management System API',
        version: '1.0.0',
        description: 'Complete field sales and collection management system',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: availableEndpoints,
        authentication: 'Bearer token required for most endpoints',
        totalEndpoints: availableEndpoints.length
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.details
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized access'
        });
    }
    
    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }
    
    if (err.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json({
            success: false,
            message: 'Referenced record not found'
        });
    }

    // Generic error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint ${req.originalUrl} not found`,
        availableEndpoints: '/api/docs'
    });
});

// Basic root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Sales Management System API Server',
        version: '1.0.0',
        status: 'Running',
        timestamp: new Date().toISOString(),
        documentation: '/api/docs',
        health: '/api/health'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
🚀 Sales Management System API Server Started
================================================
📍 Server running on: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📚 API Documentation: http://localhost:${PORT}/api/docs
❤️ Health Check: http://localhost:${PORT}/api/health
🛡️ Security: Helmet & CORS enabled
⚡ Rate Limiting: 1000 requests/15 minutes
================================================
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.log('Shutting down due to uncaught exception...');
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    console.log('Shutting down due to unhandled promise rejection...');
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;