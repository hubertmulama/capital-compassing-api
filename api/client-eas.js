// /api/client-eas.js
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
    return res.status(400).json({ error: 'Missing mt5_name parameter' });
  }

  try {
    const connection = await mysql.createConnection({
      host: "sql.freedb.tech",         // e.g., sqlXXX.infinityfree.com
      user: "freedb_Hubert_mulama",
      password: "#?wqa5T4m5GB%JB",
      database: "freedb_Capital compassing", 
    });

    // Query to get the client's EA assignments by MT5 name
    const [rows] = await connection.execute(
      `SELECT 
        ce.id as assignment_id,
        ce.state as assignment_state,
        c.id as client_id,
        c.name as client_name,
        c.mt5_name,
        e.id as ea_id,
        e.name as ea_name,
        e.version,
        e.description
      FROM client_eas ce
      JOIN clients c ON ce.client_id = c.id
      JOIN eas e ON ce.ea_id = e.id
      WHERE c.mt5_name = ? AND ce.state = 'enabled' AND c.state = 'active' AND e.state = 'enabled'`,
      [mt5_name]
    );

    await connection.end();

    return res.status(200).json({
      success: true,
      client: {
        id: rows[0]?.client_id,
        name: rows[0]?.client_name,
        mt5_name: rows[0]?.mt5_name
      },
      eas: rows.map(row => ({
        assignment_id: row.assignment_id,
        ea_id: row.ea_id,
        ea_name: row.ea_name,
        version: row.version,
        description: row.description,
        assignment_state: row.assignment_state
      }))
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
