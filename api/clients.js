// /api/clients.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set CORS headers to allow requests from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for now
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: "sql.freedb.tech",         // e.g., sqlXXX.infinityfree.com
      user: "freedb_Hubert_mulama",
      password: "#?wqa5T4m5GB%JB",
      database: "freedb_Capital compassing",      
    });

    // Query to get all clients
    const [rows] = await connection.execute(
      'SELECT * FROM clients ORDER BY created_at DESC'
    );

    // Close connection
    await connection.end();

    // Return clients as JSON
    return res.status(200).json({
      success: true,
      count: rows.length,
      clients: rows
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
