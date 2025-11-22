// db-config.js - Updated for PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
    const result = await client.query('SELECT NOW() as current_time');
    return { 
      success: true, 
      message: '✅ Railway PostgreSQL connection successful',
      database_time: result.rows[0].current_time
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Query helper function (for MySQL-like syntax conversion)
async function executeQuery(sql, params = []) {
  let client;
  try {
    client = await getConnection();
    
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, $3
    let postgresSQL = sql;
    let postgresParams = [...params];
    
    const result = await client.query(postgresSQL, postgresParams);
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
