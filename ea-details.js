// /api/ea-details.js
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

  const { ea_name } = req.query;

  if (!ea_name) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing ea_name parameter' 
    });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // 1. Get basic EA information
    const [eaRows] = await connection.execute(
      `SELECT * FROM eas WHERE name = ?`,
      [ea_name]
    );

    if (eaRows.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        error: 'EA not found'
      });
    }

    const ea = eaRows[0];

    // 2. Get allowed pairs for this EA
    const [allowedPairs] = await connection.execute(
      `SELECT 
        pair, 
        state as pair_state,
        created_at as pair_created
      FROM ea_pairs 
      WHERE ea_id = ?`,
      [ea.id]
    );

    // 3. Get clients assigned to this EA
    const [assignedClients] = await connection.execute(
      `SELECT 
        ce.id as assignment_id,
        ce.state as assignment_state,
        ce.created_at as assignment_date,
        c.id as client_id,
        c.name as client_name,
        c.mt5_name,
        c.email,
        c.state as client_state,
        c.created_at as client_since
      FROM client_eas ce
      JOIN clients c ON ce.client_id = c.id
      WHERE ce.ea_id = ?`,
      [ea.id]
    );

    // 4. Get recent activity for this EA
    const [recentActivity] = await connection.execute(
      `SELECT 
        l.action,
        l.details,
        l.ip_address,
        l.timestamp,
        c.name as client_name,
        c.mt5_name
      FROM logs l
      JOIN clients c ON l.client_id = c.id
      WHERE l.ea_id = ?
      ORDER BY l.timestamp DESC
      LIMIT 20`,
      [ea.id]
    );

    await connection.end();

    // Compile all the data
    const eaInfo = {
      success: true,
      ea: {
        id: ea.id,
        name: ea.name,
        version: ea.version,
        description: ea.description,
        state: ea.state,
        created_at: ea.created_at
      },
      allowed_pairs: allowedPairs,
      assigned_clients: assignedClients,
      recent_activity: recentActivity,
      statistics: {
        total_clients: assignedClients.length,
        total_pairs: allowedPairs.length,
        enabled_clients: assignedClients.filter(client => client.assignment_state === 'enabled').length,
        enabled_pairs: allowedPairs.filter(pair => pair.pair_state === 'enabled').length,
        active_clients: assignedClients.filter(client => client.client_state === 'active').length
      }
    };

    return res.status(200).json(eaInfo);

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
