const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../database/schema.sql');

async function initDb() {
    console.log('Reading schema from:', schemaPath);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Create a connection specifically with multipleStatements enabled for this operation
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        multipleStatements: true
    });

    console.log('Connected to database. Executing schema...');

    try {
        await connection.query(schemaSql);
        console.log('✅ Schema applied successfully.');
    } catch (err) {
        console.error('❌ Failed to apply schema:', err);
    } finally {
        await connection.end();
    }
}

initDb();
