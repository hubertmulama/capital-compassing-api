const { executeQuery } = require('./db-config.js');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Handle SQL queries
    try {
      const { sql } = req.body;
      const result = await executeQuery(sql);
      res.json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    // Serve minimal HTML with external CSS/JS
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Capital Compassing - Admin</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --primary: #4361ee; --secondary: #3a0ca3; --dark: #1a1a2e; }
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; }
        .dashboard { display: flex; min-height: 100vh; }
        .sidebar { width: 250px; background: var(--dark); color: white; position: fixed; height: 100vh; }
        .sidebar-header { padding: 2rem 1rem; text-align: center; border-bottom: 1px solid #2d3748; }
        .nav-item { padding: 1rem; cursor: pointer; border-left: 4px solid transparent; }
        .nav-item:hover, .nav-item.active { background: #2d3748; border-left-color: var(--primary); }
        .main-content { flex: 1; margin-left: 250px; padding: 1rem; }
        .header { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .stat-card { background: white; padding: 1rem; border-radius: 8px; text-align: center; }
        .content-area { background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .sql-editor { width: 100%; height: 120px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; }
        .btn { background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin: 0.25rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .mobile-menu { display: none; }
        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.active { transform: translateX(0); }
            .main-content { margin-left: 0; }
            .mobile-menu { display: block; }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-chart-line"></i> Capital Compassing</h2>
                <p>Admin Dashboard</p>
            </div>
            <div class="nav-links">
                <div class="nav-item active" data-tab="overview">📊 Overview</div>
                <div class="nav-item" data-tab="clients">👥 Clients</div>
                <div class="nav-item" data-tab="eas">🤖 EAs</div>
                <div class="nav-item" data-tab="trading">📈 Trading</div>
                <div class="nav-item" data-tab="sql">💻 SQL Tool</div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <button class="mobile-menu" onclick="toggleSidebar()">☰ Menu</button>
                <h1>Database Admin</h1>
                <button class="btn" onclick="refreshStats()">🔄 Refresh</button>
            </div>

            <!-- Overview -->
            <div class="tab-content active" id="overview">
                <div class="stats-grid" id="statsGrid">
                    <div class="stat-card">Loading...</div>
                </div>
            </div>

            <!-- SQL Tool -->
            <div class="tab-content" id="sql">
                <div class="content-area">
                    <h3>SQL Query Tool</h3>
                    <textarea class="sql-editor" id="sqlEditor">SELECT * FROM clients LIMIT 5;</textarea>
                    <button class="btn" onclick="runQuery()">Run Query</button>
                    <div id="sqlResult" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                        Results will appear here...
                    </div>
                </div>
            </div>

            <!-- Other tabs -->
            <div class="tab-content" id="clients">
                <div class="content-area">
                    <h3>Clients</h3>
                    <button class="btn" onclick="loadTable('clients')">Load Clients</button>
                    <div id="clientsResult"></div>
                </div>
            </div>

            <div class="tab-content" id="eas">
                <div class="content-area">
                    <h3>Expert Advisors</h3>
                    <button class="btn" onclick="loadTable('eas')">Load EAs</button>
                    <div id="easResult"></div>
                </div>
            </div>

            <div class="tab-content" id="trading">
                <div class="content-area">
                    <h3>Trading Pairs</h3>
                    <button class="btn" onclick="loadTable('trading_pairs')">Load Pairs</button>
                    <div id="tradingResult"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }

        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
            });
        });

        async function runQuery() {
            const sql = document.getElementById('sqlEditor').value;
            const resultDiv = document.getElementById('sqlResult');
            resultDiv.innerHTML = 'Running query...';
            
            try {
                const response = await fetch('/api/admin-dashboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (data.rows.length > 0) {
                        resultDiv.innerHTML = createTable(data.rows);
                    } else {
                        resultDiv.innerHTML = '✅ Query executed. Rows affected: ' + data.rowCount;
                    }
                } else {
                    resultDiv.innerHTML = '❌ Error: ' + data.error;
                }
            } catch (error) {
                resultDiv.innerHTML = '❌ Request failed: ' + error.message;
            }
        }

        function createTable(rows) {
            if (!rows.length) return 'No data found';
            
            let html = '<table><tr>';
            Object.keys(rows[0]).forEach(key => html += '<th>' + key + '</th>');
            html += '</tr>';
            
            rows.forEach(row => {
                html += '<tr>';
                Object.values(row).forEach(value => html += '<td>' + (value ?? 'NULL') + '</td>');
                html += '</tr>';
            });
            
            return html + '</table>';
        }

        async function loadTable(tableName) {
            const resultDiv = document.getElementById(tableName.replace('_', '') + 'Result');
            resultDiv.innerHTML = 'Loading...';
            
            await runQuery('SELECT * FROM ' + tableName + ' LIMIT 20;');
        }

        async function refreshStats() {
            const statsGrid = document.getElementById('statsGrid');
            const queries = [
                'SELECT COUNT(*) as count FROM clients',
                'SELECT COUNT(*) as count FROM eas',
                'SELECT COUNT(*) as count FROM trading_pairs',
                'SELECT COUNT(*) as count FROM account_details'
            ];
            
            try {
                const results = await Promise.all(queries.map(query => 
                    fetch('/api/admin-dashboard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sql: query })
                    }).then(r => r.json())
                ));
                
                const stats = ['Clients', 'EAs', 'Pairs', 'Accounts'];
                statsGrid.innerHTML = results.map((result, i) => `
                    <div class="stat-card">
                        <h3>${result.rows[0].count}</h3>
                        <p>${stats[i]}</p>
                    </div>
                `).join('');
            } catch (error) {
                statsGrid.innerHTML = '<div class="stat-card">Error loading stats</div>';
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', refreshStats);
    </script>
</body>
</html>
    `);
  }
};
