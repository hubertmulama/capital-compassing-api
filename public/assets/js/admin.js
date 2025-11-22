// Mobile menu toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Tab navigation
function initializeTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length === 0) return;
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
            
            // Close mobile menu
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });
}

// Run SQL query
async function runQuery(customQuery = null) {
    const sqlEditor = document.getElementById('sqlEditor');
    const resultDiv = document.getElementById('sqlResult');
    
    if (!resultDiv) return;
    
    const sql = customQuery || (sqlEditor ? sqlEditor.value : '');
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

// Load table data - FIXED VERSION
async function loadTable(tableName) {
    // FIX: Use global regex to replace ALL underscores, not just the first one
    const elementId = tableName.replace(/_/g, '') + 'Result';
    const resultDiv = document.getElementById(elementId);
    if (!resultDiv) {
        console.error('Element not found:', elementId);
        return;
    }
    
    resultDiv.innerHTML = 'Loading...';
    
    try {
        const response = await fetch('/api/admin/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT * FROM ' + tableName + ' LIMIT 20;' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.rows.length > 0) {
                resultDiv.innerHTML = createTableHTML(data.rows);
            } else {
                resultDiv.innerHTML = '<div style="color: green;">✅ No data found</div>';
            }
        } else {
            resultDiv.innerHTML = '<div style="color: red;">❌ Error: ' + data.error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="color: red;">❌ Request failed: ' + error.message + '</div>';
    }
}

// Load dashboard stats
async function refreshStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    const statCards = statsGrid.querySelectorAll('.stat-number');
    if (statCards.length === 0) return;
    
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
            if (result.success && statCards[index]) {
                statCards[index].textContent = result.rows[0].count;
            }
        });
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Initialize dashboard - wait for full page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initialized');
    initializeTabs();
    refreshStats();
});
