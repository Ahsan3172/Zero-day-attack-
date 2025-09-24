"""
Data validation utilities for ML pipeline
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Union, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def validate_numeric_data(data: Union[List, np.ndarray, pd.Series]) -> bool:
    """
    Validate that data contains only numeric values
    
    Args:
        data: List, array, or series of data to validate
        
    Returns:
        True if all data is numeric, False otherwise
    """
    try:
        if isinstance(data, (list, tuple)):
            # Check if all items are numeric
            return all(isinstance(x, (int, float, np.number)) and not np.isnan(x) for x in data)
        
        elif isinstance(data, np.ndarray):
            # Check for numeric dtype and no NaN values
            return np.issubdtype(data.dtype, np.number) and not np.isnan(data).any()
            
        elif isinstance(data, pd.Series):
            # Check for numeric dtype and no NaN values
            return pd.api.types.is_numeric_dtype(data) and not data.isna().any()
            
        else:
            return False
            
    except (TypeError, ValueError):
        return False


def validate_dataset_structure(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate dataset structure for ML pipeline
    
    Args:
        df: DataFrame to validate
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'info': {
            'rows': len(df),
            'columns': len(df.columns),
            'column_types': df.dtypes.to_dict(),
            'missing_values': df.isnull().sum().to_dict()
        }
    }
    
    # Check minimum requirements
    if len(df) < 10:
        validation_results['errors'].append("Dataset must have at least 10 rows")
        validation_results['valid'] = False
    
    if len(df.columns) < 2:
        validation_results['errors'].append("Dataset must have at least 2 columns")
        validation_results['valid'] = False
    
    # Check for excessive missing values
    missing_percentage = (df.isnull().sum() / len(df)) * 100
    high_missing_cols = missing_percentage[missing_percentage > 50].index.tolist()
    
    if high_missing_cols:
        validation_results['warnings'].append(f"Columns with >50% missing values: {high_missing_cols}")
    
    # Check for duplicate rows
    duplicates = df.duplicated().sum()
    if duplicates > 0:
        validation_results['warnings'].append(f"Found {duplicates} duplicate rows")
    
    # Check for constant columns
    constant_cols = []
    for col in df.columns:
        if df[col].nunique() <= 1:
            constant_cols.append(col)
    
    if constant_cols:
        validation_results['warnings'].append(f"Constant columns detected: {constant_cols}")
    
    return validation_results


def validate_features_labels(features: Union[np.ndarray, pd.DataFrame], 
                           labels: Union[np.ndarray, pd.Series]) -> Dict[str, Any]:
    """
    Validate features and labels for ML training
    
    Args:
        features: Feature matrix
        labels: Target labels
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    # Check shapes
    if len(features) != len(labels):
        validation_results['errors'].append(
            f"Features ({len(features)}) and labels ({len(labels)}) must have same length"
        )
        validation_results['valid'] = False
    
    # Check for empty data
    if len(features) == 0 or len(labels) == 0:
        validation_results['errors'].append("Features and labels cannot be empty")
        validation_results['valid'] = False
    
    # Check for NaN values
    if isinstance(features, pd.DataFrame):
        if features.isnull().any().any():
            validation_results['warnings'].append("Features contain missing values")
    elif isinstance(features, np.ndarray):
        if np.isnan(features).any():
            validation_results['warnings'].append("Features contain NaN values")
    
    if isinstance(labels, pd.Series):
        if labels.isnull().any():
            validation_results['warnings'].append("Labels contain missing values")
    elif isinstance(labels, np.ndarray):
        if np.isnan(labels).any():
            validation_results['warnings'].append("Labels contain NaN values")
    
    # Check label distribution for classification
    if isinstance(labels, (pd.Series, np.ndarray)):
        unique_labels = np.unique(labels)
        if len(unique_labels) < 2:
            validation_results['errors'].append("Labels must have at least 2 unique values")
            validation_results['valid'] = False
        elif len(unique_labels) > 100:
            validation_results['warnings'].append("High number of unique labels - might be regression problem")
    
    return validation_results


