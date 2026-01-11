const mysql = require('mysql2/promise');

async function testRemoteConnection() {
    // Password: hossam@@123!!MM
    // Encoded: hossam%40%40123%21%21MM
    const dbUrl = 'mysql://hossam:hossam%40%40123%21%21MM@db.lenteagency.com:3306/cafe_management';
    console.log('Testing connection to remote DB...');

    try {
        const connection = await mysql.createConnection(dbUrl);
        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('✅ Connection successful!');
        await connection.end();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testRemoteConnection();
