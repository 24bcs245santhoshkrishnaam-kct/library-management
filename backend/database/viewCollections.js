/**
 * MongoDB Collections Viewer for KCT AI Smart Library
 * 
 * Usage:
 *   node backend/database/viewCollections.js                  # View summary of all collections & counts
 *   node backend/database/viewCollections.js users            # View documents in 'users'
 *   node backend/database/viewCollections.js books            # View documents in 'books' (first 10)
 *   node backend/database/viewCollections.js transactions     # View borrowing transactions
 *   node backend/database/viewCollections.js notifications    # View notifications & reminders
 *   node backend/database/viewCollections.js policies         # View system policies
 *   node backend/database/viewCollections.js audit_logs       # View audit logs
 *   node backend/database/viewCollections.js books --search "Python" # Search by keyword
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function main() {
  const args = process.argv.slice(2);
  const targetCollection = args[0] && !args[0].startsWith('--') ? args[0].toLowerCase() : null;

  // Search keyword if passed via --search <keyword>
  let searchKeyword = null;
  const searchIdx = args.indexOf('--search');
  if (searchIdx !== -1 && args[searchIdx + 1]) {
    searchKeyword = args[searchIdx + 1];
  }

  // Limit if passed via --limit <num>
  let limit = 10;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10) || 10;
  }

  console.log('\n================================================================');
  console.log('       KCT AI SMART LIBRARY — MONGODB COLLECTIONS VIEWER        ');
  console.log('================================================================\n');

  await db.testConnection();
  await db.initTables();
  const mongoDb = db.getDb();

  if (!mongoDb) {
    console.error('❌ Failed to connect to MongoDB.');
    process.exit(1);
  }

  const collections = ['users', 'books', 'transactions', 'notifications', 'policies', 'audit_logs', '_counters'];

  if (!targetCollection) {
    // Mode 1: Summary of all collections
    console.log('📊 DATABASE COLLECTIONS SUMMARY:');
    console.log('----------------------------------------------------------------');
    console.log(
      'Collection'.padEnd(18) +
      'Document Count'.padEnd(18) +
      'Sample Fields'
    );
    console.log('----------------------------------------------------------------');

    for (const name of collections) {
      const col = mongoDb.collection(name);
      const count = await col.countDocuments();
      const sample = await col.findOne({});
      const fields = sample ? Object.keys(sample).filter(k => k !== '_id').slice(0, 5).join(', ') : 'Empty';
      console.log(
        name.padEnd(18) +
        String(count).padEnd(18) +
        fields
      );
    }

    console.log('----------------------------------------------------------------\n');
    console.log('💡 Quick Commands to inspect specific collections:');
    console.log('   node backend/database/viewCollections.js users');
    console.log('   node backend/database/viewCollections.js books');
    console.log('   node backend/database/viewCollections.js books --search "Machine Learning"');
    console.log('   node backend/database/viewCollections.js transactions');
    console.log('   node backend/database/viewCollections.js notifications');
    console.log('   node backend/database/viewCollections.js policies');
    console.log('   node backend/database/viewCollections.js audit_logs\n');

    process.exit(0);
  }

  // Mode 2: Detailed view of a specific collection
  if (!collections.includes(targetCollection)) {
    console.error(`❌ Collection "${targetCollection}" not found.`);
    console.log(`Available collections: ${collections.join(', ')}`);
    process.exit(1);
  }

  const col = mongoDb.collection(targetCollection);
  const totalCount = await col.countDocuments();

  let filter = {};
  if (searchKeyword) {
    if (targetCollection === 'books') {
      filter = {
        $or: [
          { title: { $regex: searchKeyword, $options: 'i' } },
          { author: { $regex: searchKeyword, $options: 'i' } },
          { category: { $regex: searchKeyword, $options: 'i' } },
          { department: { $regex: searchKeyword, $options: 'i' } }
        ]
      };
    } else if (targetCollection === 'users') {
      filter = {
        $or: [
          { name: { $regex: searchKeyword, $options: 'i' } },
          { email: { $regex: searchKeyword, $options: 'i' } },
          { role: { $regex: searchKeyword, $options: 'i' } }
        ]
      };
    }
  }

  const cursor = col.find(filter).sort({ id: 1 }).limit(limit);
  const docs = await cursor.toArray();

  console.log(`📂 COLLECTION: "${targetCollection}"`);
  console.log(`Total records in collection: ${totalCount}`);
  if (searchKeyword) {
    console.log(`Filter: Matching "${searchKeyword}" (${docs.length} shown)`);
  } else {
    console.log(`Showing first ${docs.length} of ${totalCount} documents:`);
  }
  console.log('----------------------------------------------------------------');

  // Format display based on collection type
  if (targetCollection === 'users') {
    console.table(docs.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Department: u.department,
      Status: u.account_status
    })));
  } else if (targetCollection === 'books') {
    console.table(docs.map(b => ({
      ID: b.id,
      Title: b.title ? (b.title.length > 35 ? b.title.substring(0, 32) + '...' : b.title) : 'N/A',
      Author: b.author ? (b.author.length > 20 ? b.author.substring(0, 17) + '...' : b.author) : 'N/A',
      Category: b.category,
      Department: b.department,
      Available: `${b.available_copies}/${b.total_copies}`
    })));
  } else if (targetCollection === 'transactions') {
    console.table(docs.map(t => ({
      TxID: t.id,
      BookID: t.book_id,
      UserID: t.user_id,
      Status: t.status,
      Duration: t.duration,
      DueDate: t.due_date ? new Date(t.due_date).toLocaleString() : 'N/A',
      SMSCount: t.sms_count || 0
    })));
  } else if (targetCollection === 'notifications') {
    console.table(docs.map(n => ({
      ID: n.id,
      UserID: n.user_id,
      Type: n.type,
      Recipient: n.recipient,
      Title: n.title,
      Status: n.status,
      IsRead: Boolean(n.is_read)
    })));
  } else if (targetCollection === 'policies') {
    console.table(docs.map(p => ({
      Key: p.policy_key,
      Value: p.policy_value,
      Description: p.description
    })));
  } else {
    console.log(JSON.stringify(docs, null, 2));
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`✅ Inspection of collection "${targetCollection}" complete.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error viewing collections:', err);
  process.exit(1);
});
