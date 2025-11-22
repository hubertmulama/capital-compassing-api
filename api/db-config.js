// db-config.js - TEMPORARY FOR TESTING (PostgreSQL Version)
import pkg from 'pg';
const { Pool } = pkg;

// TEMPORARY - Hardcoded for testing (REMOVE LATER)
const pool = new Pool({
  connectionString: 'postgresql://postgres:OcRAYwNRkXZAEOVTjYIKpxYMWUdNVbMI@maglev.proxy.rlwy.net:40211/railway',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, // PostgreSQL equivalent
});

// Create connection function
export async function getConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection established to Railway PostgreSQL');
    return client;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Test connection function (updated for PostgreSQL)
export async function testConnection() {
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
      client.release(); // PostgreSQL uses release() instead of end()
    }
  }
}

// Query helper function (similar to your MySQL execute)
export async function executeQuery(sql, params = []) {
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

// For direct pool queries (more efficient for multiple queries)
export { pool };
