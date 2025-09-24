import pandas as pd
import numpy as np
from scipy.stats import zscore
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from typing import Dict, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """Handles data processing, feature engineering, and preprocessing"""
    
    def __init__(self):
        self.preprocessor = None
        self.feature_names = None
        self.categorical_features = ["proto", "service", "state"]
    
    def validate_dataset(self, file_path: str) -> Dict[str, Any]:
        """Validate the uploaded dataset"""
        try:
            df = pd.read_csv(file_path)
            
            # Basic validation
            validation_result = {
                "valid": True,
                "shape": df.shape,
                "columns": list(df.columns),
                "missing_values": df.isnull().sum().to_dict(),
                "data_types": {col: str(dtype) for col, dtype in df.dtypes.to_dict().items()},
                "issues": []
            }
            
            # Check for required columns
            required_columns = ["Class", "Label"]
            missing_required = [col for col in required_columns if col not in df.columns]
            if missing_required:
                validation_result["issues"].append(f"Missing required columns: {missing_required}")
                validation_result["valid"] = False
            
            # Check for excessive missing values
            missing_percentage = (df.isnull().sum() / len(df)) * 100
            high_missing = missing_percentage[missing_percentage > 50]
            if not high_missing.empty:
                validation_result["issues"].append(f"Columns with >50% missing values: {high_missing.index.tolist()}")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating dataset: {e}")
            return {
                "valid": False,
                "error": str(e),
                "issues": [f"Failed to read dataset: {str(e)}"]
            }
    
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create new features based on the notebook logic"""
        df_processed = df.copy()
        
        try:
            # 1. Create pkt_rate_ratio
            df_processed['pkt_rate_ratio'] = df_processed.apply(
                lambda row: row['spkts'] / row['dpkts'] if row['dpkts'] != 0 else (
                    1 if row['spkts'] > 0 else 0), axis=1
            )
            df_processed.replace([np.inf, -np.inf], 0, inplace=True)

            # 2. Create byte_transfer_ratio
            df_processed['byte_transfer_ratio'] = df_processed.apply(
                lambda row: row['sbytes'] / row['dbytes'] if row['dbytes'] != 0 else (
                    1 if row['sbytes'] > 0 else 0), axis=1
            )
            df_processed.replace([np.inf, -np.inf], 0, inplace=True)

            # 3. Create pkt_size_mean
            df_processed['total_pkts'] = df_processed['spkts'] + df_processed['dpkts']
            df_processed['total_bytes'] = df_processed['sbytes'] + df_processed['dbytes']
            df_processed['pkt_size_mean'] = df_processed.apply(
                lambda row: row['total_bytes'] / row['total_pkts'] if row['total_pkts'] != 0 else 0, axis=1
            )
            df_processed.replace([np.inf, -np.inf], 0, inplace=True)

            # 4. Create interaction features with dur
            df_processed['dur_rate_interaction'] = df_processed['dur'] * df_processed['rate']
            df_processed['dur_sload_interaction'] = df_processed['dur'] * df_processed['sload']
            df_processed['dur_dload_interaction'] = df_processed['dur'] * df_processed['dload']
            
            logger.info("Feature engineering completed successfully")
            return df_processed
            
        except Exception as e:
            logger.error(f"Error in feature engineering: {e}")
            raise
    
    def handle_outliers(self, df: pd.DataFrame, method: str = "iqr_cap") -> pd.DataFrame:
        """Handle outliers using IQR capping method"""
        try:
            df_processed = df.copy()
            numerical_cols = df_processed.select_dtypes(include=np.number).columns
            
            if method == "z_score_removal":
                # Remove outliers using Z-score
                z_scores = np.abs(zscore(df_processed[numerical_cols]))
                threshold = 3
                mask = (z_scores < threshold).all(axis=1)
                df_processed = df_processed[mask]
                logger.info(f"Removed {len(df) - len(df_processed)} outliers using Z-score method")
                
            elif method == "iqr_cap":
                # Cap outliers using IQR
                Q1 = df_processed[numerical_cols].quantile(0.25)
                Q3 = df_processed[numerical_cols].quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                for col in numerical_cols:
                    df_processed[col] = np.where(
                        df_processed[col] < lower_bound[col], 
                        lower_bound[col], 
                        df_processed[col]
                    )
                    df_processed[col] = np.where(
                        df_processed[col] > upper_bound[col], 
                        upper_bound[col], 
                        df_processed[col]
                    )
                
                logger.info("Outliers capped using IQR method")
            
            return df_processed
            
        except Exception as e:
            logger.error(f"Error handling outliers: {e}")
            raise
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features and target variables"""
        try:
            # Map class labels
            df['Class'] = df['Class'].map({'Normal': 0, 'Attack': 1})
            
            # Remove unnecessary columns
            columns_to_drop = ['Label', 'Class']
            if 'id' in df.columns:
                columns_to_drop.append('id')
            
            X = df.drop(columns_to_drop, axis=1)
            y = df['Class']
            
            logger.info(f"Data prepared: Features shape {X.shape}, Target shape {y.shape}")
            return X, y
            
        except Exception as e:
            logger.error(f"Error preparing data: {e}")
            raise
    
    def create_preprocessor(self, X: pd.DataFrame):
        """Create preprocessing pipeline"""
        try:
            # Identify numerical and categorical features
            numerical_features = X.select_dtypes(include=[np.number]).columns.tolist()
            categorical_features = [col for col in self.categorical_features if col in X.columns]
            
            # Create transformers
            numerical_transformer = StandardScaler()
            categorical_transformer = OneHotEncoder(handle_unknown="ignore", drop='first')
            
            # Create preprocessor
            self.preprocessor = ColumnTransformer(
                transformers=[
                    ("num", numerical_transformer, numerical_features),
                    ("cat", categorical_transformer, categorical_features)
                ]
            )
            
            logger.info(f"Preprocessor created with {len(numerical_features)} numerical and {len(categorical_features)} categorical features")
            return self.preprocessor
            
        except Exception as e:
            logger.error(f"Error creating preprocessor: {e}")
            raise
    
    def process_dataset(self, file_path: str) -> Dict[str, Any]:
        """Complete data processing pipeline"""
        try:
            # Load dataset
            df = pd.read_csv(file_path)
            
            # Remove first column if it's an index
            if df.columns[0] in ['Unnamed: 0', 'index']:
                df = df.iloc[:, 1:]
            
            logger.info(f"Loaded dataset with shape: {df.shape}")
            
            # Feature engineering
            df = self.create_features(df)
            
            # Handle outliers
            df = self.handle_outliers(df, method="iqr_cap")
            
            # Prepare features and target
            X, y = self.prepare_data(df)
            
            # Create preprocessor
            preprocessor = self.create_preprocessor(X)
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Get feature names after preprocessing (for later use)
            preprocessor.fit(X_train)
            feature_names = preprocessor.get_feature_names_out()
            
            # Calculate target distribution
            target_distribution = {
                "normal": int((y == 0).sum()),
                "attack": int((y == 1).sum()),
                "normal_percentage": float((y == 0).mean() * 100),
                "attack_percentage": float((y == 1).mean() * 100)
            }
            
            logger.info("Dataset processing completed successfully")
            
            return {
                "X_train": X_train,
                "X_test": X_test,
                "y_train": y_train,
                "y_test": y_test,
                "preprocessor": preprocessor,
                "feature_names": feature_names.tolist(),
                "shape": df.shape,
                "features": X.columns.tolist(),
                "target_distribution": target_distribution,
                "processed_path": file_path  # Could save processed data to new file
            }
            
        except Exception as e:
            logger.error(f"Error processing dataset: {e}")
            raise
