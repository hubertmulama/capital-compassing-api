// /api/client-info.js
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

    // 1. Get basic client information
    const [clientRows] = await connection.execute(
      `SELECT * FROM clients WHERE mt5_name = ?`,
      [mt5_name]
    );

    if (clientRows.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const client = clientRows[0];

    // 2. Get EA assignments for this client
    const [eaAssignments] = await connection.execute(
      `SELECT 
        ce.id as assignment_id,
        ce.state as assignment_state,
        ce.created_at as assignment_date,
        e.id as ea_id,
        e.name as ea_name,
        e.version,
        e.description,
        e.state as ea_state,
        e.created_at as ea_created
      FROM client_eas ce
      JOIN eas e ON ce.ea_id = e.id
      WHERE ce.client_id = ? AND ce.state = 'enabled'`,
      [client.id]
    );

    // 3. For each EA assignment, get the allowed pairs
    const easWithPairs = await Promise.all(
      eaAssignments.map(async (ea) => {
        const [pairs] = await connection.execute(
          `SELECT 
            pair, 
            state as pair_state,
            created_at as pair_created
          FROM ea_pairs 
          WHERE ea_id = ? AND state = 'enabled'`,
          [ea.ea_id]
        );

        return {
          ...ea,
          allowed_pairs: pairs
        };
      })
    );

    // 4. Get recent logs for this client (optional)
    const [recentLogs] = await connection.execute(
      `SELECT 
        l.action,
        l.ip_address,
        l.timestamp,
        e.name as ea_name
      FROM logs l
      LEFT JOIN eas e ON l.ea_id = e.id
      WHERE l.client_id = ?
      ORDER BY l.timestamp DESC
      LIMIT 10`,
      [client.id]
    );

    await connection.end();

    // Compile all the data
    const clientInfo = {
      success: true,
      client: {
        id: client.id,
        name: client.name,
        mt5_name: client.mt5_name,
        email: client.email,
        state: client.state,
        created_at: client.created_at
      },
      ea_assignments: easWithPairs,
      recent_activity: recentLogs,
      summary: {
        total_eas: easWithPairs.length,
        total_pairs: easWithPairs.reduce((total, ea) => total + ea.allowed_pairs.length, 0),
        client_since: client.created_at,
        status: client.state
      }
    };

    return res.status(200).json(clientInfo);

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
