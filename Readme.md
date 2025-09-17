# Zero Day Attack - ML-Powered Cybersecurity Platform

A comprehensive cybersecurity platform that leverages machine learning for zero-day attack detection and network intrusion analysis. The system consists of three main components: a FastAPI ML backend, Node.js Express server, and React frontend.

## Architecture

- *ML API (FastAPI)*: Port 8000 - Handles machine learning operations, model training, and predictions
- *Backend (Express.js)*: Port 5000 - Manages authentication, database operations, and integrates with ML API
- *Frontend (React/Vite)*: Port 8081 - User interface for dashboard, model management, and monitoring
- *Database*: MySQL - Stores user data, training jobs, predictions, and security alerts

## Prerequisites

Before running the project, ensure you have the following installed:

### Required Software
- *Python 3.10*
- *Node.js latest* 
- *MySQL via xampp server*
- *Git* (for cloning the repository)


## Quick Start

### Step 1: Download the Repository
bash
git clone https://github.com/Ahsan3172/Zero-day-attack-.git
cd Zero-day-attack


### Step 2: Database Setup

#### Install and Configure MySQL
1. Download and install Xampp server
    - Start the apache and mysql servers
    - Open the phpmyadmin at this link http://localhost/phpmyadmin/ or from the xampp control panel
    - Create the database of name "zero_day_attack" 
    - Open this database and goto SQL tab and run the sql schema that is in the backend/database/schema.sql, copy that and run it in the phpmyadmin sql tab

### Step 3: Install Dependencies

#### Python Dependencies (ML API)
bash
cd api
pip install -r requirements.txt


#### Backend Dependencies
bash
cd ../backend
npm install


#### Frontend Dependencies
bash
cd ../frontend
npm install


## Running the Project

### Option 1: Automated Startup (Recommended)
In the VsCode, make sure your project is open then open the terminal in the vscode then run the below command only, it will startup all the three servers.
cmd
# Run all servers at once
start-servers.bat


### Option 2: Manual Startup

#### Terminal 1 - ML API (FastAPI)
bash
cd api
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload


#### Terminal 2 - Backend Server (Express)
bash
cd backend
npm start


#### Terminal 3 - Frontend (React)
bash
cd frontend
npm run dev -- --port 8081 --host 0.0.0.0


## Accessing the Application

Once all servers are running:

- *Main Application*: http://localhost:8081
- *API Documentation*: http://localhost:8000/docs
- *API Health Check*: http://localhost:8000/health
- *Backend API*: http://localhost:5000/api

## First Time Setup

### Create Admin User
1. Access the application at http://localhost:8081
2. Click "Sign Up" and create an account
3. Open MySQL and manually approve the user:
sql
UPDATE users SET status = 'approved', role = 'admin' WHERE username = 'your_username';


### Upload Training Dataset
1. Login as admin
2. Navigate to "Train Model"
3. Upload a CSV file with network traffic data
4. Select a model type (Random Forest recommended)
5. Start training

## Features

### ML Models Supported
- *Random Forest*: Best for general network intrusion detection
- *Isolation Forest*: Unsupervised anomaly detection
- *One Class SVM*: Novelty detection for zero-day attacks
- *Deep Autoencoders*: Complex pattern recognition

### Dashboard Features
- Real-time threat monitoring
- Model performance metrics
- Training job management
- Prediction analytics
- Security alert management

## Troubleshooting

### Common Issues

#### Port Already in Use
bash
# Kill processes on required ports
netstat -ano | findstr :8000
netstat -ano | findstr :5000
netstat -ano | findstr :8081
taskkill /f /pid [PID_NUMBER]


#### Database Connection Issues
- Verify MySQL is running
- Check credentials in .env file
- Ensure database and user exist

#### Python Module Errors
bash
cd api
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall


#### Node.js Dependency Issues
bash
cd backend
npm cache clean --force
npm install

cd ../frontend
npm cache clean --force
npm install
