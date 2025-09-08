const express = require('express');
const { executeQuery } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const bcrypt = require('bcryptjs');

const router = express.Router();

// @route   GET /api/admin/users/pending
// @desc    Get all pending user registrations
// @access  Private (Admin only)
router.get('/users/pending', requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await executeQuery(`
      SELECT id, username, email, created_at 
      FROM users 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `);

    res.json({
      success: true,
      message: 'Pending users retrieved successfully',
      data: pendingUsers
    });

  } catch (error) {
    logger.error('Error fetching pending users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending users'
    });
  }
});

// @route   PUT /api/admin/users/:userId/approve
// @desc    Approve a user registration
// @access  Private (Admin only)
router.put('/users/:userId/approve', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Check if user exists and is pending
    const user = await executeQuery(
      'SELECT id, username, email, status FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `User is already ${user[0].status}`
      });
    }

    // Approve user
    await executeQuery(
      'UPDATE users SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['approved', adminId, userId]
    );

    // Log the action
    await executeQuery(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      adminId, 
      'approve_user', 
      'users', 
      userId, 
      JSON.stringify({ status: 'approved', approved_by: adminId })
    ]);

    logger.info(`Admin ${req.user.username} approved user ${user[0].username}`);

    res.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId,
        username: user[0].username,
        email: user[0].email,
        status: 'approved'
      }
    });

  } catch (error) {
    logger.error('Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user'
    });
  }
});

// @route   PUT /api/admin/users/:userId/reject
// @desc    Reject a user registration
// @access  Private (Admin only)
router.put('/users/:userId/reject', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Check if user exists and is pending
    const user = await executeQuery(
      'SELECT id, username, email, status FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `User is already ${user[0].status}`
      });
    }

    // Reject user
    await executeQuery(
      'UPDATE users SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['rejected', adminId, userId]
    );

    // Log the action
    await executeQuery(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      adminId, 
      'reject_user', 
      'users', 
      userId, 
      JSON.stringify({ status: 'rejected', approved_by: adminId })
    ]);

    logger.info(`Admin ${req.user.username} rejected user ${user[0].username}`);

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        userId,
        username: user[0].username,
        email: user[0].email,
        status: 'rejected'
      }
    });

  } catch (error) {
    logger.error('Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status; // optional filter by status

    let query = `
      SELECT u.id, u.username, u.email, u.role, u.status, u.created_at,
             approver.username as approved_by_username
      FROM users u
      LEFT JOIN users approver ON u.approved_by = approver.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE u.status = ?';
      params.push(status);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const users = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let countParams = [];
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const user = await executeQuery(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user (CASCADE will handle related records)
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

    // Log the action
    await executeQuery(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      adminId, 
      'delete_user', 
      'users', 
      userId, 
      JSON.stringify(user[0])
    ]);

    logger.info(`Admin ${req.user.username} deleted user ${user[0].username}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// @route   POST /api/admin/models/train
// @desc    Initiate training of a new model
// @access  Private (Admin only)
router.post('/models/train', requireAdmin, async (req, res) => {
  try {
    const { name, description, algorithm, datasetId } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!name || !algorithm || !datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Name, algorithm, and dataset ID are required'
      });
    }

    // Check if dataset exists
    const dataset = await executeQuery(
      'SELECT id, file_path FROM dataset_uploads WHERE id = ?',
      [datasetId]
    );

    if (dataset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    // Create new model record
    const result = await executeQuery(`
      INSERT INTO ml_models (name, description, algorithm, status, created_by)
      VALUES (?, ?, ?, 'training', ?)
    `, [name, description, algorithm, adminId]);

    const modelId = result.insertId;

    // Log the training initiation
    await executeQuery(`
      INSERT INTO training_logs (model_id, log_message, log_level)
      VALUES (?, 'Model training initiated', 'info')
    `, [modelId]);

    // Here you would typically start a background process to train the model
    // For now, we'll just return the created model info
    
    logger.info(`Admin ${req.user.username} initiated training for model: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Model training initiated successfully',
      data: {
        modelId,
        name,
        algorithm,
        status: 'training',
        datasetId
      }
    });

  } catch (error) {
    logger.error('Error initiating model training:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate model training'
    });
  }
});

// @route   GET /api/admin/system/stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/system/stats', requireAdmin, async (req, res) => {
  try {
    // Get various system statistics
    const [userStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        SUM(status = 'approved') as approved_users,
        SUM(status = 'pending') as pending_users,
        SUM(status = 'rejected') as rejected_users
      FROM users
    `);

    const [modelStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_models,
        SUM(status = 'ready') as ready_models,
        SUM(status = 'training') as training_models,
        SUM(status = 'failed') as failed_models
      FROM ml_models
    `);

    const [datasetStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_datasets,
        SUM(file_size) as total_storage_bytes
      FROM dataset_uploads
    `);

    const [recentActivity] = await executeQuery(`
      SELECT COUNT(*) as recent_logins
      FROM user_sessions 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    res.json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: {
        users: userStats,
        models: modelStats,
        datasets: {
          ...datasetStats,
          total_storage_mb: Math.round(datasetStats.total_storage_bytes / (1024 * 1024) * 100) / 100
        },
        activity: recentActivity
      }
    });

  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics'
    });
  }
});

// @route   GET /api/admin/logs
// @desc    Get audit logs
// @access  Private (Admin only)
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const logs = await executeQuery(`
      SELECT a.*, u.username 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [{ total }] = await executeQuery('SELECT COUNT(*) as total FROM audit_logs');

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
});

module.exports = router;
