const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verifyTables() {
    const dbUrl = process.env.DATABASE_URL;
    console.log('Verifying data in database...');

    try {
        const connection = await mysql.createConnection(dbUrl);

        // Check Categories
        const [categories] = await connection.execute('SELECT count(*) as count FROM Categories');
        console.log(`✅ Categories table found with ${categories[0].count} records.`);

        // Check MenuItems
        const [items] = await connection.execute('SELECT count(*) as count FROM MenuItems');
        console.log(`✅ MenuItems table found with ${items[0].count} records.`);

        await connection.end();
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyTables();
