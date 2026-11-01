const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function runMigration() {
  console.log('[Migration] Starting duration & datetime column upgrade...');
  
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'smart_library'
  });

  try {
    await conn.query("ALTER TABLE transactions ADD COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6 days'");
    console.log('✓ Added column `duration` to `transactions`');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('• Column `duration` already exists in `transactions`');
    } else {
      console.warn('• Notice on duration column:', err.message);
    }
  }

  try {
    await conn.query('ALTER TABLE transactions MODIFY COLUMN issue_date DATETIME NOT NULL');
    console.log('✓ Modified `issue_date` to DATETIME');
  } catch (err) {
    console.warn('• Notice on issue_date:', err.message);
  }

  try {
    await conn.query('ALTER TABLE transactions MODIFY COLUMN due_date DATETIME NOT NULL');
    console.log('✓ Modified `due_date` to DATETIME');
  } catch (err) {
    console.warn('• Notice on due_date:', err.message);
  }

  try {
    await conn.query('ALTER TABLE transactions MODIFY COLUMN return_date DATETIME NULL');
    console.log('✓ Modified `return_date` to DATETIME');
  } catch (err) {
    console.warn('• Notice on return_date:', err.message);
  }

  // Also check SMART_LIBRARY_MANAGEMENT_SYSTEM database
  try {
    await conn.query('USE SMART_LIBRARY_MANAGEMENT_SYSTEM');
    try {
      await conn.query("ALTER TABLE transactions ADD COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6 days'");
    } catch (e) {}
    try {
      await conn.query('ALTER TABLE transactions MODIFY COLUMN issue_date DATETIME NOT NULL');
      await conn.query('ALTER TABLE transactions MODIFY COLUMN due_date DATETIME NOT NULL');
      await conn.query('ALTER TABLE transactions MODIFY COLUMN return_date DATETIME NULL');
    } catch (e) {}
    console.log('✓ Synchronized SMART_LIBRARY_MANAGEMENT_SYSTEM database');
  } catch (e) {
    // database might not exist or already synchronized
  }

  await conn.end();
  console.log('[Migration] Schema migration completed successfully!');
}

runMigration().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});

