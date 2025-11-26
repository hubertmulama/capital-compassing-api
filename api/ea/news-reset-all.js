import { executeQuery } from '../db-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query = `
      UPDATE news_state 
      SET 
        monday_state = 'enabled',
        tuesday_state = 'enabled',
        wednesday_state = 'enabled', 
        thursday_state = 'enabled',
        friday_state = 'enabled',
        updated_at = NOW()
    `;
    
    const result = await executeQuery(query);

    const countQuery = `SELECT COUNT(*) as updated_count FROM news_state`;
    const countResult = await executeQuery(countQuery);
    const updatedCount = countResult.rows[0].updated_count;

    return res.status(200).json({
      success: true,
      message: `All ${updatedCount} currencies reset to enabled`,
      updated_count: updatedCount
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
}
