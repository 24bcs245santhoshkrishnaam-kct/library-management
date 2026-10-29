const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_library_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.query.token;

  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication token required. Please log in.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Invalid or expired authentication session. Please re-authenticate.' 
      });
    }
    // Attach verified user identity from token signature
    req.user = user;
    next();
  });
}

function requireLibrarian(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (req.user.role !== 'librarian' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Access denied. Librarian or Administrator authorization required to perform this action.' 
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Access denied. System Administrator authorization required.' 
    });
  }

  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.query.token;

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  requireLibrarian,
  requireAdmin,
  optionalAuth,
  JWT_SECRET
};
