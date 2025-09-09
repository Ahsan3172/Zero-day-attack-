# Zero Day Attack Detection API

A comprehensive FastAPI-based machine learning API for network intrusion detection using multiple ML models including Random Forest, Isolation Forest, One-Class SVM, and Autoencoder.

## 🚀 Features

### Machine Learning Models
- **Random Forest**: Supervised ensemble learning for high accuracy classification
- **Isolation Forest**: Unsupervised anomaly detection for identifying outliers
- **One-Class SVM**: Support Vector Machine for novelty detection
- **Autoencoder**: Deep learning neural network for complex pattern recognition

### API Capabilities
- **Dataset Management**: Upload, validate, and process CSV datasets
- **Model Training**: Background training of multiple models with progress tracking
- **Predictions**: Single, batch, and ensemble predictions
- **Real-time Processing**: Stream processing for live network monitoring
- **Model Comparison**: Performance metrics and recommendations
- **Results Management**: History tracking and file management

## 📋 Requirements

### Python Dependencies
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pandas==2.1.3
numpy==1.24.3
scikit-learn==1.3.2
scipy==1.11.4
joblib==1.3.2
tensorflow==2.15.0
aiofiles==23.2.1
python-multipart==0.0.6
pydantic==2.5.0
matplotlib==3.8.2
seaborn==0.13.0
```

### System Requirements
- Python 3.8+
- 4GB+ RAM (recommended for training)
- 1GB+ disk space for models and data

## 🛠 Installation

1. **Clone or navigate to the API directory**
```bash
cd api
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Start the API server**
```bash
python start_server.py
```

Or directly with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 📖 API Documentation

### Base URL
```
http://localhost:8000
```

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 API Endpoints

### General Endpoints
- `GET /` - API root and information
- `GET /health` - Health check
- `GET /info` - Detailed API information

### Data Management (`/api/v1/data/`)
- `POST /upload` - Upload dataset file
- `POST /validate` - Validate dataset
- `POST /process` - Process dataset with feature engineering
- `GET /files` - List uploaded files
- `GET /files/{file_name}` - Get file information
- `DELETE /files/{file_name}` - Delete uploaded file
- `POST /cleanup` - Clean up old files
- `GET /statistics` - Get storage statistics

### Model Management (`/api/v1/models/`)
- `GET /` - List available models
- `GET /{model_name}` - Get model details
- `GET /{model_name}/performance` - Get performance metrics
- `DELETE /{model_name}` - Delete model
- `GET /compare` - Compare multiple models
- `GET /recommendations` - Get model recommendations

### Training (`/api/v1/train/`)
- `POST /` - Start model training
- `GET /status/{task_id}` - Get training status
- `GET /active` - Get active training tasks
- `GET /history` - Get training history
- `POST /quick` - Quick single model training
- `DELETE /cancel/{task_id}` - Cancel training
- `GET /recommendations` - Get training recommendations

### Predictions (`/api/v1/predict/`)
- `POST /single` - Single prediction
- `POST /batch` - Batch predictions
- `POST /file` - Predictions from file
- `POST /ensemble` - Ensemble predictions
- `POST /realtime/stream` - Real-time stream processing
- `GET /capabilities/{model_type}` - Get model capabilities
- `GET /history` - Get prediction history
- `DELETE /history/{filename}` - Delete prediction results

## 📊 Usage Examples

### 1. Upload Dataset
```python
import requests

# Upload dataset
with open('network_data.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/data/upload',
        files={'file': f}
    )
print(response.json())
```

### 2. Train Models
```python
import requests

# Start training
response = requests.post(
    'http://localhost:8000/api/v1/train/',
    json={
        "model_types": ["random_forest", "isolation_forest"],
        "test_size": 0.2,
        "random_state": 42
    }
)

task_id = response.json()['data']['task_id']

# Check training status
status_response = requests.get(
    f'http://localhost:8000/api/v1/train/status/{task_id}'
)
print(status_response.json())
```

### 3. Make Predictions
```python
import requests

# Single prediction
prediction_data = {
    "data": {
        "dur": 0.121,
        "spkts": 13,
        "dpkts": 7,
        "sbytes": 803,
        "dbytes": 508,
        "rate": 100.5,
        "sload": 6635.5,
        "dload": 4196.7,
        "proto": "tcp",
        "service": "http",
        "state": "FIN"
    },
    "model_type": "random_forest"
}

response = requests.post(
    'http://localhost:8000/api/v1/predict/single',
    json=prediction_data
)
print(response.json())
```

### 4. Batch Predictions from File
```python
import requests

# Upload file for batch prediction
with open('test_data.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/predict/file',
        files={'file': f},
        data={'model_type': 'random_forest'}
    )
print(response.json())
```

