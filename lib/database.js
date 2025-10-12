// /lib/database.js
import mysql from 'mysql2/promise';
import { dbConfig } from './db-config.js';

export async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Optional: Connection pool for better performance
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function getPoolConnection() {
  return await pool.getConnection();
}