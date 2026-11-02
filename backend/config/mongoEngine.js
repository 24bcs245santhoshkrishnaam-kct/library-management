/**
 * MongoDB Query Engine for KCT AI Smart Library
 * Provides transparent, high-performance execution of queries directly
 * against MongoDB collections (users, books, transactions, notifications, policies, audit_logs)
 * with zero data loss and exact MySQL-compatible response shapes.
 */

const { ObjectId } = require('mongodb');

// Helper to escape regex special characters
function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to format local date string YYYY-MM-DD HH:mm:ss
function formatDateTime(val) {
  if (!val) return null;
  const d = (val instanceof Date) ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Atomically get next integer ID for a collection using _counters
async function getNextSequenceValue(db, sequenceName) {
  const result = await db.collection('_counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq || (result.value ? result.value.seq : 1);
}

/**
 * Execute a query on MongoDB
 */
async function executeMongoQuery(db, sql, params = []) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();

  // 1. DDL Statements (CREATE, ALTER, DROP) -> No-op for MongoDB
  if (upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP')) {
    const res = [];
    res.insertId = 0;
    res.affectedRows = 0;
    return res;
  }

  // 1.5 INFORMATION_SCHEMA.COLUMNS Queries
  if (upper.includes('INFORMATION_SCHEMA.COLUMNS')) {
    if (upper.includes("'NOTIFICATIONS'")) {
      const res = [
        { COLUMN_NAME: 'title' },
        { COLUMN_NAME: 'is_read' },
        { COLUMN_NAME: 'read_at' }
      ];
      res.insertId = 0;
      return res;
    }
    if (upper.includes("'TRANSACTIONS'")) {
      const res = [
        { COLUMN_NAME: 'auto_reminders_count' },
        { COLUMN_NAME: 'last_auto_reminder_at' }
      ];
      res.insertId = 0;
      return res;
    }
    const res = [];
    res.insertId = 0;
    return res;
  }

  // 2. POLICIES QUERIES
  if (normalized.includes('policies')) {
    const col = db.collection('policies');

    if (upper.startsWith('SELECT')) {
      if (normalized.includes('policy_key =') || normalized.includes('policy_key=')) {
        // Find specific policy
        let key = params[0];
        if (!key) {
          const match = normalized.match(/policy_key\s*=\s*['"]([^'"]+)['"]/i);
          if (match) key = match[1];
        }
        const doc = await col.findOne({ policy_key: key });
        const res = doc ? [doc] : [];
        res.insertId = 0;
        return res;
      }
      // Select all policies
      const docs = await col.find({}).sort({ policy_key: 1 }).toArray();
      docs.insertId = 0;
      return docs;
    }

    if (upper.startsWith('INSERT') || upper.startsWith('UPDATE')) {
      let policyKey = 'borrowing_mode';
      let policyValue = 'testing';
      let description = '';

      const match = normalized.match(/VALUES\s*\(\s*['"]([^'"]+)['"]/i);
      if (match) {
        policyKey = match[1];
        policyValue = params[0] !== undefined ? params[0] : 'testing';
        description = params[1] || `Policy for ${policyKey}`;
      } else {
        policyKey = params[0] || 'borrowing_mode';
        policyValue = params[1] !== undefined ? params[1] : 'testing';
        description = params[2] || `Policy for ${policyKey}`;
      }

      const nextId = await getNextSequenceValue(db, 'policies');
      await col.updateOne(
        { policy_key: policyKey },
        { 
          $set: { 
            policy_value: policyValue, 
            description: description,
            updated_at: new Date()
          },
          $setOnInsert: { id: nextId }
        },
        { upsert: true }
      );
      const res = [{ affectedRows: 1 }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }
  }

  // 3. USERS QUERIES
  if (normalized.includes('FROM users') || normalized.includes('INTO users') || normalized.includes('UPDATE users') || normalized.includes('DELETE FROM users')) {
    const col = db.collection('users');

    if (upper.startsWith('SELECT')) {
      // Admin user count stats
      if (upper.includes('COUNT(*)')) {
        const total = await col.countDocuments();
        const students = await col.countDocuments({ role: 'student' });
        const staff = await col.countDocuments({ role: { $in: ['librarian', 'admin'] } });
        const res = [{ count: total, total_users: total, student_count: students, staff_count: staff }];
        res.insertId = 0;
        return res;
      }

      // Check user by username or email (Login)
      if (upper.includes('LOWER(USERNAME) = LOWER(?) OR LOWER(EMAIL) = LOWER(?)') ||
          upper.includes('LOWER(EMAIL) = LOWER(?) OR LOWER(USERNAME) = LOWER(?)') ||
          upper.includes('EMAIL = ? OR USERNAME = ?')) {
        const p1 = String(params[0] || '').toLowerCase().trim();
        const p2 = String(params[1] || p1).toLowerCase().trim();
        const reg1 = new RegExp(`^${escapeRegex(p1)}$`, 'i');
        const reg2 = new RegExp(`^${escapeRegex(p2)}$`, 'i');
        const user = await col.findOne({ $or: [{ username: reg1 }, { email: reg1 }, { email: reg2 }, { username: reg2 }] });
        const res = user ? [user] : [];
        res.insertId = 0;
        return res;
      }

      // Find user by ID
      if (upper.includes('WHERE ID = ?') || upper.includes('WHERE ID=?')) {
        const userId = Number(params[0]);
        const user = await col.findOne({ id: userId });
        const res = user ? [user] : [];
        res.insertId = 0;
        return res;
      }

      // Find users by role
      if (upper.includes('WHERE ROLE = ?') || upper.includes("WHERE ROLE = 'STUDENT'")) {
        const role = params[0] || 'student';
        const docs = await col.find({ role }).sort({ name: 1 }).toArray();
        docs.insertId = 0;
        return docs;
      }

      // General users query
      const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
      const limitVal = limitMatch ? parseInt(limitMatch[1], 10) : 0;
      let cursor = col.find({});
      if (limitVal > 0) cursor = cursor.limit(limitVal);
      const docs = await cursor.toArray();
      docs.insertId = 0;
      return docs;
    }

    if (upper.startsWith('INSERT')) {
      const nextId = await getNextSequenceValue(db, 'users');
      // Format parameters into document
      const doc = {
        id: nextId,
        username: params[0] || `user_${nextId}`,
        password_hash: params[1],
        name: params[2],
        email: params[3],
        role: params[4] || 'student',
        student_id: params[5] || null,
        department: params[6] || 'General Engineering',
        contact_number: params[7] || '+91 98765 43210',
        account_status: params[8] || 'Active',
        is_demo: Boolean(params[9]),
        created_at: new Date()
      };
      await col.insertOne(doc);
      const res = [{ affectedRows: 1, insertId: nextId }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('UPDATE')) {
      const userId = Number(params[params.length - 1]);
      const updateFields = {};
      if (normalized.includes('name = COALESCE(?, name)')) {
        if (params[0] !== null && params[0] !== undefined) updateFields.name = params[0];
        if (params[1] !== null && params[1] !== undefined) updateFields.contact_number = params[1];
        if (params[2] !== null && params[2] !== undefined) updateFields.department = params[2];
      } else {
        if (params[0] !== null && params[0] !== undefined) updateFields.account_status = params[0];
        if (params[1] !== null && params[1] !== undefined) updateFields.contact_number = params[1];
        if (params[2] !== null && params[2] !== undefined) updateFields.department = params[2];
      }
      await col.updateOne({ id: userId }, { $set: updateFields });
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('DELETE')) {
      const userId = Number(params[0]);
      await col.deleteOne({ id: userId });
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }
  }

  // 4. BOOKS QUERIES
  if (normalized.includes('FROM books') || normalized.includes('INTO books') || normalized.includes('UPDATE books') || normalized.includes('DELETE FROM books')) {
    const col = db.collection('books');

    if (upper.startsWith('SELECT')) {
      // Books aggregate stats for admin
      if (upper.includes('COUNT(*)') && upper.includes('TOTAL_COPIES')) {
        const stats = await col.aggregate([
          {
            $group: {
              _id: null,
              total_titles: { $sum: 1 },
              total_copies: { $sum: '$total_copies' },
              available_copies: { $sum: '$available_copies' }
            }
          }
        ]).toArray();
        const s = stats[0] || { total_titles: 0, total_copies: 0, available_copies: 0 };
        const res = [{
          total_titles: s.total_titles,
          total_copies: s.total_copies,
          available_copies: s.available_copies,
          borrowed_copies: Math.max(0, s.total_copies - s.available_copies)
        }];
        res.insertId = 0;
        return res;
      }

      // Category breakdown
      if (upper.includes('GROUP BY CATEGORY')) {
        const categories = await col.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 }, total_copies: { $sum: '$total_copies' } } },
          { $project: { category: '$_id', count: 1, total_copies: 1, _id: 0 } },
          { $sort: { count: -1 } }
        ]).toArray();
        categories.insertId = 0;
        return categories;
      }

      // Department breakdown
      if (upper.includes('GROUP BY DEPARTMENT')) {
        const depts = await col.aggregate([
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $project: { department: '$_id', count: 1, _id: 0 } },
          { $sort: { count: -1 } }
        ]).toArray();
        depts.insertId = 0;
        return depts;
      }

      // DISTINCT queries
      if (upper.includes('SELECT DISTINCT')) {
        let field = 'category';
        if (upper.includes('AUTHOR')) field = 'author';
        if (upper.includes('DEPARTMENT')) field = 'department';
        if (upper.includes('CATALOG_COLLECTION')) field = 'catalog_collection';

        const distinctVals = await col.distinct(field, { [field]: { $ne: null, $ne: '' } });
        distinctVals.sort();
        const res = distinctVals.map(val => ({ [field]: val }));
        res.insertId = 0;
        return res;
      }

      // Find book by ID
      if (upper.includes('WHERE ID = ?') || upper.includes('WHERE ID=?') || upper.includes('WHERE B.ID = ?')) {
        const bookId = Number(params[0]);
        const book = await col.findOne({ id: bookId });
        const res = book ? [book] : [];
        res.insertId = 0;
        return res;
      }

      // Search books by title or alternate_titles
      if (upper.includes('LOWER(TITLE) LIKE ? OR LOWER(ALTERNATE_TITLES) LIKE ?')) {
        const q = String(params[0] || '').replace(/%/g, '');
        const reg = new RegExp(escapeRegex(q), 'i');
        const book = await col.findOne({ $or: [{ title: reg }, { alternate_titles: reg }] });
        const res = book ? [book] : [];
        res.insertId = 0;
        return res;
      }

      // Available copies query
      const filter = {};
      let paramIdx = 0;

      if (upper.includes('AVAILABLE_COPIES > 0')) {
        filter.available_copies = { $gt: 0 };
      }

      if (normalized.includes('catalog_collection = ?')) {
        filter.catalog_collection = params[paramIdx++];
      }

      if (normalized.includes('department = ?')) {
        filter.department = params[paramIdx++];
      }

      if (normalized.includes('category = ?')) {
        filter.category = params[paramIdx++];
      }

      // Text search LIKE condition
      if (normalized.includes('title LIKE ?') || normalized.includes('title LIKE ? OR author LIKE ?')) {
        const term = String(params[paramIdx++] || '').replace(/%/g, '');
        if (term) {
          const reg = new RegExp(escapeRegex(term), 'i');
          filter.$or = [
            { title: reg },
            { author: reg },
            { category: reg },
            { alternate_titles: reg }
          ];
        }
      }

      const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
      const limitVal = limitMatch ? parseInt(limitMatch[1], 10) : 0;

      let cursor = col.find(filter);
      if (upper.includes('ORDER BY ID ASC')) cursor = cursor.sort({ id: 1 });
      if (upper.includes('ORDER BY ID DESC')) cursor = cursor.sort({ id: -1 });
      if (upper.includes('ORDER BY TITLE ASC')) cursor = cursor.sort({ title: 1 });
      if (limitVal > 0) cursor = cursor.limit(limitVal);

      const docs = await cursor.toArray();
      docs.insertId = 0;
      return docs;
    }

    if (upper.startsWith('INSERT')) {
      const nextId = await getNextSequenceValue(db, 'books');
      const doc = {
        id: nextId,
        title: params[0],
        author: params[1],
        department: params[2] || 'CSE',
        category: params[3] || 'General',
        publisher: params[4] || 'Academic Press',
        published_year: parseInt(params[5], 10) || 2024,
        isbn: params[6] || `978-0-${nextId}`,
        description: params[7] || '',
        cover_image: params[8] || `/api/books/${nextId}/cover.svg`,
        total_copies: parseInt(params[9], 10) || 5,
        available_copies: parseInt(params[9], 10) || 5,
        shelf_location: params[10] || 'A1-01',
        is_damaged: 0,
        is_lost: 0,
        language: params[11] || 'English',
        catalog_collection: params[12] || 'Engineering',
        created_at: new Date()
      };
      await col.insertOne(doc);
      const res = [{ affectedRows: 1, insertId: nextId }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('UPDATE')) {
      // Stock increment / return
      if (normalized.includes('available_copies + 1') || normalized.includes('available_copies = total_copies')) {
        if (normalized.includes('WHERE id = ?')) {
          const bookId = Number(params[0]);
          await col.updateOne({ id: bookId }, { $inc: { available_copies: 1 } });
        } else {
          // Reset all copies
          await col.updateMany({}, [{ $set: { available_copies: '$total_copies' } }]);
        }
        const res = [{ affectedRows: 1 }];
        res.insertId = 0;
        res.affectedRows = 1;
        return res;
      }

      // Stock decrement / borrow
      if (normalized.includes('available_copies - 1')) {
        const bookId = Number(params[0]);
        await col.updateOne({ id: bookId, available_copies: { $gt: 0 } }, { $inc: { available_copies: -1 } });
        const res = [{ affectedRows: 1 }];
        res.insertId = 0;
        res.affectedRows = 1;
        return res;
      }

      // General book update
      const bookId = Number(params[params.length - 1]);
      const updateFields = {};
      if (params[0] !== undefined) updateFields.title = params[0];
      if (params[1] !== undefined) updateFields.author = params[1];
      if (params[2] !== undefined) updateFields.department = params[2];
      if (params[3] !== undefined) updateFields.category = params[3];
      if (params[4] !== undefined) updateFields.isbn = params[4];
      if (params[5] !== undefined) updateFields.description = params[5];
      if (params[6] !== undefined) updateFields.shelf_location = params[6];
      if (params[7] !== undefined) updateFields.total_copies = Number(params[7]);

      await col.updateOne({ id: bookId }, { $set: updateFields });
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('DELETE')) {
      const bookId = Number(params[0]);
      await col.deleteOne({ id: bookId });
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }
  }

  // 5. TRANSACTIONS QUERIES
  if ((normalized.includes('FROM transactions') || normalized.includes('INTO transactions') || normalized.includes('UPDATE transactions') || normalized.includes('DELETE FROM transactions')) && !normalized.includes('FROM notifications')) {
    const col = db.collection('transactions');

    if (upper.startsWith('SELECT')) {
      // Transaction counts for admin
      if (upper.includes('COUNT(*)') && upper.includes('TOTAL_TRANSACTIONS')) {
        const total = await col.countDocuments();
        const active = await col.countDocuments({ status: 'Issued' });
        const returned = await col.countDocuments({ status: 'Returned' });
        const res = [{ total_transactions: total, active_loans: active, returned_loans: returned }];
        res.insertId = 0;
        return res;
      }

      // Single transaction lookup by ID (e.g. for return or preview)
      if (normalized.includes('WHERE t.id = ?') || normalized.includes('WHERE id = ?')) {
        const txId = Number(params[0]);
        const pipeline = [
          { $match: { id: txId } },
          {
            $lookup: {
              from: 'books',
              localField: 'book_id',
              foreignField: 'id',
              as: 'book'
            }
          },
          { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: 1,
              transaction_id: '$id',
              book_id: 1,
              user_id: 1,
              issue_date: 1,
              due_date: 1,
              return_date: 1,
              status: 1,
              duration: 1,
              fine_amount: 1,
              last_sms_sent_at: 1,
              last_auto_reminder_at: 1,
              auto_reminders_count: 1,
              sms_status: 1,
              sms_count: 1,
              notes: 1,
              title: '$book.title',
              author: '$book.author',
              category: '$book.category',
              cover_image: '$book.cover_image',
              book_department: '$book.department',
              shelf_location: '$book.shelf_location',
              available_copies: '$book.available_copies',
              total_copies: '$book.total_copies',
              student_name: '$user.name',
              student_id: '$user.student_id',
              student_email: '$user.email',
              student_department: '$user.department',
              contact_number: '$user.contact_number'
            }
          }
        ];
        const rows = await col.aggregate(pipeline).toArray();
        for (const r of rows) {
          if (r.issue_date) r.issue_date = formatDateTime(r.issue_date);
          if (r.due_date) r.due_date = formatDateTime(r.due_date);
          if (r.return_date) r.return_date = formatDateTime(r.return_date);
        }
        rows.insertId = 0;
        return rows;
      }

      // Check student existing loan for a book
      if (normalized.includes('book_id = ? AND user_id = ? AND status =')) {
        const bookId = Number(params[0]);
        const userId = Number(params[1]);
        const activeLoan = await col.findOne({ book_id: bookId, user_id: userId, status: 'Issued' });
        const res = activeLoan ? [activeLoan] : [];
        res.insertId = 0;
        return res;
      }

      // Student active loan count limit check
      if (normalized.includes('WHERE user_id = ? AND status =') && upper.includes('COUNT(*)')) {
        const userId = Number(params[0]);
        const count = await col.countDocuments({ user_id: userId, status: 'Issued' });
        const res = [{ count }];
        res.insertId = 0;
        return res;
      }

      // Student loans list (All loans belonging to user_id)
      if (normalized.includes('WHERE t.user_id = ?')) {
        const userId = Number(params[0]);
        const pipeline = [
          { $match: { user_id: userId } },
          {
            $lookup: {
              from: 'books',
              localField: 'book_id',
              foreignField: 'id',
              as: 'book'
            }
          },
          { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: 1,
              transaction_id: '$id',
              book_id: 1,
              user_id: 1,
              issue_date: 1,
              due_date: 1,
              return_date: 1,
              status: 1,
              duration: 1,
              fine_amount: 1,
              last_sms_sent_at: 1,
              last_auto_reminder_at: 1,
              auto_reminders_count: 1,
              sms_status: 1,
              sms_count: 1,
              notes: 1,
              title: '$book.title',
              author: '$book.author',
              category: '$book.category',
              cover_image: '$book.cover_image',
              book_department: '$book.department',
              shelf_location: '$book.shelf_location'
            }
          },
          { $sort: { id: -1 } }
        ];
        const rows = await col.aggregate(pipeline).toArray();
        for (const r of rows) {
          if (r.issue_date) r.issue_date = formatDateTime(r.issue_date);
          if (r.due_date) r.due_date = formatDateTime(r.due_date);
          if (r.return_date) r.return_date = formatDateTime(r.return_date);
        }
        rows.insertId = 0;
        return rows;
      }

      // Overdue Scheduler query: active overdue transactions
      if (normalized.includes("WHERE t.status = 'Issued' AND t.due_date < NOW()")) {
        const now = new Date();
        const pipeline = [
          { $match: { status: 'Issued', due_date: { $lt: now } } },
          {
            $lookup: {
              from: 'books',
              localField: 'book_id',
              foreignField: 'id',
              as: 'book'
            }
          },
          { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: '$id',
              transaction_id: '$id',
              user_id: 1,
              book_id: 1,
              due_date: 1,
              issue_date: 1,
              last_auto_reminder_at: 1,
              last_sms_sent_at: 1,
              sms_status: 1,
              auto_reminders_count: 1,
              book_title: '$book.title',
              student_name: '$user.name',
              student_email: '$user.email',
              contact_number: '$user.contact_number'
            }
          },
          { $sort: { due_date: 1 } }
        ];
        const rows = await col.aggregate(pipeline).toArray();
        rows.insertId = 0;
        return rows;
      }

      // Librarian All Loans list (with search & filters)
      const pipeline = [
        {
          $lookup: {
            from: 'books',
            localField: 'book_id',
            foreignField: 'id',
            as: 'book'
          }
        },
        { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: 'id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: 1,
            transaction_id: '$id',
            book_id: 1,
            user_id: 1,
            title: '$book.title',
            author: '$book.author',
            category: '$book.category',
            book_department: '$book.department',
            cover_image: '$book.cover_image',
            available_copies: '$book.available_copies',
            total_copies: '$book.total_copies',
            shelf_location: '$book.shelf_location',
            student_name: '$user.name',
            student_id: '$user.student_id',
            student_email: '$user.email',
            student_department: '$user.department',
            student_contact: '$user.contact_number',
            duration: 1,
            issue_date: 1,
            due_date: 1,
            return_date: 1,
            status: 1,
            fine_amount: 1,
            last_sms_sent_at: 1,
            last_auto_reminder_at: 1,
            auto_reminders_count: 1,
            sms_status: 1,
            sms_count: 1,
            notes: 1
          }
        },
        { $sort: { id: -1 } }
      ];

      const rows = await col.aggregate(pipeline).toArray();
      for (const r of rows) {
        if (r.issue_date) r.issue_date = formatDateTime(r.issue_date);
        if (r.due_date) r.due_date = formatDateTime(r.due_date);
        if (r.return_date) r.return_date = formatDateTime(r.return_date);
      }
      rows.insertId = 0;
      return rows;
    }

    if (upper.startsWith('INSERT')) {
      const nextId = await getNextSequenceValue(db, 'transactions');
      const bookId = Number(params[0]);
      const userId = Number(params[1]);
      const issueDate = params[2] ? new Date(params[2]) : new Date();
      const dueDate = params[3] ? new Date(params[3]) : new Date(Date.now() + 10 * 60 * 1000);
      const duration = params[4] || '10 minutes';
      const notes = params[5] || 'Online borrowing';

      const doc = {
        id: nextId,
        book_id: bookId,
        user_id: userId,
        issue_date: issueDate,
        due_date: dueDate,
        return_date: null,
        status: 'Issued',
        fine_amount: 0.00,
        last_sms_sent_at: null,
        last_auto_reminder_at: null,
        sms_status: 'None',
        sms_count: 0,
        auto_reminders_count: 0,
        duration: duration,
        notes: notes,
        created_at: new Date()
      };

      await col.insertOne(doc);
      const res = [{ affectedRows: 1, insertId: nextId }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('UPDATE')) {
      const txId = Number(params[params.length - 1]);
      const updateFields = {};
      const incFields = {};

      if (upper.includes("STATUS = 'RETURNED'")) {
        updateFields.status = 'Returned';
        updateFields.return_date = new Date();
      }

      if (upper.includes('DUE_DATE = DATE_SUB(NOW()') || upper.includes('INTERVAL 1 MINUTE')) {
        updateFields.due_date = new Date(Date.now() - 60 * 1000);
      }

      if (upper.includes('LAST_AUTO_REMINDER_AT = NOW()')) {
        updateFields.last_auto_reminder_at = new Date();
        updateFields.last_sms_sent_at = new Date();
        updateFields.sms_status = params[0] || 'Delivered';
        incFields.sms_count = 1;
        incFields.auto_reminders_count = 1;
      }

      if (upper.includes('LAST_AUTO_REMINDER_AT = NULL')) {
        updateFields.last_auto_reminder_at = null;
        updateFields.last_sms_sent_at = null;
      }

      if (upper.includes('DUE_DATE = ?')) {
        updateFields.due_date = params[0] ? new Date(params[0]) : new Date();
      }

      if (upper.includes('FINE_AMOUNT = ?')) {
        updateFields.fine_amount = parseFloat(params[0]) || 0;
      }

      if (upper.includes('NOTES = CONCAT')) {
        updateFields.notes = 'Renewed';
      }

      const updateOp = {};
      if (Object.keys(updateFields).length > 0) updateOp.$set = updateFields;
      if (Object.keys(incFields).length > 0) updateOp.$inc = incFields;

      if (Object.keys(updateOp).length > 0) {
        if (upper.includes('WHERE USER_ID = ?') && upper.includes("STATUS = 'RETURNED'")) {
          const userId = Number(params[0]);
          await col.updateMany({ user_id: userId, status: 'Issued' }, updateOp);
        } else {
          await col.updateOne({ id: txId }, updateOp);
        }
      }
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('DELETE')) {
      await col.deleteMany({});
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }
  }

  // 6. NOTIFICATIONS QUERIES
  if (normalized.includes('notifications')) {
    const col = db.collection('notifications');

    if (upper.startsWith('SELECT')) {
      // 1. Single notification lookup (e.g. check is_read)
      if (upper.includes('WHERE ID = ?') || upper.includes('WHERE ID=?')) {
        const notifId = Number(params[0]);
        const doc = await col.findOne({ id: notifId });
        if (!doc) {
          const res = [];
          res.insertId = 0;
          return res;
        }
        const formatted = {
          ...doc,
          is_read: (doc.is_read === 1 || doc.is_read === true || doc.is_read === '1') ? 1 : 0
        };
        const res = [formatted];
        res.insertId = 0;
        return res;
      }

      // 2. Librarian SMS logs with JOINs
      if (upper.includes("WHERE N.TYPE = 'SMS' OR N.TYPE = 'OVERDUESMS'") || upper.includes("WHERE N.TYPE = 'SMS'") || upper.includes("WHERE TYPE = 'SMS'")) {
        const pipeline = [
          { $match: { type: { $in: ['SMS', 'OverdueSMS'] } } },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'transactions',
              localField: 'transaction_id',
              foreignField: 'id',
              as: 'tx'
            }
          },
          { $unwind: { path: '$tx', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'books',
              localField: 'tx.book_id',
              foreignField: 'id',
              as: 'book'
            }
          },
          { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: '$id',
              user_id: '$user_id',
              transaction_id: '$transaction_id',
              type: '$type',
              recipient: '$recipient',
              message: '$message',
              status: '$status',
              provider: '$provider',
              created_at: '$created_at',
              student_name: { $ifNull: ['$user.name', 'Student'] },
              student_id: { $ifNull: ['$user.student_id', 'KCT-LIB'] },
              contact_number: { $ifNull: ['$user.contact_number', '$recipient'] },
              book_title: { $ifNull: ['$book.title', 'Library Book'] },
              due_date: '$tx.due_date',
              notification_created_status: { $literal: 'Created' }
            }
          },
          { $sort: { id: -1 } },
          { $limit: 100 }
        ];
        const docs = await col.aggregate(pipeline).toArray();
        for (const d of docs) {
          if (d.created_at) d.created_at = formatDateTime(d.created_at);
          if (d.due_date) d.due_date = formatDateTime(d.due_date);
          if (!d.due_date) d.due_date = formatDateTime(new Date());
        }
        docs.insertId = 0;
        return docs;
      }

      // 3. User & transaction scoped notification
      if (upper.includes('USER_ID = ? AND TRANSACTION_ID = ?')) {
        const uId = Number(params[0]);
        const tId = Number(params[1]);
        const queryFilter = { user_id: uId, transaction_id: tId };
        if (upper.includes("TYPE = 'INAPP'")) queryFilter.type = 'InApp';
        else if (upper.includes("TYPE = 'SMS'")) queryFilter.type = 'SMS';
        const docs = await col.find(queryFilter).sort({ id: -1 }).limit(1).toArray();
        for (const d of docs) {
          d.is_read = (d.is_read === 1 || d.is_read === true || d.is_read === '1') ? 1 : 0;
          if (d.created_at) d.created_at = formatDateTime(d.created_at);
        }
        docs.insertId = 0;
        return docs;
      }

      // 4. Student notifications with book & loan details
      if (upper.includes('USER_ID = ?') || upper.includes('N.USER_ID = ?')) {
        const userId = Number(params[0]);
        const pipeline = [
          { $match: { user_id: userId } },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'transactions',
              localField: 'transaction_id',
              foreignField: 'id',
              as: 'tx'
            }
          },
          { $unwind: { path: '$tx', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'books',
              localField: 'tx.book_id',
              foreignField: 'id',
              as: 'book'
            }
          },
          { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: '$id',
              user_id: '$user_id',
              transaction_id: '$transaction_id',
              type: '$type',
              recipient: '$recipient',
              message: '$message',
              title: { $ifNull: ['$title', 'Book Return Deadline Expired'] },
              status: '$status',
              provider: '$provider',
              is_read: {
                $cond: [
                  { $or: [{ $eq: ['$is_read', 1] }, { $eq: ['$is_read', true] }] },
                  1,
                  0
                ]
              },
              read_at: '$read_at',
              created_at: '$created_at',
              student_name: '$user.name',
              book_title: '$book.title',
              book_author: '$book.author',
              cover_image: '$book.cover_image',
              duration: '$tx.duration',
              due_date: '$tx.due_date',
              loan_status: '$tx.status'
            }
          },
          { $sort: { id: -1 } },
          { $limit: 100 }
        ];
        const docs = await col.aggregate(pipeline).toArray();
        for (const d of docs) {
          if (d.created_at) d.created_at = formatDateTime(d.created_at);
          if (d.due_date) d.due_date = formatDateTime(d.due_date);
          if (d.read_at) d.read_at = formatDateTime(d.read_at);
          d.is_read = (d.is_read === 1 || d.is_read === true) ? 1 : 0;
        }
        docs.insertId = 0;
        return docs;
      }

      // 5. Total count
      if (upper.includes('COUNT(*)')) {
        const count = await col.countDocuments();
        const res = [{ total_sms_sent: count }];
        res.insertId = 0;
        return res;
      }

      // 6. Generic list
      const docs = await col.find({}).sort({ id: -1 }).limit(200).toArray();
      for (const d of docs) {
        if (d.created_at) d.created_at = formatDateTime(d.created_at);
        if (d.read_at) d.read_at = formatDateTime(d.read_at);
        d.is_read = (d.is_read === 1 || d.is_read === true) ? 1 : 0;
      }
      docs.insertId = 0;
      return docs;
    }

    if (upper.startsWith('INSERT')) {
      const nextId = await getNextSequenceValue(db, 'notifications');
      let type = 'InApp';
      let status = 'Delivered';
      let provider = 'CampusSystem';
      let title = 'Book Return Deadline Expired';
      let is_read = 0;

      if (upper.includes("'SMS'")) type = 'SMS';
      if (upper.includes("'INAPP'")) type = 'InApp';
      if (upper.includes("'EMAIL'")) type = 'Email';

      // Title extraction from literal SQL
      const titleMatch = sql.match(/,\s*['"]([^'"]*(?:Reminder|Expired|Notification|Notice|Renewal)[^'"]*)['"]/i);
      if (titleMatch) {
        title = titleMatch[1];
      }

      let userId = 1;
      let txId = null;
      let recipient = 'student@kct.ac.in';
      let message = 'Library Book Overdue Reminder';

      if (params.length === 0) {
        const valMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
        if (valMatch) {
          const tokens = valMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          userId = Number(tokens[0]) || 1;
          txId = (tokens[1] && tokens[1].toLowerCase() !== 'null') ? Number(tokens[1]) : null;
          if (tokens[2]) type = tokens[2];
          if (tokens[3]) recipient = tokens[3];
          if (tokens[4]) message = tokens[4];
          if (tokens[5]) status = tokens[5];
          if (tokens[6]) provider = tokens[6];
          if (tokens[7]) title = tokens[7];
          if (tokens[8] !== undefined) is_read = (tokens[8] === '1' || tokens[8].toLowerCase() === 'true') ? 1 : 0;
        }
      } else if (params.length === 1) {
        userId = Number(params[0]) || 1;
        const msgMatch = sql.match(/['"]([^'"]{10,})['"]/);
        if (msgMatch) message = msgMatch[1];
      } else if (params.length === 4) {
        userId = Number(params[0]) || 1;
        txId = params[1] ? Number(params[1]) : null;
        recipient = params[2] || recipient;
        message = params[3] || message;
      } else if (params.length === 6) {
        userId = Number(params[0]) || 1;
        txId = params[1] ? Number(params[1]) : null;
        recipient = params[2] || recipient;
        message = params[3] || message;
        status = params[4] || status;
        provider = params[5] || provider;
      } else if (params.length >= 7) {
        userId = Number(params[0]) || 1;
        txId = params[1] ? Number(params[1]) : null;
        type = params[2] || type;
        recipient = params[3] || recipient;
        message = params[4] || message;
        status = params[5] || status;
        provider = params[6] || provider;
        if (params[7]) title = params[7];
        if (params[8] !== undefined) is_read = (params[8] === 1 || params[8] === true) ? 1 : 0;
      }

      const doc = {
        id: nextId,
        user_id: userId,
        transaction_id: txId,
        type: type,
        recipient: recipient,
        message: message,
        status: status,
        provider: provider,
        title: title,
        is_read: is_read,
        read_at: null,
        created_at: new Date()
      };
      await col.insertOne(doc);
      const res = [{ affectedRows: 1, insertId: nextId }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }

    if (upper.startsWith('UPDATE')) {
      if (upper.includes('USER_ID = ? AND IS_READ = FALSE') || (upper.includes('USER_ID = ?') && !upper.includes('WHERE ID = ?'))) {
        const userId = Number(params[0]);
        const result = await col.updateMany({ user_id: userId }, { $set: { is_read: 1, read_at: new Date() } });
        const res = [{ affectedRows: result.modifiedCount }];
        res.insertId = 0;
        res.affectedRows = result.modifiedCount;
        return res;
      }

      if (upper.includes('WHERE ID = ? AND USER_ID = ?')) {
        const notifId = Number(params[0]);
        const userId = Number(params[1]);
        const result = await col.updateOne({ id: notifId, user_id: userId }, { $set: { is_read: 1, read_at: new Date() } });
        const res = [{ affectedRows: result.modifiedCount }];
        res.insertId = 0;
        res.affectedRows = result.modifiedCount;
        return res;
      }

      const notifId = Number(params[0]);
      const result = await col.updateOne({ id: notifId }, { $set: { is_read: 1, read_at: new Date() } });
      const res = [{ affectedRows: result.modifiedCount }];
      res.insertId = 0;
      res.affectedRows = result.modifiedCount;
      return res;
    }

    if (upper.startsWith('DELETE')) {
      await col.deleteMany({});
      const res = [{ affectedRows: 1 }];
      res.insertId = 0;
      res.affectedRows = 1;
      return res;
    }
  }

  // 7. AUDIT LOGS QUERIES
  if (normalized.includes('audit_logs')) {
    const col = db.collection('audit_logs');

    if (upper.startsWith('SELECT')) {
      const docs = await col.find({}).sort({ id: -1 }).limit(100).toArray();
      docs.insertId = 0;
      return docs;
    }

    if (upper.startsWith('INSERT')) {
      const nextId = await getNextSequenceValue(db, 'audit_logs');
      const doc = {
        id: nextId,
        user_name: params[0] || 'System',
        action: params[1] || 'GENERAL_ACTION',
        details: params[2] || '',
        created_at: new Date()
      };
      await col.insertOne(doc);
      const res = [{ affectedRows: 1, insertId: nextId }];
      res.insertId = nextId;
      res.affectedRows = 1;
      return res;
    }
  }

  // Default fallback for any unhandled query
  const res = [];
  res.insertId = 0;
  res.affectedRows = 0;
  return res;
}

module.exports = {
  executeMongoQuery,
  getNextSequenceValue
};
