from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import logging
from models.data_processor import DataProcessor
from utils.file_handler import FileHandler
from utils.response_formatter import ResponseFormatter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["data"])

# Initialize components
data_processor = DataProcessor()
file_handler = FileHandler()
response_formatter = ResponseFormatter()

@router.post("/data/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file for training or prediction"""
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.CSV')):
            raise HTTPException(
                status_code=400, 
                detail="Only CSV files are supported. Please upload a .csv file."
            )
        
        # Validate file size (assuming a reasonable limit)
        file_content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        if len(file_content) > 100 * 1024 * 1024:  # 100MB limit
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 100MB."
            )
        
        # Save the uploaded file
        file_path = await file_handler.save_uploaded_file(file)
        
        # Validate the dataset
        validation_result = data_processor.validate_dataset(file_path)
        
        # Get file info
        file_info = file_handler.get_dataset_info(file_path)
        
        return response_formatter.batch_upload_response(
            file_path=file_path,
            validation_result=validation_result,
            file_size_mb=file_info["file_size_mb"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/data/validate")
async def validate_dataset(file_path: str):
    """Validate a dataset file"""
    try:
        validation_result = data_processor.validate_dataset(file_path)
        
        return response_formatter.success_response(
            data=validation_result,
            message="Dataset validation completed"
        )
        
    except Exception as e:
        logger.error(f"Error validating dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/process")
async def process_dataset(
    file_path: str = Form(...),
    outlier_method: str = Form("iqr_cap"),
    create_features: bool = Form(True)
):
    """Process dataset with feature engineering and preprocessing"""
    try:
        # Check if file exists
        import os
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dataset file not found")
        
        # Process the dataset
        processed_data = data_processor.process_dataset(file_path)
        
        # Return summary information (not the actual data for API efficiency)
        summary = {
            "original_shape": processed_data["shape"],
            "features": processed_data["features"],
            "feature_count": len(processed_data["features"]),
            "target_distribution": processed_data["target_distribution"],
            "processing_steps": [
                "Feature engineering" if create_features else "No feature engineering",
                f"Outlier handling: {outlier_method}",
                "Data preprocessing and scaling"
            ]
        }
        
        return response_formatter.success_response(
            data=summary,
            message="Dataset processed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/files")
async def list_uploaded_files():
    """List all uploaded dataset files"""
    try:
        files = file_handler.list_uploaded_files()
        
        return response_formatter.success_response(
            data={
                "files": files,
                "total_files": len(files)
            },
            message="Uploaded files retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/files/{file_name}")
async def get_file_info(file_name: str):
    """Get information about a specific uploaded file"""
    try:
        # Construct file path (this is a simplified approach)
        file_path = f"uploads/{file_name}"
        
        # Get file information
        file_info = file_handler.get_dataset_info(file_path)
        
        return response_formatter.success_response(
            data=file_info,
            message=f"File information for {file_name} retrieved successfully"
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File {file_name} not found")
    except Exception as e:
        logger.error(f"Error getting file info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/data/files/{file_name}")
async def delete_uploaded_file(file_name: str):
    """Delete an uploaded file"""
    try:
        import os
        file_path = f"uploads/{file_name}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File {file_name} not found")
        
        os.remove(file_path)
        
        return response_formatter.success_response(
            data={"deleted_file": file_name},
            message=f"File {file_name} deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/cleanup")
async def cleanup_old_files(days_old: int = 7):
    """Clean up old uploaded files"""
    try:
        cleaned_files = file_handler.cleanup_old_files(days_old)
        
        return response_formatter.success_response(
            data={
                "cleaned_files": cleaned_files,
                "files_cleaned": len(cleaned_files),
                "days_threshold": days_old
            },
            message=f"Cleanup completed: {len(cleaned_files)} files removed"
        )
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/statistics")
async def get_data_statistics():
    """Get statistics about uploaded data and storage usage"""
    try:
        files = file_handler.list_uploaded_files()
        results = file_handler.list_results()
        
        # Calculate total storage usage
        total_upload_size = sum(file["size_mb"] for file in files)
        total_results_size = sum(result["size_kb"] / 1024 for result in results)  # Convert to MB
        
        statistics = {
            "uploaded_files": {
                "count": len(files),
                "total_size_mb": round(total_upload_size, 2)
            },
            "result_files": {
                "count": len(results),
                "total_size_mb": round(total_results_size, 2)
            },
            "storage_usage": {
                "total_size_mb": round(total_upload_size + total_results_size, 2),
                "breakdown": {
                    "datasets": f"{total_upload_size:.2f} MB",
                    "results": f"{total_results_size:.2f} MB"
                }
            }
        }
        
        return response_formatter.success_response(
            data=statistics,
            message="Data statistics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
