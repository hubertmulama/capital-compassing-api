// api/sql-runner.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { sql } = req.body;
      
      const client = await pool.connect();
      const result = await client.query(sql);
      client.release();
      
      res.json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else {
    // Return HTML form for SQL queries
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SQL Query Runner - Capital Compassing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial; margin: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          textarea { width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; }
          button { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
          .result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 SQL Query Runner</h1>
          <p>Run SQL queries on your Railway PostgreSQL database</p>
          
          <form id="sqlForm">
            <textarea name="sql" placeholder="SELECT * FROM your_table LIMIT 10;" required>SELECT NOW() as current_time;</textarea>
            <br><br>
            <button type="submit">Run Query</button>
          </form>
          
          <div id="result" class="result"></div>
        </div>

        <script>
          document.getElementById('sqlForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const sql = formData.get('sql');
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '🔄 Running query...';
            
            try {
              const response = await fetch('/api/sql-runner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
              });
              
              const data = await response.json();
              
              if (data.success) {
                if (data.rows.length > 0) {
                  let html = '<h3>✅ Results (' + data.rows.length + ' rows)</h3>';
                  html += '<table><tr>';
                  
                  // Header
                  Object.keys(data.rows[0]).forEach(key => {
                    html += '<th>' + key + '</th>';
                  });
                  html += '</tr>';
                  
                  // Rows
                  data.rows.forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(value => {
                      html += '<td>' + (value === null ? 'NULL' : value) + '</td>';
                    });
                    html += '</tr>';
                  });
                  
                  html += '</table>';
                  resultDiv.innerHTML = html;
                } else {
                  resultDiv.innerHTML = '✅ Query executed successfully. Rows affected: ' + data.rowCount;
                }
              } else {
                resultDiv.innerHTML = '❌ Error: ' + data.error;
              }
            } catch (error) {
              resultDiv.innerHTML = '❌ Request failed: ' + error.message;
            }
          });
        </script>
      </body>
      </html>
    `);
  }
}
