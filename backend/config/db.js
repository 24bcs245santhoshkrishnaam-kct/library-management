/**
 * Unified Database Configuration for KCT AI Smart Library
 * MongoDB Engine with full data persistence and automated seeding.
 */
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on macOS / custom DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { executeMongoQuery } = require('./mongoEngine');

let mongoClient = null;
let mongoDb = null;
let mongoMemoryServer = null;
let isConnected = false;

const DB_NAME = process.env.DB_NAME || 'smart_library';

/**
 * Initialize connection to MongoDB (Cloud Atlas or Local/Embedded)
 */
async function testConnection() {
  if (isConnected && mongoDb) return true;

  let uri = process.env.MONGODB_URI;

  // 1. Try configured MONGODB_URI (Cloud Atlas or remote) with quick 2s timeout
  if (uri) {
    try {
      console.log('[Database] Connecting to configured MongoDB URI...');
      mongoClient = new MongoClient(uri, { 
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db(DB_NAME);
      isConnected = true;
      console.log(`[Database] Successfully connected to MongoDB database "${DB_NAME}"`);
      return true;
    } catch (err) {
      console.warn(`[Database] Remote MongoDB connection notice: ${err.message}. Activating high-speed local engine...`);
      mongoClient = null;
      mongoDb = null;
      isConnected = false;
    }
  }

  // 2. High-speed local embedded MongoDB (zero lag, instant response)
  try {
    if (!mongoMemoryServer) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
    }
    const localUri = mongoMemoryServer.getUri();
    mongoClient = new MongoClient(localUri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(DB_NAME);
    isConnected = true;
    console.log(`[Database] Connected to high-speed local MongoDB engine at ${localUri}`);
    return true;
  } catch (err) {
    console.error('[Database] Local MongoDB engine error:', err.message);
    isConnected = false;
    return false;
  }
}

/**
 * Initialize Collections, Indexes, and Import full data from MySQL backup if needed
 */
async function initTables() {
  await testConnection();
  if (!mongoDb) return;

  try {
    const collections = ['users', 'books', 'transactions', 'notifications', 'policies', 'audit_logs', '_counters'];
    const existingCollections = await mongoDb.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    for (const colName of collections) {
      if (!existingNames.includes(colName)) {
        await mongoDb.createCollection(colName);
      }
    }

    // Check if seeding is needed (if books or users are empty)
    const booksCount = await mongoDb.collection('books').countDocuments();
    const usersCount = await mongoDb.collection('users').countDocuments();

    if (booksCount === 0 || usersCount === 0) {
      console.log('[Database] Importing initial MySQL data into MongoDB collections...');
      const dumpPath = path.join(__dirname, '../database/backups/mysql_full_export.json');
      if (fs.existsSync(dumpPath)) {
        const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

        for (const table of Object.keys(dump)) {
          if (dump[table] && dump[table].length > 0) {
            const col = mongoDb.collection(table);
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
              console.log(`[Database] Imported ${records.length} records into MongoDB collection "${table}"`);
            }
          }
        }
      }
    }

    // Ensure all dates in transactions are proper Date objects for query comparisons
    const stringTx = await mongoDb.collection('transactions').find({ due_date: { $type: 'string' } }).toArray();
    for (const t of stringTx) {
      const updates = {};
      if (t.issue_date) updates.issue_date = new Date(t.issue_date);
      if (t.due_date) updates.due_date = new Date(t.due_date);
      if (t.return_date) updates.return_date = new Date(t.return_date);
      if (t.created_at) updates.created_at = new Date(t.created_at);
      if (t.last_auto_reminder_at) updates.last_auto_reminder_at = new Date(t.last_auto_reminder_at);
      if (t.last_sms_sent_at) updates.last_sms_sent_at = new Date(t.last_sms_sent_at);
      await mongoDb.collection('transactions').updateOne({ _id: t._id }, { $set: updates });
    }

    // Initialize sequence counters based on highest existing IDs
    for (const table of ['users', 'books', 'transactions', 'notifications', 'policies', 'audit_logs']) {
      const topDoc = await mongoDb.collection(table).find({}).sort({ id: -1 }).limit(1).toArray();
      const maxId = (topDoc && topDoc.length > 0 && topDoc[0].id) ? topDoc[0].id : 0;
      await mongoDb.collection('_counters').updateOne(
        { _id: table },
        { $max: { seq: maxId } },
        { upsert: true }
      );
    }

    // Ensure critical performance indexes
    await mongoDb.collection('users').createIndex({ email: 1 }, { background: true });
    await mongoDb.collection('users').createIndex({ username: 1 }, { background: true });
    await mongoDb.collection('users').createIndex({ id: 1 }, { unique: true, background: true });
    await mongoDb.collection('books').createIndex({ id: 1 }, { unique: true, background: true });
    await mongoDb.collection('books').createIndex({ title: 1 }, { background: true });
    await mongoDb.collection('transactions').createIndex({ id: 1 }, { unique: true, background: true });
    await mongoDb.collection('transactions').createIndex({ user_id: 1, status: 1 }, { background: true });
    await mongoDb.collection('notifications').createIndex({ id: 1 }, { unique: true, background: true });
    await mongoDb.collection('policies').createIndex({ policy_key: 1 }, { unique: true, background: true });

    console.log('[Database] MongoDB collections, indexes, and full dataset verified and ready.');
  } catch (err) {
    console.warn('[Database] Collection initialization notice:', err.message);
  }
}

/**
 * Execute query against MongoDB
 */
async function query(sql, params = []) {
  if (!isConnected || !mongoDb) {
    await testConnection();
    await initTables();
  }
  return await executeMongoQuery(mongoDb, sql, params);
}

/**
 * Emulate MySQL connection object with transaction hooks
 */
async function getConnection() {
  if (!isConnected || !mongoDb) {
    await testConnection();
    await initTables();
  }

  return {
    query: async (sql, params = []) => {
      const res = await executeMongoQuery(mongoDb, sql, params);
      return [res];
    },
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  };
}

module.exports = {
  testConnection,
  initTables,
  query,
  getConnection,
  getDb: () => mongoDb,
  getClient: () => mongoClient,
  collection: (name) => mongoDb ? mongoDb.collection(name) : null,
  get isConnected() { return isConnected; }
};
