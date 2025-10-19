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

  console.log('=== API CALLED ===');

  try {
    // Vercel should automatically parse JSON if Content-Type is correct
    console.log('Request body:', req.body);
    console.log('Body type:', typeof req.body);
    
    if (!req.body) {
      return res.status(400).json({ 
        success: false,
        error: 'No request body received' 
      });
    }

    const { mt5_name, account_number, balance, equity, margin, free_margin, leverage } = req.body;

    console.log('Extracted values:', {
      mt5_name, account_number, balance, equity, margin, free_margin, leverage
    });

    if (!mt5_name || !account_number) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing mt5_name or account_number' 
      });
    }

    let connection = await getConnection();
    console.log('Database connected');

    // Get mt5_name_id
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

    // Check if account number exists
    const [accountRows] = await connection.execute(
      `SELECT id FROM account_details WHERE mt5_name_id = ? AND account_number = ?`,
      [mt5_name_id, account_number]
    );

    // Insert if doesn't exist
    if (accountRows.length === 0) {
      await connection.execute(
        `INSERT INTO account_details (mt5_name_id, account_number) VALUES (?, ?)`,
        [mt5_name_id, account_number]
      );
    }

    // Update account details
    await connection.execute(
      `UPDATE account_details 
       SET balance=?, equity=?, margin=?, free_margin=?, leverage=?, updated_at=NOW()
       WHERE mt5_name_id = ? AND account_number = ?`,
      [balance, equity, margin, free_margin, leverage, mt5_name_id, account_number]
    );

    await connection.end();

    console.log('SUCCESS: Account updated');
    return res.status(200).json({
      success: true,
      message: 'Account details updated successfully'
    });

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
