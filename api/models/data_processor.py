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

    def load_data(self, file_path: str) -> pd.DataFrame:
        """Load data from CSV file"""
        try:
            return pd.read_csv(file_path)
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise

    def handle_missing_values(self, df: pd.DataFrame, strategy: str = "median") -> pd.DataFrame:
        """Handle missing values in the dataset"""
        try:
            df_copy = df.copy()
            
            # Handle numeric columns
            numeric_cols = df_copy.select_dtypes(include=[np.number]).columns
            if strategy == "median":
                df_copy[numeric_cols] = df_copy[numeric_cols].fillna(df_copy[numeric_cols].median())
            elif strategy == "mean":
                df_copy[numeric_cols] = df_copy[numeric_cols].fillna(df_copy[numeric_cols].mean())
            elif strategy == "drop":
                df_copy = df_copy.dropna(subset=numeric_cols)
            
            # Handle categorical columns
            categorical_cols = df_copy.select_dtypes(include=['object']).columns
            df_copy[categorical_cols] = df_copy[categorical_cols].fillna('Unknown')
            
            return df_copy
        except Exception as e:
            logger.error(f"Error handling missing values: {e}")
            raise

    def normalize_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize features using StandardScaler"""
        try:
            df_copy = df.copy()
            numeric_cols = df_copy.select_dtypes(include=[np.number]).columns
            
            # Handle missing values first
            df_copy[numeric_cols] = df_copy[numeric_cols].fillna(df_copy[numeric_cols].mean())
            
            scaler = StandardScaler()
            df_copy[numeric_cols] = scaler.fit_transform(df_copy[numeric_cols])
            
            return df_copy
        except Exception as e:
            logger.error(f"Error normalizing features: {e}")
            raise

    def detect_outliers(self, df: pd.DataFrame, method: str = "iqr") -> np.ndarray:
        """Detect outliers in the dataset - returns boolean mask"""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            outlier_mask = np.zeros(len(df), dtype=bool)
            
            for col in numeric_cols:
                if method == "iqr":
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    col_outliers = (df[col] < lower_bound) | (df[col] > upper_bound)
                    outlier_mask |= col_outliers.fillna(False).values
                elif method == "zscore":
                    z_scores = np.abs(zscore(df[col].fillna(df[col].mean())))
                    col_outliers = z_scores > 3
                    outlier_mask |= col_outliers
            
            return outlier_mask
        except Exception as e:
            logger.error(f"Error detecting outliers: {e}")
            raise

    def feature_selection(self, df: pd.DataFrame, target_col: str = "Label", n_features: int = 10):
        """Select top features based on correlation with target"""
        try:
            if target_col not in df.columns:
                logger.warning(f"Target column {target_col} not found, returning feature names")
                return [col for col in df.columns if col != target_col][:n_features]
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            correlation_matrix = df[numeric_cols].corr()
            
            if target_col in correlation_matrix.columns:
                feature_scores = abs(correlation_matrix[target_col]).sort_values(ascending=False)
                top_features = feature_scores.head(n_features).index.tolist()
                
                # Remove target column from feature list if present
                if target_col in top_features:
                    top_features.remove(target_col)
                
                return top_features
            else:
                return [col for col in df.columns if col != target_col][:n_features]
        except Exception as e:
            logger.error(f"Error in feature selection: {e}")
            raise

    def check_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check data quality metrics"""
        try:
            quality_metrics = {
                "shape": df.shape,
                "missing_values": df.isnull().sum().to_dict(),
                "missing_percentage": (df.isnull().sum() / len(df) * 100).to_dict(),
                "duplicate_rows": df.duplicated().sum(),
                "data_types": {col: str(dtype) for col, dtype in df.dtypes.to_dict().items()},
                "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
                "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
                "constant_columns": [col for col in df.columns if df[col].nunique() <= 1],
                "high_cardinality_columns": [col for col in df.select_dtypes(include=['object']).columns 
                                           if df[col].nunique() > 50]
            }
            
            # Add data quality score
            total_cells = df.shape[0] * df.shape[1]
            missing_cells = df.isnull().sum().sum()
            quality_score = ((total_cells - missing_cells) / total_cells) * 100
            quality_metrics["quality_score"] = round(quality_score, 2)
            
            # Add duplicate percentage
            duplicate_count = df.duplicated().sum()
            duplicate_percentage = (duplicate_count / len(df)) * 100 if len(df) > 0 else 0
            quality_metrics["duplicate_percentage"] = round(duplicate_percentage, 2)
            
            return quality_metrics
        except Exception as e:
            logger.error(f"Error checking data quality: {e}")
            raise

    def detect_data_drift(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> Dict[str, Any]:
        """Detect data drift between reference and current datasets"""
        try:
            from scipy.stats import ks_2samp
            
            drift_results = {
                "overall_drift": False,
                "feature_drift": {},
                "drift_score": 0.0,
                "threshold": 0.05
            }
            
            common_columns = set(reference_data.columns).intersection(set(current_data.columns))
            numeric_columns = reference_data[list(common_columns)].select_dtypes(include=[np.number]).columns
            
            drift_detected = []
            
            for col in numeric_columns:
                if col in current_data.columns:
                    # Kolmogorov-Smirnov test
                    stat, p_value = ks_2samp(reference_data[col].dropna(), current_data[col].dropna())
                    
                    drift_results["feature_drift"][col] = {
                        "statistic": stat,
                        "p_value": p_value,
                        "drift_detected": p_value < drift_results["threshold"]
                    }
                    
                    if p_value < drift_results["threshold"]:
                        drift_detected.append(col)
            
            drift_results["drift_detected"] = len(drift_detected) > 0  # Add for test compatibility
            drift_results["overall_drift"] = len(drift_detected) > 0
            drift_results["drift_score"] = len(drift_detected) / len(numeric_columns) if len(numeric_columns) > 0 else 0
            drift_results["drift_scores"] = {col: drift_results["feature_drift"][col]["statistic"] for col in drift_results["feature_drift"]}  # Add for test compatibility
            drift_results["drifted_features"] = drift_detected
            drift_results["drift_detected"] = len(drift_detected) > 0
            
            return drift_results
        except Exception as e:
            logger.error(f"Error detecting data drift: {e}")
            raise
