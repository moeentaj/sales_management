// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sales_management',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting database migrations...');
        
        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get list of executed migrations
        const executedMigrationsResult = await client.query(
            'SELECT filename FROM migrations ORDER BY id'
        );
        const executedMigrations = executedMigrationsResult.rows.map(row => row.filename);
        
        // Read migration files from the migrations directory
        const migrationsDir = path.join(__dirname, 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('📁 Creating migrations directory...');
            fs.mkdirSync(migrationsDir, { recursive: true });
        }
        
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        if (migrationFiles.length === 0) {
            console.log('⚠️  No migration files found. Running initial schema...');
            
            // Run the initial schema
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);
                console.log('✅ Initial schema executed successfully');
                
                // Mark as executed
                await client.query(
                    'INSERT INTO migrations (filename) VALUES ($1)',
                    ['000_initial_schema.sql']
                );
            } else {
                // Use the migration file
                const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
                if (fs.existsSync(migrationPath)) {
                    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                    await client.query(migrationSql);
                    console.log('✅ Initial migration executed successfully');
                    
                    // Mark as executed
                    await client.query(
                        'INSERT INTO migrations (filename) VALUES ($1)',
                        ['001_initial_schema.sql']
                    );
                }
            }
            return;
        }
        
        // Execute pending migrations
        for (const filename of migrationFiles) {
            if (!executedMigrations.includes(filename)) {
                console.log(`🔄 Executing migration: ${filename}`);
                
                const migrationPath = path.join(migrationsDir, filename);
                const migrationSql = fs.readFileSync(migrationPath, 'utf8');
                
                // Start transaction for this migration
                await client.query('BEGIN');
                
                try {
                    await client.query(migrationSql);
                    
                    // Record the migration as executed
                    await client.query(
                        'INSERT INTO migrations (filename) VALUES ($1)',
                        [filename]
                    );
                    
                    await client.query('COMMIT');
                    console.log(`✅ Migration ${filename} executed successfully`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw new Error(`Migration ${filename} failed: ${error.message}`);
                }
            } else {
                console.log(`⏭️  Migration ${filename} already executed`);
            }
        }
        
        console.log('🎉 All migrations completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Add command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Migration Tool

Usage:
  npm run db:migrate                Run all pending migrations
  npm run db:migrate -- --status   Show migration status
  npm run db:migrate -- --help     Show this help

Environment Variables:
  DB_HOST        Database host (default: localhost)
  DB_PORT        Database port (default: 5432)
  DB_NAME        Database name (default: sales_management)
  DB_USER        Database user (default: postgres)
  DB_PASSWORD    Database password (default: password)
    `);
    process.exit(0);
}

if (args.includes('--status')) {
    showMigrationStatus();
} else {
    runMigrations();
}

async function showMigrationStatus() {
    const client = await pool.connect();
    
    try {
        // Check if migrations table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'migrations'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ Migrations table does not exist. Run migrations first.');
            return;
        }
        
        // Get executed migrations
        const result = await client.query(
            'SELECT filename, executed_at FROM migrations ORDER BY id'
        );
        
        console.log('\n📊 Migration Status:');
        console.log('====================');
        
        if (result.rows.length === 0) {
            console.log('No migrations have been executed yet.');
        } else {
            result.rows.forEach(row => {
                console.log(`✅ ${row.filename} (executed: ${row.executed_at})`);
            });
        }
        
        // Check for pending migrations
        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            const executedMigrations = result.rows.map(row => row.filename);
            const pendingMigrations = migrationFiles.filter(file => 
                !executedMigrations.includes(file)
            );
            
            if (pendingMigrations.length > 0) {
                console.log('\n⏳ Pending Migrations:');
                pendingMigrations.forEach(file => {
                    console.log(`⏳ ${file}`);
                });
            } else {
                console.log('\n🎉 All migrations are up to date!');
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking migration status:', error);
    } finally {
        client.release();
        await pool.end();
    }
}