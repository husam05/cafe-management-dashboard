const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  // Mask password in logs
  console.log('Testing connection to:', dbUrl.replace(/:[^:@]+@/, ':****@'));

  try {
    const connection = await mysql.createConnection(dbUrl);
    const [rows] = await connection.execute('SELECT 1 as val');
    console.log('✅ Connection successful! Test query returned:', rows);
    await connection.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
