#!/usr/bin/env python3
"""
Zero Day Attack Detection ML Models
This script provides machine learning models for cybersecurity threat detection.
"""

import pandas as pd
import numpy as np
import json
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import joblib
import warnings
warnings.filterwarnings('ignore')

class ZeroDayDetector:
    def __init__(self, model_type='random_forest'):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = None
        
        # Initialize model based on type
        if model_type == 'random_forest':
            self.model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        elif model_type == 'gradient_boosting':
            self.model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        elif model_type == 'svm':
            self.model = SVC(kernel='rbf', random_state=42, probability=True)
        elif model_type == 'neural_network':
            self.model = MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
    
    def preprocess_data(self, df):
        """Preprocess the dataset for training/prediction"""
        # Handle missing values
        df = df.fillna(df.median(numeric_only=True))
        
        # Separate features and target
        if 'Class' in df.columns:
            target = df['Class']
            features = df.drop('Class', axis=1)
        elif 'Label' in df.columns:
            target = df['Label']  
            features = df.drop('Label', axis=1)
        else:
            # No target column for prediction
            target = None
            features = df
        
        # Handle categorical variables
        categorical_cols = features.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            # Use frequency encoding for high cardinality categorical variables
            freq_encoding = features[col].value_counts().to_dict()
            features[col] = features[col].map(freq_encoding)
        
        # Store feature columns for consistency
        if self.feature_columns is None:
            self.feature_columns = features.columns.tolist()
        
        # Ensure consistent feature columns
        features = features.reindex(columns=self.feature_columns, fill_value=0)
        
        return features, target
    
    def train(self, data_path):
        """Train the model on the provided dataset"""
        try:
            # Load data
            df = pd.read_csv(data_path)
            print(f"Loaded dataset with shape: {df.shape}")
            
            # Preprocess data
            X, y = self.preprocess_data(df)
            
            if y is None:
                raise ValueError("No target column found. Expected 'Class' or 'Label' column.")
            
            # Encode target labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            print(f"Training {self.model_type} model...")
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = self.model.predict(X_test_scaled)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            # Confusion matrix
            cm = confusion_matrix(y_test, y_pred)
            
            # Classification report
            report = classification_report(y_test, y_pred, 
                                         target_names=self.label_encoder.classes_,
                                         output_dict=True)
            
            results = {
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'confusion_matrix': cm.tolist(),
                'classification_report': report,
                'model_type': self.model_type,
                'feature_count': len(self.feature_columns),
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
            print(f"Training completed. Accuracy: {accuracy:.4f}")
            return results
            
        except Exception as e:
            print(f"Error during training: {str(e)}")
            return {'error': str(e)}
    
    def predict(self, data_path):
        """Make predictions on new data"""
        try:
            if self.model is None:
                raise ValueError("Model not trained. Please train the model first.")
            
            # Load data
            df = pd.read_csv(data_path)
            print(f"Loaded prediction dataset with shape: {df.shape}")
            
            # Preprocess data
            X, y_true = self.preprocess_data(df)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make predictions
            y_pred = self.model.predict(X_scaled)
            y_pred_proba = self.model.predict_proba(X_scaled) if hasattr(self.model, 'predict_proba') else None
            
            # Decode predictions
            y_pred_labels = self.label_encoder.inverse_transform(y_pred)
            
            results = {
                'predictions': y_pred_labels.tolist(),
                'prediction_probabilities': y_pred_proba.tolist() if y_pred_proba is not None else None,
                'sample_count': len(X)
            }
            
            # If true labels available, calculate metrics
            if y_true is not None:
                y_true_encoded = self.label_encoder.transform(y_true)
                
                accuracy = accuracy_score(y_true_encoded, y_pred)
                precision = precision_score(y_true_encoded, y_pred, average='weighted')
                recall = recall_score(y_true_encoded, y_pred, average='weighted')
                f1 = f1_score(y_true_encoded, y_pred, average='weighted')
                cm = confusion_matrix(y_true_encoded, y_pred)
                report = classification_report(y_true_encoded, y_pred,
                                             target_names=self.label_encoder.classes_,
                                             output_dict=True)
                
                results.update({
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'confusion_matrix': cm.tolist(),
                    'classification_report': report
                })
                
                print(f"Prediction completed. Accuracy: {accuracy:.4f}")
            else:
                print("Prediction completed. No ground truth available for evaluation.")
            
            return results
            
        except Exception as e:
            print(f"Error during prediction: {str(e)}")
            return {'error': str(e)}
    
    def save_model(self, model_path):
        """Save the trained model"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder,
                'feature_columns': self.feature_columns,
                'model_type': self.model_type
            }
            joblib.dump(model_data, model_path)
            print(f"Model saved to {model_path}")
            return True
        except Exception as e:
            print(f"Error saving model: {str(e)}")
            return False
    
    def load_model(self, model_path):
        """Load a trained model"""
        try:
            model_data = joblib.load(model_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['label_encoder']
            self.feature_columns = model_data['feature_columns']
            self.model_type = model_data['model_type']
            print(f"Model loaded from {model_path}")
            return True
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 3:
        print("Usage: python ml_models.py <action> <model_type> [data_path] [model_path]")
        print("Actions: train, predict, save, load")
        print("Model types: random_forest, gradient_boosting, svm, neural_network")
        sys.exit(1)
    
    action = sys.argv[1]
    model_type = sys.argv[2]
    
    # Initialize detector
    detector = ZeroDayDetector(model_type)
    
    if action == 'train':
        if len(sys.argv) < 4:
            print("Data path required for training")
            sys.exit(1)
        
        data_path = sys.argv[3]
        results = detector.train(data_path)
        
        # Save results to JSON
        with open('training_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        # Optionally save model
        if len(sys.argv) >= 5:
            model_path = sys.argv[4]
            detector.save_model(model_path)
    
    elif action == 'predict':
        if len(sys.argv) < 5:
            print("Data path and model path required for prediction")
            sys.exit(1)
        
        data_path = sys.argv[3]
        model_path = sys.argv[4]
        
        # Load model and predict
        if detector.load_model(model_path):
            results = detector.predict(data_path)
            
            # Save results to JSON
            with open('prediction_results.json', 'w') as f:
                json.dump(results, f, indent=2)
    
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)

if __name__ == "__main__":
    main()
