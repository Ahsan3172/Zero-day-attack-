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
set FRONTEND_PORT=8081

echo [INFO] Quick starting all services...
echo.

echo [INFO] Starting ML API (Port %API_PORT%)...
start "ML API" cmd /k "title ML API && cd /d %PROJECT_ROOT%api && python -m uvicorn main:app --host 0.0.0.0 --port %API_PORT% --reload"

timeout /t 5 /nobreak > nul

echo [INFO] Starting Backend (Port %BACKEND_PORT%)...
start "Backend" cmd /k "title Backend && cd /d %PROJECT_ROOT%backend && npm start"

timeout /t 5 /nobreak > nul

echo [INFO] Starting Frontend (Port %FRONTEND_PORT%)...
start "Frontend" cmd /k "title Frontend && cd /d %PROJECT_ROOT%frontend && npm run dev -- --port %FRONTEND_PORT% --host 0.0.0.0"

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
echo [INFO] Wait a few moments for all services to be ready
echo.
pause
