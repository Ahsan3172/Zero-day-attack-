# Zero Day Attack - ML-Powered Cybersecurity Platform

A comprehensive cybersecurity platform that leverages machine learning for zero-day attack detection and network intrusion analysis. The system consists of three main components: a FastAPI ML backend, Node.js Express server, and React frontend.

## 🏗️ Architecture

- **ML API (FastAPI)**: Port 8000 - Handles machine learning operations, model training, and predictions
- **Backend (Express.js)**: Port 5000 - Manages authentication, database operations, and integrates with ML API
- **Frontend (React/Vite)**: Port 8081 - User interface for dashboard, model management, and monitoring
- **Database**: MySQL - Stores user data, training jobs, predictions, and security alerts

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

### Required Software
- **Python 3.8 or higher** (recommended: 3.10+)
- **Node.js 16 or higher** (recommended: 18+)
- **MySQL 8.0 or higher**
- **Git** (for cloning the repository)

### Operating System
- Windows 10/11 (primary support)
- Linux/MacOS (with minor modifications to startup scripts)

## 🚀 Quick Start

### Step 1: Download the Repository
```bash
git clone https://github.com/Ahsan3172/Zero-day-attack-.git
cd Zero-day-attack
```

### Step 2: Database Setup

#### Install and Configure MySQL
1. Download and install MySQL from https://dev.mysql.com/downloads/mysql/
2. During installation, set a root password (remember this!)
3. Start MySQL service:
   - Windows: MySQL should start automatically
   - Linux: `sudo systemctl start mysql`

#### Create Database and User
```sql
-- Login to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE zero_day_attack;

-- Create user (replace 'your_password' with a secure password)
CREATE USER 'zda_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON zero_day_attack.* TO 'zda_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### Step 3: Install Dependencies

#### Python Dependencies (ML API)
```bash
cd api
pip install -r requirements.txt
```

#### Backend Dependencies
```bash
cd ../backend
npm install
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 4: Environment Configuration

#### Backend Environment Setup
Create a `.env` file in the `backend` directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=zda_user
DB_PASSWORD=your_password
DB_NAME=zero_day_attack

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# ML API Configuration
ML_API_URL=http://localhost:8000
ML_API_TIMEOUT=300000

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:8081
```

#### Database Schema Setup
The backend will automatically create necessary tables on first run, but you can also manually create them:
```sql
USE zero_day_attack;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'data_scientist') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Training jobs table
CREATE TABLE ml_models (
    id VARCHAR(255) PRIMARY KEY,
    model_type VARCHAR(100) NOT NULL,
    dataset_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    progress INT DEFAULT 0,
    accuracy FLOAT DEFAULT NULL,
    precision_score FLOAT DEFAULT NULL,
    recall_score FLOAT DEFAULT NULL,
    f1_score FLOAT DEFAULT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    error_message TEXT NULL,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Predictions table
CREATE TABLE predictions (
    id VARCHAR(255) PRIMARY KEY,
    model_type VARCHAR(100) NOT NULL,
    prediction INT NOT NULL,
    confidence FLOAT NOT NULL,
    prediction_label VARCHAR(50) NOT NULL,
    features JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Security alerts table
CREATE TABLE security_alerts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high') NOT NULL,
    description TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    status ENUM('active', 'investigating', 'resolved', 'blocked') DEFAULT 'active',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prediction_id VARCHAR(255),
    FOREIGN KEY (prediction_id) REFERENCES predictions(id)
);
```

## 🔧 Running the Project

### Option 1: Automated Startup (Recommended)
Use the provided batch file for Windows:
```cmd
# Run all servers at once
start-servers.bat
```

### Option 2: Manual Startup

#### Terminal 1 - ML API (FastAPI)
```bash
cd api
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2 - Backend Server (Express)
```bash
cd backend
npm start
```

#### Terminal 3 - Frontend (React)
```bash
cd frontend
npm run dev -- --port 8081 --host 0.0.0.0
```

## 📱 Accessing the Application

Once all servers are running:

- **Main Application**: http://localhost:8081
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health
- **Backend API**: http://localhost:5000/api

## 🔐 First Time Setup

### Create Admin User
1. Access the application at http://localhost:8081
2. Click "Sign Up" and create an account
3. Open MySQL and manually approve the user:
```sql
UPDATE users SET status = 'approved', role = 'admin' WHERE username = 'your_username';
```

### Upload Training Dataset
1. Login as admin
2. Navigate to "Train Model"
3. Upload a CSV file with network traffic data
4. Select a model type (Random Forest recommended)
5. Start training

## 📊 Features

### ML Models Supported
- **Random Forest**: Best for general network intrusion detection
- **Isolation Forest**: Unsupervised anomaly detection
- **One Class SVM**: Novelty detection for zero-day attacks
- **Deep Autoencoders**: Complex pattern recognition

### Dashboard Features
- Real-time threat monitoring
- Model performance metrics
- Training job management
- Prediction analytics
- Security alert management

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on required ports
netstat -ano | findstr :8000
netstat -ano | findstr :5000
netstat -ano | findstr :8081
taskkill /f /pid [PID_NUMBER]
```

#### Database Connection Issues
- Verify MySQL is running
- Check credentials in `.env` file
- Ensure database and user exist
- Check firewall settings

#### Python Module Errors
```bash
cd api
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

#### Node.js Dependency Issues
```bash
cd backend
npm cache clean --force
npm install

cd ../frontend
npm cache clean --force
npm install
```

### Performance Optimization
- Use SSD storage for better database performance
- Allocate at least 8GB RAM for ML training
- Enable MySQL query caching
- Use production builds for deployment

## 🔒 Security Considerations

- Change default JWT secret in production
- Use strong database passwords
- Enable HTTPS in production
- Regularly update dependencies
- Implement rate limiting
- Use environment variables for sensitive data

## 📝 Development

### Adding New Models
1. Implement model in `api/models/`
2. Update `ml_pipeline.py`
3. Add model type to frontend
4. Test training and prediction endpoints

### Database Migrations
- Backup database before schema changes
- Use proper foreign key constraints
- Index frequently queried columns
- Document schema changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## 📄 License

This project is for educational and research purposes in cybersecurity.

## 📞 Support

For issues and questions:
- Check troubleshooting section above
- Review server logs in respective terminal windows
- Ensure all prerequisites are installed
- Verify database connectivity

---

**Note**: This is a research and educational project. Use responsibly and in accordance with applicable laws and regulations.
