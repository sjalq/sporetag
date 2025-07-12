#!/usr/bin/env node

/**
 * Database Connectivity Test for Cloudflare D1
 * Tests database connection and verifies schema integrity
 */

import { execSync } from 'child_process';

const DB_NAMES = ['sporetag-db', 'sporetag-db-preview', 'sporetag-db-prod'];

async function testDatabaseConnection(dbName) {
  console.log(`\n🔍 Testing connection to ${dbName}...`);
  
  try {
    // Test 1: Basic connectivity
    console.log('  ✓ Testing basic connectivity...');
    const basicTest = execSync(
      `npx wrangler d1 execute ${dbName} --command="SELECT 1 as test_connection"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    if (basicTest.includes('test_connection')) {
      console.log('  ✅ Database connection successful');
    } else {
      throw new Error('Connection test failed');
    }

    // Test 2: Schema verification
    console.log('  ✓ Verifying schema...');
    const schemaTest = execSync(
      `npx wrangler d1 execute ${dbName} --command="SELECT name FROM sqlite_master WHERE type='table' AND name='spores'"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    if (schemaTest.includes('spores')) {
      console.log('  ✅ Spores table exists');
    } else {
      console.log('  ⚠️  Spores table not found - run migrations first');
      return false;
    }

    // Test 3: Index verification
    console.log('  ✓ Verifying indexes...');
    const indexTest = execSync(
      `npx wrangler d1 execute ${dbName} --command="SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='spores'"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const expectedIndexes = ['idx_spores_location', 'idx_spores_cookie'];
    const foundIndexes = expectedIndexes.filter(idx => indexTest.includes(idx));
    
    if (foundIndexes.length === expectedIndexes.length) {
      console.log('  ✅ All indexes present');
    } else {
      console.log(`  ⚠️  Missing indexes: ${expectedIndexes.filter(idx => !foundIndexes.includes(idx)).join(', ')}`);
    }

    // Test 4: Insert/Select test
    console.log('  ✓ Testing INSERT/SELECT operations...');
    const testMessage = 'Test spore connection';
    const testCookieId = `test-${Date.now()}`;
    
    // Insert test record
    execSync(
      `npx wrangler d1 execute ${dbName} --command="INSERT INTO spores (lat, lng, message, cookie_id, ip_address) VALUES (0, 0, '${testMessage}', '${testCookieId}', 'test')"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    // Query test record
    const selectTest = execSync(
      `npx wrangler d1 execute ${dbName} --command="SELECT message FROM spores WHERE cookie_id='${testCookieId}'"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    if (selectTest.includes(testMessage)) {
      console.log('  ✅ INSERT/SELECT operations working');
    } else {
      throw new Error('INSERT/SELECT test failed');
    }
    
    // Cleanup test record
    execSync(
      `npx wrangler d1 execute ${dbName} --command="DELETE FROM spores WHERE cookie_id='${testCookieId}'"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    console.log(`✅ ${dbName} - All tests passed!`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${dbName} - Connection failed:`);
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('not found')) {
      console.log(`   💡 Database '${dbName}' doesn't exist. Run ./scripts/setup-d1.sh first.`);
    }
    
    return false;
  }
}

async function main() {
  console.log('🧪 Cloudflare D1 Database Connectivity Test');
  console.log('==========================================');
  
  // Check wrangler authentication
  try {
    execSync('npx wrangler whoami', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Wrangler authentication verified');
  } catch (error) {
    console.log('❌ Wrangler not authenticated. Run: npx wrangler login');
    process.exit(1);
  }
  
  let allPassed = true;
  
  for (const dbName of DB_NAMES) {
    const result = await testDatabaseConnection(dbName);
    allPassed = allPassed && result;
  }
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  if (allPassed) {
    console.log('🎉 All database connections successful!');
    console.log('💡 Your D1 setup is ready for development.');
    process.exit(0);
  } else {
    console.log('⚠️  Some database connections failed.');
    console.log('💡 Check the output above for specific issues.');
    console.log('💡 Make sure to run migrations if tables are missing.');
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testDatabaseConnection, main as testAllConnections };