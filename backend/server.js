// backend/server.js - Updated to include payments route
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
let distributorRoutes, productRoutes, dashboardRoutes, invoiceRoutes, paymentRoutes;

try {
    distributorRoutes = require('./routes/distributors');
} catch (error) {
    console.log('⚠️ distributors.js route not found or has errors:', error.message);
}

try {
    productRoutes = require('./routes/products');
} catch (error) {
    console.log('⚠️ products.js route not found or has errors:', error.message);
}

try {
    dashboardRoutes = require('./routes/dashboard');
} catch (error) {
    console.log('⚠️ dashboard.js route not found or has errors:', error.message);
}

try {
    invoiceRoutes = require('./routes/invoices');
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
} catch (error) {
    console.log('⚠️ reports.js route not found or has errors:', error.message);
}

try {
    uploadRoutes = require('./routes/upload');
} catch (error) {
    console.log('⚠️ upload.js route not found or has errors:', error.message);
}

// API routes - only use routes that loaded successfully
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

if (distributorRoutes) {
    app.use('/api/distributors', distributorRoutes);
}

if (productRoutes) {
    app.use('/api/products', productRoutes);
}

if (dashboardRoutes) {
    app.use('/api/dashboard', dashboardRoutes);
}

if (invoiceRoutes) {
    app.use('/api/invoices', invoiceRoutes);
}

if (paymentRoutes) {
    app.use('/api/payments', paymentRoutes);
}

if (reportRoutes) {
    app.use('/api/reports', reportRoutes);
}

if (uploadRoutes) {
    app.use('/api/upload', uploadRoutes);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        routes: {
            auth: '✅',
            users: '✅',
            distributors: distributorRoutes ? '✅' : '❌',
            products: productRoutes ? '✅' : '❌',
            dashboard: dashboardRoutes ? '✅' : '❌',
            invoices: invoiceRoutes ? '✅' : '❌',
            payments: paymentRoutes ? '✅' : '❌', // NEW
            reports: reportRoutes ? '✅' : '❌',
            upload: uploadRoutes ? '✅' : '❌'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (err.type === 'validation') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.details
        });
    }
    
    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️ Health Check: http://localhost:${PORT}/api/health`);
    console.log(`💰 Payment Collection API: Ready!`);
});

module.exports = app;