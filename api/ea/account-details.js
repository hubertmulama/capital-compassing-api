import { executeQuery } from '../db-config.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== ACCOUNT DETAILS API CALL ===');
  console.log('Request body:', req.body);

  const { mt5_name, account_number, balance, equity, margin, free_margin, leverage } = req.body;

  if (!mt5_name || !account_number) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required parameters: mt5_name and account_number are required' 
    });
  }

  try {
    // First, get the mt5_name_id from mt5_account_names table
    const mt5Result = await executeQuery(
      `SELECT id FROM mt5_account_names WHERE mt5_name = $1`,
      [mt5_name]
    );

    if (mt5Result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'MT5 account name not found in database'
      });
    }

    const mt5_name_id = mt5Result.rows[0].id;

    // Insert or update account details
    const insertResult = await executeQuery(
      `INSERT INTO account_details 
       (mt5_name_id, account_number, balance, equity, margin, free_margin, leverage, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (mt5_name_id, account_number) 
       DO UPDATE SET 
         balance = EXCLUDED.balance,
         equity = EXCLUDED.equity,
         margin = EXCLUDED.margin,
         free_margin = EXCLUDED.free_margin,
         leverage = EXCLUDED.leverage,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [mt5_name_id, account_number, balance, equity, margin, free_margin, leverage]
    );

    console.log('Database operation successful:', insertResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Account details updated successfully',
      data: insertResult.rows[0]
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
