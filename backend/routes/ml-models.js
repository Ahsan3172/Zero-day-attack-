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
    const uploadPath = path.join(__dirname, '../uploads/datasets');
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
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// @route   GET /api/models/health
// @desc    Check ML API health status
// @access  Private
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const healthStatus = await mlApiService.checkHealth();
    res.json({
      success: true,
      data: healthStatus,
      message: 'ML API health check completed'
    });
  } catch (error) {
    logger.error('ML API health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'ML API is not available',
      details: error.message
    });
  }
});

// @route   GET /api/models
// @desc    Get all available ML models from ML API and database
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get models from ML API
    const mlApiModels = await mlApiService.getAvailableModels();
    
    // Get models from database
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const dbModels = await executeQuery(`
      SELECT m.id, m.name, m.description, m.model_type, m.algorithm, 
             m.accuracy, m.precision_score, m.recall_score, m.f1_score, 
             m.status, m.created_at, u.username as created_by
      FROM ml_models m
      JOIN users u ON m.created_by = u.id
      ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [{ total }] = await executeQuery('SELECT COUNT(*) as total FROM ml_models', []);

    res.json({
      success: true,
      data: {
        ml_api_models: mlApiModels.data || [],
        database_models: dbModels,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'Models retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve models',
      details: error.message
    });
  }
});

// @route   GET /api/models/:modelName/details
// @desc    Get detailed information about a specific ML model
// @access  Private
router.get('/:modelName/details', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;
    const modelDetails = await mlApiService.getModelDetails(modelName);
    
    res.json({
      success: true,
      data: modelDetails,
      message: `Details for ${modelName} retrieved successfully`
    });
  } catch (error) {
    logger.error(`Error getting model details for ${req.params.modelName}:`, error);
    if (error.response && error.response.status === 404) {
      res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get model details',
        details: error.message
      });
    }
  }
});

// @route   GET /api/models/:modelName/performance
// @desc    Get performance metrics for a specific model
// @access  Private
router.get('/:modelName/performance', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;
    const performance = await mlApiService.getModelPerformance(modelName);
    
    res.json({
      success: true,
      data: performance,
      message: `Performance metrics for ${modelName} retrieved successfully`
    });
  } catch (error) {
    logger.error(`Error getting performance for ${req.params.modelName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model performance',
      details: error.message
    });
  }
});

// @route   POST /api/models/compare
// @desc    Compare multiple models
// @access  Private
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { model_names } = req.body;
    
    if (!model_names || !Array.isArray(model_names) || model_names.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of model names to compare'
      });
    }

    const comparison = await mlApiService.compareModels(model_names);
    
    res.json({
      success: true,
      data: comparison,
      message: 'Model comparison completed successfully'
    });
  } catch (error) {
    logger.error('Error comparing models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare models',
      details: error.message
    });
  }
});

// @route   GET /api/models/recommendations
// @desc    Get model recommendations based on use case
// @access  Private
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { use_case, dataset_size } = req.query;
    const recommendations = await mlApiService.getModelRecommendations(use_case, dataset_size);
    
    res.json({
      success: true,
      data: recommendations,
      message: 'Model recommendations retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting model recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model recommendations',
      details: error.message
    });
  }
});

