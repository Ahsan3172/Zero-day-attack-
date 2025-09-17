const express = require('express');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Base stats for all users
    let userStats = {};
    let systemStats = {};

    if (isAdmin) {
      // Admin gets system-wide statistics
      const [userCount] = await executeQuery(`
        SELECT 
          COUNT(*) as total_users,
          SUM(status = 'approved') as approved_users,
          SUM(status = 'pending') as pending_users,
          SUM(status = 'rejected') as rejected_users
        FROM users
      `);

      const [modelCount] = await executeQuery(`
        SELECT 
          COUNT(*) as total_models,
          SUM(status = 'ready') as ready_models,
          SUM(status = 'training') as training_models,
          SUM(status = 'failed') as failed_models
        FROM ml_models
      `);

      const [datasetCount] = await executeQuery(`
        SELECT 
          COUNT(*) as total_datasets,
          SUM(file_size) as total_storage_bytes
        FROM dataset_uploads
      `);

      const [resultCount] = await executeQuery(`
        SELECT 
          COUNT(*) as total_results,
          AVG(accuracy) as avg_accuracy,
          COUNT(DISTINCT user_id) as active_users
        FROM model_results
        WHERE accuracy IS NOT NULL
      `);

      systemStats = {
        users: userCount,
        models: modelCount,
        datasets: {
          ...datasetCount,
          total_storage_mb: Math.round((datasetCount.total_storage_bytes || 0) / (1024 * 1024) * 100) / 100
        },
        results: resultCount
      };
    }

    // User-specific statistics
    const [userDatasets] = await executeQuery(`
      SELECT COUNT(*) as my_datasets
      FROM dataset_uploads
      WHERE uploaded_by = ?
    `, [userId]);

    const [userResults] = await executeQuery(`
      SELECT 
        COUNT(*) as my_results,
        AVG(accuracy) as my_avg_accuracy,
        MAX(accuracy) as my_best_accuracy
      FROM model_results
      WHERE user_id = ? AND accuracy IS NOT NULL
    `, [userId]);

    const [recentActivity] = await executeQuery(`
      SELECT 
        COUNT(*) as recent_predictions
      FROM model_results
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAYS)
    `, [userId]);

    userStats = {
      datasets: userDatasets,
      results: userResults,
      activity: recentActivity
    };

    // Get recent results for the user
    const recentResults = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.created_at, m.name as model_name, d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 5
    `, [userId]);

    // Get available models
    const availableModels = await executeQuery(`
      SELECT id, name, algorithm, accuracy, status
      FROM ml_models
      WHERE status = 'ready'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        userStats,
        ...(isAdmin && { systemStats }),
        recentResults,
        availableModels,
        user: {
          username: req.user.username,
          role: req.user.role
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard overview'
    });
  }
});

// @route   GET /api/dashboard/charts/accuracy-trend
// @desc    Get accuracy trend data for charts
// @access  Private
router.get('/charts/accuracy-trend', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const days = parseInt(req.query.days) || 30;

    let query = `
      SELECT 
        DATE(created_at) as date,
        AVG(accuracy) as avg_accuracy,
        COUNT(*) as count
      FROM model_results
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND accuracy IS NOT NULL
    `;
    let params = [days];

    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += `
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const trendData = await executeQuery(query, params);

    res.json({
      success: true,
      message: 'Accuracy trend data retrieved successfully',
      data: trendData
    });

  } catch (error) {
    logger.error('Error fetching accuracy trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve accuracy trend data'
    });
  }
});

// @route   GET /api/dashboard/charts/model-performance
// @desc    Get model performance comparison data
// @access  Private
router.get('/charts/model-performance', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT 
        m.name as model_name,
        m.algorithm,
        AVG(mr.accuracy) as avg_accuracy,
        AVG(mr.precision_score) as avg_precision,
        AVG(mr.recall_score) as avg_recall,
        AVG(mr.f1_score) as avg_f1,
        COUNT(mr.id) as usage_count
      FROM ml_models m
      LEFT JOIN model_results mr ON m.id = mr.model_id
    `;
    let params = [];

    if (!isAdmin) {
      query += ' WHERE mr.user_id = ? OR mr.user_id IS NULL';
      params.push(userId);
    }

    query += `
      GROUP BY m.id, m.name, m.algorithm
      ORDER BY avg_accuracy DESC
    `;

    const performanceData = await executeQuery(query, params);

    res.json({
      success: true,
      message: 'Model performance data retrieved successfully',
      data: performanceData
    });

  } catch (error) {
    logger.error('Error fetching model performance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve model performance data'
    });
  }
});

