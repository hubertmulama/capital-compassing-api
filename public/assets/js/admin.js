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

// Create HTML table from data with action buttons
function createTableHTML(rows, tableName = '') {
    if (rows.length === 0) return '<div>No data found</div>';
    
    let html = '<h4>Results (' + rows.length + ' rows)</h4>';
    html += '<div style="overflow-x: auto;"><table><tr>';
    
    // Header - add Actions column if table has state
    const hasState = rows[0].state !== undefined;
    Object.keys(rows[0]).forEach(key => {
        html += '<th>' + key + '</th>';
    });
    if (hasState && tableName) {
        html += '<th>Actions</th>';
    }
    html += '</tr>';
    
    // Rows
    rows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
            html += '<td>' + (value === null ? 'NULL' : value) + '</td>';
        });
        
        // Add toggle button if table has state
        if (hasState && tableName) {
            const isActive = row.state === 'active' || row.state === 'enabled';
            const newState = isActive ? 'disabled' : 'enabled';
            const buttonText = isActive ? 'Disable' : 'Enable';
            const buttonClass = isActive ? 'btn-danger' : 'btn-success';
            
            html += `<td>
                <button class="btn-toggle ${buttonClass}" 
                        onclick="toggleState('${tableName}', ${row.id}, '${newState}')"
                        data-id="${row.id}"
                        data-table="${tableName}">
                    ${buttonText}
                </button>
            </td>`;
        }
        html += '</tr>';
    });
    
    html += '</table></div>';
    return html;
}

// Toggle state function
async function toggleState(tableName, id, newState) {
    console.log(`Toggling ${tableName} ID ${id} to ${newState}`);
    
    // Determine the correct state column value based on table
    let stateValue = newState;
    
    try {
        const response = await fetch('/api/admin/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: `UPDATE ${tableName} SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                params: [stateValue, id]
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`✅ ${tableName} ${id} ${newState} successfully!`, 'success');
            // Reload the current table to reflect changes
            reloadCurrentTable();
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Request failed: ${error.message}`, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.getElementById('global-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'global-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#10b981';
    } else if (type === 'error') {
        notification.style.background = '#ef4444';
    } else {
        notification.style.background = '#3b82f6';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Reload current table after state change
function reloadCurrentTable() {
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        
        // Map tab IDs to table names
        const tabToTable = {
            'clients': 'clients',
            'eas': 'eas',
            'trading': 'trading_pairs'
        };
        
        const tableName = tabToTable[tabId];
        if (tableName) {
            setTimeout(() => loadTable(tableName), 500);
        }
    }
}

// Load table data with enhanced display
async function loadTable(tableName) {
    console.log('loadTable called with:', tableName);
    
    // Map table names to their correct element IDs
    const elementMap = {
        'clients': 'clientsResult',
        'eas': 'easResult', 
        'trading_pairs': 'tradingResult',
        'client_eas': 'clientsResult', // Will show in Clients tab
        'mt5_account_names': 'clientsResult', // Will show in Clients tab
        'ea_pair_assignments': 'easResult' // Will show in EAs tab
    };
    
    const elementId = elementMap[tableName];
    console.log('Looking for element:', elementId);
    
    const resultDiv = document.getElementById(elementId);
    
    if (!resultDiv) {
        console.error('Element not found:', elementId);
        return;
    }
    
    resultDiv.innerHTML = 'Loading...';
    
    try {
        let query = `SELECT * FROM ${tableName} LIMIT 20;`;
        
        // Special queries for joined tables
        if (tableName === 'client_eas') {
            query = `
                SELECT ce.*, c.name as client_name, ea.name as ea_name 
                FROM client_eas ce
                LEFT JOIN clients c ON ce.client_id = c.id
                LEFT JOIN eas ea ON ce.ea_id = ea.id
                LIMIT 20;
            `;
        } else if (tableName === 'mt5_account_names') {
            query = `
                SELECT man.*, c.name as client_name 
                FROM mt5_account_names man
                LEFT JOIN clients c ON man.client_id = c.id
                LIMIT 20;
            `;
        } else if (tableName === 'ea_pair_assignments') {
            query = `
                SELECT epa.*, ea.name as ea_name, tp.pair as pair_name 
                FROM ea_pair_assignments epa
                LEFT JOIN eas ea ON epa.ea_id = ea.id
                LEFT JOIN trading_pairs tp ON epa.pair_id = tp.id
                LIMIT 20;
            `;
        }
        
        const response = await fetch('/api/admin/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: query })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.rows.length > 0) {
                resultDiv.innerHTML = createTableHTML(data.rows, tableName);
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
