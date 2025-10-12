// /api/test-db.js - MINIMAL TEST ENDPOINT
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  console.log('Test DB endpoint called');
  
  try {
    // Test 1: Check if environment variables are loaded
    console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
    console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
    console.log('DB_NAME:', process.env.DB_NAME ? 'SET' : 'NOT SET');
    
    // Test 2: Simple response without DB connection
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: 'API is working',
        env_vars: {
          db_host_set: !!process.env.DB_HOST,
          db_user_set: !!process.env.DB_USER,
          db_name_set: !!process.env.DB_NAME
        }
      });
    }
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