// @route   GET /api/dashboard/charts/attack-distribution
// @desc    Get attack type distribution data (if available in results)
// @access  Private
router.get('/charts/attack-distribution', async (req, res) => {
  try {
    // This would require analysis of your specific dataset structure
    // For now, return mock data based on common network attack types
    const mockDistribution = [
      { type: 'Normal', count: 156789, percentage: 75.2 },
      { type: 'DoS', count: 25432, percentage: 12.2 },
      { type: 'Probe', count: 15678, percentage: 7.5 },
      { type: 'U2R', count: 6789, percentage: 3.3 },
      { type: 'R2L', count: 3456, percentage: 1.7 },
      { type: 'Other', count: 234, percentage: 0.1 }
    ];

    res.json({
      success: true,
      message: 'Attack distribution data retrieved successfully',
      data: mockDistribution
    });

  } catch (error) {
    logger.error('Error fetching attack distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attack distribution data'
    });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent system activity
// @access  Private
router.get('/recent-activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const limit = parseInt(req.query.limit) || 10;

    let activities = [];

    // Get recent model results
    let resultsQuery = `
      SELECT 
        'prediction' as activity_type,
        mr.created_at,
        m.name as model_name,
        d.original_name as dataset_name,
        mr.accuracy,
        u.username
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      JOIN users u ON mr.user_id = u.id
    `;
    let resultsParams = [];

    if (!isAdmin) {
      resultsQuery += ' WHERE mr.user_id = ?';
      resultsParams.push(userId);
    }

    resultsQuery += ' ORDER BY mr.created_at DESC LIMIT ?';
    resultsParams.push(Math.floor(limit / 2));

    const recentResults = await executeQuery(resultsQuery, resultsParams);

    // Get recent dataset uploads
    let uploadsQuery = `
      SELECT 
        'upload' as activity_type,
        du.upload_date as created_at,
        du.original_name as dataset_name,
        du.file_size,
        u.username
      FROM dataset_uploads du
      JOIN users u ON du.uploaded_by = u.id
    `;
    let uploadsParams = [];

    if (!isAdmin) {
      uploadsQuery += ' WHERE du.uploaded_by = ?';
      uploadsParams.push(userId);
    }

    uploadsQuery += ' ORDER BY du.upload_date DESC LIMIT ?';
    uploadsParams.push(Math.floor(limit / 2));

    const recentUploads = await executeQuery(uploadsQuery, uploadsParams);

    // Combine and sort activities
    activities = [...recentResults, ...recentUploads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    res.json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: activities
    });

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activity'
    });
  }
});

