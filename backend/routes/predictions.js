const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const mlApiService = require('../services/mlApiService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/predictions');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for prediction files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// @route   POST /api/predictions/single
// @desc    Make a single prediction
// @access  Private
router.post('/single', authenticateToken, async (req, res) => {
  try {
    const { data, model_type = 'random_forest' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Network data is required for prediction'
      });
    }

    const prediction = await mlApiService.predictSingle(data, model_type);
    
    // Save prediction to database
    await executeQuery(`
      INSERT INTO predictions (user_id, prediction_type, model_used, input_data, result, created_at)
      VALUES (?, 'single', ?, ?, ?, NOW())
    `, [req.user.id, model_type, JSON.stringify(data), JSON.stringify(prediction.data)]);

    res.json({
      success: true,
      data: prediction,
      message: 'Single prediction completed successfully'
    });
  } catch (error) {
    logger.error('Error making single prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make prediction',
      details: error.message
    });
  }
});

// @route   POST /api/predictions/batch
// @desc    Make batch predictions
// @access  Private
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { data, model_type = 'random_forest' } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of network data is required for batch prediction'
      });
    }

    const predictions = await mlApiService.predictBatch(data, model_type);
    
    // Save batch prediction to database
    await executeQuery(`
      INSERT INTO predictions (user_id, prediction_type, model_used, input_data, result, batch_size, created_at)
      VALUES (?, 'batch', ?, ?, ?, ?, NOW())
    `, [req.user.id, model_type, JSON.stringify(data), JSON.stringify(predictions.data), data.length]);

    res.json({
      success: true,
      data: predictions,
      message: `Batch prediction completed for ${data.length} samples`
    });
  } catch (error) {
    logger.error('Error making batch predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make batch predictions',
      details: error.message
    });
  }
});

// @route   POST /api/predictions/file
// @desc    Make predictions from uploaded file
// @access  Private
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { model_type = 'random_forest' } = req.body;
    
    // Read file and send to ML API
    const fileBuffer = fs.readFileSync(req.file.path);
    const predictions = await mlApiService.predictFromFile(fileBuffer, req.file.originalname, model_type);
    
    // Save file prediction to database
    await executeQuery(`
      INSERT INTO predictions (user_id, prediction_type, model_used, file_path, result, created_at)
      VALUES (?, 'file', ?, ?, ?, NOW())
    `, [req.user.id, model_type, req.file.path, JSON.stringify(predictions.data)]);

    // Clean up uploaded file after processing
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      data: {
        predictions: predictions.data,
        file_info: {
          filename: req.file.originalname,
          size: req.file.size
        }
      },
      message: 'File predictions completed successfully'
    });
  } catch (error) {
    logger.error('Error making file predictions:', error);
    
    // Clean up file if prediction failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to make file predictions',
      details: error.message
    });
  }
});

// @route   POST /api/predictions/ensemble
// @desc    Make ensemble predictions using multiple models
// @access  Private
router.post('/ensemble', authenticateToken, async (req, res) => {
  try {
    const { data, model_types = ['random_forest', 'isolation_forest'] } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of network data is required for ensemble prediction'
      });
    }

    const predictions = await mlApiService.predictEnsemble(data, model_types);
    
    // Save ensemble prediction to database
    await executeQuery(`
      INSERT INTO predictions (user_id, prediction_type, model_used, input_data, result, batch_size, created_at)
      VALUES (?, 'ensemble', ?, ?, ?, ?, NOW())
    `, [req.user.id, model_types.join(','), JSON.stringify(data), JSON.stringify(predictions.data), data.length]);

    res.json({
      success: true,
      data: predictions,
      message: `Ensemble prediction completed using ${model_types.length} models`
    });
  } catch (error) {
    logger.error('Error making ensemble predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make ensemble predictions',
      details: error.message
    });
  }
});

