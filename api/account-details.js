import { getConnection } from './db-config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== RAW REQUEST INFO ===');
  console.log('req.body:', req.body);
  console.log('typeof req.body:', typeof req.body);
  console.log('req.headers:', req.headers);

  let body;
  try {
    // Vercel might already parse the body for us
    body = req.body;
    console.log('Parsed body:', body);
    
    // If body is empty or undefined, there might be a parsing issue
    if (!body || Object.keys(body).length === 0) {
      console.log('Body is empty, checking raw request...');
      return res.status(400).json({ 
        success: false,
        error: 'Empty request body' 
      });
    }
  } catch (e) {
    console.log('Body access error:', e.message);
    return res.status(400).json({ 
      success: false,
      error: 'Cannot access request body: ' + e.message 
    });
  }

  // Extract values with proper type checking
  const mt5_name = String(body.mt5_name || '');
  const account_number = String(body.account_number || '');
  const balance = parseFloat(body.balance) || 0;
  const equity = parseFloat(body.equity) || 0;
  const margin = parseFloat(body.margin) || 0;
  const free_margin = parseFloat(body.free_margin) || 0;
  const leverage = parseInt(body.leverage) || 0;

  console.log('Extracted values:', {
    mt5_name, account_number, balance, equity, margin, free_margin, leverage
  });

  if (!mt5_name || !account_number) {
    console.log('ERROR: Missing required fields');
    return res.status(400).json({ 
      success: false,
      error: 'Missing mt5_name or account_number' 
    });
  }

  let connection;
  try {
    connection = await getConnection();
    console.log('Database connection established');

    // Rest of your database code remains the same...
    const [mt5Rows] = await connection.execute(
      `SELECT id FROM mt5_account_names WHERE mt5_name = ? AND state = 'active'`,
      [mt5_name]
    );

    if (mt5Rows.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        error: 'MT5 name not found or inactive'
      });
    }

    const mt5_name_id = mt5Rows[0].id;

    const [accountRows] = await connection.execute(
      `SELECT id FROM account_details WHERE mt5_name_id = ? AND account_number = ?`,
      [mt5_name_id, account_number]
    );

    if (accountRows.length === 0) {
      await connection.execute(
        `INSERT INTO account_details (mt5_name_id, account_number) VALUES (?, ?)`,
        [mt5_name_id, account_number]
      );
    }

    await connection.execute(
      `UPDATE account_details 
       SET balance=?, equity=?, margin=?, free_margin=?, leverage=?, updated_at=NOW()
       WHERE mt5_name_id = ? AND account_number = ?`,
      [balance, equity, margin, free_margin, leverage, mt5_name_id, account_number]
    );

    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'Account details updated successfully'
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