// @route   POST /api/models/upload-dataset
// @desc    Upload dataset for training
// @access  Private
router.post('/upload-dataset', authenticateToken, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Read file and send to ML API
    const fileBuffer = fs.readFileSync(req.file.path);
    const uploadResult = await mlApiService.uploadDataset(fileBuffer, req.file.originalname);
    
    // Save upload info to database
    await executeQuery(`
      INSERT INTO dataset_uploads (user_id, filename, original_name, file_path, file_size, upload_date)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [req.user.id, req.file.filename, req.file.originalname, req.file.path, req.file.size]);

    res.json({
      success: true,
      data: {
        upload_result: uploadResult,
        file_info: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          path: req.file.path
        }
      },
      message: 'Dataset uploaded successfully'
    });
  } catch (error) {
    logger.error('Error uploading dataset:', error);
    
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload dataset',
      details: error.message
    });
  }
});

// @route   POST /api/models/train
// @desc    Start model training
// @access  Private (Admin/Data Scientist only)
router.post('/train', authenticateToken, requireRole(['admin', 'data_scientist']), async (req, res) => {
  try {
    const { dataset_path, model_types, test_size, random_state, outlier_method } = req.body;
    
    const trainingConfig = {
      dataset_path,
      model_types: model_types || ['random_forest', 'isolation_forest', 'one_class_svm', 'autoencoder'],
      test_size: test_size || 0.2,
      random_state: random_state || 42,
      outlier_method: outlier_method || 'iqr_cap'
    };

    const trainingResult = await mlApiService.startTraining(trainingConfig);
    
    // Save training job to database
    await executeQuery(`
      INSERT INTO ml_models (user_id, task_id, config, status, created_at)
      VALUES (?, ?, ?, 'started', NOW())
    `, [req.user.id, trainingResult.data.task_id, JSON.stringify(trainingConfig)]);

    res.json({
      success: true,
      data: trainingResult,
      message: 'Model training started successfully'
    });
  } catch (error) {
    logger.error('Error starting training:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start model training',
      details: error.message
    });
  }
});

// @route   POST /api/models/train/quick
// @desc    Quick train single model
// @access  Private (Admin/Data Scientist only)
router.post('/train/quick', authenticateToken, requireRole(['admin', 'data_scientist']), async (req, res) => {
  try {
    const { model_type, dataset_path } = req.body;
    
    if (!model_type) {
      return res.status(400).json({
        success: false,
        error: 'Model type is required'
      });
    }

    const trainingResult = await mlApiService.quickTrainModel(model_type, dataset_path);
    
    // Save quick training job to database
    await executeQuery(`
      INSERT INTO ml_models (user_id, task_id, config, status, created_at)
      VALUES (?, ?, ?, 'started', NOW())
    `, [req.user.id, trainingResult.data.task_id, JSON.stringify({ model_type, dataset_path })]);

    res.json({
      success: true,
      data: trainingResult,
      message: `Quick training started for ${model_type}`
    });
  } catch (error) {
    logger.error('Error in quick training:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start quick training',
      details: error.message
    });
  }
});

// @route   GET /api/models/train/status/:taskId
// @desc    Get training status
// @access  Private
router.get('/train/status/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await mlApiService.getTrainingStatus(taskId);
    
    // Update database with current status
    await executeQuery(`
      UPDATE ml_models SET status = ?, updated_at = NOW()
      WHERE task_id = ?
    `, [status.data.status, taskId]);

    res.json({
      success: true,
      data: status,
      message: 'Training status retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error getting training status for ${req.params.taskId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training status',
      details: error.message
    });
  }
});

// @route   GET /api/models/train/history
// @desc    Get training history
// @access  Private
router.get('/train/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get from ML API
    const mlApiHistory = await mlApiService.getTrainingHistory(limit);
    
    // Get from database
    const dbHistory = await executeQuery(`
      SELECT tj.*, u.username as created_by
      FROM ml_models tj
      JOIN users u ON tj.user_id = u.id
      ORDER BY tj.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json({
      success: true,
      data: {
        ml_api_history: mlApiHistory.data || {},
        database_history: dbHistory
      },
      message: 'Training history retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting training history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training history',
      details: error.message
    });
  }
});

// @route   DELETE /api/models/:modelName
// @desc    Delete a trained model
// @access  Private (Admin only)
router.delete('/:modelName', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { modelName } = req.params;
    const deleteResult = await mlApiService.deleteModel(modelName);
    
    res.json({
      success: true,
      data: deleteResult,
      message: `Model ${modelName} deleted successfully`
    });
  } catch (error) {
    logger.error(`Error deleting model ${req.params.modelName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete model',
      details: error.message
    });
  }
});

module.exports = router;
