@echo off
color 0B

echo.
echo ========================================
echo   Zero Day Attack - Quick Start
echo ========================================
echo.

set PROJECT_ROOT=%~dp0
set API_PORT=8000
set BACKEND_PORT=5000
set FRONTEND_PORT=8080

echo [INFO] Checking for existing processes...

REM Kill any existing processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /f /pid %%a >nul 2>&1

echo [INFO] Starting services...
echo.

echo [INFO] Starting ML API (Port %API_PORT%)...
start "ML API" cmd /k "title ML API && cd /d %PROJECT_ROOT%api && python -m uvicorn main:app --host 0.0.0.0 --port %API_PORT% --reload"

timeout /t 5 /nobreak > nul

echo [INFO] Starting Backend (Port %BACKEND_PORT%)...
start "Backend" cmd /k "title Backend && cd /d %PROJECT_ROOT%backend && node server.js"

timeout /t 5 /nobreak > nul

echo [INFO] Starting Frontend (Port %FRONTEND_PORT%)...
start "Frontend" cmd /k "title Frontend && cd /d %PROJECT_ROOT%frontend && npm run dev"

echo.
echo ========================================
echo   Services Starting...
echo ========================================
echo.
echo Access Points:
echo   Application:    http://localhost:%FRONTEND_PORT%
echo   Backend API:    http://localhost:%BACKEND_PORT%/api
echo   ML API:         http://localhost:%API_PORT%
echo   API Docs:       http://localhost:%API_PORT%/docs
echo.
echo [INFO] All services are starting in separate windows
echo [INFO] Wait 10-15 seconds for all services to be ready
echo [INFO] Check the separate command windows for any errors
echo.
echo [TIP] If services fail to start:
echo   1. Check if Python virtual environment is activated
echo   2. Ensure Node.js dependencies are installed (npm install)
echo   3. Verify database connection is working
echo.
pause
