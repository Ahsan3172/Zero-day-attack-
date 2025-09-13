"""
Database connection utility for FastAPI backend
"""
import mysql.connector
from mysql.connector import Error
import json
import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'zero_day_attack'),
            'autocommit': True
        }

    def connect(self):
        """Establish database connection"""
        try:
            self.connection = mysql.connector.connect(**self.config)
            if self.connection.is_connected():
                logger.info("Connected to MySQL database successfully")
                return True
        except Error as e:
            logger.error(f"Error connecting to MySQL: {e}")
            return False
        return False

    def disconnect(self):
        """Close database connection"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("MySQL connection closed")

    def execute_query(self, query: str, params: tuple = None) -> Optional[List[Dict]]:
        """Execute a SELECT query and return results"""
        try:
            if not self.connection or not self.connection.is_connected():
                if not self.connect():
                    return None

            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            return results
        except Error as e:
            logger.error(f"Error executing query: {e}")
            return None

    def execute_insert(self, query: str, params: tuple = None) -> Optional[int]:
        """Execute an INSERT query and return the last inserted ID"""
        try:
            if not self.connection or not self.connection.is_connected():
                if not self.connect():
                    return None

            cursor = self.connection.cursor()
            cursor.execute(query, params)
            self.connection.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        except Error as e:
            logger.error(f"Error executing insert: {e}")
            return None

    def execute_update(self, query: str, params: tuple = None) -> bool:
        """Execute an UPDATE/DELETE query"""
        try:
            if not self.connection or not self.connection.is_connected():
                if not self.connect():
                    return False

            cursor = self.connection.cursor()
            cursor.execute(query, params)
            self.connection.commit()
            cursor.close()
            return True
        except Error as e:
            logger.error(f"Error executing update: {e}")
            return False

    def save_model_result(self, model_name: str, dataset_filename: str, user_id: int, 
                         results: Dict[Any, Any], execution_time: float) -> Optional[int]:
        """Save model test results to database"""
        try:
            # First, save dataset info if not exists
            dataset_id = self.save_dataset_info(dataset_filename, user_id)
            if not dataset_id:
                logger.error("Failed to save dataset info")
                return None

            # Get or create model_id
            model_id = self.get_or_create_model_id(model_name)
            if not model_id:
                logger.error("Failed to get model ID")
                return None

            # Prepare data for insertion
            confusion_matrix = json.dumps(results.get("performance_metrics", {}).get("confusion_matrix", []))
            prediction_results = json.dumps(results.get("predictions_summary", {}))
            
            # Additional data to store
            additional_data = {
                "dataset_info": results.get("dataset_info", {}),
                "confidence_scores": results.get("confidence_scores", {}),
                "model_name": model_name
            }
            classification_report = json.dumps(additional_data)

            query = """
            INSERT INTO model_results 
            (model_id, dataset_id, user_id, accuracy, precision_score, recall_score, f1_score, 
             confusion_matrix, classification_report, prediction_results, execution_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            params = (
                model_id, dataset_id, user_id,
                results.get("performance_metrics", {}).get("accuracy", 0),
                results.get("performance_metrics", {}).get("precision", 0),
                results.get("performance_metrics", {}).get("recall", 0),
                results.get("performance_metrics", {}).get("f1_score", 0),
                confusion_matrix,
                classification_report,
                prediction_results,
                execution_time
            )

            return self.execute_insert(query, params)
        except Exception as e:
            logger.error(f"Error saving model result: {e}")
            return None

    def save_dataset_info(self, filename: str, user_id: int, 
                         rows_count: int = None, columns_count: int = None) -> Optional[int]:
        """Save dataset upload info"""
        try:
            # Check if dataset already exists
            query = "SELECT id FROM dataset_uploads WHERE filename = %s AND uploaded_by = %s"
            existing = self.execute_query(query, (filename, user_id))
            
            if existing:
                return existing[0]['id']

            # Insert new dataset record
            query = """
            INSERT INTO dataset_uploads 
            (filename, original_name, file_path, file_size, rows_count, columns_count, uploaded_by, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            params = (
                filename, filename, f"uploads/{filename}", 0, 
                rows_count, columns_count, user_id, 'processed'
            )

            return self.execute_insert(query, params)
        except Exception as e:
            logger.error(f"Error saving dataset info: {e}")
            return None

    def get_or_create_model_id(self, model_name: str) -> Optional[int]:
        """Get existing model ID or create a new training record"""
        try:
            # For now, we'll create a simple mapping or use a dummy ml_models entry
            # In a real scenario, this would reference actual training jobs
            query = "SELECT id FROM ml_models WHERE current_model = %s LIMIT 1"
            existing = self.execute_query(query, (model_name,))
            
            if existing:
                return existing[0]['id']

            # Create a dummy training job entry for the model
            query = """
            INSERT INTO ml_models 
            (task_id, user_id, model_types, current_model, status, progress, message, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            task_id = f"test_{model_name}_{int(datetime.now().timestamp())}"
            params = (
                task_id, 1,  # Default to user ID 1 (admin)
                json.dumps([model_name]), model_name, 'completed', 100.0,
                f"Model {model_name} ready for testing", datetime.now()
            )

            return self.execute_insert(query, params)
        except Exception as e:
            logger.error(f"Error getting/creating model ID: {e}")
            return None

    def get_user_test_history(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get test history for a user"""
        try:
            query = """
            SELECT 
                mr.id,
                mr.accuracy,
                mr.precision_score,
                mr.recall_score,
                mr.f1_score,
                mr.confusion_matrix,
                mr.classification_report,
                mr.prediction_results,
                mr.execution_time,
                mr.created_at,
                du.filename as dataset_filename,
                tm.current_model as model_name
            FROM model_results mr
            LEFT JOIN dataset_uploads du ON mr.dataset_id = du.id
            LEFT JOIN ml_models tm ON mr.model_id = tm.id
            WHERE mr.user_id = %s
            ORDER BY mr.created_at DESC
            LIMIT %s
            """
            
            results = self.execute_query(query, (user_id, limit))
            
            # Parse JSON fields
            if results:
                for result in results:
                    try:
                        if result['confusion_matrix']:
                            result['confusion_matrix'] = json.loads(result['confusion_matrix'])
                        if result['classification_report']:
                            result['classification_report'] = json.loads(result['classification_report'])
                        if result['prediction_results']:
                            result['prediction_results'] = json.loads(result['prediction_results'])
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse JSON for result ID {result['id']}")
            
            return results or []
        except Exception as e:
            logger.error(f"Error getting test history: {e}")
            return []

# Global database instance
db = DatabaseConnection()