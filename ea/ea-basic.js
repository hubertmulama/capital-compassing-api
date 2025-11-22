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

  const { ea_name } = req.query;

  if (!ea_name) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing ea_name parameter' 
    });
  }

  try {
    // Get basic EA information from eas table only
    const eaResult = await executeQuery(
      `SELECT * FROM eas WHERE name = $1`,
      [ea_name]
    );

    if (eaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'EA not found'
      });
    }

    const ea = eaResult.rows[0];

    // Return only the EA details
    return res.status(200).json({
      success: true,
      ea: {
        id: ea.id,
        name: ea.name,
        version: ea.version,
        description: ea.description,
        state: ea.state,
        created_at: ea.created_at
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
