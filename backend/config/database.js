 // config/database.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sales_management',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of connections in the pool
    connectionTimeoutMillis: 5000, // Connection timeout
    idleTimeoutMillis: 30000, // Idle timeout
});

// Test connection
pool.on('connect', () => {
    console.log('🔌 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('📝 Query executed:', { text, duration: `${duration}ms`, rows: res.rowCount });
        }
        
        return res;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
};

// Helper function to get a client from the pool (for transactions)
const getClient = () => pool.connect();

module.exports = {
    pool,
    query,
    getClient
};