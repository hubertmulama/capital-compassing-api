// api/test-env.js
const { testConnection, executeQuery } = require('./db-config');

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing with Environment Variables...');
    
    // Log environment variable status (don't log actual URL for security)
    const hasDbUrl = !!process.env.RAILWAY_DATABASE_URL;
    console.log('Environment variable present:', hasDbUrl);
    
    // Test connection using environment variable
    const connectionTest = await testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (connectionTest.success) {
      // Test with environment variable
      const envTest = await executeQuery(
        'INSERT INTO mt5_connection_test (symbol, price, test_message) VALUES ($1, $2, $3) RETURNING *',
        ['ENV_TEST', 1.12345, '✅ Environment Variables Working!']
      );
      
      // Read all test records
      const allRecords = await executeQuery('SELECT * FROM mt5_connection_test ORDER BY created_at DESC');
      
      res.json({
        status: '🎉 ENVIRONMENT VARIABLES SUCCESS!',
        connection: connectionTest,
        environment: {
          has_database_url: hasDbUrl,
          node_env: process.env.NODE_ENV
        },
        test_insert: envTest.rows[0],
        all_test_records: allRecords.rows,
        message: '✅ Database connection using environment variables is working!'
      });
      
    } else {
      res.status(500).json({
        status: '❌ ENVIRONMENT VARIABLE FAILED',
        error: connectionTest,
        troubleshooting: 'Check if RAILWAY_DATABASE_URL is set correctly in Vercel'
      });
    }
    
  } catch (error) {
    console.error('❌ Environment test failed:', error);
    res.status(500).json({
      status: '💥 ENVIRONMENT TEST ERROR',
      error: error.message,
      details: 'Make sure RAILWAY_DATABASE_URL is set in Vercel environment variables'
    });
  }
}
