const { connectDB, executeQuery, closeConnection } = require('./config/database');
const { logger } = require('./utils/logger');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await connectDB();
    console.log('✅ Database connection successful');
    
    // Test query
    const result = await executeQuery('SELECT 1 as test');
    console.log('✅ Database query successful:', result);
    
    // Test if tables exist
    const tables = await executeQuery('SHOW TABLES');
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
    
    // Close connection
    await closeConnection();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n💡 Make sure to:');
    console.log('1. Start XAMPP/MySQL server');
    console.log('2. Create database "zero_day_attack"');
    console.log('3. Import the schema.sql file');
    console.log('4. Update .env file with correct database credentials');
  }
}

testDatabaseConnection();
