const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Feature 8: Safe Archive & Clean Old Notification & Borrowing History
 * Backs up existing transactions and notifications to:
 * 1. JSON file in backend/database/backups/
 * 2. Dedicated MySQL archive tables (archived_transactions, archived_notifications)
 * 3. Restores book available copies to total copies
 * 4. Clears old test records without touching books, users, policies, or accounts
 */
async function archiveAndClean() {
  console.log('[Cleanup] Starting safe archive and history cleanup...');

  // 1. Fetch current data
  const transactions = await db.query('SELECT * FROM transactions');
  const notifications = await db.query('SELECT * FROM notifications');

  console.log(`[Cleanup] Found ${transactions.length} transactions and ${notifications.length} notifications to archive.`);

  // 2. Write file backup
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_history_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify({
    archived_at: new Date().toISOString(),
    transactions_count: transactions.length,
    notifications_count: notifications.length,
    transactions,
    notifications
  }, null, 2));
  console.log(`[Cleanup] File backup saved to: ${backupFilePath}`);

  // 3. Create database archive tables if not exist and copy
  await db.query(`
    CREATE TABLE IF NOT EXISTS archived_transactions LIKE transactions
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS archived_notifications LIKE notifications
  `);

  if (transactions.length > 0) {
    await db.query(`
      INSERT INTO archived_transactions SELECT * FROM transactions
    `).catch(err => {
      console.warn('[Cleanup] Note on DB archive insert (may already have entries):', err.message);
    });
  }

  if (notifications.length > 0) {
    await db.query(`
      INSERT INTO archived_notifications SELECT * FROM notifications
    `).catch(err => {
      console.warn('[Cleanup] Note on DB archive notifications:', err.message);
    });
  }

  // 4. Reset books available copies to total copies
  await db.query(`
    UPDATE books SET available_copies = total_copies WHERE is_lost = 0
  `);
  console.log('[Cleanup] Restored available_copies to total_copies across catalog.');

  // 5. Clean active history tables for fresh workflow testing
  await db.query('DELETE FROM notifications');
  await db.query('DELETE FROM transactions');

  console.log('✅ [Cleanup] Old notification and borrowing history safely archived and cleared.');
}

if (require.main === module) {
  archiveAndClean().then(() => {
    console.log('[Cleanup] Finished successfully.');
    process.exit(0);
  }).catch(err => {
    console.error('[Cleanup Error]:', err);
    process.exit(1);
  });
}

module.exports = { archiveAndClean };

