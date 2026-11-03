/**
 * Pure JavaScript In-Memory MongoDB Engine for KCT AI Smart Library
 * Provides zero-dependency, ultra-fast MongoDB collection emulation
 * with full aggregation pipeline ($match, $group, $lookup, $unwind, $project, $sort, $limit, $skip)
 * for serverless (Vercel) environments when remote Atlas is initializing or connecting.
 */

function matchFilter(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const key of Object.keys(filter)) {
    const val = filter[key];
    if (key === '$or') {
      if (!Array.isArray(val) || !val.some(sub => matchFilter(doc, sub))) return false;
    } else if (key === '$and') {
      if (!Array.isArray(val) || !val.every(sub => matchFilter(doc, sub))) return false;
    } else {
      const docVal = doc[key];
      if (val instanceof RegExp) {
        if (!val.test(String(docVal !== undefined && docVal !== null ? docVal : ''))) return false;
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const op of Object.keys(val)) {
          const target = val[op];
          if (op === '$regex') {
            const flags = val.$options || 'i';
            const reg = new RegExp(target, flags);
            if (!reg.test(String(docVal !== undefined && docVal !== null ? docVal : ''))) return false;
          } else if (op === '$in') {
            if (!Array.isArray(target) || !target.includes(docVal)) return false;
          } else if (op === '$nin') {
            if (Array.isArray(target) && target.includes(docVal)) return false;
          } else if (op === '$ne') {
            if (docVal === target) return false;
          } else if (op === '$gt') {
            if (!(docVal > target)) return false;
          } else if (op === '$gte') {
            if (!(docVal >= target)) return false;
          } else if (op === '$lt') {
            if (!(docVal < target)) return false;
          } else if (op === '$lte') {
            if (!(docVal <= target)) return false;
          } else if (op === '$type') {
            if (target === 'string' && typeof docVal !== 'string') return false;
          }
        }
      } else {
        if (docVal !== val) return false;
      }
    }
  }
  return true;
}

function applyUpdate(doc, update = {}) {
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      doc[k] = v;
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      doc[k] = (Number(doc[k]) || 0) + Number(v);
    }
  }
  if (update.$max) {
    for (const [k, v] of Object.entries(update.$max)) {
      doc[k] = Math.max(Number(doc[k]) || 0, Number(v) || 0);
    }
  }
  if (update.$setOnInsert && doc._isNew) {
    for (const [k, v] of Object.entries(update.$setOnInsert)) {
      doc[k] = v;
    }
  }
}

class PureJsCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortObj) {
    if (!sortObj) return this;
    const entries = Object.entries(sortObj);
    this.docs.sort((a, b) => {
      for (const [key, dir] of entries) {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
      }
      return 0;
    });
    return this;
  }

  skip(n) {
    if (n > 0) this.docs = this.docs.slice(n);
    return this;
  }

  limit(n) {
    if (n > 0) this.docs = this.docs.slice(0, n);
    return this;
  }

  async toArray() {
    return JSON.parse(JSON.stringify(this.docs));
  }
}

class PureJsCollection {
  constructor(name, initialDocs = [], db = null) {
    this.name = name;
    this.docs = [...initialDocs];
    this.db = db;
    this.indexes = [];
  }

  find(filter = {}) {
    const matched = this.docs.filter(d => matchFilter(d, filter));
    return new PureJsCursor(matched);
  }

