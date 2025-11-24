// Toggle state function - UPDATED FOR NEW SCHEMA
async function toggleState(tableName, id, newState) {
    console.log(`Toggling ${tableName} ID ${id} to ${newState}`);
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: `UPDATE ${tableName} SET state = $1 WHERE id = $2`,
                params: [newState, id]
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ ${tableName} ID ${id} ${newState} successfully!`, 'success');
            // Reload current table
            reloadCurrentTable();
        } else {
            showAlert(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert(`❌ Request failed: ${error.message}`, 'error');
    }
}

// Reload current table - UPDATED
function reloadCurrentTable() {
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        setTimeout(() => {
            if (tabId === 'users') loadTable('users');
            else if (tabId === 'eas') loadTable('eas');
            else if (tabId === 'trading') loadTable('trading_pairs');
        }, 500);
    }
}

// Create HTML table from data - UPDATED FOR STATE BUTTONS
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
            // Determine correct state values for each table type
            let isActive, newState, buttonText, buttonClass;
            
            if (tableName === 'users' || tableName === 'mt5_account_names') {
                // Users and MT5 accounts use 'active'/'inactive'
                isActive = row.state === 'active';
                newState = isActive ? 'inactive' : 'active';
                buttonText = isActive ? 'Deactivate' : 'Activate';
                buttonClass = isActive ? 'btn-danger' : 'btn-success';
            } else {
                // Other tables use 'enabled'/'disabled'
                isActive = row.state === 'enabled';
                newState = isActive ? 'disabled' : 'enabled';
                buttonText = isActive ? 'Disable' : 'Enable';
                buttonClass = isActive ? 'btn-danger' : 'btn-success';
            }
            
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

// Load table data - UPDATED FOR NEW SCHEMA
async function loadTable(tableName) {
    console.log('Loading table:', tableName);
    
    const elementMap = {
        'users': 'usersResult',
        'eas': 'easResult', 
        'trading_pairs': 'tradingResult',
        'clients': 'usersResult' // Map old clients to users
    };
    
    const elementId = elementMap[tableName];
    const resultDiv = document.getElementById(elementId);
    
    if (!resultDiv) {
        console.error('Element not found:', elementId);
        return;
    }
    
    resultDiv.innerHTML = 'Loading...';
    
    try {
        let query = `SELECT * FROM ${tableName} ORDER BY id LIMIT 20;`;
        
        // Special queries for joined tables - UPDATED
        if (tableName === 'client_eas') {
            query = `
                SELECT ce.*, u.name as user_name, ea.name as ea_name 
                FROM client_eas ce
                LEFT JOIN users u ON ce.client_id = u.id
                LEFT JOIN eas ea ON ce.ea_id = ea.id
                ORDER BY ce.id LIMIT 20;
            `;
        } else if (tableName === 'mt5_account_names') {
            query = `
                SELECT man.*, u.name as user_name 
                FROM mt5_account_names man
                LEFT JOIN users u ON man.user_id = u.id
                ORDER BY man.id LIMIT 20;
            `;
        } else if (tableName === 'ea_pair_assignments') {
            query = `
                SELECT epa.*, ea.name as ea_name, tp.pair as pair_name 
                FROM ea_pair_assignments epa
                LEFT JOIN eas ea ON epa.ea_id = ea.id
                LEFT JOIN trading_pairs tp ON epa.pair_id = tp.id
                ORDER BY epa.id LIMIT 20;
            `;
        } else if (tableName === 'users') {
            query = `
                SELECT id, name, email, role, state, created_at 
                FROM users 
                ORDER BY id LIMIT 20;
            `;
        }
        
        const response = await fetch('/api/admin?action=data', {
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
