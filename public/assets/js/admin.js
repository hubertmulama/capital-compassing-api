// Mobile menu toggle
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

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
    
    resultDiv.innerHTML = 'Running query...';
    
    try {
        const response = await fetch('/api/admin/data', {
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
    
    let html = '<h4>Results (' + rows.length + ' rows)</h4>';
    html += '<div style="overflow-x: auto;"><table><tr>';
    
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

// Load table data
async function loadTable(tableName) {
    const resultDiv = document.getElementById(tableName.replace('_', '') + 'Result');
    resultDiv.innerHTML = 'Loading...';
    
    await runQuery('SELECT * FROM ' + tableName + ' LIMIT 20;');
}

// Load dashboard stats
async function refreshStats() {
    const statsGrid = document.getElementById('statsGrid');
    const statCards = statsGrid.querySelectorAll('.stat-number');
    
    // Show loading
    statCards.forEach(card => card.textContent = '...');
    
    try {
        const queries = [
            'SELECT COUNT(*) as count FROM clients',
            'SELECT COUNT(*) as count FROM eas',
            'SELECT COUNT(*) as count FROM trading_pairs',
            'SELECT COUNT(*) as count FROM account_details'
        ];
        
        const results = await Promise.all(queries.map(query => 
            fetch('/api/admin/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: query })
            }).then(r => r.json())
        ));
        
        // Update stats
        results.forEach((result, index) => {
            if (result.success) {
                statCards[index].textContent = result.rows[0].count;
            }
        });
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    refreshStats();
});
