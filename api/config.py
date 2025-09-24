import os
from pathlib import Path

# Suppress TensorFlow informational messages
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')  # 0=all, 1=INFO, 2=WARNING, 3=ERROR
os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')  # Disable oneDNN custom operations messages

class Config:
    """Configuration settings for the API"""
    
    # API Settings
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", 8000))
    API_RELOAD = os.getenv("API_RELOAD", "True").lower() == "true"
    
    # CORS Settings
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173"
    ]
    
    # File Settings
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 100))
    MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes for tests
    UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
    UPLOAD_DIRECTORY = str(UPLOAD_DIR)  # String version for tests
    FILE_RETENTION_DAYS = int(os.getenv("FILE_RETENTION_DAYS", 30))
    
    # Database Settings (for tests)
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "test-secret-key-for-development")
    RESULTS_DIR = Path(os.getenv("RESULTS_DIR", "results"))
    MODELS_DIR = Path(os.getenv("MODELS_DIR", "saved_models"))
    
    # ML Settings
    DEFAULT_TEST_SIZE = float(os.getenv("DEFAULT_TEST_SIZE", 0.2))
    DEFAULT_RANDOM_STATE = int(os.getenv("DEFAULT_RANDOM_STATE", 42))
    DEFAULT_MODEL_TYPE = os.getenv("DEFAULT_MODEL_TYPE", "random_forest")
    
    # Dataset Settings
    # Use relative path from API directory to dataset directory
    _base_dir = Path(__file__).parent.parent  # Go up from api/ to project root
    DEFAULT_DATASET_PATH = os.getenv(
        "DEFAULT_DATASET_PATH",
        str(_base_dir / "dataset" / "unswnb15_dataset.csv")
    )
    
    # Logging Settings
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "api.log")
    
    # Model Training Settings
    AUTOENCODER_EPOCHS = int(os.getenv("AUTOENCODER_EPOCHS", 50))
    AUTOENCODER_BATCH_SIZE = int(os.getenv("AUTOENCODER_BATCH_SIZE", 256))
    
    # Performance Settings
    ENABLE_MODEL_CACHING = os.getenv("ENABLE_MODEL_CACHING", "True").lower() == "true"
    MAX_CACHED_MODELS = int(os.getenv("MAX_CACHED_MODELS", 3))
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories"""
        cls.UPLOAD_DIR.mkdir(exist_ok=True)
        cls.RESULTS_DIR.mkdir(exist_ok=True)
        cls.MODELS_DIR.mkdir(exist_ok=True)
        
        # Create subdirectories
        (cls.UPLOAD_DIR / "datasets").mkdir(exist_ok=True)
        (cls.RESULTS_DIR / "predictions").mkdir(exist_ok=True)
        (cls.RESULTS_DIR / "training").mkdir(exist_ok=True)

# Create directories on import
Config.create_directories()
