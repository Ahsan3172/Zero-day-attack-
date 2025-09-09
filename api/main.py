from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
from pathlib import Path

# Import route modules
from routes import models, data, predictions, training
from utils.response_formatter import ResponseFormatter
from config import Config

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Zero Day Attack Detection API",
    description="API for network intrusion detection using multiple ML models (Random Forest, Isolation Forest, One-Class SVM, Autoencoder)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize response formatter
response_formatter = ResponseFormatter()

# Include routers
app.include_router(models.router)
app.include_router(data.router)
app.include_router(predictions.router)
app.include_router(training.router)
# Root endpoints
@app.get("/")
async def root():
    """API root endpoint"""
    return response_formatter.success_response(
        data={
            "api_name": "Zero Day Attack Detection API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "docs": "/docs",
                "redoc": "/redoc",
                "health": "/health",
                "models": "/api/v1/models",
                "data": "/api/v1/data",
                "predictions": "/api/v1/predict",
                "training": "/api/v1/train"
            }
        },
        message="Zero Day Attack Detection API is running"
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if directories exist
        directories_status = {
            "models_dir": Config.MODELS_DIR.exists(),
            "upload_dir": Config.UPLOAD_DIR.exists(),
            "results_dir": Config.RESULTS_DIR.exists()
        }
        
        # Check if default dataset exists
        import os
        dataset_exists = os.path.exists(Config.DEFAULT_DATASET_PATH)
        
        return response_formatter.health_check_response(
            status="healthy",
            additional_info={
                "directories": directories_status,
                "default_dataset_available": dataset_exists,
                "config": {
                    "api_host": Config.API_HOST,
                    "api_port": Config.API_PORT,
                    "max_file_size_mb": Config.MAX_FILE_SIZE_MB
                }
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/info")
async def api_info():
    """Get detailed API information"""
    return response_formatter.success_response(
        data={
            "api_info": {
                "name": "Zero Day Attack Detection API",
                "version": "1.0.0",
                "description": "Comprehensive API for network intrusion detection using multiple ML models"
            },
            "supported_models": [
                {
                    "name": "Random Forest",
                    "type": "supervised",
                    "description": "Ensemble learning method for classification with high accuracy"
                },
                {
                    "name": "Isolation Forest", 
                    "type": "anomaly_detection",
                    "description": "Unsupervised anomaly detection for identifying outliers"
                },
                {
                    "name": "One-Class SVM",
                    "type": "anomaly_detection", 
                    "description": "Support Vector Machine for novelty detection"
                },
                {
                    "name": "Autoencoder",
                    "type": "deep_learning",
                    "description": "Neural network for complex pattern recognition and anomaly detection"
                }
            ],
            "features": [
                "Dataset upload and validation",
                "Automated data preprocessing and feature engineering", 
                "Multiple ML model training",
                "Single and batch predictions",
                "Ensemble predictions using multiple models",
                "Real-time prediction capabilities",
                "Model performance comparison",
                "Training progress tracking",
                "Results history and management"
            ],
            "configuration": {
                "max_file_size_mb": Config.MAX_FILE_SIZE_MB,
                "default_test_size": Config.DEFAULT_TEST_SIZE,
                "supported_formats": ["CSV"],
                "cors_origins": Config.CORS_ORIGINS
            }
        },
        message="API information retrieved successfully"
    )

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Zero Day Attack Detection API...")
    logger.info(f"📍 Host: {Config.API_HOST}:{Config.API_PORT}")
    logger.info(f"📁 Models Directory: {Config.MODELS_DIR}")
    logger.info(f"📤 Upload Directory: {Config.UPLOAD_DIR}")
    
    uvicorn.run(
        "main:app",
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=Config.API_RELOAD,
        log_level=Config.LOG_LEVEL.lower()
    )