## 🧠 Model Information

### Random Forest
- **Type**: Supervised Learning
- **Use Case**: General intrusion detection with high accuracy
- **Advantages**: Feature importance, robust, handles mixed data types
- **Training Time**: Medium
- **Prediction Speed**: Fast

### Isolation Forest
- **Type**: Unsupervised Anomaly Detection
- **Use Case**: Unknown attack patterns, outlier detection
- **Advantages**: No labeled anomalies needed, fast training
- **Training Time**: Fast
- **Prediction Speed**: Very Fast

### One-Class SVM
- **Type**: Novelty Detection
- **Use Case**: Zero-day attacks, limited training data
- **Advantages**: Effective boundary learning, works with normal data only
- **Training Time**: Slow
- **Prediction Speed**: Medium

### Autoencoder
- **Type**: Deep Learning Anomaly Detection
- **Use Case**: Complex pattern recognition, large datasets
- **Advantages**: Feature learning, handles complex patterns
- **Training Time**: Slow
- **Prediction Speed**: Medium

## 📁 Project Structure

```
api/
├── main.py                 # FastAPI application
├── start_server.py        # Server startup script
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── models/
│   ├── __init__.py
│   ├── ml_pipeline.py     # ML pipeline manager
│   ├── data_processor.py  # Data processing utilities
│   ├── model_trainer.py   # Model training logic
│   └── predictor.py       # Prediction utilities
├── routes/
│   ├── __init__.py
│   ├── models.py          # Model management routes
│   ├── data.py           # Data management routes
│   ├── predictions.py     # Prediction routes
│   └── training.py        # Training routes
├── utils/
│   ├── __init__.py
│   ├── file_handler.py    # File management utilities
│   └── response_formatter.py # Response formatting
├── uploads/               # Uploaded files directory
├── results/              # Results and predictions
└── saved_models/         # Trained models storage
```

## 🔧 Configuration

The API uses environment variables for configuration. Create a `.env` file or set environment variables:

```bash
# API Settings
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=True

# File Settings
MAX_FILE_SIZE_MB=100
UPLOAD_DIR=uploads
RESULTS_DIR=results
MODELS_DIR=saved_models

# ML Settings
DEFAULT_TEST_SIZE=0.2
DEFAULT_RANDOM_STATE=42
DEFAULT_MODEL_TYPE=random_forest

# Dataset Settings
DEFAULT_DATASET_PATH=/path/to/your/dataset.csv

# Logging
LOG_LEVEL=INFO
LOG_FILE=api.log
```

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:8000/health
```

### Get API Information
```bash
curl http://localhost:8000/info
```

### List Available Models
```bash
curl http://localhost:8000/api/v1/models/
```

## 🚨 Error Handling

The API provides comprehensive error handling with detailed error messages:

```json
{
    "success": false,
    "error": "Error description",
    "error_code": "ERROR_TYPE",
    "timestamp": "2024-01-01T12:00:00",
    "details": {
        "additional": "error context"
    }
}
```

## 📈 Performance Monitoring

### Training Progress
Monitor training progress in real-time:
- Track progress percentage
- Monitor current model being trained
- View completed models
- Check for errors

### Prediction Analytics
- Track prediction history
- Monitor attack detection rates
- Analyze model performance
- View confidence scores

## 🔒 Security Considerations

- File upload size limits
- Input validation for all endpoints
- CORS configuration for web applications
- Error message sanitization
- Request rate limiting (can be added)

## 🤝 Integration

### With Frontend Applications
The API is designed to work seamlessly with web applications:
- CORS enabled for localhost development
- RESTful API design
- JSON response format
- WebSocket support (can be added for real-time updates)

### With External Systems
- CSV file format support
- Batch processing capabilities
- Results export functionality
- Model persistence

## 📝 Logging

The API provides comprehensive logging:
- Request/response logging
- Error tracking
- Performance metrics
- Training progress logs

## 🚀 Deployment

### Development
```bash
python start_server.py
```

### Production
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)
Create a Dockerfile for containerized deployment:
```dockerfile
FROM python:3.9
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📞 Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review the logs in `api.log`
3. Verify configuration settings
4. Ensure all dependencies are installed

## 🔄 Updates and Maintenance

### Model Retraining
Models can be retrained with new data:
1. Upload new dataset
2. Start training process
3. Monitor progress
4. Replace old models

### Data Cleanup
Regular maintenance tasks:
- Clean up old uploaded files
- Archive prediction results
- Monitor disk usage
- Update model performance metrics

This API provides a complete solution for network intrusion detection with machine learning, offering flexibility, scalability, and comprehensive monitoring capabilities.
