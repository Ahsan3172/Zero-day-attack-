from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ResponseFormatter:
    """Formats API responses consistently"""
    
    def success(self, data: Any = None, message: str = "Success") -> Dict[str, Any]:
        """Format successful response for tests"""
        return {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
    
    def error(self, message: str, status_code: int = 400) -> Dict[str, Any]:
        """Format error response for tests"""
        return {
            "success": False,
            "message": message,
            "status_code": status_code,
            "timestamp": datetime.now().isoformat()
        }
    
    def validation_error(self, errors: list) -> Dict[str, Any]:
        """Format validation error response for tests"""
        return {
            "success": False,
            "message": "Validation failed",
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
    
    @staticmethod
    def success_response(data: Any = None, message: str = "Success", metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Format successful response"""
        response = {
            "success": True,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        if metadata:
            response["metadata"] = metadata
        
        return response
    
    @staticmethod
    def error_response(message: str = None, error: str = None, error_code: str = "GENERAL_ERROR", status_code: int = 400, details: Optional[Dict] = None) -> Dict[str, Any]:
        """Format error response"""
        # Support both message and error parameters for backwards compatibility
        error_message = message or error or "An error occurred"
        
        response = {
            "success": False,
            "message": error_message,
            "error": error_message,
            "error_code": error_code,
            "status_code": status_code,
            "timestamp": datetime.now().isoformat()
        }
        
        if details:
            response["details"] = details
        
        return response
    
    @staticmethod
    def training_response(task_id: str, status: str, progress: float = 0.0, message: str = "") -> Dict[str, Any]:
        """Format training status response"""
        return {
            "success": True,
            "task_id": task_id,
            "status": status,
            "progress": progress,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
    
    @staticmethod
    def prediction_response(predictions: list, model_type: str, additional_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Format prediction response"""
        response = {
            "success": True,
            "predictions": predictions,
            "model_type": model_type,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_samples": len(predictions),
                "attacks_detected": sum(predictions) if all(isinstance(p, int) for p in predictions) else "N/A",
                "normal_traffic": len(predictions) - sum(predictions) if all(isinstance(p, int) for p in predictions) else "N/A"
            }
        }
        
        if additional_data:
            response.update(additional_data)
        
        return response
    
    @staticmethod
    def model_info_response(model_name: str, info: Dict, performance: Optional[Dict] = None) -> Dict[str, Any]:
        """Format model information response"""
        response = {
            "success": True,
            "model_name": model_name,
            "model_info": info,
            "timestamp": datetime.now().isoformat()
        }
        
        if performance:
            response["performance"] = performance
        
        return response
    
    @staticmethod
    def batch_upload_response(file_path: str, validation_result: Dict, file_size_mb: float) -> Dict[str, Any]:
        """Format file upload response"""
        return {
            "success": True,
            "message": "File uploaded successfully",
            "file_path": file_path,
            "file_size_mb": file_size_mb,
            "validation": validation_result,
            "timestamp": datetime.now().isoformat()
        }
    
    @staticmethod
    def health_check_response(status: str = "healthy", additional_info: Optional[Dict] = None) -> Dict[str, Any]:
        """Format health check response"""
        response = {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
        if additional_info:
            response.update(additional_info)
        
        return response
