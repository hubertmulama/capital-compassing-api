export default async function handler(req, res) {
  res.json({
    status: '✅ API is running',
    database: 'Railway PostgreSQL',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
}
