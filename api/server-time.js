const { executeQuery } = require('./db-config');

export default async function handler(req, res) {
  try {
    const result = await executeQuery('SELECT NOW() as server_time, version() as postgres_version');
    res.json({
      server_time: result.rows[0].server_time,
      postgres_version: result.rows[0].postgres_version,
      api_time: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
