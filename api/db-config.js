// api/test.js - FIXED IMPORT PATH
const { testConnection, executeQuery } = require('./db-config');  // ← Changed from '../../db-config'

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing Railway PostgreSQL connection...');
    
    // Test basic connection
    const connectionTest = await testConnection();
    console.log('Connection test result:', connectionTest);
    
    let testResults = {};
    
    if (connectionTest.success) {
      // Test 1: Create a test table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS mt5_connection_test (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20),
          price DECIMAL(12,6),
          test_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      testResults.table_created = true;
      
      // Test 2: Insert test data
      const insertResult = await executeQuery(
        'INSERT INTO mt5_connection_test (symbol, price, test_message) VALUES ($1, $2, $3) RETURNING *',
        ['EURUSD', 1.08542, '✅ PostgreSQL connection successful!']
      );
      testResults.inserted_record = insertResult.rows[0];
      
      // Test 3: Read test data
      const selectResult = await executeQuery('SELECT * FROM mt5_connection_test ORDER BY created_at DESC');
      testResults.all_records = selectResult.rows;
      
      res.json({
        status: '🎉 SUCCESS - Railway PostgreSQL Connected!',
        connection: connectionTest,
        tests: testResults,
        message: 'Your MT5 EA can now use unlimited database queries!'
      });
      
    } else {
      res.status(500).json({
        status: '❌ CONNECTION FAILED',
        error: connectionTest
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      status: '💥 UNEXPECTED ERROR',
      error: error.message
    });
  }
}
