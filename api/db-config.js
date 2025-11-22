// api/db-config.js
const { Pool } = require('pg');

// TEMPORARY - Hardcoded for testing
const pool = new Pool({
  connectionString: 'postgresql://postgres:OcRAYwNRkXZAEOVTjYIKpxYMWUdNVbMI@maglev.proxy.rlwy.net:40211/railway',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

// Create connection function
async function getConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection established to Railway PostgreSQL');
    return client;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Test connection function
async function testConnection() {
  let client;
  try {
    client = await getConnection();
    const result = await client.query('SELECT 1 as test');
    return { 
      success: true, 
      message: '✅ Railway PostgreSQL connection successful',
      database: 'PostgreSQL (Railway)'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      database: 'PostgreSQL (Railway)'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Query helper function
async function executeQuery(sql, params = []) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query(sql, params);
    return result;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  getConnection,
  testConnection,
  executeQuery,
  pool
};
