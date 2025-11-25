// app.js - Complete JavaScript for Capital Compassing Platform

// =============================================
// GLOBAL VARIABLES AND UTILITIES
// =============================================

let currentUser = null;
let clientData = null;

// Utility function to get CSRF token (if needed)
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

// =============================================
// AUTHENTICATION & SESSION MANAGEMENT
// =============================================

// Check authentication status
function checkAuth() {
    const sessionToken = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('user');
    
    if (!sessionToken || !user) {
        redirectToLogin();
        return null;
    }
    
    try {
        const userData = JSON.parse(user);
        currentUser = userData;
        return userData;
    } catch (error) {
        console.error('Error parsing user data:', error);
        redirectToLogin();
        return null;
    }
}

// Check admin privileges
function checkAdminAuth() {
    const user = checkAuth();
    if (!user) return null;
    
    if (user.role !== 'admin' && user.role !== 'staff') {
        window.location.href = '/client/';
        return null;
    }
    
    return user;
}

// Redirect to login
function redirectToLogin() {
    // Don't redirect if we're already on login page
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('register.html') &&
        !window.location.pathname.includes('verify-email.html')) {
        window.location.href = '/login.html';
    }
}

// Logout function
function logout() {
    const sessionToken = localStorage.getItem('sessionToken');
    
    // Call logout API if session token exists
    if (sessionToken) {
        fetch('/api/auth?action=logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_token: sessionToken })
        }).catch(error => {
            console.error('Logout API error:', error);
        });
    }
    
    // Clear local storage
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    
    // Redirect to login
    window.location.href = '/login.html';
}

// =============================================
// ALERT & NOTIFICATION SYSTEM
// =============================================

// Enhanced showAlert function with popups
function showAlert(message, type = 'error', duration = 3000) {
    // Remove any existing alerts first
    const existingAlert = document.getElementById('alertPopup');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.id = 'alertPopup';
    alertDiv.className = `alert-popup alert-${type}`;
    
    // Add icon based on type
    let icon = '❌';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';
    
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">${icon}</span>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-hide success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    // Add click to dismiss for all alerts
    alertDiv.addEventListener('click', () => {
        alertDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    });
}

// Show loading spinner
function showLoading(container, message = 'Loading...') {
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #4361ee; margin-bottom: 1rem;"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// =============================================
// NAVIGATION & LAYOUT MANAGEMENT
// =============================================

// Initialize tabs system
function initializeTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length === 0) return;
    
    navItems.forEach(item => {
        // Skip items with onclick handlers (like logout)
        if (item.getAttribute('onclick') && !item.getAttribute('data-tab')) {
            return;
        }
        
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (!tabId) return;
            
            switchTab(tabId);
        });
    });
}