  async findOne(filter = {}) {
    const found = this.docs.find(d => matchFilter(d, filter));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async countDocuments(filter = {}) {
    if (!filter || Object.keys(filter).length === 0) return this.docs.length;
    return this.docs.filter(d => matchFilter(d, filter)).length;
  }

  async insertOne(doc) {
    const copy = JSON.parse(JSON.stringify(doc));
    if (!copy._id) {
      copy._id = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    }
    this.docs.push(copy);
    return { acknowledged: true, insertedId: copy._id };
  }

  async insertMany(docs) {
    const inserted = docs.map(d => {
      const copy = JSON.parse(JSON.stringify(d));
      if (!copy._id) copy._id = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      return copy;
    });
    this.docs.push(...inserted);
    return { acknowledged: true, insertedCount: inserted.length };
  }

  async updateOne(filter, update, options = {}) {
    let doc = this.docs.find(d => matchFilter(d, filter));
    if (!doc && options.upsert) {
      doc = { ...filter, _isNew: true };
      applyUpdate(doc, update);
      delete doc._isNew;
      await this.insertOne(doc);
      return { matchedCount: 0, modifiedCount: 1, upsertedCount: 1 };
    }
    if (doc) {
      applyUpdate(doc, update);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async updateMany(filter, update) {
    let modified = 0;
    for (const doc of this.docs) {
      if (matchFilter(doc, filter)) {
        applyUpdate(doc, update);
        modified++;
      }
    }
    return { matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter) {
    const idx = this.docs.findIndex(d => matchFilter(d, filter));
    if (idx !== -1) {
      this.docs.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter) {
    const initial = this.docs.length;
    this.docs = this.docs.filter(d => !matchFilter(d, filter));
    return { deletedCount: initial - this.docs.length };
  }

  async findOneAndUpdate(filter, update, options = {}) {
    let doc = this.docs.find(d => matchFilter(d, filter));
    if (!doc && options.upsert) {
      doc = { ...filter, _isNew: true };
      applyUpdate(doc, update);
      delete doc._isNew;
      await this.insertOne(doc);
      return options.returnDocument === 'after' ? doc : null;
    }
    if (doc) {
      applyUpdate(doc, update);
      return doc;
    }
    return null;
  }

  async distinct(field, filter = {}) {
    const matched = this.docs.filter(d => matchFilter(d, filter));
    const set = new Set();
    for (const d of matched) {
      if (d[field] !== undefined && d[field] !== null && d[field] !== '') {
        set.add(d[field]);
      }
    }
    return Array.from(set);
  }

  aggregate(pipeline = []) {
    let current = JSON.parse(JSON.stringify(this.docs));
    const parentDb = this.db;

    for (const stage of pipeline) {
      if (stage.$match) {
        current = current.filter(d => matchFilter(d, stage.$match));
      } else if (stage.$group) {
        const groupSpec = stage.$group;
        const idExpr = groupSpec._id;
        const groups = new Map();

        for (const doc of current) {
          let groupKey = null;
          if (idExpr && typeof idExpr === 'string' && idExpr.startsWith('$')) {
            groupKey = doc[idExpr.slice(1)];
          } else {
            groupKey = idExpr;
          }

          if (!groups.has(groupKey)) {
            const initObj = { _id: groupKey };
            for (const [k, v] of Object.entries(groupSpec)) {
              if (k !== '_id') {
                if (v && v.$sum !== undefined) initObj[k] = 0;
              }
            }
            groups.set(groupKey, initObj);
          }

          const targetGroup = groups.get(groupKey);
          for (const [k, v] of Object.entries(groupSpec)) {
            if (k !== '_id' && v && v.$sum !== undefined) {
              if (v.$sum === 1) {
                targetGroup[k] += 1;
              } else if (typeof v.$sum === 'string' && v.$sum.startsWith('$')) {
                const fName = v.$sum.slice(1);
                targetGroup[k] += (Number(doc[fName]) || 0);
              } else if (typeof v.$sum === 'number') {
                targetGroup[k] += v.$sum;
              }
            }
          }
        }
        current = Array.from(groups.values());
      } else if (stage.$lookup && parentDb) {
        const { from, localField, foreignField, as } = stage.$lookup;
        const targetCol = parentDb.collection(from);
        for (const doc of current) {
          const lVal = doc[localField];
          const matchedForeign = targetCol.docs.filter(fd => fd[foreignField] === lVal);
          doc[as] = JSON.parse(JSON.stringify(matchedForeign));
        }
      } else if (stage.$unwind) {
        const path = typeof stage.$unwind === 'string' ? stage.$unwind : stage.$unwind.path;
        const field = path.replace('$', '');
        const preserve = stage.$unwind.preserveNullAndEmptyArrays;
        const unwound = [];
        for (const doc of current) {
          const arr = doc[field];
          if (Array.isArray(arr) && arr.length > 0) {
            for (const item of arr) {
              const copy = { ...doc, [field]: item };
              unwound.push(copy);
            }
          } else if (preserve) {
            unwound.push({ ...doc, [field]: null });
          }
        }
        current = unwound;
      } else if (stage.$project) {
        const proj = stage.$project;
        current = current.map(doc => {
          const out = {};
          for (const [k, v] of Object.entries(proj)) {
            if (v === 1) {
              out[k] = doc[k];
            } else if (typeof v === 'string' && v.startsWith('$')) {
              out[k] = doc[v.slice(1)];
            } else if (v && typeof v === 'object' && !Array.isArray(v)) {
              if (v.$ifNull) {
                const [f, fallback] = v.$ifNull;
                const fieldVal = typeof f === 'string' && f.startsWith('$') ? doc[f.slice(1)] : f;
                out[k] = (fieldVal !== null && fieldVal !== undefined) ? fieldVal : fallback;
              } else if (v.$cond) {
                const [cond, thenVal, elseVal] = v.$cond;
                let condMet = false;
                if (cond.$or) {
                  condMet = cond.$or.some(c => {
                    if (c.$eq) {
                      const [cf, target] = c.$eq;
                      const cVal = typeof cf === 'string' && cf.startsWith('$') ? doc[cf.slice(1)] : cf;
                      return cVal === target;
                    }
                    return false;
                  });
                }
                out[k] = condMet ? thenVal : elseVal;
              } else if (v.$literal !== undefined) {
                out[k] = v.$literal;
              } else {
                out[k] = v;
              }
            } else {
              out[k] = v;
            }
          }
          return out;
        });
      } else if (stage.$sort) {
        const cursor = new PureJsCursor(current);
        cursor.sort(stage.$sort);
        current = cursor.docs;
      } else if (stage.$limit) {
        current = current.slice(0, stage.$limit);
      } else if (stage.$skip) {
        current = current.slice(stage.$skip);
      }
    }

    return new PureJsCursor(current);
  }

  async createIndex(keys, options) {
    this.indexes.push({ keys, options });
    return true;
  }
}

class PureJsDatabase {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new PureJsCollection(name, [], this));
    }
    return this.collections.get(name);
  }

  listCollections() {
    return {
      toArray: async () => Array.from(this.collections.keys()).map(name => ({ name }))
    };
  }

  async createCollection(name) {
    return this.collection(name);
  }

  async command(cmd) {
    return { ok: 1 };
  }
}

function createPureJsMongoEngine() {
  const db = new PureJsDatabase();
  const path = require('path');
  const fs = require('fs');

  try {
    const dumpPath = path.join(__dirname, '../database/backups/mysql_full_export.json');
    if (fs.existsSync(dumpPath)) {
      const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
      for (const table of Object.keys(dump)) {
        if (Array.isArray(dump[table])) {
          const col = db.collection(table);
          const records = dump[table].map(item => {
            const rec = { ...item };
            if (rec.issue_date) rec.issue_date = new Date(rec.issue_date);
            if (rec.due_date) rec.due_date = new Date(rec.due_date);
            if (rec.return_date) rec.return_date = new Date(rec.return_date);
            if (rec.created_at) rec.created_at = new Date(rec.created_at);
            return rec;
          });
          col.docs = records;
        }
      }
      // Initialize sequence counters
      for (const table of ['users', 'books', 'transactions', 'notifications', 'policies', 'audit_logs']) {
        const docs = db.collection(table).docs;
        let maxId = 0;
        for (const d of docs) {
          if (d.id && d.id > maxId) maxId = d.id;
        }
        db.collection('_counters').docs.push({ _id: table, seq: maxId });
      }
      console.log('[PureJsMongo] Pre-loaded database backup into memory successfully.');
    }
  } catch (err) {
    console.warn('[PureJsMongo] Backup load notice:', err.message);
  }

  return db;
}

module.exports = {
  createPureJsMongoEngine,
  PureJsDatabase,
  PureJsCollection,
  PureJsCursor
};