// @route   GET /api/dashboard/stats
// @desc    Get comprehensive dashboard statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Get user-specific stats
    const [userStats] = await executeQuery(`
      SELECT 
        COUNT(DISTINCT mr.id) as total_tests,
        COALESCE(AVG(mr.accuracy), 0) as avg_accuracy,
        COUNT(CASE WHEN mr.accuracy < 80 THEN 1 END) as potential_threats,
        COUNT(CASE WHEN mr.accuracy >= 95 THEN 1 END) as high_performance,
        MAX(mr.created_at) as last_test_date
      FROM model_results mr
      WHERE mr.user_id = ?
    `, [userId]);

    // Get recent test results for user
    const recentTests = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.execution_time, mr.created_at,
             m.task_id as model_name, m.current_model as algorithm,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 5
    `, [userId]);

    // Get active training jobs for user
    const [activeTraining] = await executeQuery(`
      SELECT COUNT(*) as active_jobs
      FROM ml_models
      WHERE user_id = ? AND status IN ('running', 'pending')
    `, [userId]);

    let systemStats = {};
    if (isAdmin) {
      // Admin gets system-wide stats
      const [systemWideStats] = await executeQuery(`
        SELECT 
          COUNT(DISTINCT mr.id) as total_tests_all,
          COUNT(DISTINCT mr.user_id) as active_users,
          COALESCE(AVG(mr.accuracy), 0) as system_avg_accuracy,
          COUNT(CASE WHEN mr.accuracy < 80 THEN 1 END) as system_threats,
          COUNT(CASE WHEN mr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as tests_this_week
        FROM model_results mr
      `);

      const topPerformers = await executeQuery(`
        SELECT u.username, u.id,
               COUNT(mr.id) as test_count,
               COALESCE(AVG(mr.accuracy), 0) as avg_accuracy,
               MAX(mr.created_at) as last_activity
        FROM users u
        JOIN model_results mr ON u.id = mr.user_id
        GROUP BY u.id, u.username
        HAVING test_count > 0
        ORDER BY avg_accuracy DESC, test_count DESC
        LIMIT 5
      `);

      systemStats = {
        ...systemWideStats,
        top_performers: topPerformers
      };
    }

    // Get weekly activity data
    const weeklyActivity = await executeQuery(`
      SELECT 
        DATE(mr.created_at) as date,
        COUNT(*) as tests,
        COALESCE(AVG(mr.accuracy), 0) as avg_accuracy
      FROM model_results mr
      WHERE mr.user_id = ? 
        AND mr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(mr.created_at)
      ORDER BY date DESC
    `, [userId]);

    res.json({
      success: true,
      data: {
        user_stats: userStats || {
          total_tests: 0,
          avg_accuracy: 0,
          potential_threats: 0,
          high_performance: 0,
          last_test_date: null
        },
        recent_tests: recentTests,
        active_training: activeTraining || { active_jobs: 0 },
        weekly_activity: weeklyActivity,
        system_stats: systemStats
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/threats
// @desc    Get threat analysis data
// @access  Private
router.get('/threats', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const userCondition = isAdmin ? '' : 'WHERE mr.user_id = ?';
    const params = isAdmin ? [] : [userId];

    // Threat distribution by accuracy ranges
    const threatDistribution = await executeQuery(`
      SELECT 
        CASE 
          WHEN mr.accuracy >= 95 THEN 'Excellent'
          WHEN mr.accuracy >= 90 THEN 'Very Good'
          WHEN mr.accuracy >= 80 THEN 'Good'
          WHEN mr.accuracy >= 70 THEN 'Fair'
          ELSE 'Needs Attention'
        END as threat_level,
        COUNT(*) as count,
        COALESCE(AVG(mr.accuracy), 0) as avg_accuracy
      FROM model_results mr
      ${userCondition}
      GROUP BY 
        CASE 
          WHEN mr.accuracy >= 95 THEN 'Excellent'
          WHEN mr.accuracy >= 90 THEN 'Very Good'
          WHEN mr.accuracy >= 80 THEN 'Good'
          WHEN mr.accuracy >= 70 THEN 'Fair'
          ELSE 'Needs Attention'
        END
      ORDER BY avg_accuracy DESC
    `, params);

    // Algorithm performance comparison
    const algorithmPerformance = await executeQuery(`
      SELECT 
        m.current_model as algorithm,
        COUNT(mr.id) as test_count,
        COALESCE(AVG(mr.accuracy), 0) as avg_accuracy,
        COALESCE(AVG(mr.precision_score), 0) as avg_precision,
        COALESCE(AVG(mr.recall_score), 0) as avg_recall,
        COALESCE(AVG(mr.f1_score), 0) as avg_f1,
        COALESCE(AVG(mr.execution_time), 0) as avg_execution_time
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      ${userCondition}
      GROUP BY m.current_model
      HAVING test_count > 0
      ORDER BY avg_accuracy DESC
    `, params);

    res.json({
      success: true,
      data: {
        threat_distribution: threatDistribution,
        algorithm_performance: algorithmPerformance
      }
    });

  } catch (error) {
    logger.error('Error fetching threat analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch threat analysis',
      error: error.message
    });
  }
});

module.exports = router;
