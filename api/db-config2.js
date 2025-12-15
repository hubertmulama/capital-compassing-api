// db-config.js - Self-contained version (no .env needed)
const { Pool } = require('pg');

// Direct hardcoded connection - replace with your actual password
const SUPABASE_PASSWORD = '76FXw9Gs?12'; // Your actual password
const ENCODED_PASSWORD = '76FXw9Gs%3F12'; // URL-encoded version

// Try both password formats (one should work)
const connectionStrings = [
  `postgresql://postgres:${ENCODED_PASSWORD}@db.ihzccklzamgqgfrqmmmf.supabase.co:5432/postgres`,
  `postgresql://postgres:${SUPABASE_PASSWORD}@db.ihzccklzamgqgfrqmmmf.supabase.co:5432/postgres`
];

let activeConnectionString = connectionStrings[0];

const pool = new Pool({
  connectionString: activeConnectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Reusable connection function
async function getConnection() {
  let lastError = null;
  
  // Try both connection strings if first fails
  for (let i = 0; i < connectionStrings.length; i++) {
    const testPool = new Pool({
      connectionString: connectionStrings[i],
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    
    try {
      const client = await testPool.connect();
      console.log(`✅ Database connected (using password format ${i === 0 ? 'encoded' : 'raw'})`);
      
      // Update main pool if this works
      if (i === 1) {
        pool.options.connectionString = connectionStrings[1];
        activeConnectionString = connectionStrings[1];
      }
      
      // Return a wrapper that releases to the correct pool
      return {
        query: (text, params) => client.query(text, params),
        release: () => {
          client.release();
          testPool.end();
        },
        _client: client,
        _pool: testPool
      };
    } catch (error) {
      lastError = error;
      continue; // Try next connection string
    }
  }
  
  console.error('❌ All connection attempts failed:', lastError.message);
  throw lastError;
}

// Keep your original function signatures
async function testConnection() {
  let client;
  try {
    client = await getConnection();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    return { 
      success: true, 
      message: '✅ Supabase PostgreSQL connection successful',
      database_time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(',')[0]
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      hint: 'Try resetting password in Supabase dashboard'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Your original executeQuery function - works exactly the same
async function executeQuery(sql, params = []) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error('Query Error:', {
      sql: sql.length > 100 ? sql.substring(0, 100) + '...' : sql,
      params: params,
      error: error.message
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Export same API
module.exports = {
  getConnection,
  testConnection,
  executeQuery,
  pool
};
