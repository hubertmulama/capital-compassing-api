const { executeQuery } = require('../db-config.js');

module.exports = async function handler(req, res) {
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

  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({ 
        success: false, 
        error: 'SQL query is required' 
      });
    }

    // Basic security check - prevent destructive operations in demo
    const lowerSql = sql.toLowerCase().trim();
    if (lowerSql.startsWith('drop') || 
        lowerSql.startsWith('delete from') || 
        lowerSql.startsWith('truncate') ||
        lowerSql.startsWith('alter') ||
        lowerSql.startsWith('update') ||
        lowerSql.startsWith('insert')) {
      return res.status(400).json({ 
        success: false, 
        error: 'This operation is restricted in demo mode' 
      });
    }

    console.log('Admin SQL Query:', sql);
    
    const result = await executeQuery(sql);
    
    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
