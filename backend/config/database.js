const mysql = require('mysql2/promise');
const logger = require('../utils/logger').logger;

let connection = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zero_day_attack',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Remove invalid options that cause warnings
  multipleStatements: false,
  timezone: '+00:00'
};

const connectDB = async () => {
  try {
    connection = await mysql.createPool(dbConfig);
    
    // Test the connection
    const testConnection = await connection.getConnection();
    await testConnection.ping();
    testConnection.release();
    
    logger.info('MySQL connected successfully');
    return connection;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const getConnection = () => {
  if (!connection) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return connection;
};

const closeConnection = async () => {
  if (connection) {
    await connection.end();
    connection = null;
    logger.info('Database connection closed');
  }
};

// Helper function to execute queries with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', { query, params, error: error.message });
    throw error;
  }
};

// Helper function for transactions
const executeTransaction = async (queries) => {
  const conn = await connection.getConnection();
  try {
    await conn.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await conn.execute(query, params);
      results.push(result);
    }
    
    await conn.commit();
    return results;
  } catch (error) {
    await conn.rollback();
    logger.error('Transaction failed:', error);
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  connectDB,
  getConnection,
  closeConnection,
  executeQuery,
  executeTransaction
};
