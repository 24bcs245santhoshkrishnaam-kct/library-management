const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const aiRoutes = require('./routes/aiRoutes');
const loanRoutes = require('./routes/loanRoutes');
const smsRoutes = require('./routes/smsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { startOverdueScheduler } = require('./services/overdueScheduler');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.set('etag', false); // Disable ETags so dynamic API updates never return 304 Not Modified
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ensure all API endpoints return fresh live responses immediately without browser caching
app.use(['/api', '/auth', '/books', '/ai', '/loans', '/sms', '/admin', '/health'], (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// API Routes - Mounted with and without /api prefix for seamless Vercel serverless rewrite compatibility
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/books', '/books'], bookRoutes);
app.use(['/api/ai', '/ai'], aiRoutes);
app.use(['/api/loans', '/loans'], loanRoutes);
app.use(['/api/sms', '/sms'], smsRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);

// System Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    system: 'KCT AI Smart Library',
    institution: 'Kumaraguru College of Technology (KCT)',
    database: 'mongodb',
    timestamp: new Date().toISOString(),
    mongodb_connected: db.isConnected,
    mysql_connected: db.isConnected,
    ai_provider: process.env.AI_PROVIDER || 'gemini',
    ai_key_configured: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.length > 0)
  });
});

// Serve static frontend build if it exists
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    const isApiRequest = ['/api', '/auth', '/books', '/ai', '/loans', '/sms', '/admin', '/health']
      .some(prefix => req.originalUrl.startsWith(prefix));
    if (isApiRequest) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized 404 handler for unknown API endpoints
app.use(['/api/*', '/auth/*', '/books/*', '/ai/*', '/loans/*', '/sms/*', '/admin/*'], (req, res) => {
  res.status(404).json({
    error: 'Endpoint Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred. Please contact the administrator.'
  });
});

const { execSync } = require('child_process');

function freePort(port) {
  try {
    const currentPid = process.pid;
    const output = execSync(`lsof -ti :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const pids = output
      .trim()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p && p !== String(currentPid));

    if (pids.length > 0) {
      console.log(`[Server] Freeing port ${port} from process(es): ${pids.join(', ')}...`);
      execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
    }
  } catch (e) {
    // Port was already free
  }
}

// Initialize DB connection and start server
async function startServer(retries = 2) {
  console.log('[Server] Initializing Smart Library Backend...');
  await db.testConnection();
  await db.initTables();

  // Proactively ensure port is free
  freePort(PORT);

  const server = app.listen(PORT, () => {
    console.log(`[Server] Smart Library running at http://localhost:${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
    startOverdueScheduler();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retries > 0) {
        console.warn(`[Server] Port ${PORT} busy. Auto-clearing and retrying in 500ms... (${retries} retries left)`);
        freePort(PORT);
        setTimeout(() => startServer(retries - 1), 500);
        return;
      }
      console.error(`\n❌ Error: Port ${PORT} is still busy.`);
      console.error(`Run this command to free it:`);
      console.error(`  lsof -ti :${PORT} | xargs kill -9\n`);
    } else {
      console.error('[Server Error]:', err);
    }
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  startServer();
} else {
  // Proactively warm up DB connection when loaded as a module / service
  db.testConnection().catch(e => console.warn('[Server] Module DB connection notice:', e.message));
}

module.exports = app;
