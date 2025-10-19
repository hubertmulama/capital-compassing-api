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

  let body;
  try {
    // Parse the raw body
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Parsed body:', body);
  } catch (e) {
    console.log('Body parsing error:', e);
    return res.status(400).json({ 
      success: false,
      error: 'Invalid JSON body' 
    });
  }

  const { mt5_name, account_number, balance, equity, margin, free_margin, leverage } = body;

  // Debug logging
  console.log('=== API CALL RECEIVED ===');
  console.log('mt5_name:', mt5_name);
  console.log('account_number:', account_number);
  console.log('balance:', balance);
  console.log('equity:', equity);

  if (!mt5_name || !account_number) {
    console.log('ERROR: Missing mt5_name or account_number');
    return res.status(400).json({ 
      success: false,
      error: 'Missing mt5_name or account_number' 
    });
  }

  let connection;
  try {
    connection = await getConnection();
    console.log('Database connection established');

    // First get the mt5_name_id
    const [mt5Rows] = await connection.execute(
      `SELECT id FROM mt5_account_names WHERE mt5_name = ? AND state = 'active'`,
      [mt5_name]
    );

    console.log('MT5 query result:', mt5Rows);

    if (mt5Rows.length === 0) {
      await connection.end();
      console.log('ERROR: MT5 name not found or inactive');
      return res.status(404).json({
        success: false,
        error: 'MT5 name not found or inactive'
      });
    }

    const mt5_name_id = mt5Rows[0].id;
    console.log('Found MT5 name ID:', mt5_name_id);

    // Check if account number exists for this mt5_name
    const [accountRows] = await connection.execute(
      `SELECT id FROM account_details WHERE mt5_name_id = ? AND account_number = ?`,
      [mt5_name_id, account_number]
    );

    console.log('Account check result:', accountRows);

    // If account number doesn't exist, insert it first
    if (accountRows.length === 0) {
      console.log('Inserting new account number');
      await connection.execute(
        `INSERT INTO account_details (mt5_name_id, account_number) VALUES (?, ?)`,
        [mt5_name_id, account_number]
      );
      console.log(`New account number ${account_number} linked to MT5 name ${mt5_name}`);
    }

    // Now update account details
    console.log('Updating account details');
    const [result] = await connection.execute(
      `UPDATE account_details 
       SET balance=?, equity=?, margin=?, free_margin=?, leverage=?, updated_at=NOW()
       WHERE mt5_name_id = ? AND account_number = ?`,
      [balance, equity, margin, free_margin, leverage, mt5_name_id, account_number]
    );

    console.log('Update result:', result);

    await connection.end();
    console.log('SUCCESS: Account details updated');

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
