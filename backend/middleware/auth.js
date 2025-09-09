const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await executeQuery(
      'SELECT id, username, email, role, status FROM users WHERE id = ? AND status = "approved"',
      [decoded.userId]
    );

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or not approved'
      });
    }

    // Add user info to request object
    req.user = user[0];
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Middleware to check if user has admin or user role
const requireUser = (req, res, next) => {
  if (!['admin', 'user'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'User access required'
    });
  }
  next();
};

// Middleware to check if user has specific roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUser,
  requireRole
};
