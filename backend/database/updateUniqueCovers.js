const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function updateUniqueCovers() {
  console.log('[Cover Updater] Ensuring every book has an individual, unique cover...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'smart_library'
  });

  const [books] = await conn.query('SELECT id, title, isbn, cover_image, category, department FROM books ORDER BY id ASC');
  console.log(`Analyzing ${books.length} catalog books...`);

  let updatedCount = 0;

  for (const b of books) {
    // If the cover_image is missing, or is a generic unsplash placeholder that is shared across books:
    const isGenericUnsplash = !b.cover_image || 
      b.cover_image.includes('images.unsplash.com') || 
      b.cover_image.includes('placeholder');

    if (isGenericUnsplash) {
      // Set to the dedicated unique SVG cover endpoint for this exact book
      const uniqueCoverUrl = `/api/books/${b.id}/cover.svg`;
      await conn.query('UPDATE books SET cover_image = ? WHERE id = ?', [uniqueCoverUrl, b.id]);
      updatedCount++;
    }
  }

  // Also update SMART_LIBRARY_MANAGEMENT_SYSTEM database if present
  try {
    await conn.query('USE SMART_LIBRARY_MANAGEMENT_SYSTEM');
    for (const b of books) {
      const uniqueCoverUrl = `/api/books/${b.id}/cover.svg`;
      await conn.query('UPDATE books SET cover_image = ? WHERE id = ?', [uniqueCoverUrl, b.id]);
    }
    console.log('✓ Synchronized SMART_LIBRARY_MANAGEMENT_SYSTEM database covers');
  } catch (e) {}

  await conn.end();
  console.log(`[Cover Updater] Updated ${updatedCount} books with unique individual cover endpoints!`);
}

updateUniqueCovers().catch(err => {
  console.error('[Cover Updater Error]:', err);
  process.exit(1);
});

