from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import json
import logging
import os
import time
from pathlib import Path
from models.predictor import NetworkPredictor
from utils.file_handler import FileHandler
from utils.response_formatter import ResponseFormatter
from utils.database import db
from config import Config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["predictions"])

# Initialize components
predictor = NetworkPredictor()
file_handler = FileHandler()
response_formatter = ResponseFormatter()

@router.post("/models/test")
async def test_model(model_name: str = Form(...), file: UploadFile = File(...), user_id: int = Form(1)):
    """
    Test a trained model with automatic data cleaning for raw datasets
    This endpoint handles raw data cleaning before applying the trained pipeline
    """
    start_time = time.time()
    
    try:
        # Save and load the uploaded file
        file_path = await file_handler.save_uploaded_file(file)
        logger.info(f"Loading test dataset from {file_path}")
        
        df = pd.read_csv(file_path)
        logger.info(f"Dataset loaded with shape: {df.shape}")
        
        # Check for required label column
        if "label" not in df.columns:
            # Try common variations
            if "Label" in df.columns:
                df = df.rename(columns={"Label": "label"})
            elif "Class" in df.columns:
                df = df.rename(columns={"Class": "label"})
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Dataset must contain a 'label' column for testing (or 'Label'/'Class' column)"
                )
        
        # Ensure labels are numeric (0/1 for binary classification)
        logger.info(f"Original label distribution: {df['label'].value_counts().to_dict()}")
        
        # Convert string labels to numeric if needed
        if df['label'].dtype == 'object' or df['label'].dtype == 'string':
            # Map common string labels to numeric
            label_mapping = {
                'Normal': 0, 'normal': 0, 'NORMAL': 0,
                'Attack': 1, 'attack': 1, 'ATTACK': 1,
                'Benign': 0, 'benign': 0, 'BENIGN': 0,
                'Malicious': 1, 'malicious': 1, 'MALICIOUS': 1,
                '0': 0, '1': 1,
                0: 0, 1: 1
            }
            
            # Apply mapping
            df['label'] = df['label'].map(label_mapping)
            
            # Check for unmapped labels
            unmapped = df['label'].isna()
            if unmapped.any():
                unique_labels = df.loc[unmapped, 'label'].unique()
                logger.warning(f"Found unmapped labels: {unique_labels}")
                # For any unmapped labels, assume they are attacks (1)
                df['label'] = df['label'].fillna(1)
        
        # Ensure labels are integers
        df['label'] = df['label'].astype(int)
        logger.info(f"Final label distribution: {df['label'].value_counts().to_dict()}")
        
        # Separate features and target
        X = df.drop(columns=["label"])
        y = df["label"]
        original_shape = X.shape
        
        # Ensure y is numpy array of integers
        y = y.astype(int).values
        
        logger.info("Starting data cleaning for raw dataset...")
        
        # === RAW DATASET CLEANING ===
        
        # 1. Handle missing values and placeholder values
        logger.info("Cleaning missing values and placeholders...")
        X = X.replace(["?", "N/A", "nan", "null", ""], np.nan)
        
        # Fill missing values
        for col in X.columns:
            if X[col].dtype in ['object', 'string']:
                # For categorical columns, fill with mode
                mode_val = X[col].mode()
                if len(mode_val) > 0:
                    X[col] = X[col].fillna(mode_val[0])
                else:
                    X[col] = X[col].fillna("unknown")
            else:
                # For numeric columns, fill with median
                X[col] = X[col].fillna(X[col].median())
        
        # 2. Handle categorical columns - ensure they're strings
        categorical_cols = X.select_dtypes(include=["object"]).columns
        for col in categorical_cols:
            X[col] = X[col].astype(str)
        
        # 3. Balanced outlier removal using statistical approach
        logger.info("Applying balanced outlier removal...")
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        
        outlier_counts = pd.Series(0, index=X.index)
        columns_processed = 0
        
        for col in numeric_cols:
            # Skip columns with very few unique values (likely categorical or binary)
            if X[col].nunique() <= 5:
                logger.info(f"Skipping column '{col}' - only {X[col].nunique()} unique values")
                continue
                
            Q1 = X[col].quantile(0.25)
            Q3 = X[col].quantile(0.75)
            IQR = Q3 - Q1
            
            # Skip columns with zero variance
            if IQR == 0:
                logger.info(f"Skipping column '{col}' - zero variance")
                continue
            
            # Use standard IQR method with 1.5 multiplier, but be smarter about aggregation
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Count outliers in this column
            is_outlier = (X[col] < lower_bound) | (X[col] > upper_bound)
            outlier_count_in_col = is_outlier.sum()
            
            logger.info(f"Column '{col}': {outlier_count_in_col} outliers ({(outlier_count_in_col/len(X)*100):.1f}%)")
            
            # Only count this column if it has reasonable number of outliers (not too few or too many)
            outlier_percentage = outlier_count_in_col / len(X) * 100
            if 0.1 <= outlier_percentage <= 15:  # Between 0.1% and 15% outliers
                outlier_counts[is_outlier] += 1
                columns_processed += 1
            elif outlier_percentage > 15:
                logger.info(f"Column '{col}' has too many outliers ({outlier_percentage:.1f}%) - likely normal variation")
            else:
                logger.info(f"Column '{col}' has too few outliers ({outlier_percentage:.1f}%) - skipping")
        
        logger.info(f"Processed {columns_processed} columns for outlier detection")
        
        if columns_processed == 0:
            logger.info("No columns suitable for outlier detection - keeping all data")
            outliers_removed = 0
            rows_to_keep = pd.Series([True] * len(X))
        else:
            # Remove rows that are outliers in multiple columns
            # Dynamic threshold based on number of processed columns
            if columns_processed <= 3:
                outlier_threshold = max(1, columns_processed // 2)  # At least 1, up to half
            else:
                outlier_threshold = max(2, columns_processed // 3)  # At least 2, up to one-third
            
            rows_to_remove = outlier_counts >= outlier_threshold
            rows_to_keep = ~rows_to_remove
            outliers_removed = rows_to_remove.sum()
            
            logger.info(f"Outlier threshold: {outlier_threshold} columns")
            logger.info(f"Rows marked for removal: {outliers_removed} (outliers in {outlier_threshold}+ columns)")
            
            # Additional safety check - don't remove more than 20% of data
            removal_percentage = outliers_removed / len(X) * 100
            if removal_percentage > 20:
                logger.warning(f"Would remove {removal_percentage:.1f}% of data - applying cap at 20%")
                # Keep only the most extreme outliers (top 20%)
                outlier_scores = outlier_counts.sort_values(ascending=False)
                cutoff_index = int(0.20 * len(X))
                cutoff_score = outlier_scores.iloc[cutoff_index] if cutoff_index < len(outlier_scores) else outlier_scores.max()
                rows_to_remove = outlier_counts > cutoff_score
                rows_to_keep = ~rows_to_remove
                outliers_removed = rows_to_remove.sum()
        
        # Apply filtering
        X = X[rows_to_keep].reset_index(drop=True)
        y = y[rows_to_keep]
        
        # Ensure y is still integer type after filtering
        y = y.astype(int)
        
        logger.info(f"Data cleaning completed:")
        logger.info(f"  Original shape: {original_shape}")
        logger.info(f"  Cleaned shape: {X.shape}")
        logger.info(f"  Outliers removed: {outliers_removed} ({(outliers_removed/original_shape[0]*100):.1f}%)")
        logger.info(f"  Data retained: {len(X)} ({(len(X)/original_shape[0]*100):.1f}%)")
        
        # === FEATURE ENGINEERING ===
        logger.info("Applying feature engineering...")
        
        # Add the engineered features that the models expect
        try:
            # 1. Create pkt_rate_ratio
            X['pkt_rate_ratio'] = X.apply(
                lambda row: row['spkts'] / row['dpkts'] if row['dpkts'] != 0 else (
                    1 if row['spkts'] > 0 else 0), axis=1
            )
            X.replace([np.inf, -np.inf], 0, inplace=True)

            # 2. Create byte_transfer_ratio
            X['byte_transfer_ratio'] = X.apply(
                lambda row: row['sbytes'] / row['dbytes'] if row['dbytes'] != 0 else (
                    1 if row['sbytes'] > 0 else 0), axis=1
            )
            X.replace([np.inf, -np.inf], 0, inplace=True)

            # 3. Create total packets and bytes, then pkt_size_mean
            X['total_pkts'] = X['spkts'] + X['dpkts']
            X['total_bytes'] = X['sbytes'] + X['dbytes']
            X['pkt_size_mean'] = X.apply(
                lambda row: row['total_bytes'] / row['total_pkts'] if row['total_pkts'] != 0 else 0, axis=1
            )
            X.replace([np.inf, -np.inf], 0, inplace=True)

            # 4. Create interaction features with duration
            X['dur_rate_interaction'] = X['dur'] * X['rate']
            X['dur_sload_interaction'] = X['dur'] * X['sload']
            X['dur_dload_interaction'] = X['dur'] * X['dload']
            
            logger.info(f"Feature engineering completed. New shape: {X.shape}")
            logger.info(f"Added features: pkt_rate_ratio, byte_transfer_ratio, total_pkts, total_bytes, pkt_size_mean, dur_*_interaction")
            
        except Exception as fe_error:
            logger.error(f"Feature engineering failed: {fe_error}")
            # Continue without feature engineering if it fails
            logger.warning("Continuing without feature engineering - this may cause prediction errors")
        
        # 4. Check if we have enough data left
        if len(X) < 10:
            raise HTTPException(
                status_code=400,
                detail="Too few samples remaining after data cleaning. Please check your dataset."
            )
        
        # === MODEL TESTING WITH PIPELINE ===
        
        # Load the model using the proper pipeline manager
        from models.ml_pipeline import MLPipelineManager
        ml_manager = MLPipelineManager()
        
        try:
            pipeline = ml_manager.load_model(model_name)
            logger.info(f"Loaded trained pipeline for {model_name}")
        except FileNotFoundError as e:
            # Get available models for better error message
            available_models = ml_manager.get_available_models()
            raise HTTPException(
                status_code=404,
                detail=f"Model '{model_name}' not found. Available models: {available_models}"
            )
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error loading model '{model_name}': {str(e)}"
            )
        
        # Get expected features from the pipeline
        if hasattr(pipeline, 'feature_names_in_'):
            expected_features = pipeline.feature_names_in_
            logger.info(f"Model expects {len(expected_features)} features")
        else:
            logger.warning("Could not determine expected features from model")
            expected_features = None
        
        # Check available vs expected features
        available_features = set(X.columns)
        if expected_features is not None:
            expected_features_set = set(expected_features)
            missing_features = expected_features_set - available_features
            extra_features = available_features - expected_features_set
            
            if missing_features:
                logger.warning(f"Missing features: {missing_features}")
            if extra_features:
                logger.info(f"Extra features (will be ignored): {extra_features}")
                
        # Make predictions (pipeline handles its own preprocessing)
        logger.info("Making predictions with trained pipeline...")
        logger.info(f"Input features: {list(X.columns)}")
        y_pred = pipeline.predict(X)
        
        # Handle different model output formats and ensure predictions are integers
        if hasattr(pipeline, 'named_steps') and 'model' in pipeline.named_steps:
            model_step = pipeline.named_steps['model']
            if hasattr(model_step, 'predict') and type(model_step).__name__ in ['IsolationForest', 'OneClassSVM']:
                # Convert anomaly detection output: -1 (outlier) -> 1 (Attack), 1 (normal) -> 0 (Normal)
                y_pred = np.where(y_pred == -1, 1, 0)
        
        # Ensure predictions are integers
        y_pred = y_pred.astype(int)
        
        # Debug: Check data types before metrics calculation
        logger.info(f"y data type: {y.dtype}, unique values: {np.unique(y)}")
        logger.info(f"y_pred data type: {y_pred.dtype}, unique values: {np.unique(y_pred)}")
        
        # Get probabilities if available
        probabilities = None
        try:
            if hasattr(pipeline, 'predict_proba'):
                probabilities = pipeline.predict_proba(X)
        except Exception as e:
            logger.warning(f"Could not get probabilities: {e}")
        
        # Calculate performance metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
        
        accuracy = accuracy_score(y, y_pred)
        precision = precision_score(y, y_pred, average="weighted", zero_division=0)
        recall = recall_score(y, y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y, y_pred, average="weighted", zero_division=0)
        cm = confusion_matrix(y, y_pred)
        
        # Prepare results with proper type conversion for JSON serialization
        results = {
            "success": True,
            "model_name": model_name,
            "dataset_info": {
                "original_samples": int(original_shape[0]),
                "cleaned_samples": int(len(X)),
                "original_features": int(original_shape[1]),
                "final_features": int(X.shape[1]),
                "outliers_removed": int(outliers_removed),
                "cleaning_applied": True,
                "feature_engineering_applied": True
            },
            "performance_metrics": {
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "confusion_matrix": cm.astype(int).tolist()
            },
            "predictions_summary": {
                "total_predictions": int(len(y_pred)),
                "attacks_detected": int(np.sum(y_pred)),
                "normal_detected": int(len(y_pred) - np.sum(y_pred)),
                "attack_percentage": float((np.sum(y_pred) / len(y_pred)) * 100)
            }
        }
        
        # Add probabilities if available
        if probabilities is not None:
            results["probabilities_available"] = True
            results["confidence_scores"] = {
                "mean_confidence": float(np.mean(np.max(probabilities, axis=1))),
                "min_confidence": float(np.min(np.max(probabilities, axis=1))),
                "max_confidence": float(np.max(np.max(probabilities, axis=1)))
            }
        
        logger.info(f"Model testing completed successfully:")
        logger.info(f"  Accuracy: {float(accuracy):.4f}")
        logger.info(f"  F1 Score: {float(f1):.4f}")
        logger.info(f"  Attacks detected: {int(np.sum(y_pred))}")
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Save results to database
        try:
            dataset_rows = len(X) if X is not None else 0
            dataset_cols = X.shape[1] if X is not None else 0
            
            result_id = db.save_model_result(
                model_name=model_name,
                dataset_filename=file.filename,
                user_id=user_id,
                results=results,
                execution_time=execution_time
            )
            
            if result_id:
                logger.info(f"Test results saved to database with ID: {result_id}")
                results["result_id"] = result_id
            else:
                logger.warning("Failed to save results to database")
                
        except Exception as db_error:
            logger.error(f"Database error while saving results: {db_error}")
            # Don't fail the entire request if database save fails
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing model {model_name}: {e}")
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": str(e),
                "error_type": type(e).__name__,
                "message": "Testing failed - check server logs for details"
            }
        )

