// api/adminer.js
export default async function handler(req, res) {
  // Redirect to external Adminer with pre-filled Railway connection
  const adminerUrl = `https://adminer.com/?pgsql=${encodeURIComponent('maglev.proxy.rlwy.net:40211')}&username=postgres&db=railway`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Adminer - Capital Compassing</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial; margin: 40px; background: #f0f2f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .btn { display: block; width: 100%; padding: 15px; background: #007acc; color: white; text-align: center; text-decoration: none; border-radius: 5px; font-size: 16px; margin: 10px 0; }
        .btn:hover { background: #005a9e; }
        .credentials { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Database Admin</h1>
        
        <div class="info">
          <strong>Click below to open Adminer with your Railway database:</strong>
        </div>
        
        <a href="${adminerUrl}" class="btn" target="_blank">
          📊 Open Web SQL Editor
        </a>
        
        <div class="credentials">
          <strong>Connection Details:</strong><br>
          System: PostgreSQL<br>
          Server: maglev.proxy.rlwy.net:40211<br>
          Username: postgres<br>
          Database: railway<br>
          SSL: Required
        </div>
        
        <p style="text-align: center; margin-top: 20px; color: #666;">
          Works on any device 📱💻
        </p>
      </div>
    </body>
    </html>
  `);
}
