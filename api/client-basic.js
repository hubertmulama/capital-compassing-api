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

  // ADD DEBUG LOGGING HERE
  console.log('=== CLIENT-BASIC API CALL ===');
  console.log('Full URL:', req.url);
  console.log('Query parameters:', req.query);
  console.log('Raw mt5_name from query:', req.query.mt5_name);
  console.log('Type of mt5_name:', typeof req.query.mt5_name);

  let { mt5_name } = req.query;

  if (!mt5_name) {
    console.log('ERROR: mt5_name is null or undefined');
    return res.status(400).json({ 
      success: false,
      error: 'Missing mt5_name parameter' 
    });
  }

  console.log('mt5_name after extraction:', mt5_name);
  console.log('mt5_name length:', mt5_name.length);

  let connection;
  try {
    connection = await getConnection();

    const [clientRows] = await connection.execute(
      `SELECT 
         c.id, c.name, c.email, c.state as client_state, c.created_at as client_created_at,
         man.mt5_name, man.state as mt5_state, man.created_at as mt5_created_at
       FROM clients c
       INNER JOIN mt5_account_names man ON c.id = man.client_id
       WHERE man.mt5_name = ?`,
      [mt5_name]
    );

    await connection.end();

    console.log('Database query results:', clientRows.length, 'rows found');

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
        mt5_state: row.mt5_state,
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
