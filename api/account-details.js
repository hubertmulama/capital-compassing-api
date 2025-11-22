import { getConnection, executeQuery } from './db-config.js';

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

  console.log('=== ACCOUNT-DETAILS API CALL ===');

  try {
    // Get the raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    
    console.log('Raw body received:', rawBody);

    if (!rawBody || rawBody.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Empty request body' 
      });
    }

    const cleanedBody = rawBody.replace(/\0/g, '').trim();
    let parsedBody;

    try {
      parsedBody = JSON.parse(cleanedBody);
      console.log('Successfully parsed JSON:', parsedBody);
    } catch (parseError) {
      console.log('JSON parse failed:', parseError.message);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid JSON format' 
      });
    }

    const { mt5_name, account_number, balance, equity, margin, free_margin, leverage } = parsedBody;

    console.log('Extracted values:', {
      mt5_name, account_number, balance, equity, margin, free_margin, leverage
    });

    if (!mt5_name || !account_number) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing mt5_name or account_number' 
      });
    }

    console.log('Database connected');

    // Get the MT5 name ID - PostgreSQL syntax
    const mt5Result = await executeQuery(
      `SELECT id FROM mt5_account_names WHERE mt5_name = $1`,
      [mt5_name]
    );

    console.log('MT5 query result:', mt5Result.rows);

    if (mt5Result.rows.length === 0) {
      console.log('MT5 name not found:', mt5_name);
      return res.status(404).json({
        success: false,
        error: 'MT5 name not found'
      });
    }

    const mt5_name_id = mt5Result.rows[0].id;
    console.log('Found MT5 name ID:', mt5_name_id);

    // Check if this specific MT5 name + account number combination exists
    const existingResult = await executeQuery(
      `SELECT id FROM account_details WHERE mt5_name_id = $1 AND account_number = $2`,
      [mt5_name_id, account_number]
    );

    console.log('Existing account check:', existingResult.rows);

    if (existingResult.rows.length > 0) {
      // Update existing record for this MT5 name + account number
      console.log('Updating existing account record');
      await executeQuery(
        `UPDATE account_details 
         SET balance=$1, equity=$2, margin=$3, free_margin=$4, leverage=$5, updated_at=CURRENT_TIMESTAMP
         WHERE mt5_name_id = $6 AND account_number = $7`,
        [balance, equity, margin, free_margin, leverage, mt5_name_id, account_number]
      );
      console.log('Existing account updated');
    } else {
      // Insert new record - same account number but different MT5 name is allowed
      console.log('Inserting new account record');
      await executeQuery(
        `INSERT INTO account_details (mt5_name_id, account_number, balance, equity, margin, free_margin, leverage) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [mt5_name_id, account_number, balance, equity, margin, free_margin, leverage]
      );
      console.log('New account record inserted');
    }

    console.log('SUCCESS: Account details processed');
    return res.status(200).json({
      success: true,
      message: 'Account details updated successfully'
    });

  } catch (error) {
    console.error('ERROR in account-details API:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
