import { executeQuery } from '../db-config.js';

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

  console.log('=== USER-BASIC API CALL ===');
  console.log('Query parameters:', req.query);

  let { mt5_name } = req.query;

  if (!mt5_name) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing mt5_name parameter' 
    });
  }

  try {
    const userResult = await executeQuery(
      `SELECT 
         u.id, u.name, u.email, u.state, u.created_at,
         man.mt5_name, man.state as mt5_state, man.created_at as mt5_created_at
       FROM users u
       INNER JOIN mt5_account_names man ON u.id = man.user_id
       WHERE man.mt5_name = $1`,
      [mt5_name]
    );

    console.log('Database query results:', userResult.rows.length, 'rows found');

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const row = userResult.rows[0];
    
    const formatPostgresDate = (postgresDate) => {
      if (!postgresDate) return 'Unknown';
      const date = new Date(postgresDate);
      return date.toISOString().replace('T', ' ').substring(0, 19);
    };

    return res.status(200).json({
      success: true,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        state: row.state,
        created_at: formatPostgresDate(row.created_at),
        mt5_name: row.mt5_name,
        mt5_state: row.mt5_state,
        mt5_created_at: formatPostgresDate(row.mt5_created_at)
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
