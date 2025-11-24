const { executeQuery } = require('./db-config.js');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    if (req.method === 'POST') {
      switch (action) {
        case 'data':
          return await handleDataQuery(req, res);
        case 'queries':
          return await handlePredefinedQueries(req, res);
        case 'analytics':
          return await handleAnalytics(req, res);
        default:
          return res.status(404).json({ error: 'Admin endpoint not found' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Handle SQL data queries
async function handleDataQuery(req, res) {
  const { sql, params = [] } = req.body;

  if (!sql) {
    return res.status(400).json({ 
      success: false, 
      error: 'SQL query is required' 
    });
  }

  // Security checks
  const lowerSql = sql.toLowerCase().trim();
  const restrictedPatterns = [
    /drop\s+table/i,
    /drop\s+database/i,
    /truncate\s+table/i,
    /delete\s+from\s+\w+\s+where\s+1=1/i,
    /delete\s+from\s+\w+\s+where\s+true/i,
    /alter\s+table/i
  ];

  if (restrictedPatterns.some(pattern => pattern.test(lowerSql))) {
    return res.status(400).json({ 
      success: false, 
      error: 'This operation is restricted in demo mode' 
    });
  }

  // Allow UPDATE/INSERT on specific tables for state management
  const allowedTables = ['clients', 'eas', 'trading_pairs', 'client_eas', 'mt5_account_names', 'ea_pair_assignments'];
  
  if (lowerSql.startsWith('update') || lowerSql.startsWith('insert')) {
    const tableMatch = lowerSql.match(/(?:update|insert into)\s+(\w+)/i);
    if (tableMatch && !allowedTables.includes(tableMatch[1])) {
      return res.status(400).json({ 
        success: false, 
        error: 'Operation not allowed on this table' 
      });
    }
    
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
}

// Handle predefined queries
async function handlePredefinedQueries(req, res) {
  const { query } = req.body;
  
  const predefinedQueries = {
    'client_stats': 'SELECT c.*, COUNT(man.id) as mt5_accounts FROM clients c LEFT JOIN mt5_account_names man ON c.id = man.client_id GROUP BY c.id;',
    'ea_assignments': 'SELECT ea.*, COUNT(epa.id) as assigned_pairs FROM eas ea LEFT JOIN ea_pair_assignments epa ON ea.id = epa.ea_id GROUP BY ea.id;',
    'category_stats': 'SELECT category, COUNT(*) as count FROM trading_pairs GROUP BY category;',
    'status_summary': 'SELECT state, COUNT(*) as count FROM trading_pairs GROUP BY state;'
  };

  const sql = predefinedQueries[query];
  if (!sql) {
    return res.status(400).json({ 
      success: false, 
      error: 'Predefined query not found' 
    });
  }

  const result = await executeQuery(sql);
  res.json({
    success: true,
    rows: result.rows,
    rowCount: result.rowCount
  });
}

// Handle analytics
async function handleAnalytics(req, res) {
  const { type } = req.body;
  
  const analyticsQueries = {
    'overview': [
      'SELECT COUNT(*) as total_clients FROM clients',
      'SELECT COUNT(*) as total_eas FROM eas',
      'SELECT COUNT(*) as total_pairs FROM trading_pairs',
      'SELECT COUNT(*) as total_accounts FROM account_details'
    ],
    'active_stats': [
      'SELECT COUNT(*) as active_clients FROM clients WHERE state = \'active\'',
      'SELECT COUNT(*) as enabled_eas FROM eas WHERE state = \'enabled\'',
      'SELECT COUNT(*) as enabled_pairs FROM trading_pairs WHERE state = \'enabled\''
    ]
  };

  const queries = analyticsQueries[type] || analyticsQueries['overview'];
  
  try {
    const results = await Promise.all(
      queries.map(query => executeQuery(query))
    );
    
    const data = results.map((result, index) => ({
      query: queries[index],
      result: result.rows[0]
    }));
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
