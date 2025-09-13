-- Zero Day Attack Detection Database Schema
-- Database: zero_day_attack

-- Create database (run this first in phpMyAdmin or MySQL command line)
-- CREATE DATABASE zero_day_attack;
-- USE zero_day_attack;

-- Users table for authentication and role management
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Dataset uploads table
CREATE TABLE dataset_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    rows_count INT,
    columns_count INT,
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('uploaded', 'processing', 'processed', 'error') DEFAULT 'uploaded',
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Model predictions/results table
CREATE TABLE model_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    dataset_id INT NOT NULL,
    user_id INT NOT NULL,
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    confusion_matrix JSON, -- Store as JSON
    classification_report JSON, -- Store detailed report as JSON
    prediction_results JSON, -- Store actual predictions
    execution_time DECIMAL(8,3), -- Time in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_id) REFERENCES dataset_uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions table for authentication
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Model training jobs
CREATE TABLE ml_models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    dataset_path VARCHAR(255),
    model_types JSON NOT NULL, -- Array of model types to train
    test_size DECIMAL(3,2) DEFAULT 0.2,
    random_state INT DEFAULT 42,
    status ENUM('started', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'started',
    progress DECIMAL(5,2) DEFAULT 0.00, -- Progress percentage
    current_model VARCHAR(50),
    message TEXT,
    error_details TEXT,
    models_completed JSON, -- Array of completed models
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- System settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Audit log for important actions
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin user (password: admin123 - hash this in production)
INSERT INTO users (username, email, password_hash, role, status, approved_at) 
VALUES ('admin', 'admin@zerodayattack.com', '$2b$10$8Og5nJ8Z9K.K9KxN3Z4Q0.rX9z5r2YHM2FJn6J2J8Z9K.K9KxN3Z4', 'admin', 'approved', NOW());

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('max_file_size', '100', 'Maximum file upload size in MB'),
('allowed_file_types', 'csv,xlsx,json', 'Allowed file types for dataset upload'),
('auto_approve_users', 'false', 'Automatically approve new user registrations'),
('model_retention_days', '30', 'Number of days to keep old model results');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_model_results_model_id ON model_results(model_id);
CREATE INDEX idx_model_results_user_id ON model_results(user_id);
CREATE INDEX idx_model_results_created_at ON model_results(created_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