// @route   POST /api/predictions/realtime-stream
// @desc    Process real-time stream of network data
// @access  Private
router.post('/realtime-stream', authenticateToken, async (req, res) => {
  try {
    const { 
      data, 
      model_type = 'random_forest', 
      threshold_confidence = 0.8 
    } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of network data is required for real-time stream processing'
      });
    }

    const streamResults = await mlApiService.processRealtimeStream(data, model_type, threshold_confidence);
    
    // Save stream processing results
    await executeQuery(`
      INSERT INTO predictions (user_id, prediction_type, model_used, input_data, result, batch_size, created_at)
      VALUES (?, 'realtime_stream', ?, ?, ?, ?, NOW())
    `, [req.user.id, model_type, JSON.stringify(data), JSON.stringify(streamResults.data), data.length]);

    // If there are high-priority alerts, log them separately
    const alerts = streamResults.data.alerts || [];
    for (const alert of alerts) {
      if (alert.alert_level === 'HIGH') {
        await executeQuery(`
          INSERT INTO security_alerts (user_id, alert_level, confidence, model_used, alert_data, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [req.user.id, alert.alert_level, alert.confidence, model_type, JSON.stringify(alert)]);
      }
    }

    res.json({
      success: true,
      data: streamResults,
      message: `Real-time stream processed: ${alerts.length} alerts generated`
    });
  } catch (error) {
    logger.error('Error processing real-time stream:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process real-time stream',
      details: error.message
    });
  }
});

// @route   GET /api/predictions/history
// @desc    Get prediction history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const prediction_type = req.query.type;

    // Get from ML API
    const mlApiHistory = await mlApiService.getPredictionHistory(limit);
    
    // Get from database
    let query = `
      SELECT p.id, p.prediction_type, p.model_used, p.batch_size, p.created_at, u.username
      FROM predictions p
      JOIN users u ON p.user_id = u.id
    `;
    let params = [];

    if (prediction_type) {
      query += ' WHERE p.prediction_type = ?';
      params.push(prediction_type);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const dbHistory = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM predictions';
    let countParams = [];
    if (prediction_type) {
      countQuery += ' WHERE prediction_type = ?';
      countParams.push(prediction_type);
    }
    
    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      success: true,
      data: {
        ml_api_history: mlApiHistory.data || {},
        database_history: dbHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Prediction history retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting prediction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prediction history',
      details: error.message
    });
  }
});

// @route   GET /api/predictions/alerts
// @desc    Get security alerts from predictions
// @access  Private
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const alert_level = req.query.level;

    let query = `
      SELECT sa.*, u.username
      FROM security_alerts sa
      JOIN users u ON sa.user_id = u.id
    `;
    let params = [];

    if (alert_level) {
      query += ' WHERE sa.alert_level = ?';
      params.push(alert_level);
    }

    query += ' ORDER BY sa.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const alerts = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM security_alerts';
    let countParams = [];
    if (alert_level) {
      countQuery += ' WHERE alert_level = ?';
      countParams.push(alert_level);
    }
    
    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Security alerts retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security alerts',
      details: error.message
    });
  }
});

// @route   GET /api/predictions/statistics
// @desc    Get prediction statistics
// @access  Private
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Get from ML API
    const mlApiStats = await mlApiService.getDataStatistics();
    
    // Get from database
    const [totalPredictions] = await executeQuery('SELECT COUNT(*) as count FROM predictions', []);
    const [totalAlerts] = await executeQuery('SELECT COUNT(*) as count FROM security_alerts', []);
    
    const predictionsByType = await executeQuery(`
      SELECT prediction_type, COUNT(*) as count
      FROM predictions
      GROUP BY prediction_type
    `, []);

    const alertsByLevel = await executeQuery(`
      SELECT alert_level, COUNT(*) as count
      FROM security_alerts
      GROUP BY alert_level
    `, []);

    const recentActivity = await executeQuery(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM predictions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, []);

    res.json({
      success: true,
      data: {
        ml_api_statistics: mlApiStats.data || {},
        database_statistics: {
          total_predictions: totalPredictions.count,
          total_alerts: totalAlerts.count,
          predictions_by_type: predictionsByType,
          alerts_by_level: alertsByLevel,
          recent_activity: recentActivity
        }
      },
      message: 'Prediction statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting prediction statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prediction statistics',
      details: error.message
    });
  }
});

module.exports = router;
