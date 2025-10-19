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
    // Get the raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    
    console.log('Raw body received:', rawBody);
    console.log('Raw body length:', rawBody.length);

    if (!rawBody || rawBody.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Empty request body' 
      });
    }

    // Clean the JSON string - remove any null characters or extra whitespace
    const cleanedBody = rawBody.replace(/\0/g, '').trim();
    console.log('Cleaned body:', cleanedBody);
    console.log('Cleaned length:', cleanedBody.length);

    let parsedBody;
    try {
      parsedBody = JSON.parse(cleanedBody);
      console.log('Successfully parsed JSON:', parsedBody);
    } catch (parseError) {
      console.log('JSON parse failed:', parseError.message);
      // Try to extract values manually as fallback
      try {
        const mt5_match = cleanedBody.match(/"mt5_name":"([^"]*)"/);
        const account_match = cleanedBody.match(/"account_number":"([^"]*)"/);
        const balance_match = cleanedBody.match(/"balance":([\d.]+)/);
        const equity_match = cleanedBody.match(/"equity":([\d.]+)/);
        const margin_match = cleanedBody.match(/"margin":([\d.]+)/);
        const free_margin_match = cleanedBody.match(/"free_margin":([\d.]+)/);
        const leverage_match = cleanedBody.match(/"leverage":([\d.]+)/);
        
        parsedBody = {
          mt5_name: mt5_match ? mt5_match[1] : null,
          account_number: account_match ? account_match[1] : null,
          balance: balance_match ? parseFloat(balance_match[1]) : 0,
          equity: equity_match ? parseFloat(equity_match[1]) : 0,
          margin: margin_match ? parseFloat(margin_match[1]) : 0,
          free_margin: free_margin_match ? parseFloat(free_margin_match[1]) : 0,
          leverage: leverage_match ? parseInt(leverage_match[1]) : 0
        };
        console.log('Manually extracted values:', parsedBody);
      } catch (manualError) {
        console.log('Manual extraction also failed:', manualError.message);
        return res.status(400).json({ 
          success: false,
          error: 'Invalid JSON format' 
        });
      }
    }

    const { mt5_name, account_number, balance, equity, margin, free_margin, leverage } = parsedBody;

    if (!mt5_name || !account_number) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing mt5_name or account_number' 
      });
    }

    let connection = await getConnection();
    console.log('Database connected');

    // Rest of your database code...
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
