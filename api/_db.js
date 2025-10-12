// /api/_db.js - Shared Database Configuration (CONFIRMED WORKING)
import mysql from 'mysql2/promise';

const dbConfig = {
  host: "sql.freedb.tech",
  user: "freedb_Hubert_mulama", 
  password: "#?wqa5T4m5GB%JB",
  database: "freedb_Capital compassing", // No backticks - confirmed working
  connectTimeout: 10000,
  timeout: 10000
};

// Create connection function
export async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

// Test connection function
export async function testConnection() {
  let connection;
  try {
    connection = await getConnection();
    const [results] = await connection.execute('SELECT 1 as test');
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  } finally {
    if (connection) {
      await connection.end().catch(console.error);
    }
  }
}

// Export the config for direct use if needed
export { dbConfig };