// Switch to specific tab
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(nav => {
        if (nav.getAttribute('data-tab') === tabName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => {
        if (tab.id === tabName) {
            tab.classList.add('active');
            
            // Load tab-specific data
            loadTabData(tabName);
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

// Load data for specific tab
function loadTabData(tabName) {
    switch (tabName) {
        case 'overview':
            if (window.location.pathname.includes('admin')) {
                refreshStats();
            } else {
                updateClientStats();
            }
            break;
        case 'users':
            loadTable('users');
            break;
        case 'eas':
            loadTable('eas');
            break;
        case 'marketplace':
            initializeCategoryFilters();
            break;
        case 'education':
            // Future: Load education data
            break;
        case 'community':
            // Future: Load community posts
            break;
        case 'ai-studio':
            // Future: Load AI enhancements
            break;
    }
}

// Toggle mobile sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// =============================================
// TABLE & DATA MANAGEMENT
// =============================================

// Create HTML table from data
function createTableHTML(rows, tableName = '') {
    if (!rows || rows.length === 0) {
        return '<div style="text-align: center; padding: 2rem; color: #6b7280;">No data found</div>';
    }
    
    let html = '<div class="table-header">';
    html += '<h4>Results (' + rows.length + ' rows)</h4>';
    html += '</div>';
    html += '<div style="overflow-x: auto;"><table><thead><tr>';
    
    // Header - add Actions column if table has state
    const hasState = rows[0].state !== undefined;
    const hasId = rows[0].id !== undefined;
    
    Object.keys(rows[0]).forEach(key => {
        if (key !== 'password_hash' && key !== 'verification_token') { // Skip sensitive fields
            html += '<th>' + formatColumnName(key) + '</th>';
        }
    });
    
    if (hasState && tableName && hasId) {
        html += '<th>Actions</th>';
    }
    html += '</tr></thead><tbody>';
    
    // Rows
    rows.forEach(row => {
        html += '<tr>';
        Object.entries(row).forEach(([key, value]) => {
            if (key !== 'password_hash' && key !== 'verification_token') { // Skip sensitive fields
                html += '<td>' + formatCellValue(value, key) + '</td>';
            }
        });
        
        // Add toggle button if table has state and ID
        if (hasState && tableName && hasId) {
            const isActive = isItemActive(row.state, tableName);
            const newState = isActive ? getInactiveState(tableName) : getActiveState(tableName);
            const buttonText = isActive ? getDisableText(tableName) : getEnableText(tableName);
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
    
    html += '</tbody></table></div>';
    return html;
}

// Helper functions for table formatting
function formatColumnName(key) {
    const names = {
        'id': 'ID',
        'name': 'Name',
        'email': 'Email',
        'role': 'Role',
        'state': 'Status',
        'created_at': 'Created',
        'updated_at': 'Updated',
        'mt5_name': 'MT5 Name',
        'account_number': 'Account #',
        'balance': 'Balance',
        'equity': 'Equity',
        'margin': 'Margin',
        'free_margin': 'Free Margin',
        'leverage': 'Leverage'
    };
    return names[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatCellValue(value, key) {
    if (value === null || value === undefined) return '<span style="color: #9ca3af;">NULL</span>';
    
    if (key === 'state') {
        const color = value === 'active' || value === 'enabled' ? '#10b981' : '#ef4444';
        return `<span style="color: ${color}; font-weight: 600;">${value}</span>`;
    }
    
    if (key === 'created_at' || key === 'updated_at') {
        return new Date(value).toLocaleString();
    }
    
    if (key === 'balance' || key === 'equity' || key === 'margin' || key === 'free_margin') {
        return typeof value === 'number' ? '$' + value.toFixed(2) : value;
    }
    
    return value;
}

function isItemActive(state, tableName) {
    if (tableName === 'users' || tableName === 'mt5_account_names') {
        return state === 'active';
    }
    return state === 'enabled';
}

function getActiveState(tableName) {
    if (tableName === 'users' || tableName === 'mt5_account_names') {
        return 'active';
    }
    return 'enabled';
}

function getInactiveState(tableName) {
    if (tableName === 'users' || tableName === 'mt5_account_names') {
        return 'inactive';
    }
    return 'disabled';
}

function getEnableText(tableName) {
    if (tableName === 'users' || tableName === 'mt5_account_names') {
        return 'Activate';
    }
    return 'Enable';
}

function getDisableText(tableName) {
    if (tableName === 'users' || tableName === 'mt5_account_names') {
        return 'Deactivate';
    }
    return 'Disable';
}

// Toggle state function
async function toggleState(tableName, id, newState) {
    if (!confirm(`Are you sure you want to ${newState === 'active' || newState === 'enabled' ? 'enable' : 'disable'} this item?`)) {
        return;
    }
    
    showAlert(`Updating ${tableName} #${id}...`, 'info');
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: `UPDATE ${tableName} SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
                params: [newState, id]
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ ${tableName} #${id} updated successfully!`, 'success');
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
            if (tabId === 'users') loadTable('users');
            else if (tabId === 'eas') loadTable('eas');
            else if (tabId === 'trading') loadTable('trading_pairs');
            else if (tabId === 'products') loadTable('products');
        }, 500);
    }
}

// Load table data
async function loadTable(tableName) {
    const elementMap = {
        'users': 'usersResult',
        'eas': 'easResult', 
        'trading_pairs': 'tradingResult',
        'products': 'productsResult',
        'accounts': 'accountsResult',
        'client_eas': 'easResult'
    };
    
    const elementId = elementMap[tableName];
    const resultDiv = document.getElementById(elementId);
    
    if (!resultDiv) {
        console.error('Element not found:', elementId);
        return;
    }
    
    showLoading(resultDiv, `Loading ${tableName.replace(/_/g, ' ')}...`);
    
    try {
        let query = `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 50;`;
        let params = [];
        
        // Special queries for joined tables
        if (tableName === 'client_eas') {
            query = `
                SELECT ce.*, u.name as user_name, ea.name as ea_name 
                FROM client_eas ce
                LEFT JOIN users u ON ce.client_id = u.id
                LEFT JOIN eas ea ON ce.ea_id = ea.id
                ORDER BY ce.id DESC LIMIT 50;
            `;
        } else if (tableName === 'mt5_account_names') {
            query = `
                SELECT man.*, u.name as user_name 
                FROM mt5_account_names man
                LEFT JOIN users u ON man.user_id = u.id
                ORDER BY man.id DESC LIMIT 50;
            `;
        } else if (tableName === 'ea_pair_assignments') {
            query = `
                SELECT epa.*, ea.name as ea_name, tp.pair as pair_name 
                FROM ea_pair_assignments epa
                LEFT JOIN eas ea ON epa.ea_id = ea.id
                LEFT JOIN trading_pairs tp ON epa.pair_id = tp.id
                ORDER BY epa.id DESC LIMIT 50;
            `;
        } else if (tableName === 'users') {
            query = `
                SELECT id, name, email, role, state, created_at, last_login 
                FROM users 
                ORDER BY id DESC LIMIT 50;
            `;
        } else if (tableName === 'accounts') {
            // For client dashboard - load user's accounts
            if (clientData) {
                query = `
                    SELECT man.*, ad.balance, ad.equity, ad.margin, ad.free_margin 
                    FROM mt5_account_names man 
                    LEFT JOIN account_details ad ON man.id = ad.mt5_name_id 
                    WHERE man.user_id = $1 
                    ORDER BY man.created_at DESC
                `;
                params = [clientData.id];
            }
        }
        
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: query, params: params })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.rows.length > 0) {
                resultDiv.innerHTML = createTableHTML(data.rows, tableName);
            } else {
                resultDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No data found</div>';
            }
        } else {
            resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Error: ' + data.error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Request failed: ' + error.message + '</div>';
    }
}

// Run SQL query
async function runQuery(customQuery = null) {
    const sqlEditor = document.getElementById('sqlEditor');
    const resultDiv = document.getElementById('sqlResult');
    
    if (!resultDiv) return;
    
    const sql = customQuery || (sqlEditor ? sqlEditor.value : '');
    
    if (!sql.trim()) {
        showAlert('Please enter a SQL query', 'warning');
        return;
    }
    
    showLoading(resultDiv, 'Executing query...');
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.rows && data.rows.length > 0) {
                resultDiv.innerHTML = createTableHTML(data.rows);
            } else {
                resultDiv.innerHTML = '<div style="color: #10b981; text-align: center; padding: 1rem;">✅ Query executed successfully. Rows affected: ' + (data.rowCount || 0) + '</div>';
            }
        } else {
            resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Error: ' + data.error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Request failed: ' + error.message + '</div>';
    }
}

// =============================================
// CLIENT DASHBOARD FUNCTIONS
// =============================================

// Initialize client dashboard
function initializeClientDashboard() {
    const user = checkAuth();
    if (!user) return;

    // Update welcome message
    const welcomeElement = document.getElementById('userWelcome');
    if (welcomeElement) {
        welcomeElement.innerHTML = `<div>Welcome, <strong>${user.name}</strong> <span style="color: #6b7280; font-size: 0.9rem;">(${user.role})</span></div>`;
    }

    clientData = user;
    initializeTabs();
    initializeCategoryFilters();
    loadClientData();
}

// Load all client data
async function loadClientData() {
    await loadClientAccounts();
    await loadClientEAs();
    await loadClientProfile();
    updateClientStats();
}

// Load client accounts
async function loadClientAccounts() {
    const resultDiv = document.getElementById('accountsResult');
    if (!resultDiv) return;
    
    showLoading(resultDiv, 'Loading your accounts...');
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: `SELECT man.*, ad.balance, ad.equity, ad.margin, ad.free_margin, ad.leverage 
                      FROM mt5_account_names man 
                      LEFT JOIN account_details ad ON man.id = ad.mt5_name_id 
                      WHERE man.user_id = $1 
                      ORDER BY man.created_at DESC`,
                params: [clientData.id]
            })
        });

        const data = await response.json();
        
        if (data.success) {
            if (data.rows.length > 0) {
                let html = '<div class="table-header"><h4>Your MT5 Accounts (' + data.rows.length + ')</h4></div>';
                html += '<div style="overflow-x: auto;"><table><thead><tr>';
                html += '<th>MT5 Name</th><th>Status</th><th>Balance</th><th>Equity</th><th>Free Margin</th><th>Leverage</th><th>Created</th>';
                html += '</tr></thead><tbody>';
                
                data.rows.forEach(row => {
                    const statusColor = row.state === 'active' ? '#10b981' : '#ef4444';
                    html += '<tr>';
                    html += '<td><strong>' + row.mt5_name + '</strong></td>';
                    html += '<td><span style="color: ' + statusColor + '; font-weight: 600;">' + row.state + '</span></td>';
                    html += '<td>$' + (row.balance ? Number(row.balance).toFixed(2) : '0.00') + '</td>';
                    html += '<td>$' + (row.equity ? Number(row.equity).toFixed(2) : '0.00') + '</td>';
                    html += '<td>$' + (row.free_margin ? Number(row.free_margin).toFixed(2) : '0.00') + '</td>';
                    html += '<td>' + (row.leverage || 'N/A') + '</td>';
                    html += '<td>' + new Date(row.created_at).toLocaleDateString() + '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No MT5 accounts found. Contact support to add your trading accounts.</div>';
            }
        } else {
            resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Error loading accounts: ' + data.error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Failed to load accounts: ' + error.message + '</div>';
    }
}

// Load client EAs
async function loadClientEAs() {
    const resultDiv = document.getElementById('easResult');
    if (!resultDiv) return;
    
    showLoading(resultDiv, 'Loading your Expert Advisors...');
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: `SELECT ce.*, ea.name as ea_name, ea.version, ea.description, ea.state as ea_status 
                      FROM client_eas ce 
                      JOIN eas ea ON ce.ea_id = ea.id 
                      WHERE ce.client_id = $1 
                      ORDER BY ea.name`,
                params: [clientData.id]
            })
        });

        const data = await response.json();
        
        if (data.success) {
            if (data.rows.length > 0) {
                let html = '<div class="table-header"><h4>Your Expert Advisors (' + data.rows.length + ')</h4></div>';
                html += '<div style="overflow-x: auto;"><table><thead><tr>';
                html += '<th>EA Name</th><th>Version</th><th>Your Status</th><th>EA Status</th><th>Description</th>';
                html += '</tr></thead><tbody>';
                
                data.rows.forEach(row => {
                    const yourStatusColor = row.state === 'enabled' ? '#10b981' : '#ef4444';
                    const eaStatusColor = row.ea_status === 'enabled' ? '#10b981' : '#ef4444';
                    
                    html += '<tr>';
                    html += '<td><strong>' + row.ea_name + '</strong></td>';
                    html += '<td>' + (row.version || 'N/A') + '</td>';
                    html += '<td><span style="color: ' + yourStatusColor + '; font-weight: 600;">' + row.state + '</span></td>';
                    html += '<td><span style="color: ' + eaStatusColor + ';">' + row.ea_status + '</span></td>';
                    html += '<td>' + (row.description || 'No description available') + '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No Expert Advisors assigned. Browse the marketplace to get started!</div>';
            }
        } else {
            resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Error loading EAs: ' + data.error + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Failed to load EAs: ' + error.message + '</div>';
    }
}

// Load client profile
async function loadClientProfile() {
    const profileDiv = document.getElementById('profileInfo');
    if (!profileDiv) return;
    
    try {
        const response = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: "SELECT * FROM users WHERE id = $1",
                params: [clientData.id]
            })
        });

        const data = await response.json();
        
        if (data.success && data.rows.length > 0) {
            const user = data.rows[0];
            const statusColor = user.state === 'active' ? '#10b981' : '#ef4444';
            const verifiedColor = user.is_verified ? '#10b981' : '#f59e0b';
            
            profileDiv.innerHTML = 
                '<div style="display: grid; gap: 1.5rem; max-width: 500px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">' +
                '<div><strong style="font-size: 1.2rem;">' + user.name + '</strong><br><span style="color: #6b7280;">' + user.email + '</span></div>' +
                '<div style="text-align: right;"><span style="background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem; text-transform: capitalize;">' + user.role + '</span></div>' +
                '</div>' +
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">' +
                '<div><strong>Phone:</strong><br><span style="color: #6b7280;">' + (user.phone || 'Not provided') + '</span></div>' +
                '<div><strong>Member Since:</strong><br><span style="color: #6b7280;">' + new Date(user.created_at).toLocaleDateString() + '</span></div>' +
                '<div><strong>Account Status:</strong><br><span style="color: ' + statusColor + '; font-weight: 600;">' + user.state + '</span></div>' +
                '<div><strong>Email Verified:</strong><br><span style="color: ' + verifiedColor + '; font-weight: 600;">' + (user.is_verified ? 'Verified' : 'Pending') + '</span></div>' +
                '</div>' +
                '<div style="margin-top: 1rem;">' +
                '<button class="btn btn-primary" onclick="editProfile()" style="width: auto; margin-right: 0.5rem;"><i class="fas fa-edit"></i> Edit Profile</button>' +
                '<button class="btn btn-secondary" onclick="changePassword()" style="width: auto;"><i class="fas fa-key"></i> Change Password</button>' +
                '</div>' +
                '</div>';
        }
    } catch (error) {
        profileDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">❌ Failed to load profile information</div>';
    }
}

