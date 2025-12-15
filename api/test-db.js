// test-db.js
const { testConnection, executeQuery } = require('./db-config2');

async function runTests() {
  console.log('🔌 Testing Supabase connection...\n');
  
  // Test 1: Basic connection
  console.log('1. Testing connection...');
  const connResult = await testConnection();
  console.log(connResult.success ? '✅ Connected!' : '❌ Failed');
  if (connResult.success) {
    console.log(`   Time: ${connResult.database_time}`);
    console.log(`   Version: ${connResult.version}`);
  }
  
  // Test 2: Create todos table if it doesn't exist
  console.log('\n2. Checking/Creating todos table...');
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        task TEXT NOT NULL,
        status TEXT DEFAULT 'Not Started',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Todos table ready');
  } catch (error) {
    console.log('ℹ️ Table already exists or error:', error.message);
  }
  
  // Test 3: Insert a test record
  console.log('\n3. Inserting test record...');
  try {
    const result = await executeQuery(
      'INSERT INTO todos (task, status) VALUES ($1, $2) RETURNING id',
      ['Test Supabase connection', 'Complete']
    );
    console.log(`✅ Inserted record with ID: ${result.rows[0].id}`);
  } catch (error) {
    console.log('⚠️ Insert failed (might need RLS policies):', error.message);
  }
  
  // Test 4: Query records
  console.log('\n4. Querying records...');
  try {
    const result = await executeQuery('SELECT * FROM todos ORDER BY id DESC LIMIT 3');
    console.log(`✅ Found ${result.rows.length} records`);
    result.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.task} (${row.status})`);
    });
  } catch (error) {
    console.log('❌ Query failed:', error.message);
  }
}

runTests().catch(console.error);
