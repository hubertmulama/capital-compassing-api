import { getConnection } from './db-config.js';

export default async function handler(req, res) {
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

  let connection;
  try {
    connection = await getConnection();

    // Updated query - removed the state filter to return regardless of MT5 account state
    const [clientRows] = await connection.execute(
      `SELECT 
         c.id, c.name, c.email, c.state as client_state, c.created_at as client_created_at,
         man.mt5_name, man.state as mt5_state, man.created_at as mt5_created_at
       FROM clients c
       INNER JOIN mt5_account_names man ON c.id = man.client_id
       WHERE man.mt5_name = ?`,  // Removed: AND man.state = 'active'
      [mt5_name]
    );

    await connection.end();

    if (clientRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const row = clientRows[0];
    
    const formatMySQLDate = (mysqlDate) => {
      if (!mysqlDate) return 'Unknown';
      
      const date = new Date(mysqlDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return res.status(200).json({
      success: true,
      client: {
        id: row.id,
        name: row.name,
        email: row.email,
        client_state: row.client_state,
        client_created_at: formatMySQLDate(row.client_created_at),
        mt5_name: row.mt5_name,
        mt5_state: row.mt5_state,  // Will show actual state (active/inactive)
        mt5_created_at: formatMySQLDate(row.mt5_created_at)
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    if (connection) {
      await connection.end().catch(console.error);
    }
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
