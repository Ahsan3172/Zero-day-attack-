const express = require('express');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await executeQuery(`
      SELECT id, username, email, role, status, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user[0]
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email } = req.body;
    const userId = req.user.id;

    // Check if username or email already exists (for other users)
    if (username || email) {
      const existingUser = await executeQuery(`
        SELECT id FROM users 
        WHERE (username = ? OR email = ?) AND id != ?
      `, [username || '', email || '', userId]);

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    values.push(userId);

    await executeQuery(`
      UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `, values);

    // Get updated user data
    const updatedUser = await executeQuery(`
      SELECT id, username, email, role, status, created_at, updated_at
      FROM users WHERE id = ?
    `, [userId]);

    logger.info(`User ${userId} updated profile`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser[0]
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user with password
    const user = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    // Invalidate all existing sessions for this user
    await executeQuery(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [userId]
    );

    logger.info(`User ${userId} changed password`);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// @route   GET /api/users/activity
// @desc    Get user activity history
// @access  Private
router.get('/activity', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get user's recent activities from audit logs
    const activities = await executeQuery(`
      SELECT action, table_name, created_at, ip_address
      FROM audit_logs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

    // Get user's recent model results
    const modelResults = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.created_at,
             m.name as model_name,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'User activity retrieved successfully',
      data: {
        activities,
        recentResults: modelResults,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user activity'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  body('password').notEmpty().withMessage('Password is required to delete account')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { password } = req.body;
    const userId = req.user.id;

    // Prevent admin from deleting their account if they're the only admin
    if (req.user.role === 'admin') {
      const adminCount = await executeQuery(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "approved"'
      );

      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete account. At least one admin must remain.'
        });
      }
    }

    // Get current user with password
    const user = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Delete user account (CASCADE will handle related records)
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

    logger.info(`User ${userId} deleted their account`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

// @route   PUT /api/users/role/:id
// @desc    Update user role (admin only)
// @access  Private (Admin only)
router.put('/role/:id', [
  body('role')
    .isIn(['admin', 'user'])
    .withMessage('Role must be either "admin" or "user"')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Check if target user exists and get current role
    const targetUser = await executeQuery(
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [userId]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow changing own role
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // If trying to remove admin role, ensure at least one admin remains
    if (targetUser[0].role === 'admin' && role === 'user') {
      const adminCount = await executeQuery(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "approved"'
      );

      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove admin role. At least one admin must remain.'
        });
      }
    }

    // Update user role
    await executeQuery(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, userId]
    );

    logger.info(`Admin ${req.user.id} (${req.user.username}) changed user ${userId} (${targetUser[0].username}) role from ${targetUser[0].role} to ${role}`);

    res.json({
      success: true,
      message: 'Role updated successfully',
      userId: userId,
      newRole: role
    });

  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

module.exports = router;
