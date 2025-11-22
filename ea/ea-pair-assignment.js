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

  const { ea_id, pair_id } = req.query;

  if (!ea_id || !pair_id) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing ea_id or pair_id parameter' 
    });
  }

  try {
    // Query to get EA-pair assignment with joined data
    const assignmentResult = await executeQuery(
      `SELECT 
        epa.*,
        ea.name as ea_name,
        tp.pair as pair_name,
        tp.category as pair_category
       FROM ea_pair_assignments epa
       INNER JOIN eas ea ON epa.ea_id = ea.id
       INNER JOIN trading_pairs tp ON epa.pair_id = tp.id
       WHERE epa.ea_id = $1 AND epa.pair_id = $2`,
      [ea_id, pair_id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'EA-Pair assignment not found'
      });
    }

    const assignment = assignmentResult.rows[0];

    return res.status(200).json({
      success: true,
      assignment: {
        id: assignment.id,
        ea_id: assignment.ea_id,
        ea_name: assignment.ea_name,
        pair_id: assignment.pair_id,
        pair_name: assignment.pair_name,
        pair_category: assignment.pair_category,
        state: assignment.state,
        created_at: assignment.created_at
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
