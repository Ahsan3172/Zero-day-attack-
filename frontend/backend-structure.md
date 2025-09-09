# Backend Structure for CyberGuard ML

Since Lovable focuses on frontend development, here's the recommended backend structure you would need to implement separately using Python/Flask or FastAPI:

## Core Backend Components

### 1. API Endpoints (`app.py`)
```python
from flask import Flask, request, jsonify
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
import pickle
import numpy as np

app = Flask(__name__)

# Dataset upload and processing
@app.route('/api/upload-dataset', methods=['POST'])
def upload_dataset():
    # Handle CSV file upload
    # Validate and store dataset
    pass

@app.route('/api/train-model', methods=['POST'])
def train_model():
    # Train selected ML model
    # Return training progress and results
    pass

@app.route('/api/apply-smote', methods=['POST'])
def apply_smote():
    # Apply SMOTE to balance dataset
    # Return class distribution before/after
    pass

@app.route('/api/feature-selection', methods=['POST'])
def feature_selection():
    # Apply feature selection techniques
    # Return selected features and performance comparison
    pass

@app.route('/api/predict', methods=['POST'])
def predict():
    # Make predictions on new data
    # Return prediction results with confidence
    pass

@app.route('/api/network-monitor', methods=['GET'])
def network_monitor():
    # Real-time network traffic analysis
    # Return live monitoring data
    pass
```

### 2. ML Model Handler (`models/ml_handler.py`)
```python
class MLHandler:
    def __init__(self):
        self.models = {
            'random_forest': RandomForestClassifier(n_estimators=100),
            'isolation_forest': IsolationForest(contamination=0.1),
            'ocsvm': OneClassSVM(gamma='auto'),
            'lof': LocalOutlierFactor(novelty=True)
        }
        
    def train_model(self, X_train, y_train, model_name):
        # Training logic for different models
        pass
        
    def evaluate_model(self, X_test, y_test, model):
        # Model evaluation and metrics calculation
        pass
```

### 3. Data Preprocessing (`preprocessing/data_processor.py`)
```python
class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_selector = None
        
    def load_unsw_nb15(self, file_path):
        # Load and preprocess UNSW-NB15 dataset
        pass
        
    def apply_feature_selection(self, X, y, method='rfe'):
        # Apply various feature selection techniques
        pass
        
    def apply_smote(self, X, y):
        # Apply SMOTE for class balancing
        pass
```

### 4. Network Traffic Capture (`network/traffic_monitor.py`)
```python
import scapy.all as scapy
import threading

class NetworkMonitor:
    def __init__(self):
        self.is_monitoring = False
        self.packet_buffer = []
        
    def start_monitoring(self, interface='eth0'):
        # Start capturing network packets
        pass
        
    def process_packet(self, packet):
        # Extract features from network packet
        # Apply trained model for prediction
        pass
        
    def get_real_time_stats(self):
        # Return real-time network statistics
        pass
```

### 5. Database Models (`database/models.py`)
```python
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Dataset(Base):
    __tablename__ = 'datasets'
    id = Column(Integer, primary_key=True)
    filename = Column(String(255))
    upload_date = Column(DateTime)
    num_samples = Column(Integer)
    num_features = Column(Integer)

class ModelResults(Base):
    __tablename__ = 'model_results'
    id = Column(Integer, primary_key=True)
    model_name = Column(String(100))
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    training_date = Column(DateTime)

class NetworkAlerts(Base):
    __tablename__ = 'network_alerts'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    source_ip = Column(String(45))
    alert_type = Column(String(50))
    confidence = Column(Float)
    description = Column(String(500))
```

## Required Python Dependencies
```txt
flask==2.3.3
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3
imbalanced-learn==0.11.0
scapy==2.5.0
sqlalchemy==2.0.20
flask-cors==4.0.0
pickle-mixin==1.0.2
```

## Installation & Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask application
python app.py
```

## Frontend-Backend Integration
The React frontend would communicate with this backend via HTTP API calls. Key integration points:

1. **File Upload**: Use FormData to send CSV files to `/api/upload-dataset`
2. **WebSocket Connection**: For real-time network monitoring updates
3. **Polling**: Regular API calls to get training progress and live statistics
4. **State Management**: Use React Query or similar for API state management

## Security Considerations
- Input validation for all uploaded files
- Rate limiting for API endpoints
- Authentication and authorization for sensitive operations
- Secure handling of network traffic data
- HTTPS encryption for all communications

This backend structure provides the foundation for all the ML operations shown in the frontend interface.