// Update client stats
async function updateClientStats() {
    try {
        // Get account count
        const accountsResponse = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: "SELECT COUNT(*) as count FROM mt5_account_names WHERE user_id = $1 AND state = 'active'",
                params: [clientData.id]
            })
        });
        
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
            const totalAccounts = document.getElementById('totalAccounts');
            if (totalAccounts) totalAccounts.textContent = accountsData.rows[0].count;
        }

        // Get active EAs count
        const easResponse = await fetch('/api/admin?action=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sql: "SELECT COUNT(*) as count FROM client_eas WHERE client_id = $1 AND state = 'enabled'",
                params: [clientData.id]
            })
        });
        
        const easData = await easResponse.json();
        if (easData.success) {
            const activeEAs = document.getElementById('activeEAs');
            if (activeEAs) activeEAs.textContent = easData.rows[0].count;
        }

        // Update placeholder stats (these would come from real data in production)
        const weeklyProfit = document.getElementById('weeklyProfit');
        const winRate = document.getElementById('accountStatus');
        
        if (weeklyProfit) weeklyProfit.textContent = '$245.50';
        if (winRate) winRate.textContent = '72%';

    } catch (error) {
        console.error('Error updating client stats:', error);
    }
}

// =============================================
// MARKETPLACE FUNCTIONS
// =============================================

