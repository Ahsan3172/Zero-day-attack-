// Quick test endpoint for immediate response
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
test_router = APIRouter(prefix="/api/v1", tags=["test"])

# Simple in-memory storage for testing
test_tasks = {}

class SimpleTrainingRequest(BaseModel):
    model_types: List[str] = ["random_forest"]

@test_router.post("/train-test")
async def test_training(request: SimpleTrainingRequest):
    """Test training endpoint that responds immediately"""
    try:
        # Generate task ID
        task_id = f"test_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Store immediately
        test_tasks[task_id] = {
            "task_id": task_id,
            "status": "started",
            "progress": 0.0,
            "message": "Training started",
            "models_completed": [],
            "current_model": None
        }
        
        logger.info(f"Test training started: {task_id}")
        
        # Return immediately without any processing
        return {
            "success": True,
            "task_id": task_id,
            "status": "started",
            "message": "Test training started successfully"
        }
        
    except Exception as e:
        logger.error(f"Test training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@test_router.get("/train-test/status/{task_id}")
async def get_test_training_status(task_id: str):
    """Get test training status"""
    try:
        if task_id not in test_tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Simulate progress
        task = test_tasks[task_id]
        if task["status"] == "started":
            task["status"] = "in_progress"
            task["progress"] = 50.0
            task["current_model"] = "random_forest"
            task["message"] = "Training in progress"
        elif task["status"] == "in_progress":
            task["status"] = "completed"
            task["progress"] = 100.0
            task["current_model"] = None
            task["models_completed"] = ["random_forest"]
            task["message"] = "Training completed successfully"
        
        return {
            "success": True,
            "data": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
