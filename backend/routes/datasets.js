const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/datasets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'csv,xlsx,json').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600 // 100MB default
  },
  fileFilter: fileFilter
});

// Helper function to analyze CSV file
const analyzeCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let columnCount = 0;
    let columns = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        columns = headers;
        columnCount = headers.length;
      })
      .on('data', (data) => {
        rowCount++;
        if (rowCount <= 5) { // Store first 5 rows for preview
          results.push(data);
        }
      })
      .on('end', () => {
        resolve({
          rowCount,
          columnCount,
          columns,
          preview: results
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// @route   POST /api/datasets/upload
// @desc    Upload a dataset file
// @access  Private
router.post('/upload', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { filename, originalname, size, path: filePath } = req.file;
    const userId = req.user.id;

    // Analyze the file (currently only supports CSV)
    let analysis = null;
    if (path.extname(originalname).toLowerCase() === '.csv') {
      try {
        analysis = await analyzeCsvFile(filePath);
      } catch (error) {
        logger.error('Error analyzing CSV file:', error);
        // Delete the uploaded file if analysis fails
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: 'Failed to analyze CSV file. Please check the file format.'
        });
      }
    }

    // Insert dataset record into database
    const result = await executeQuery(`
      INSERT INTO dataset_uploads 
      (filename, original_name, file_path, file_size, rows_count, columns_count, uploaded_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'processed')
    `, [
      filename,
      originalname,
      filePath,
      size,
      analysis ? analysis.rowCount : null,
      analysis ? analysis.columnCount : null,
      userId
    ]);

    logger.info(`User ${req.user.username} uploaded dataset: ${originalname}`);

    res.status(201).json({
      success: true,
      message: 'Dataset uploaded successfully',
      data: {
        id: result.insertId,
        filename: originalname,
        size: size,
        rows: analysis ? analysis.rowCount : null,
        columns: analysis ? analysis.columnCount : null,
        columnNames: analysis ? analysis.columns : null,
        preview: analysis ? analysis.preview : null,
        uploadedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Error uploading dataset:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload dataset'
    });
  }
});

// @route   GET /api/datasets
// @desc    Get user's uploaded datasets
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const datasets = await executeQuery(`
      SELECT id, filename, original_name, file_size, rows_count, columns_count, 
             upload_date, status
      FROM dataset_uploads 
      WHERE uploaded_by = ?
      ORDER BY upload_date DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM dataset_uploads WHERE uploaded_by = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Datasets retrieved successfully',
      data: {
        datasets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching datasets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve datasets'
    });
  }
});

// @route   GET /api/datasets/all
// @desc    Get all datasets (for model training)
// @access  Private
router.get('/all', async (req, res) => {
  try {
    const datasets = await executeQuery(`
      SELECT d.id, d.original_name, d.file_size, d.rows_count, d.columns_count, 
             d.upload_date, u.username as uploaded_by
      FROM dataset_uploads d
      JOIN users u ON d.uploaded_by = u.id
      WHERE d.status = 'processed'
      ORDER BY d.upload_date DESC
    `);

    res.json({
      success: true,
      message: 'All datasets retrieved successfully',
      data: datasets
    });

  } catch (error) {
    logger.error('Error fetching all datasets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve datasets'
    });
  }
});

// @route   GET /api/datasets/:id
// @desc    Get specific dataset details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const datasets = await executeQuery(`
      SELECT d.*, u.username as uploaded_by_username
      FROM dataset_uploads d
      JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = ?
    `, [id]);

    if (datasets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    const dataset = datasets[0];

    // Check if user owns the dataset or is admin
    if (dataset.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get preview data if it's a CSV file
    let preview = null;
    if (path.extname(dataset.original_name).toLowerCase() === '.csv') {
      try {
        const analysis = await analyzeCsvFile(dataset.file_path);
        preview = analysis.preview;
      } catch (error) {
        logger.error('Error getting dataset preview:', error);
      }
    }

    res.json({
      success: true,
      message: 'Dataset retrieved successfully',
      data: {
        ...dataset,
        preview
      }
    });

  } catch (error) {
    logger.error('Error fetching dataset details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dataset details'
    });
  }
});

// @route   DELETE /api/datasets/:id
// @desc    Delete a dataset
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get dataset info
    const datasets = await executeQuery(
      'SELECT * FROM dataset_uploads WHERE id = ?',
      [id]
    );

    if (datasets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    const dataset = datasets[0];

    // Check if user owns the dataset or is admin
    if (dataset.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if dataset is being used by any models
    const modelsUsingDataset = await executeQuery(
      'SELECT COUNT(*) as count FROM model_results WHERE dataset_id = ?',
      [id]
    );

    if (modelsUsingDataset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete dataset. It is being used by existing model results.'
      });
    }

    // Delete the physical file
    try {
      if (fs.existsSync(dataset.file_path)) {
        fs.unlinkSync(dataset.file_path);
      }
    } catch (fileError) {
      logger.error('Error deleting physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await executeQuery('DELETE FROM dataset_uploads WHERE id = ?', [id]);

    logger.info(`User ${req.user.username} deleted dataset: ${dataset.original_name}`);

    res.json({
      success: true,
      message: 'Dataset deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting dataset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete dataset'
    });
  }
});

// @route   GET /api/datasets/:id/download
// @desc    Download a dataset file
// @access  Private
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const datasets = await executeQuery(
      'SELECT * FROM dataset_uploads WHERE id = ?',
      [id]
    );

    if (datasets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    const dataset = datasets[0];

    // Check if user owns the dataset or is admin
    if (dataset.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(dataset.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Send file
    res.download(dataset.file_path, dataset.original_name, (error) => {
      if (error) {
        logger.error('Error downloading file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download file'
          });
        }
      }
    });

  } catch (error) {
    logger.error('Error processing download:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process download'
    });
  }
});

module.exports = router;
