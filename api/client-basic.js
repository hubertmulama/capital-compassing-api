// /api/client-basic.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mt5_name } = req.query;

  if (!mt5_name) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing mt5_name parameter' 
    });
  }

  try {
    const connection = await mysql.createConnection({
      host: "sql.freedb.tech",         // e.g., sqlXXX.infinityfree.com
      user: "freedb_Hubert_mulama",
      password: "#?wqa5T4m5GB%JB",
      database: "freedb_Capital compassing", 
    });

    // Get ONLY client information from clients table
    const [clientRows] = await connection.execute(
      `SELECT * FROM clients WHERE mt5_name = ?`,
      [mt5_name]
    );

    await connection.end();

    if (clientRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const client = clientRows[0];

    // Return only the client details
    return res.status(200).json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        mt5_name: client.mt5_name,
        email: client.email,
        state: client.state,
        created_at: client.created_at
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
