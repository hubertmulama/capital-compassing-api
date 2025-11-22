import { executeQuery } from './db-config.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Handle SQL queries from the dashboard
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
    // Serve the dashboard HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Capital Compassing - Admin Dashboard</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #4361ee;
            --secondary: #3a0ca3;
            --success: #4cc9f0;
            --danger: #f72585;
            --warning: #f8961e;
            --dark: #1a1a2e;
            --light: #f8f9fa;
            --sidebar-width: 250px;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: var(--dark);
        }

        .dashboard {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--dark);
            color: white;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            transition: transform 0.3s ease;
            z-index: 1000;
        }

        .sidebar-header {
            padding: 2rem 1.5rem;
            border-bottom: 1px solid #2d3748;
            text-align: center;
        }

        .sidebar-header h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: var(--success);
        }

        .sidebar-header p {
            font-size: 0.9rem;
            opacity: 0.7;
        }

        .nav-links {
            padding: 1rem 0;
        }

        .nav-item {
            padding: 1rem 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
        }

        .nav-item:hover {
            background: #2d3748;
            border-left-color: var(--primary);
        }

        .nav-item.active {
            background: #2d3748;
            border-left-color: var(--success);
        }

        .nav-item i {
            margin-right: 0.75rem;
            width: 20px;
            text-align: center;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: var(--sidebar-width);
            padding: 2rem;
            transition: margin-left 0.3s ease;
        }

        .header {
            background: white;
            padding: 1.5rem 2rem;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            display: flex;
            justify-content: between;
            align-items: center;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-card i {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: var(--primary);
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--dark);
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }

        /* Content Areas */
        .content-area {
            background: white;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .content-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .content-header h2 {
            color: var(--dark);
            font-size: 1.5rem;
        }

        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }

        .btn:hover {
            background: var(--secondary);
            transform: translateY(-2px);
        }

        .btn-success { background: var(--success); }
        .btn-danger { background: var(--danger); }
        .btn-warning { background: var(--warning); }

        /* Tables */
        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        th, td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        th {
            background: #f7fafc;
            font-weight: 600;
            color: var(--dark);
        }

        tr:hover {
            background: #f7fafc;
        }

        /* SQL Editor */
        .sql-editor {
            width: 100%;
            height: 150px;
            padding: 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            resize: vertical;
            margin-bottom: 1rem;
        }

        .sql-editor:focus {
            border-color: var(--primary);
            outline: none;
        }

        .result-area {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            max-height: 400px;
            overflow-y: auto;
        }

        /* Mobile Menu */
        .mobile-menu-btn {
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--dark);
            cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }
            
            .sidebar.active {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .mobile-menu-btn {
                display: block;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .header {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
        }

        /* Loading */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1><i class="fas fa-chart-line"></i> Capital Compassing</h1>
                <p>Admin Dashboard</p>
            </div>
            <div class="nav-links">
                <div class="nav-item active" data-tab="overview">
                    <i class="fas fa-home"></i> Overview
                </div>
                <div class="nav-item" data-tab="clients">
                    <i class="fas fa-users"></i> Clients
                </div>
                <div class="nav-item" data-tab="eas">
                    <i class="fas fa-robot"></i> Expert Advisors
                </div>
                <div class="nav-item" data-tab="trading">
                    <i class="fas fa-chart-bar"></i> Trading Pairs
                </div>
                <div class="nav-item" data-tab="accounts">
                    <i class="fas fa-wallet"></i> Account Details
                </div>
                <div class="nav-item" data-tab="sql">
                    <i class="fas fa-database"></i> SQL Query Tool
                </div>
                <div class="nav-item" data-tab="analytics">
                    <i class="fas fa-chart-pie"></i> Analytics
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <i class="fas fa-bars"></i>
                </button>
                <h1>Database Management Dashboard</h1>
                <div class="header-actions">
                    <button class="btn" onclick="refreshStats()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- Overview Tab -->
            <div class="tab-content active" id="overview">
                <div class="stats-grid" id="statsGrid">
                    <!-- Stats will be loaded here -->
                </div>
                
                <div class="content-area">
                    <div class="content-header">
                        <h2>Recent Activity</h2>
                    </div>
                    <div class="table-container">
                        <table id="recentActivity">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Action</th>
                                    <th>Client</th>
                                    <th>EA</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Recent activity will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- SQL Query Tool Tab -->
            <div class="tab-content" id="sql">
                <div class="content-area">
                    <div class="content-header">
                        <h2>SQL Query Tool</h2>
                    </div>
                    <textarea class="sql-editor" id="sqlEditor" placeholder="SELECT * FROM clients LIMIT 10;">SELECT * FROM clients LIMIT 5;</textarea>
                    <button class="btn" onclick="runQuery()">Execute Query</button>
                    <button class="btn btn-success" onclick="runQuery('SELECT * FROM clients LIMIT 5;')">Test Clients</button>
                    <button class="btn btn-warning" onclick="runQuery('SELECT * FROM eas LIMIT 5;')">Test EAs</button>
                    <div class="result-area" id="sqlResult">
                        Run a query to see results...
                    </div>
                </div>
            </div>

            <!-- Add similar content areas for other tabs -->
            <div class="tab-content" id="clients">
                <div class="content-area">
                    <div class="content-header">
                        <h2>Clients Management</h2>
                        <button class="btn btn-success" onclick="runQuery('SELECT * FROM clients ORDER BY id DESC LIMIT 20;')">
                            Load Clients
                        </button>
                    </div>
                    <div class="result-area" id="clientsResult">
                        Click "Load Clients" to view data
                    </div>
                </div>
            </div>

            <div class="tab-content" id="eas">
                <div class="content-area">
                    <div class="content-header">
                        <h2>Expert Advisors</h2>
                        <button class="btn btn-success" onclick="runQuery('SELECT * FROM eas ORDER BY id DESC LIMIT 20;')">
                            Load EAs
                        </button>
                    </div>
                    <div class="result-area" id="easResult">
                        Click "Load EAs" to view data
                    </div>
                </div>
            </div>

            <div class="tab-content" id="trading">
                <div class="content-area">
                    <div class="content-header">
                        <h2>Trading Pairs</h2>
                        <button class="btn btn-success" onclick="runQuery('SELECT * FROM trading_pairs ORDER BY id DESC LIMIT 20;')">
                            Load Pairs
                        </button>
                    </div>
                    <div class="result-area" id="tradingResult">
                        Click "Load Pairs" to view data
                    </div>
                </div>
            </div>

            <div class="tab-content" id="accounts">
                <div class="content-area">
                    <div class="content-header">
                        <h2>Account Details</h2>
                        <button class="btn btn-success" onclick="runQuery('SELECT ad.*, man.mt5_name FROM account_details ad JOIN mt5_account_names man ON ad.mt5_name_id = man.id ORDER BY ad.updated_at DESC LIMIT 20;')">
                            Load Accounts
                        </button>
                    </div>
                    <div class="result-area" id="accountsResult">
                        Click "Load Accounts" to view data
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Mobile menu toggle
        document.getElementById('mobileMenuBtn').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                // Remove active class from all
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
                
                // Close mobile menu
                document.getElementById('sidebar').classList.remove('active');
            });
        });

        // Run SQL query
        async function runQuery(customQuery = null) {
            const sql = customQuery || document.getElementById('sqlEditor').value;
            const resultDiv = document.getElementById('sqlResult');
            
            resultDiv.innerHTML = '<div class="loading"></div> Running query...';
            
            try {
                const response = await fetch('/api/admin-dashboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (data.rows.length > 0) {
                        resultDiv.innerHTML = createTableHTML(data.rows);
                    } else {
                        resultDiv.innerHTML = '<div style="color: green;">✅ Query executed successfully. Rows affected: ' + data.rowCount + '</div>';
                    }
                } else {
                    resultDiv.innerHTML = '<div style="color: red;">❌ Error: ' + data.error + '</div>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<div style="color: red;">❌ Request failed: ' + error.message + '</div>';
            }
        }

        // Create HTML table from data
        function createTableHTML(rows) {
            if (rows.length === 0) return '<div>No data found</div>';
            
            let html = '<h3>Results (' + rows.length + ' rows)</h3>';
            html += '<div class="table-container"><table><tr>';
            
            // Header
            Object.keys(rows[0]).forEach(key => {
                html += '<th>' + key + '</th>';
            });
            html += '</tr>';
            
            // Rows
            rows.forEach(row => {
                html += '<tr>';
                Object.values(row).forEach(value => {
                    html += '<td>' + (value === null ? 'NULL' : value) + '</td>';
                });
                html += '</tr>';
            });
            
            html += '</table></div>';
            return html;
        }

        // Load dashboard stats
        async function refreshStats() {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = '<div class="stat-card"><div class="loading"></div> Loading...</div>'.repeat(4);
            
            try {
                const queries = [
                    'SELECT COUNT(*) as total FROM clients',
                    'SELECT COUNT(*) as total FROM eas', 
                    'SELECT COUNT(*) as total FROM trading_pairs',
                    'SELECT COUNT(*) as total FROM account_details'
                ];
                
                const results = await Promise.all(queries.map(query => 
                    fetch('/api/admin-dashboard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sql: query })
                    }).then(r => r.json())
                ));
                
                const stats = [
                    { icon: 'fas fa-users', label: 'Total Clients', value: results[0].rows[0].total },
                    { icon: 'fas fa-robot', label: 'Expert Advisors', value: results[1].rows[0].total },
                    { icon: 'fas fa-chart-bar', label: 'Trading Pairs', value: results[2].rows[0].total },
                    { icon: 'fas fa-wallet', label: 'Account Records', value: results[3].rows[0].total }
                ];
                
                statsGrid.innerHTML = stats.map(stat => `
                    <div class="stat-card">
                        <i class="${stat.icon}"></i>
                        <div class="stat-number">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                    </div>
                `).join('');
                
            } catch (error) {
                statsGrid.innerHTML = '<div class="stat-card">Error loading stats</div>';
            }
        }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            refreshStats();
            // Load initial data for active tab
            if (document.querySelector('.nav-item.active').getAttribute('data-tab') === 'clients') {
                runQuery('SELECT * FROM clients LIMIT 10;');
            }
        });
    </script>
</body>
</html>
    `);
  }
}
