// /api/test-connection.js - DATABASE CONNECTION TEST
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  console.log('Testing database connection...');
  
  let connection;
  try {
    // Log environment variables (without showing values)
    console.log('Environment variables status:');
    console.log('- DB_HOST:', process.env.DB_HOST ? '***' : 'MISSING');
    console.log('- DB_USER:', process.env.DB_USER ? '***' : 'MISSING'); 
    console.log('- DB_NAME:', process.env.DB_NAME ? '***' : 'MISSING');
    console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'MISSING');

    // Test database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      timeout: 10000
    });

    console.log('Database connection successful');
    
    // Test a simple query
    const [results] = await connection.execute('SELECT 1 as test');
    console.log('Query test successful:', results);

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      connection_test: 'PASSED',
      query_test: 'PASSED'
    });

  } catch (error) {
    console.error('DATABASE CONNECTION FAILED:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  } finally {
    if (connection) {
      await connection.end().catch(console.error);
    }
  }
}
