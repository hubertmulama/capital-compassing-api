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
    const { sql, params = [] } = req.body;

    if (!sql) {
      return res.status(400).json({ 
        success: false, 
        error: 'SQL query is required' 
      });
    }

    // Basic security check - prevent destructive operations in demo
    const lowerSql = sql.toLowerCase().trim();
    const restrictedPatterns = [
      /drop\s+table/i,
      /drop\s+database/i,
      /truncate\s+table/i,
      /delete\s+from\s+\w+\s+where\s+1=1/i,
      /delete\s+from\s+\w+\s+where\s+true/i,
      /alter\s+table/i
    ];

    // Allow UPDATE and INSERT operations for state management
    // But block other destructive operations
    if (restrictedPatterns.some(pattern => pattern.test(lowerSql))) {
      return res.status(400).json({ 
        success: false, 
        error: 'This operation is restricted in demo mode' 
      });
    }

    // Additional security: Only allow UPDATE/INSERT on specific tables for state management
    const allowedTables = ['clients', 'eas', 'trading_pairs', 'client_eas', 'mt5_account_names', 'ea_pair_assignments'];
    
    if (lowerSql.startsWith('update') || lowerSql.startsWith('insert')) {
      const tableMatch = lowerSql.match(/(?:update|insert into)\s+(\w+)/i);
      if (tableMatch && !allowedTables.includes(tableMatch[1])) {
        return res.status(400).json({ 
          success: false, 
          error: 'Operation not allowed on this table' 
        });
      }
      
      // For UPDATE, only allow state changes
      if (lowerSql.startsWith('update')) {
        const safeUpdatePattern = /update\s+\w+\s+set\s+state\s*=\s*\$\d+/i;
        if (!safeUpdatePattern.test(lowerSql)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Only state updates are allowed in demo mode' 
          });
        }
      }
    }

    console.log('Admin SQL Query:', sql, 'Params:', params);
    
    const result = await executeQuery(sql, params);
    
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
