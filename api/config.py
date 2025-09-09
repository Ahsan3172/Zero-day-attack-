import os
from pathlib import Path

class Config:
    """Configuration settings for the API"""
    
    # API Settings
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", 8000))
    API_RELOAD = os.getenv("API_RELOAD", "True").lower() == "true"
    
    # CORS Settings
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173"
    ]
    
    # File Settings
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 100))
    UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
    RESULTS_DIR = Path(os.getenv("RESULTS_DIR", "results"))
    MODELS_DIR = Path(os.getenv("MODELS_DIR", "saved_models"))
    
    # ML Settings
    DEFAULT_TEST_SIZE = float(os.getenv("DEFAULT_TEST_SIZE", 0.2))
    DEFAULT_RANDOM_STATE = int(os.getenv("DEFAULT_RANDOM_STATE", 42))
    DEFAULT_MODEL_TYPE = os.getenv("DEFAULT_MODEL_TYPE", "random_forest")
    
    # Dataset Settings
    DEFAULT_DATASET_PATH = os.getenv(
        "DEFAULT_DATASET_PATH",
        "c:\\Users\\adnan\\OneDrive\\Documents\\Projects\\Zero_Day_Attack\\dataset\\unswnb15_dataset.csv"
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
