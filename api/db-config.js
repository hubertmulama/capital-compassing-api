import mysql from 'mysql2/promise';

const dbConfig = {
  host: "sql.freedb.tech",
  user: "freedb_Hubert_mulama", 
  password: "#?wqa5T4m5GB%JB",
  database: "freedb_Capital compassing",
  connectTimeout: 10000,  // Only use connectTimeout
  // Remove timeout and acquireTimeout - they're not valid for createConnection
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

// Rest of your code remains the same...
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

export { dbConfig };
