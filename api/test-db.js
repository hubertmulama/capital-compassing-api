const { testConnection } = require('./db-config');

export default async function handler(req, res) {
  try {
    const connectionTest = await testConnection();
    res.json({
      status: '✅ Database connected',
      database: 'Railway PostgreSQL',
      connection: connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
