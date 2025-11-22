// pages/api/test-db.js - CREATE THIS FILE
import { testConnection, executeQuery } from '../../db-config.js';

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing Railway PostgreSQL connection...');
    
    // Test connection
    const connectionTest = await testConnection();
    console.log('Connection test:', connectionTest);
    
    if (connectionTest.success) {
      // Test creating a simple table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS test_mt5 (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20),
          price DECIMAL(12,6),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Test insert
      const insertResult = await executeQuery(
        'INSERT INTO test_mt5 (symbol, price) VALUES ($1, $2) RETURNING *',
        ['EURUSD', 1.08542]
      );
      
      // Test select
      const selectResult = await executeQuery('SELECT * FROM test_mt5');
      
      res.json({
        status: '✅ SUCCESS',
        connection: connectionTest,
        inserted: insertResult.rows[0],
        all_records: selectResult.rows,
        message: 'Railway PostgreSQL is working perfectly!'
      });
      
    } else {
      res.status(500).json({
        status: '❌ FAILED',
        error: connectionTest
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      status: '❌ ERROR',
      error: error.message
    });
  }
}