def validate_model_input(input_data: Union[List, np.ndarray, pd.DataFrame], 
                        expected_features: int) -> Dict[str, Any]:
    """
    Validate input data for model prediction
    
    Args:
        input_data: Input data for prediction
        expected_features: Expected number of features
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    try:
        if isinstance(input_data, list):
            # Convert to numpy array for consistent handling
            input_array = np.array(input_data)
        elif isinstance(input_data, pd.DataFrame):
            input_array = input_data.values
        elif isinstance(input_data, np.ndarray):
            input_array = input_data
        else:
            validation_results['errors'].append(f"Unsupported input type: {type(input_data)}")
            validation_results['valid'] = False
            return validation_results
        
        # Check dimensions
        if input_array.ndim == 1:
            if len(input_array) != expected_features:
                validation_results['errors'].append(
                    f"Expected {expected_features} features, got {len(input_array)}"
                )
                validation_results['valid'] = False
        elif input_array.ndim == 2:
            if input_array.shape[1] != expected_features:
                validation_results['errors'].append(
                    f"Expected {expected_features} features, got {input_array.shape[1]}"
                )
                validation_results['valid'] = False
        else:
            validation_results['errors'].append(f"Input data must be 1D or 2D, got {input_array.ndim}D")
            validation_results['valid'] = False
        
        # Check for NaN or infinite values
        if np.isnan(input_array).any():
            validation_results['errors'].append("Input data contains NaN values")
            validation_results['valid'] = False
        
        if np.isinf(input_array).any():
            validation_results['errors'].append("Input data contains infinite values")
            validation_results['valid'] = False
        
    except Exception as e:
        validation_results['errors'].append(f"Validation error: {str(e)}")
        validation_results['valid'] = False
    
    return validation_results


def validate_data_types(data: pd.DataFrame, expected_types: Dict[str, str]) -> Dict[str, Any]:
    """
    Validate that DataFrame columns have expected data types
    
    Args:
        data: DataFrame to validate
        expected_types: Dictionary mapping column names to expected types
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    for column, expected_type in expected_types.items():
        if column not in data.columns:
            validation_results['errors'].append(f"Missing required column: {column}")
            validation_results['valid'] = False
            continue
        
        actual_type = str(data[column].dtype)
        
        # Type mapping for common cases
        type_mapping = {
            'int': ['int64', 'int32', 'int16', 'int8'],
            'float': ['float64', 'float32', 'float16'],
            'string': ['object', 'string'],
            'bool': ['bool'],
            'datetime': ['datetime64[ns]']
        }
        
        valid_types = type_mapping.get(expected_type, [expected_type])
        
        if actual_type not in valid_types:
            validation_results['warnings'].append(
                f"Column '{column}' has type '{actual_type}', expected one of {valid_types}"
            )
    
    return validation_results


def validate_data_range(data: Union[pd.DataFrame, pd.Series, np.ndarray], 
                       min_val: Optional[float] = None,
                       max_val: Optional[float] = None) -> Dict[str, Any]:
    """
    Validate that data values are within expected range
    
    Args:
        data: Data to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    try:
        if isinstance(data, pd.DataFrame):
            # Check numeric columns only
            numeric_data = data.select_dtypes(include=[np.number])
            if len(numeric_data.columns) == 0:
                validation_results['warnings'].append("No numeric columns found for range validation")
                return validation_results
            values = numeric_data.values.flatten()
        elif isinstance(data, pd.Series):
            if not pd.api.types.is_numeric_dtype(data):
                validation_results['warnings'].append("Non-numeric data for range validation")
                return validation_results
            values = data.values
        elif isinstance(data, np.ndarray):
            if not np.issubdtype(data.dtype, np.number):
                validation_results['warnings'].append("Non-numeric array for range validation")
                return validation_results
            values = data.flatten()
        else:
            validation_results['errors'].append(f"Unsupported data type for range validation: {type(data)}")
            validation_results['valid'] = False
            return validation_results
        
        # Remove NaN values for range checking
        values = values[~np.isnan(values)]
        
        if len(values) == 0:
            validation_results['warnings'].append("No valid numeric values found")
            return validation_results
        
        # Check minimum value
        if min_val is not None:
            actual_min = np.min(values)
            if actual_min < min_val:
                validation_results['errors'].append(
                    f"Values below minimum threshold: {actual_min} < {min_val}"
                )
                validation_results['valid'] = False
        
        # Check maximum value
        if max_val is not None:
            actual_max = np.max(values)
            if actual_max > max_val:
                validation_results['errors'].append(
                    f"Values above maximum threshold: {actual_max} > {max_val}"
                )
                validation_results['valid'] = False
        
    except Exception as e:
        validation_results['errors'].append(f"Range validation error: {str(e)}")
        validation_results['valid'] = False
    
    return validation_results


def validate_categorical_data(data: pd.Series, allowed_categories: List[str]) -> Dict[str, Any]:
    """
    Validate categorical data against allowed categories
    
    Args:
        data: Categorical data to validate
        allowed_categories: List of allowed category values
        
    Returns:
        Dictionary with validation results
    """
    validation_results = {
        'valid': True,
        'errors': [],
        'warnings': []
    }
    
    unique_values = data.unique()
    invalid_categories = [val for val in unique_values if val not in allowed_categories]
    
    if invalid_categories:
        validation_results['errors'].append(
            f"Invalid categories found: {invalid_categories}"
        )
        validation_results['valid'] = False
    
    # Check for missing categories that might be expected
    missing_categories = [cat for cat in allowed_categories if cat not in unique_values]
    if missing_categories:
        validation_results['warnings'].append(
            f"Expected categories not found in data: {missing_categories}"
        )
    
    return validation_results