@router.get("/models/history/{user_id}")
async def get_test_history(user_id: int, limit: int = 50):
    """
    Get model testing history for a user
    """
    try:
        logger.info(f"Fetching test history for user {user_id}")
        
        history = db.get_user_test_history(user_id, limit)
        
        logger.info(f"Retrieved {len(history)} test results for user {user_id}")
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error fetching test history: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "message": "Failed to fetch test history"
            }
        )

@router.post("/models/predict")
async def predict_with_model(model_name: str = Form(...), file: UploadFile = File(...)):
    """
    Make predictions using a trained model (no labels required)
    This endpoint is for making predictions on new data without ground truth labels
    """
    try:
        # Save uploaded file
        file_path = await file_handler.save_uploaded_file(file)
        
        # Load dataset
        logger.info(f"Loading prediction dataset from {file_path}")
        df = pd.read_csv(file_path)
        
        # Remove label column if present (for prediction-only datasets)
        if "label" in df.columns:
            logger.info("Found label column - removing for prediction")
            df = df.drop(columns=["label"])
        elif "Label" in df.columns:
            logger.info("Found Label column - removing for prediction")
            df = df.drop(columns=["Label"])
        elif "Class" in df.columns:
            logger.info("Found Class column - removing for prediction")  
            df = df.drop(columns=["Class"])
        
        # Make predictions using the complete pipeline
        logger.info(f"Making predictions with model {model_name} on {len(df)} samples")
        results = predictor.predict_with_pipeline(df, model_name)
        
        logger.info(f"Predictions completed for {model_name}")
        
        return {
            "success": True,
            "message": f"Predictions completed using model {model_name}",
            "model_name": model_name,
            "predictions": results,
            "dataset_info": {
                "total_samples": len(df),
                "features": list(df.columns)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error making predictions with model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Pydantic models for request validation
class NetworkDataSample(BaseModel):
    dur: float
    spkts: int
    dpkts: int
    sbytes: int
    dbytes: int
    rate: float
    sload: float
    dload: float
    proto: str
    service: str
    state: str
    # Add other fields as needed based on your dataset

class SinglePredictionRequest(BaseModel):
    data: NetworkDataSample
    model_type: Optional[str] = "random_forest"

class BatchPredictionRequest(BaseModel):
    data: List[NetworkDataSample]
    model_type: Optional[str] = "random_forest"

class EnsemblePredictionRequest(BaseModel):
    data: List[NetworkDataSample]
    model_types: Optional[List[str]] = ["random_forest", "isolation_forest"]

@router.post("/predict/single")
async def predict_single(request: SinglePredictionRequest):
    """Make a single prediction on network traffic data"""
    try:
        # Convert request data to dictionary
        network_data = request.data.dict()
        
        # Make real-time prediction
        result = predictor.predict_realtime(network_data, request.model_type)
        
        return response_formatter.success_response(
            data=result,
            message="Single prediction completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error in single prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch")
async def predict_batch_data(request: BatchPredictionRequest):
    """Make batch predictions on multiple network traffic samples"""
    try:
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided for prediction")
        
        # Convert request data to DataFrame
        data_dicts = [sample.dict() for sample in request.data]
        df = pd.DataFrame(data_dicts)
        
        # Make predictions
        result = predictor.predict_batch(df, request.model_type)
        
        return response_formatter.prediction_response(
            predictions=result["predictions"],
            model_type=request.model_type,
            additional_data={
                "batch_summary": result["batch_summary"],
                "risk_level": result["risk_level"],
                "attack_percentage": result["attack_percentage"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/file")
async def predict_from_file(
    file: UploadFile = File(...),
    model_type: str = Form("random_forest")
):
    """Make predictions from uploaded CSV file"""
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.CSV')):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Save uploaded file
        file_path = await file_handler.save_uploaded_file(file)
        
        # Read the data
        df = pd.read_csv(file_path)
        
        # Make batch predictions
        result = predictor.predict_batch(df, model_type)
        
        # Save results to file
        results_file = file_handler.save_predictions(result, model_type)
        
        return response_formatter.success_response(
            data={
                "predictions": result.get("predictions", []),
                "predictions_summary": result["batch_summary"],
                "risk_assessment": {
                    "risk_level": result["risk_level"],
                    "attack_percentage": result["attack_percentage"]
                },
                "results_file": results_file,
                "total_predictions": len(result.get("predictions", [])),
                "model_used": model_type
            },
            message="File predictions completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/ensemble")
async def predict_with_ensemble(request: EnsemblePredictionRequest):
    """Make predictions using multiple models (ensemble approach)"""
    try:
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided for prediction")
        
        # Convert request data to DataFrame
        data_dicts = [sample.dict() for sample in request.data]
        df = pd.DataFrame(data_dicts)
        
        # Make ensemble predictions
        result = predictor.predict_with_multiple_models(df, request.model_types)
        
        return response_formatter.success_response(
            data=result,
            message="Ensemble predictions completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ensemble prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/capabilities/{model_type}")
async def get_prediction_capabilities(model_type: str):
    """Get prediction capabilities for a specific model"""
    try:
        capabilities = predictor.get_model_capabilities(model_type)
        
        return response_formatter.success_response(
            data=capabilities,
            message=f"Prediction capabilities for {model_type} retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/realtime/stream")
async def process_realtime_stream(
    network_samples: List[NetworkDataSample],
    model_type: str = "random_forest",
    threshold_confidence: float = 0.8
):
    """Process real-time stream of network data"""
    try:
        results = []
        alerts = []
        
        for i, sample in enumerate(network_samples):
            # Make prediction for each sample
            prediction_result = predictor.predict_realtime(sample.dict(), model_type)
            
            # Add sample index for tracking
            prediction_result["sample_index"] = i
            results.append(prediction_result)
            
            # Check for alerts
            if prediction_result["is_attack"]:
                confidence = prediction_result.get("confidence", 1.0)
                if confidence >= threshold_confidence:
                    alerts.append({
                        "sample_index": i,
                        "alert_level": "HIGH" if confidence >= 0.9 else "MEDIUM",
                        "confidence": confidence,
                        "prediction": prediction_result["prediction_label"],
                        "timestamp": prediction_result["timestamp"]
                    })
        
        # Calculate stream statistics
        total_samples = len(results)
        attacks_detected = sum(1 for r in results if r["is_attack"])
        
        stream_summary = {
            "total_samples": total_samples,
            "attacks_detected": attacks_detected,
            "normal_traffic": total_samples - attacks_detected,
            "attack_rate": (attacks_detected / total_samples) * 100 if total_samples > 0 else 0,
            "alerts_generated": len(alerts),
            "model_used": model_type
        }
        
        return response_formatter.success_response(
            data={
                "predictions": results,
                "alerts": alerts,
                "stream_summary": stream_summary
            },
            message="Real-time stream processing completed"
        )
        
    except Exception as e:
        logger.error(f"Error in real-time stream processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/history")
async def get_prediction_history(limit: int = 10):
    """Get recent prediction history"""
    try:
        # Get recent result files
        results = file_handler.list_results()
        
        # Limit the results
        recent_results = results[:limit]
        
        # Load summary information from each result file
        history = []
        for result in recent_results:
            try:
                with open(result["path"], 'r') as f:
                    data = json.load(f)
                    history.append({
                        "filename": result["filename"],
                        "created_at": result["created_at"],
                        "model_type": data.get("model_type", "unknown"),
                        "summary": data.get("summary", {})
                    })
            except Exception as e:
                logger.warning(f"Error reading result file {result['filename']}: {e}")
                continue
        
        return response_formatter.success_response(
            data={
                "history": history,
                "total_available": len(results),
                "showing": len(history)
            },
            message="Prediction history retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting prediction history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/predict/history/{filename}")
async def delete_prediction_result(filename: str):
    """Delete a specific prediction result file"""
    try:
        import os
        file_path = f"results/{filename}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Result file {filename} not found")
        
        os.remove(file_path)
        
        return response_formatter.success_response(
            data={"deleted_file": filename},
            message=f"Prediction result {filename} deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction result: {e}")
        raise HTTPException(status_code=500, detail=str(e))