// Initialize category filters
function initializeCategoryFilters() {
    const filters = document.querySelectorAll('.btn-filter');
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            filters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            filterEAs(category);
        });
    });
}

// Filter EAs by category
function filterEAs(category) {
    const eaCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;
    
    eaCards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
            visibleCount++;
        } else {
            const hasCategory = card.querySelector('.product-badge.' + category);
            if (hasCategory) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        }
    });
    
    // Show message if no products match filter
    const gridContainer = document.getElementById('eaGrid');
    let noResultsMsg = gridContainer.querySelector('.no-results');
    
    if (visibleCount === 0) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results';
            noResultsMsg.style.gridColumn = '1 / -1';
            noResultsMsg.style.textAlign = 'center';
            noResultsMsg.style.padding = '3rem';
            noResultsMsg.style.color = '#6b7280';
            noResultsMsg.innerHTML = `
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
            `;
            gridContainer.appendChild(noResultsMsg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Search EAs
function searchEAs() {
    const query = document.getElementById('eaSearch').value.trim().toLowerCase();
    const activeFilter = document.querySelector('.btn-filter.active');
    const currentCategory = activeFilter ? activeFilter.getAttribute('data-category') : 'all';
    
    const eaCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;
    
    eaCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const description = card.querySelector('.product-description').textContent.toLowerCase();
        const hasCategory = currentCategory === 'all' || card.querySelector('.product-badge.' + currentCategory);
        const matchesSearch = !query || title.includes(query) || description.includes(query);
        
        if (hasCategory && matchesSearch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    if (query && visibleCount === 0) {
        showAlert(`No products found for "${query}"`, 'info');
    }
}

// View EA details
function viewEADetails(eaId) {
    showAlert(`Loading details for EA #${eaId}...`, 'info');
    // Future: Open modal with detailed EA information, backtest results, etc.
}

// Download EA
function downloadEA(eaId) {
    showAlert(`Preparing download for EA #${eaId}...`, 'info');
    // Future: Trigger download process, check permissions, etc.
    
    // Simulate download
    setTimeout(() => {
        showAlert(`✅ EA #${eaId} downloaded successfully! Check your downloads folder.`, 'success');
    }, 1500);
}

// Add to cart
function addToCart(eaId) {
    // Get current cart or initialize empty array
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if item already in cart
    if (cart.includes(eaId)) {
        showAlert('This EA is already in your cart!', 'warning');
        return;
    }
    
    // Add to cart
    cart.push(eaId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    showAlert('✅ EA added to cart!', 'success');
    
    // Update cart badge if exists
    updateCartBadge();
}

// Update cart badge
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cartBadge.textContent = cart.length;
        cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
}

// =============================================
// EDUCATION FUNCTIONS
// =============================================

function loadCategory(category) {
    showAlert(`Loading ${category} courses...`, 'info');
    // Future: Filter and load courses by category
}

function enrollCourse(courseId) {
    showAlert(`Enrolling in course #${courseId}...`, 'info');
    // Future: Handle course enrollment, payment, etc.
}

// =============================================
// COMMUNITY FUNCTIONS
// =============================================

function showCreatePostModal() {
    showAlert('Create post feature coming soon!', 'info');
    // Future: Show create post modal with rich text editor
}

// =============================================
// AI STUDIO FUNCTIONS
// =============================================

function analyzeWithAI() {
    const goals = document.getElementById('enhancementGoals').value.trim();
    const currentSettings = document.getElementById('currentSettings').value.trim();
    
    if (!goals) {
        showAlert('Please enter enhancement goals', 'warning');
        return;
    }
    
    if (!currentSettings) {
        showAlert('Please provide your current EA settings', 'warning');
        return;
    }
    
    showAlert('🤖 AI analysis started... This may take a few moments.', 'info');
    
    // Simulate AI analysis (replace with actual API call)
    setTimeout(() => {
        showAlert('✅ AI analysis complete! Check the enhancement history for suggestions.', 'success');
        
        // Add to enhancement history (in a real app, this would come from the API)
        const historyContainer = document.querySelector('.enhancement-history');
        if (historyContainer) {
            const newEnhancement = document.createElement('div');
            newEnhancement.className = 'enhancement-item';
            newEnhancement.innerHTML = `
                <div class="enhancement-header">
                    <strong>New EA Enhancement</strong>
                    <span class="enhancement-date">Just now</span>
                </div>
                <p><strong>Goal:</strong> ${goals.substring(0, 100)}${goals.length > 100 ? '...' : ''}</p>
                <div class="enhancement-result">
                    <strong>AI Suggestions:</strong>
                    <ul>
                        <li>Optimized risk parameters based on current market volatility</li>
                        <li>Suggested dynamic position sizing algorithm</li>
                        <li>Recommended improved exit strategy for better risk-reward ratio</li>
                    </ul>
                </div>
            `;
            historyContainer.insertBefore(newEnhancement, historyContainer.firstChild);
        }
    }, 3000);
}

function analyzeMarket() {
    const symbol = document.getElementById('analysisSymbol').value;
    const timeframe = document.getElementById('analysisTimeframe').value;
    const focus = document.getElementById('analysisFocus').value;
    
    showAlert(`🔍 Analyzing ${symbol} on ${timeframe} timeframe...`, 'info');
    
    // Simulate market analysis (replace with actual API call)
    setTimeout(() => {
        showAlert(`✅ ${symbol} analysis complete!`, 'success');
    }, 2000);
}

function buyAICredits() {
    showAlert('Redirecting to credit purchase...', 'info');
    // Future: Open payment modal for AI credits
}

// =============================================
// PROFILE MANAGEMENT
// =============================================

function editProfile() {
    showAlert('Edit profile feature coming soon!', 'info');
    // Future: Open profile edit modal
}

function changePassword() {
    showAlert('Change password feature coming soon!', 'info');
    // Future: Open password change modal
}

// =============================================
// ADMIN DASHBOARD FUNCTIONS
// =============================================

// Initialize admin dashboard
function initializeAdminDashboard() {
    const user = checkAdminAuth();
    if (!user) return;
    
    console.log('Admin dashboard initialized for:', user.email, 'Role:', user.role);
    initializeTabs();
    refreshStats();
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
            "SELECT COUNT(*) as count FROM users WHERE role = 'client'",
            "SELECT COUNT(*) as count FROM eas WHERE state = 'enabled'",
            "SELECT COUNT(*) as count FROM trading_pairs WHERE state = 'enabled'",
            "SELECT COUNT(*) as count FROM account_details",
            "SELECT COUNT(*) as count FROM products WHERE status = 'active'",
            "SELECT COUNT(*) as count FROM courses WHERE status = 'active'"
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
        showAlert('Failed to load dashboard statistics', 'error');
    }
}

// Product management functions
function showAddProductModal() {
    showAlert('Add product feature coming soon!', 'info');
}

function showAddCourseModal() {
    showAlert('Add course feature coming soon!', 'info');
}

function loadRevenueData() {
    showAlert('Revenue data refreshed!', 'success');
}

function loadAnalytics() {
    showAlert('Analytics data refreshed!', 'success');
}

// =============================================
// INITIALIZATION
// =============================================

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    // Update cart badge on all pages
    updateCartBadge();
    
    // Initialize based on current page
    if (document.querySelector('.dashboard')) {
        if (window.location.pathname.includes('/admin/')) {
            initializeAdminDashboard();
        } else if (window.location.pathname.includes('/client/')) {
            initializeClientDashboard();
        }
    }
    
    // Add global error handler
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
    });
});

// Export functions for global access (if needed)
window.app = {
    showAlert,
    switchTab,
    loadTable,
    runQuery,
    logout,
    checkAuth
};
