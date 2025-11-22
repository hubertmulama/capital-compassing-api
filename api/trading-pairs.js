import { executeQuery } from './db-config.js';

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

  const { pair_name } = req.query;

  if (!pair_name) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing pair_name parameter' 
    });
  }

  try {
    // Query the trading_pairs table for the specific pair
    const pairResult = await executeQuery(
      `SELECT * FROM trading_pairs WHERE pair = $1`,
      [pair_name]
    );

    if (pairResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found'
      });
    }

    const pair = pairResult.rows[0];

    // Format the response
    return res.status(200).json({
      success: true,
      pair: {
        id: pair.id,
        pair: pair.pair,
        category: pair.category,
        state: pair.state,
        created_at: pair.created_at
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
