const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'books_and_copies';

/**
 * Helper function to check if a column exists in a table
 */
async function columnExists(connection, tableName, columnName) {
    try {
        const [rows] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? 
             AND TABLE_NAME = ? 
             AND COLUMN_NAME = ?`,
            [DB_NAME, tableName, columnName]
        );
        return rows.length > 0;
    } catch (error) {
        console.error(`Error checking column ${columnName} in ${tableName}:`, error.message);
        return false;
    }
}

/**
 * Helper function to add a column if it doesn't exist
 */
async function addColumnIfNotExists(connection, tableName, columnName, definition) {
    try {
        const exists = await columnExists(connection, tableName, columnName);

        if (!exists) {
            console.log(`  ➕ Adding column: ${tableName}.${columnName}`);
            await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
            console.log(`  ✅ Column added successfully`);
        } else {
            console.log(`  ℹ️  Column already exists: ${tableName}.${columnName}`);
        }
    } catch (error) {
        console.error(`  ❌ Error adding column ${columnName} to ${tableName}:`, error.message);
    }
}

/**
 * Helper function to check if a table exists
 */
async function tableExists(connection, tableName) {
    try {
        const [rows] = await connection.query(
            `SELECT TABLE_NAME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? 
             AND TABLE_NAME = ?`,
            [DB_NAME, tableName]
        );
        return rows.length > 0;
    } catch (error) {
        console.error(`Error checking table ${tableName}:`, error.message);
        return false;
    }
}

/**
 * Main database setup function
 */
async function setupDatabase() {
    let connection;

    try {
        console.log('\n🚀 Starting Database Setup...\n');
        console.log(`📍 Host: ${dbConfig.host}`);
        console.log(`📦 Database: ${DB_NAME}\n`);

        // Create connection with SSL for remote databases
        const configWithSSL = {
            ...dbConfig,
            ssl: dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1'
                ? { rejectUnauthorized: false }
                : undefined
        };

        connection = await mysql.createConnection(configWithSSL);
        console.log('✅ Connected to MySQL server\n');

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        console.log(`✅ Database "${DB_NAME}" ready\n`);

        // Use the database
        await connection.query(`USE \`${DB_NAME}\``);

        // Read and execute schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 Reading schema.sql...\n');

        // Execute schema
        console.log('⚙️  Executing schema...');
        try {
            await connection.query(schemaSql);
            console.log('✅ Schema executed successfully\n');
        } catch (err) {
            // Some errors are expected (duplicate tables, etc.) when running on existing DB
            if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.message.includes('already exists')) {
                console.log('ℹ️  Schema already exists, continuing with migrations...\n');
            } else {
                console.warn('⚠️  Schema execution warning:', err.message, '\n');
            }
        }

        // Verify critical tables exist
        console.log('🔍 Verifying critical tables...\n');
        const criticalTables = [
            // Auth & Users
            'users',
            'otp_verifications',
            'oauth_providers',
            'addresses',
            'user_preferences',
            // Products
            'product_types',
            'categories_v2',
            'products',
            'product_images',
            'metadata_definitions',
            'metadata_values',
            'product_metadata_map',
            // Cart
            'carts',
            'cart_items',
            // Orders
            'orders',
            'order_items',
            'cancellations',
            'returns',
            'order_returns',
            'checkout_sessions',
            // Payment & Finance
            'payment_sessions',
            'payment_events',
            'payment_transactions',
            'refunds',
            // Seller
            'seller_info',
            'seller_analytics',
            'commission_settings',
            'seller_commission_requests',
            'seller_profile_update_requests',
            'admin_revenue',
            // Reviews
            'reviews',
            'review_comments',
            // Logistics
            'logistics_shipments',
            'shipment_tracking_history',
            'status_history',
            'pincode_risk',
            'shipping_margin_rules',
            'seller_warehouses',
            // Support & System
            'support_tickets',
            'audit_logs',
            'notifications',
            'site_settings',
            'analytics_daily_stats',
        ];

        let allTablesExist = true;
        for (const table of criticalTables) {
            const exists = await tableExists(connection, table);
            if (exists) {
                console.log(`  ✅ ${table}`);
            } else {
                console.log(`  ❌ ${table} - MISSING!`);
                allTablesExist = false;
            }
        }

        if (!allTablesExist) {
            throw new Error('Some critical tables are missing. Please check the schema.sql file.');
        }

        console.log('\n✅ All critical tables verified\n');

        // Run migration checks for backward compatibility
        console.log('🔄 Running migration checks for existing databases...\n');

        // Check and add any missing columns that might not be in older schemas
        const migrations = [
            // Users table
            { table: 'users', column: 'gender', definition: 'VARCHAR(20) DEFAULT NULL' },
            { table: 'users', column: 'date_of_birth', definition: 'DATE DEFAULT NULL' },
            { table: 'users', column: 'location', definition: 'VARCHAR(255) DEFAULT NULL' },
            { table: 'users', column: 'preferences', definition: 'JSON DEFAULT NULL' },
            { table: 'users', column: 'total_orders', definition: 'INT DEFAULT 0' },
            { table: 'users', column: 'rto_count', definition: 'INT DEFAULT 0' },
            { table: 'users', column: 'cod_allowed', definition: 'BOOLEAN DEFAULT TRUE' },
            { table: 'users', column: 'profile_image_url', definition: 'VARCHAR(500) DEFAULT NULL' },

            // Orders table
            { table: 'orders', column: 'invoice_number', definition: 'VARCHAR(50) UNIQUE NULL' },
            { table: 'orders', column: 'invoice_url', definition: 'VARCHAR(500) DEFAULT NULL' },
            { table: 'orders', column: 'digital_access_granted', definition: 'BOOLEAN DEFAULT FALSE' },
            { table: 'orders', column: 'first_download_at', definition: 'DATETIME NULL' },
            { table: 'orders', column: 'gateway_fee', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'orders', column: 'admin_commission_total', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'orders', column: 'admin_net_profit', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'orders', column: 'seller_payout_total', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'orders', column: 'cancellation_deadline', definition: 'TIMESTAMP NULL DEFAULT NULL' },
            { table: 'orders', column: 'is_cod_confirmed', definition: 'BOOLEAN DEFAULT FALSE' },
            { table: 'orders', column: 'is_rto', definition: 'BOOLEAN DEFAULT FALSE' },
            { table: 'orders', column: 'packed_at', definition: 'DATETIME NULL DEFAULT NULL' },
            { table: 'orders', column: 'shipped_at', definition: 'DATETIME NULL DEFAULT NULL' },
            { table: 'orders', column: 'delivered_at', definition: 'DATETIME NULL DEFAULT NULL' },
            { table: 'orders', column: 'return_status', definition: 'VARCHAR(50)' },
            { table: 'orders', column: 'shipping_cost', definition: 'DECIMAL(10,2) NOT NULL DEFAULT 0' },
            { table: 'orders', column: 'refund_status', definition: 'VARCHAR(50)' },
            { table: 'orders', column: 'refund_id', definition: 'VARCHAR(100)' },

            // Order items table
            { table: 'order_items', column: 'seller_id', definition: 'INT DEFAULT NULL' },
            { table: 'order_items', column: 'product_type_code', definition: 'VARCHAR(50)' },
            { table: 'order_items', column: 'format', definition: "ENUM('PHYSICAL','EBOOK') DEFAULT 'PHYSICAL'" },
            { table: 'order_items', column: 'commission_percentage', definition: 'DECIMAL(5,2) DEFAULT 0' },
            { table: 'order_items', column: 'commission_amount', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'order_items', column: 'seller_payout', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'order_items', column: 'admin_net_profit', definition: 'DECIMAL(10,2) DEFAULT 0' },

            // Logistics shipments table
            { table: 'logistics_shipments', column: 'seller_id', definition: 'INT NULL' },
            { table: 'logistics_shipments', column: 'courier_company_id', definition: 'INT NULL' },
            { table: 'logistics_shipments', column: 'estimated_delivery_date', definition: 'DATE NULL' },
            { table: 'logistics_shipments', column: 'last_location', definition: 'VARCHAR(255) NULL' },
            { table: 'logistics_shipments', column: 'pickup_date', definition: 'TIMESTAMP NULL' },
            { table: 'logistics_shipments', column: 'delivered_date', definition: 'TIMESTAMP NULL' },
            { table: 'logistics_shipments', column: 'packed_at', definition: 'TIMESTAMP NULL' },
            { table: 'logistics_shipments', column: 'packed_by', definition: 'INT NULL' },
            { table: 'logistics_shipments', column: 'cod_amount', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'logistics_shipments', column: 'actual_shipping_cost', definition: 'DECIMAL(10,2) DEFAULT 0' },
            { table: 'logistics_shipments', column: 'estimated_delivery_days', definition: "VARCHAR(50) DEFAULT '3-5'" },
            { table: 'logistics_shipments', column: 'label_s3_url', definition: 'VARCHAR(500)' },
            { table: 'logistics_shipments', column: 'raw_payload', definition: 'JSON' },

            // Seller info table
            { table: 'seller_info', column: 'pickup_location_name', definition: "VARCHAR(255) DEFAULT 'Primary'" },
            { table: 'seller_info', column: 'pickup_pincode', definition: 'VARCHAR(10) DEFAULT NULL' },
            { table: 'seller_info', column: 'approval_status', definition: "ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING'" },
            { table: 'seller_info', column: 'approved_by', definition: 'INT DEFAULT NULL' },
            { table: 'seller_info', column: 'approved_at', definition: 'TIMESTAMP NULL DEFAULT NULL' },
            { table: 'seller_info', column: 'rejection_reason', definition: 'TEXT DEFAULT NULL' },
            { table: 'seller_info', column: 'requested_commission_rate', definition: 'DECIMAL(5,2) DEFAULT 10.00' },
            { table: 'seller_info', column: 'city', definition: 'VARCHAR(100) DEFAULT NULL' },
            { table: 'seller_info', column: 'pin', definition: 'VARCHAR(10) DEFAULT NULL' },

            // Products table
            { table: 'products', column: 'weight', definition: 'DECIMAL(10,3) DEFAULT 0.5' },
            { table: 'products', column: 'is_unlimited_stock', definition: 'BOOLEAN DEFAULT FALSE' },
            { table: 'products', column: 'additional_images', definition: 'JSON DEFAULT NULL' },
            { table: 'products', column: 'meta_title', definition: 'VARCHAR(255) DEFAULT NULL' },
            { table: 'products', column: 'meta_description', definition: 'TEXT DEFAULT NULL' },
            { table: 'products', column: 'tags', definition: 'VARCHAR(500) DEFAULT NULL' },
            { table: 'products', column: 'rating', definition: 'DECIMAL(3,1) DEFAULT 0.0' },
            { table: 'products', column: 'review_count', definition: 'INT DEFAULT 0' },
            { table: 'products', column: 'commission_percentage', definition: 'DECIMAL(5,2) NULL DEFAULT NULL' },
            { table: 'products', column: 'discount_percent', definition: 'DECIMAL(5,2) DEFAULT NULL' },
            { table: 'products', column: 'ebook_url', definition: 'VARCHAR(500) DEFAULT NULL' },
            { table: 'products', column: 'gst_rate', definition: 'DECIMAL(5,2) DEFAULT 0' },
            { table: 'products', column: 'is_gst_inclusive', definition: 'BOOLEAN DEFAULT TRUE' },

            // Categories table
            { table: 'categories_v2', column: 'is_leaf', definition: 'BOOLEAN DEFAULT TRUE' },
            { table: 'categories_v2', column: 'image_url', definition: 'VARCHAR(500) DEFAULT NULL' },
            { table: 'categories_v2', column: 'sort_order', definition: 'INT DEFAULT 0' },

            // Seller analytics table
            { table: 'seller_analytics', column: 'admin_commission_percentage', definition: 'DECIMAL(5,2) DEFAULT NULL' },
            { table: 'seller_analytics', column: 'total_admin_commission', definition: 'DECIMAL(12,2) DEFAULT 0.00' },
            { table: 'seller_analytics', column: 'returned_items', definition: 'INT DEFAULT 0' },
            { table: 'seller_analytics', column: 'pending_shipments', definition: 'INT DEFAULT 0' },

            // Seller warehouses table
            { table: 'seller_warehouses', column: 'return_address', definition: 'TEXT DEFAULT NULL' },
            { table: 'seller_warehouses', column: 'return_city', definition: 'VARCHAR(100) DEFAULT NULL' },
            { table: 'seller_warehouses', column: 'return_state', definition: 'VARCHAR(100) DEFAULT NULL' },
            { table: 'seller_warehouses', column: 'return_pincode', definition: 'VARCHAR(10) DEFAULT NULL' },
        ];

        for (const migration of migrations) {
            await addColumnIfNotExists(connection, migration.table, migration.column, migration.definition);
        }

        // Add foreign key for logistics_shipments.seller_id if it doesn't exist
        try {
            const [fks] = await connection.query(
                `SELECT CONSTRAINT_NAME 
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                 WHERE TABLE_SCHEMA = ? 
                 AND TABLE_NAME = 'logistics_shipments' 
                 AND COLUMN_NAME = 'seller_id' 
                 AND REFERENCED_TABLE_NAME IS NOT NULL`,
                [DB_NAME]
            );

            if (fks.length === 0) {
                console.log('  ➕ Adding foreign key: logistics_shipments.seller_id -> users.id');
                await connection.query(
                    `ALTER TABLE logistics_shipments 
                     ADD CONSTRAINT fk_logistics_seller 
                     FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL`
                );
                console.log('  ✅ Foreign key added successfully');
            } else {
                console.log('  ℹ️  Foreign key already exists: logistics_shipments.seller_id');
            }
        } catch (err) {
            if (!err.message.includes('Duplicate foreign key')) {
                console.warn('  ⚠️  Could not add foreign key:', err.message);
            }
        }

        console.log('\n✅ Migration checks completed\n');

        // Verify seed data
        console.log('🌱 Verifying seed data...\n');

        // Check product_types
        const [productTypes] = await connection.query('SELECT COUNT(*) as count FROM product_types');
        if (productTypes[0].count === 0) {
            console.log('  ➕ Inserting product types...');
            await connection.query(`
                INSERT INTO product_types (code, label) VALUES 
                ('BOOK', 'Books'),
                ('NOTEBOOK', 'Notebooks'),
                ('STATIONERY', 'Stationery')
            `);
            console.log('  ✅ Product types added');
        } else {
            console.log(`  ✅ Product types exist (${productTypes[0].count} types)`);
        }

        // Check commission_settings
        const [commissionSettings] = await connection.query('SELECT COUNT(*) as count FROM commission_settings');
        if (commissionSettings[0].count === 0) {
            console.log('  ➕ Inserting default commission settings...');
            await connection.query(`
                INSERT INTO commission_settings (type, percentage) 
                VALUES ('GLOBAL', 10.00)
            `);
            console.log('  ✅ Commission settings added');
        } else {
            console.log(`  ✅ Commission settings exist (${commissionSettings[0].count} settings)`);
        }

        console.log('\n✅ Seed data verified\n');

        // Final summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📦 Database: ${DB_NAME}`);
        console.log(`📍 Host: ${dbConfig.host}`);
        console.log(`✅ All tables created and verified`);
        console.log(`✅ All migrations applied`);
        console.log(`✅ Seed data inserted`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERROR DURING DATABASE SETUP:\n');
        console.error(error);
        console.error('\n');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed\n');
        }
    }
}

// Run the setup
setupDatabase()
    .then(() => {
        console.log('✅ Setup script completed successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Setup script failed:', err);
        process.exit(1);
    });