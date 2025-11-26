import { executeQuery } from '../db-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currency, day } = req.query;

  // Validate parameters
  if (!currency || !day) {
    return res.status(400).json({ error: 'Missing currency or day parameter' });
  }

  if (currency.length !== 3) {
    return res.status(400).json({ error: 'Currency must be 3 characters' });
  }

  const dayInt = parseInt(day);
  if (dayInt < 1 || dayInt > 5) {
    return res.status(400).json({ error: 'Day must be 1-5 (Monday-Friday)' });
  }

  try {
    // Map day number to NEW column names
    const dayColumns = {
      1: 'monday_state',
      2: 'tuesday_state', 
      3: 'wednesday_state',
      4: 'thursday_state',
      5: 'friday_state'
    };

    const dayColumn = dayColumns[dayInt];
    
    // Query using the NEW table and column names
    const query = `SELECT ${dayColumn} as state FROM news_state WHERE currency = $1`;
    const values = [currency.toUpperCase()];
    
    const result = await executeQuery(query, values);

    if (result.rows.length === 0) {
      // Currency not found in database - default to enabled
      return res.status(200).json({ 
        currency: currency.toUpperCase(),
        day: dayInt,
        state: 'enabled',
        message: 'Currency not found in database, defaulting to enabled'
      });
    }

    const state = result.rows[0].state;
    
    return res.status(200).json({
      currency: currency.toUpperCase(),
      day: dayInt,
      state: state,
      message: 'Success'
    });

  } catch (error) {
    console.error('Database error:', error);
    
    // Return enabled state even on database errors (fail-safe)
    return res.status(200).json({ 
      error: 'Database query failed',
      currency: currency.toUpperCase(),
      day: dayInt,
      state: 'enabled',
      message: 'Database error, defaulting to enabled for safety'
    });
  }
}
