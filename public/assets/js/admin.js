// Load table data - FIXED VERSION
async function loadTable(tableName) {
    const elementId = tableName.replace('_', '') + 'Result';
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
