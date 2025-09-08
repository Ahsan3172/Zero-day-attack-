# Zero Day Attack Detection System - Backend

A Node.js backend server for machine learning-based zero-day attack detection and intrusion detection system (IDS) development.

## Features

- **User Management**: Registration, authentication, role-based access control
- **Model Integration**: Support for multiple ML/DL models (Random Forest, SVM, Neural Networks, etc.)
- **Dataset Management**: Upload, process, and manage CSV datasets  
- **Results & Reporting**: Model accuracy, confusion matrix, classification reports
- **Admin Dashboard**: User approval, model training management
- **Security**: JWT authentication, rate limiting, input validation

## Prerequisites

- Node.js (v16 or higher)
- MySQL/MariaDB (v8.0 or higher)
- Python (v3.8 or higher) for ML models
- XAMPP or similar MySQL server

## Installation

### 1. Database Setup

1. Start XAMPP and ensure MySQL is running
2. Create a database named `zero_day_attack`
3. Import the schema:
   ```sql
   -- In phpMyAdmin or MySQL command line
   SOURCE database/schema.sql;
   ```

### 2. Backend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   - Copy `.env` file and update the following:
     - `DB_PASSWORD` - Your MySQL root password
     - `JWT_SECRET` - A secure secret key
     - Other settings as needed

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Change password

### Dataset Management
- `POST /api/datasets/upload` - Upload dataset
- `GET /api/datasets` - Get user datasets
- `GET /api/datasets/:id` - Get dataset details
- `DELETE /api/datasets/:id` - Delete dataset

### Model Management
- `GET /api/models` - Get available models
- `POST /api/models/:id/predict` - Run prediction
- `GET /api/models/results/:resultId` - Get prediction results

### Dashboard
- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/dashboard/charts/*` - Chart data

### Admin (Admin only)
- `GET /api/admin/users/pending` - Pending user registrations
- `PUT /api/admin/users/:id/approve` - Approve user
- `PUT /api/admin/users/:id/reject` - Reject user
- `POST /api/admin/models/train` - Initiate model training

## Usage

### 1. Register and Login

```javascript
// Register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePass123'
  })
});

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePass123'
  })
});
```

### 2. Upload Dataset

```javascript
const formData = new FormData();
formData.append('dataset', fileInput.files[0]);

const response = await fetch('/api/datasets/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 3. Run Prediction

```javascript
const response = await fetch('/api/models/1/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    datasetId: 1
  })
});
```

## Default Admin Account

- **Username**: admin
- **Email**: admin@zerodayattack.com  
- **Password**: admin123 (change immediately in production)

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- File upload restrictions

## ML Models Supported

- Random Forest Classifier
- Support Vector Machine (SVM)
- Neural Networks (MLP)
- Gradient Boosting Classifier

## File Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── datasets.js          # Dataset management routes
│   ├── models.js            # ML model routes
│   ├── dashboard.js         # Dashboard routes
│   └── admin.js             # Admin routes
├── utils/
│   └── logger.js            # Logging utilities
├── uploads/                 # Uploaded files directory
├── logs/                    # Application logs
├── database/
│   └── schema.sql           # Database schema
├── ml_models.py             # Python ML models script
├── requirements.txt         # Python dependencies
├── package.json             # Node.js dependencies
├── .env                     # Environment variables
└── server.js                # Main server file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_NAME` | Database name | zero_day_attack |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | (empty) |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 24h |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
