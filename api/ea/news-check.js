import { executeQuery } from '../db-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { day } = req.query;

  // Validate parameters
  if (!day) {
    return res.status(400).json({ error: 'Missing day parameter' });
  }

  const dayInt = parseInt(day);
  if (dayInt < 1 || dayInt > 5) {
    return res.status(400).json({ error: 'Day must be 1-5 (Monday-Friday)' });
  }

  try {
    // Map day number to column name
    const dayColumns = {
      1: 'monday_state',
      2: 'tuesday_state', 
      3: 'wednesday_state',
      4: 'thursday_state',
      5: 'friday_state'
    };

    const dayColumn = dayColumns[dayInt];
    
    // Single query to get all currencies at once
    const query = `SELECT currency, ${dayColumn} as state FROM news_state`;
    
    const result = await executeQuery(query);

    if (result.rows.length === 0) {
      return res.status(200).json({ 
        success: false,
        error: 'No currencies found in database',
        states: {}
      });
    }

    // Build states object
    const states = {};
    result.rows.forEach(row => {
      states[row.currency] = row.state;
    });

    return res.status(200).json({
      success: true,
      day: dayInt,
      states: states,
      message: 'Success'
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(200).json({ 
      success: false,
      error: 'Database query failed',
      states: {}
    });
  }
}
