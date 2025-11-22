// db-config.js - ES Module Version
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
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

// Test connection function
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
      client.release();
    }
  }
}

// Query helper function
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

// For direct pool queries
export { pool };
