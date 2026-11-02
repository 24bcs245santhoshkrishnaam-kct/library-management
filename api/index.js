/**
 * Vercel Serverless Function Entry Point for KCT AI Smart Library
 * Connects directly to MongoDB Atlas and routes all /api calls to Express
 */
const app = require('../backend/server');
const db = require('../backend/config/db');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await db.testConnection();
      await db.initTables();
      isConnected = true;
    } catch (err) {
      console.error('[Vercel DB Connection Error]:', err.message);
    }
  }
  return app(req, res);
};
