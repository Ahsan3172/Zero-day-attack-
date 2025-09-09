import os
import aiofiles
import pandas as pd
import json
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class FileHandler:
    """Handles file operations for the API"""
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.results_dir = Path("results")
        self.datasets_dir = Path("datasets")
        
        # Create directories if they don't exist
        self.upload_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        self.datasets_dir.mkdir(exist_ok=True)
    
    async def save_uploaded_file(self, file: UploadFile) -> str:
        """Save uploaded file and return file path"""
        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            file_path = self.upload_dir / filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            logger.info(f"File saved: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise
    
    def save_predictions(self, predictions: Dict[str, Any], model_type: str) -> str:
        """Save prediction results to file"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"predictions_{model_type}_{timestamp}.json"
            file_path = self.results_dir / filename
            
            # Prepare data for saving
            save_data = {
                "timestamp": timestamp,
                "model_type": model_type,
                "predictions": predictions,
                "summary": {
                    "total_samples": len(predictions.get("predictions", [])),
                    "attacks_detected": sum(predictions.get("predictions", [])),
                    "attack_percentage": (sum(predictions.get("predictions", [])) / len(predictions.get("predictions", []))) * 100 if predictions.get("predictions") else 0
                }
            }
            
            # Save to JSON file
            with open(file_path, 'w') as f:
                json.dump(save_data, f, indent=2, default=str)
            
            logger.info(f"Predictions saved: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving predictions: {e}")
            raise
    
    def save_training_results(self, results: Dict[str, Any]) -> str:
        """Save training results to file"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"training_results_{timestamp}.json"
            file_path = self.results_dir / filename
            
            # Save results
            with open(file_path, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            logger.info(f"Training results saved: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving training results: {e}")
            raise
    
    def get_dataset_info(self, file_path: str) -> Dict[str, Any]:
        """Get information about a dataset file"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Dataset file not found: {file_path}")
            
            # Get file stats
            file_stats = os.stat(file_path)
            
            # Read basic info from CSV
            df = pd.read_csv(file_path, nrows=5)  # Read only first 5 rows for info
            
            info = {
                "file_path": file_path,
                "file_size_mb": round(file_stats.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                "modified_at": datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                "columns": list(df.columns),
                "shape_preview": f"({len(df)} rows preview, {len(df.columns)} columns)",
                "data_types": df.dtypes.to_dict()
            }
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting dataset info: {e}")
            raise
    
    def list_uploaded_files(self) -> list:
        """List all uploaded files"""
        try:
            files = []
            for file_path in self.upload_dir.glob("*"):
                if file_path.is_file():
                    file_info = {
                        "filename": file_path.name,
                        "path": str(file_path),
                        "size_mb": round(file_path.stat().st_size / (1024 * 1024), 2),
                        "uploaded_at": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
                    }
                    files.append(file_info)
            
            return sorted(files, key=lambda x: x["uploaded_at"], reverse=True)
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            raise
    
    def list_results(self) -> list:
        """List all result files"""
        try:
            results = []
            for file_path in self.results_dir.glob("*.json"):
                if file_path.is_file():
                    result_info = {
                        "filename": file_path.name,
                        "path": str(file_path),
                        "size_kb": round(file_path.stat().st_size / 1024, 2),
                        "created_at": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
                    }
                    results.append(result_info)
            
            return sorted(results, key=lambda x: x["created_at"], reverse=True)
            
        except Exception as e:
            logger.error(f"Error listing results: {e}")
            raise
    
    def cleanup_old_files(self, days_old: int = 7):
        """Clean up old files older than specified days"""
        try:
            from datetime import timedelta
            cutoff_time = datetime.now() - timedelta(days=days_old)
            
            cleaned_files = []
            
            # Clean upload directory
            for file_path in self.upload_dir.glob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        file_path.unlink()
                        cleaned_files.append(str(file_path))
            
            # Clean results directory
            for file_path in self.results_dir.glob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        file_path.unlink()
                        cleaned_files.append(str(file_path))
            
            logger.info(f"Cleaned up {len(cleaned_files)} old files")
            return cleaned_files
            
        except Exception as e:
            logger.error(f"Error cleaning up files: {e}")
            raise
    
    def validate_csv_file(self, file_path: str) -> Dict[str, Any]:
        """Validate CSV file format and content"""
        try:
            # Try to read the file
            df = pd.read_csv(file_path, nrows=10)
            
            validation_result = {
                "valid": True,
                "errors": [],
                "warnings": [],
                "file_info": {
                    "columns": len(df.columns),
                    "sample_rows": len(df),
                    "column_names": list(df.columns)
                }
            }
            
            # Check for empty file
            if df.empty:
                validation_result["valid"] = False
                validation_result["errors"].append("File is empty")
            
            # Check for required columns (if any)
            # This can be customized based on your requirements
            
            return validation_result
            
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Cannot read CSV file: {str(e)}"],
                "warnings": [],
                "file_info": {}
            }
