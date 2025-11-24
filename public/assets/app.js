// app.js - All JavaScript utilities

// Password visibility toggle
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = passwordInput.parentNode.querySelector('.toggle-btn i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');

    // Upper case check
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('One uppercase letter');

    // Lower case check
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('One lowercase letter');

    // Number check
    if (/\d/.test(password)) strength += 1;
    else feedback.push('One number');

    // Special char check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    else feedback.push('One special character');

    return { strength, feedback };
}

// Update password strength visual
function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length === 0) {
        strengthFill.style.width = '0%';
        strengthFill.style.background = '#e5e7eb';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#6b7280';
        return;
    }

    const { strength, feedback } = checkPasswordStrength(password);
    const percentage = (strength / 5) * 100;

    strengthFill.style.width = percentage + '%';

    if (strength <= 2) {
        strengthFill.style.background = '#ef4444';
        strengthText.textContent = 'Weak - ' + feedback.join(', ');
        strengthText.style.color = '#ef4444';
    } else if (strength <= 4) {
        strengthFill.style.background = '#f59e0b';
        strengthText.textContent = 'Medium - ' + feedback.join(', ');
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.style.background = '#10b981';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
    }
}

// Show alert message
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;
    
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            alertDiv.classList.add('hidden');
        }, 5000);
    }
}

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

// Create HTML table from data
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
            
            if (tableName === 'clients' || tableName === 'mt5_account_names') {
                // Clients and MT5 accounts use 'active'/'inactive'
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

// Toggle state function
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

// Reload current table
function reloadCurrentTable() {
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        setTimeout(() => {
            if (tabId === 'clients') loadTable('clients');
            else if (tabId === 'eas') loadTable('eas');
            else if (tabId === 'trading') loadTable('trading_pairs');
        }, 500);
    }
}

// Load table data
async function loadTable(tableName) {
    console.log('Loading table:', tableName);
    
    const elementMap = {
        'clients': 'clientsResult',
        'eas': 'easResult', 
        'trading_pairs': 'tradingResult'
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
        
        // Special queries for joined tables
        if (tableName === 'client_eas') {
            query = `
                SELECT ce.*, c.name as client_name, ea.name as ea_name 
                FROM client_eas ce
                LEFT JOIN clients c ON ce.client_id = c.id
                LEFT JOIN eas ea ON ce.ea_id = ea.id
                ORDER BY ce.id LIMIT 20;
            `;
        } else if (tableName === 'mt5_account_names') {
            query = `
                SELECT man.*, c.name as client_name 
                FROM mt5_account_names man
                LEFT JOIN clients c ON man.client_id = c.id
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

// Run SQL query
async function runQuery(customQuery = null) {
    const sqlEditor = document.getElementById('sqlEditor');
    const resultDiv = document.getElementById('sqlResult');
    
    if (!resultDiv) return;
    
    const sql = customQuery || (sqlEditor ? sqlEditor.value : '');
    resultDiv.innerHTML = 'Running query...';
    
    try {
        const response = await fetch('/api/admin?action=data', {
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
            fetch('/api/admin?action=data', {
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

// Check authentication
function checkAuth() {
    const sessionToken = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('user');
    
    if (!sessionToken || !user) {
        window.location.href = '/login.html';
        return null;
    }
    
    return JSON.parse(user);
}

// Logout function
function logout() {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Initialize dashboard
function initializeDashboard() {
    const user = checkAuth();
    if (!user) return;
    
    console.log('Dashboard initialized for:', user.email, 'Role:', user.role);
    initializeTabs();
    refreshStats();
}

// Auto-initialize if on dashboard page
if (document.querySelector('.dashboard')) {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
}
