const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const shakespeareBooks = require('./shakespeareBooksData');
const tamilBooks = require('./tamilBooksData');

async function seedAdditionalCollections() {
  console.log('================================================================');
  console.log('SMART LIBRARY — SEEDING ADDITIONAL SHAKESPEARE & TAMIL BOOKS');
  console.log('================================================================\n');

  await db.testConnection();
  const conn = await db.getConnection();

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // 1. Ensure optional metadata columns exist in MySQL books table
    const columnsToEnsure = [
      "ALTER TABLE books ADD COLUMN language VARCHAR(50) NOT NULL DEFAULT 'English'",
      "ALTER TABLE books ADD COLUMN alternate_titles TEXT NULL",
      "ALTER TABLE books ADD COLUMN subject_keywords TEXT NULL",
      "ALTER TABLE books ADD COLUMN skills_covered TEXT NULL",
      "ALTER TABLE books ADD COLUMN career_paths TEXT NULL",
      "ALTER TABLE books ADD COLUMN catalog_collection VARCHAR(100) NOT NULL DEFAULT 'Engineering'",
      "ALTER TABLE books ADD COLUMN metadata_source VARCHAR(150) NULL"
    ];

    for (const colQuery of columnsToEnsure) {
      try {
        await conn.query(colQuery);
      } catch (err) {
        // Column already exists, safe to ignore
      }
    }

    // Combine datasets
    const collections = [
      ...shakespeareBooks,
      ...tamilBooks
    ];

    console.log(`[Seed Collections] Processing ${collections.length} total curated book records...`);

    for (const book of collections) {
      if (!book.title || !book.author || !book.category) {
        console.warn(`[Validation Warning] Book record missing required fields:`, book);
        errorCount++;
        continue;
      }

      // Check if book already exists by ID, ISBN, or exact Title
      const [rows] = await conn.query(
        'SELECT id, total_copies, available_copies, language, catalog_collection FROM books WHERE id = ? OR isbn = ? OR title = ? LIMIT 1',
        [book.id, book.isbn, book.title]
      );
      const existing = rows && rows.length > 0 ? rows[0] : null;

      if (existing) {
        // Safe additive update: enrich metadata fields without touching physical inventory counts
        await conn.query(`
          UPDATE books 
          SET 
            language = COALESCE(NULLIF(language, ''), ?),
            alternate_titles = COALESCE(alternate_titles, ?),
            subject_keywords = COALESCE(subject_keywords, ?),
            skills_covered = COALESCE(skills_covered, ?),
            career_paths = COALESCE(career_paths, ?),
            catalog_collection = COALESCE(NULLIF(catalog_collection, ''), ?),
            metadata_source = COALESCE(metadata_source, ?)
          WHERE id = ?
        `, [
          book.language || 'English',
          book.alternate_titles || null,
          book.subject_keywords || null,
          book.skills_covered || null,
          book.career_paths || null,
          book.catalog_collection || 'General',
          book.metadata_source || null,
          existing.id
        ]);
        updatedCount++;
      } else {
        // Insert new record
        await conn.query(`
          INSERT INTO books (
            id, title, author, department, category, publisher, published_year, 
            isbn, description, cover_image, total_copies, available_copies, 
            shelf_location, language, alternate_titles, subject_keywords, 
            skills_covered, career_paths, catalog_collection, metadata_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          book.id,
          book.title,
          book.author,
          book.department,
          book.category,
          book.publisher || null,
          book.published_year || 2020,
          book.isbn || null,
          book.description || '',
          book.cover_image || null,
          book.total_copies || 3,
          book.available_copies || book.total_copies || 3,
          book.shelf_location || 'GEN-01',
          book.language || 'English',
          book.alternate_titles || null,
          book.subject_keywords || null,
          book.skills_covered || null,
          book.career_paths || null,
          book.catalog_collection || 'General',
          book.metadata_source || null
        ]);
        addedCount++;
      }
    }

    // Refresh SMART_LIBRARY_MANAGEMENT_SYSTEM view
    try {
      await conn.query('CREATE OR REPLACE VIEW SMART_LIBRARY_MANAGEMENT_SYSTEM.books AS SELECT * FROM smart_library.books;');
    } catch (e) {}

    // Verify final catalog statistics directly from MySQL
    const [totalRows] = await conn.query('SELECT COUNT(*) as total FROM books');
    const [engRows] = await conn.query("SELECT COUNT(*) as count FROM books WHERE department IN ('CSE', 'AI AND MACHINE LEARNING', 'ECE', 'EEE', 'MECHANICAL') OR catalog_collection = 'Engineering'");
    const [shakRows] = await conn.query("SELECT COUNT(*) as count FROM books WHERE department = 'ENGLISH LITERATURE' OR catalog_collection = 'Shakespeare Collection' OR category LIKE '%Shakespeare%'");
    const [tamRows] = await conn.query("SELECT COUNT(*) as count FROM books WHERE department = 'TAMIL LITERATURE' OR language = 'Tamil' OR catalog_collection = 'Tamil Literature'");

    const totalCount = totalRows[0]?.total || 0;
    const engCount = engRows[0]?.count || 0;
    const shakCount = shakRows[0]?.count || 0;
    const tamCount = tamRows[0]?.count || 0;

    console.log('\n----------------------------------------------------------------');
    console.log('SEEDING SUMMARY REPORT:');
    console.log(`  Records Added:   ${addedCount}`);
    console.log(`  Records Updated: ${updatedCount}`);
    console.log(`  Records Skipped: ${skippedCount}`);
    console.log(`  Metadata Errors: ${errorCount}`);
    console.log('----------------------------------------------------------------');
    console.log('ACTUAL DATABASE CATALOG COUNTS (VERIFIED IN MYSQL):');
    console.log(`  Total Books:         ${totalCount} (Target: >= 600)`);
    console.log(`  Engineering Books:   ${engCount} (Target: >= 500)`);
    console.log(`  Shakespeare Books:   ${shakCount} (Target: >= 50)`);
    console.log(`  Tamil Books:         ${tamCount} (Target: >= 50)`);
    console.log('----------------------------------------------------------------\n');

    return {
      total: totalCount,
      engineering: engCount,
      shakespeare: shakCount,
      tamil: tamCount,
      added: addedCount,
      updated: updatedCount
    };
  } catch (err) {
    console.error('[Seed Error]:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedAdditionalCollections()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedAdditionalCollections };
