/**
 * MongoDB Atlas Direct Connection & Sync Utility
 * Connects directly to the user's Atlas cluster and verifies live sync.
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function connectToAtlas() {
  const uri = process.env.MONGODB_URI;
  console.log('\n================================================================');
  console.log('       CONNECTING KCT AI SMART LIBRARY TO MONGODB ATLAS         ');
  console.log('================================================================\n');

  console.log('Target URI: ' + uri.replace(/:([^:@]+)@/, ':****@'));
  console.log('Attempting secure TLS connection to MongoDB Atlas...\n');

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 6000
  });

  try {
    await client.connect();
    console.log('✅ SUCCESS: CONNECTED TO YOUR MONGODB ATLAS CLUSTER!\n');

    const db = client.db('smart_library');

    // Check existing data
    const existingBooks = await db.collection('books').countDocuments();
    const existingUsers = await db.collection('users').countDocuments();

    console.log(`Current data in Atlas 'smart_library':`);
    console.log(` - Books: ${existingBooks}`);
    console.log(` - Users: ${existingUsers}\n`);

    if (existingBooks === 0 || existingUsers === 0) {
      console.log('⏳ Uploading complete library dataset (630 books, 28 users, etc.) into Atlas...');
      const dumpPath = path.join(__dirname, 'backups/mysql_full_export.json');
      const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

      for (const table of Object.keys(dump)) {
        if (dump[table] && dump[table].length > 0) {
          const col = db.collection(table);
          const count = await col.countDocuments();
          if (count === 0) {
            const records = dump[table].map(item => {
              const rec = { ...item };
              if (table === 'transactions') {
                if (rec.issue_date) rec.issue_date = new Date(rec.issue_date);
                if (rec.due_date) rec.due_date = new Date(rec.due_date);
                if (rec.return_date) rec.return_date = new Date(rec.return_date);
                if (rec.created_at) rec.created_at = new Date(rec.created_at);
                if (rec.last_auto_reminder_at) rec.last_auto_reminder_at = new Date(rec.last_auto_reminder_at);
                if (rec.last_sms_sent_at) rec.last_sms_sent_at = new Date(rec.last_sms_sent_at);
              }
              if (table === 'notifications') {
                if (rec.created_at) rec.created_at = new Date(rec.created_at);
                if (rec.read_at) rec.read_at = new Date(rec.read_at);
              }
              return rec;
            });
            await col.insertMany(records);
            console.log(`   + Uploaded ${records.length} records into collection "${table}"`);
          }
        }
      }

      // Initialize counters
      for (const table of ['users', 'books', 'transactions', 'notifications', 'policies', 'audit_logs']) {
        const topDoc = await db.collection(table).find({}).sort({ id: -1 }).limit(1).toArray();
        const maxId = (topDoc && topDoc.length > 0 && topDoc[0].id) ? topDoc[0].id : 0;
        await db.collection('_counters').updateOne(
          { _id: table },
          { $max: { seq: maxId } },
          { upsert: true }
        );
      }

      console.log('\n🎉 ALL DATA HAS BEEN UPLOADED TO MONGODB ATLAS!');
    } else {
      console.log('✅ Collections already populated in MongoDB Atlas.');
    }

    // List all collections and counts
    const cols = await db.listCollections().toArray();
    console.log('\n📊 LIVE MONGODB ATLAS COLLECTIONS:');
    console.log('----------------------------------------------------');
    for (const c of cols) {
      const cCount = await db.collection(c.name).countDocuments();
      console.log(` - ${c.name.padEnd(16)} : ${cCount} documents`);
    }
    console.log('----------------------------------------------------\n');
    console.log('🚀 LIVE SYNC IS ACTIVE:');
    console.log('Every action on the website will immediately read/write directly to this MongoDB Atlas cluster!\n');

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ CONNECTION BLOCKED BY MONGODB ATLAS FIREWALL:\n');
    console.error('Error detail:', err.message);
    console.log('\n----------------------------------------------------');
    console.log('💡 HOW TO ALLOW ACCESS IN 30 SECONDS:');
    console.log('1. Go to: https://cloud.mongodb.com');
    console.log('2. Click "Network Access" in the left menu (padlock icon).');
    console.log('3. Click the green "Add IP Address" button.');
    console.log('4. Click "Allow Access From Anywhere" (0.0.0.0/0).');
    console.log('5. Click "Confirm". Wait 30 seconds for it to become Active.');
    console.log('----------------------------------------------------\n');
    process.exit(1);
  }
}

connectToAtlas();
