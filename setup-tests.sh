#!/bin/bash

# Zero Day Attack Detection System - Test Setup Script
# This script sets up the complete testing environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Zero Day Attack Detection System - Test Setup ===${NC}"
echo ""

# Check if running on Windows (Git Bash/WSL)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo -e "${YELLOW}Detected Windows environment${NC}"
    USE_WINPTY=true
else
    USE_WINPTY=false
fi

# Function to run docker commands with winpty if needed
docker_run() {
    if [ "$USE_WINPTY" = true ]; then
        winpty docker "$@"
    else
        docker "$@"
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}Installing dependencies...${NC}"
    
    # Frontend dependencies
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # API dependencies
    echo "Installing API dependencies..."
    cd api
    pip install -r requirements.txt
    cd ..
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Function to setup test environment
setup_test_env() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    
    # Create test directories
    mkdir -p test-results
    mkdir -p coverage-reports
    mkdir -p load-test-results
    
    # Create test data directory
    mkdir -p test-data
    
    # Create sample test data
    cat > test-data/sample-dataset.csv << EOF
feature1,feature2,feature3,feature4,feature5,label
1.0,2.0,3.0,4.0,5.0,0
6.0,7.0,8.0,9.0,10.0,1
11.0,12.0,13.0,14.0,15.0,0
16.0,17.0,18.0,19.0,20.0,1
21.0,22.0,23.0,24.0,25.0,0
EOF
    
    cat > test-data/prediction-data.csv << EOF
feature1,feature2,feature3,feature4,feature5
1.5,2.5,3.5,4.5,5.5
6.5,7.5,8.5,9.5,10.5
11.5,12.5,13.5,14.5,15.5
EOF
    
    echo -e "${GREEN}✓ Test environment setup complete${NC}"
}

# Function to run initial tests
run_initial_tests() {
    echo -e "${BLUE}Running initial test validation...${NC}"
    
    # Frontend tests
    echo "Testing frontend setup..."
    cd frontend
    npm run type-check || echo -e "${YELLOW}Warning: Frontend type check failed${NC}"
    cd ..
    
    # Backend tests  
    echo "Testing backend setup..."
    cd backend
    npm run lint || echo -e "${YELLOW}Warning: Backend lint failed${NC}"
    cd ..
    
    # API tests
    echo "Testing API setup..."
    cd api
    python -m pytest --version > /dev/null 2>&1 || echo -e "${YELLOW}Warning: Pytest not available${NC}"
    cd ..
    
    echo -e "${GREEN}✓ Initial test validation complete${NC}"
}

# Function to build Docker images
build_docker_images() {
    echo -e "${BLUE}Building Docker images for testing...${NC}"
    
    # Build test images
    docker-compose -f docker-compose.test.yml build || echo -e "${YELLOW}Warning: Docker build failed${NC}"
    
    echo -e "${GREEN}✓ Docker images built${NC}"
}

# Function to create PowerShell scripts for Windows
create_windows_scripts() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo -e "${BLUE}Creating Windows PowerShell scripts...${NC}"
        
        # Create PowerShell test runner
        cat > run-tests.ps1 << 'EOF'
# PowerShell Test Runner for Zero Day Attack Detection System

Write-Host "=== Zero Day Attack Detection System - Test Suite ===" -ForegroundColor Blue
Write-Host ""

$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

function Run-Test {
    param(
        [string]$TestName,
        [string]$TestCommand,
        [string]$TestDir = ""
    )
    
    Write-Host "Running $TestName..." -ForegroundColor Blue
    $script:TotalTests++
    
    $OriginalLocation = Get-Location
    
    if ($TestDir) {
        Set-Location $TestDir
    }
    
    try {
        Invoke-Expression $TestCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $TestName PASSED" -ForegroundColor Green
            $script:PassedTests++
        } else {
            Write-Host "✗ $TestName FAILED" -ForegroundColor Red
            $script:FailedTests++
        }
    } catch {
        Write-Host "✗ $TestName FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:FailedTests++
    }
    
    Set-Location $OriginalLocation
    Write-Host ""
}

# Start Docker services
Write-Host "Starting test services..." -ForegroundColor Yellow
docker-compose -f docker-compose.test.yml up -d

# Wait for services
Start-Sleep -Seconds 30

# Run tests
Write-Host "=== Frontend Tests ===" -ForegroundColor Blue
Run-Test "Frontend Unit Tests" "npm run test" "frontend"
Run-Test "Frontend Type Check" "npm run type-check" "frontend"
Run-Test "Frontend Lint" "npm run lint" "frontend"

Write-Host "=== Backend Tests ===" -ForegroundColor Blue
Run-Test "Backend Unit Tests" "npm test" "backend"
Run-Test "Backend Lint" "npm run lint" "backend"

Write-Host "=== API Tests ===" -ForegroundColor Blue
Run-Test "API Unit Tests" "python -m pytest tests/test_models.py -v" "api"
Run-Test "API Integration Tests" "python -m pytest tests/test_api.py -v" "api"

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Blue
Write-Host "Total Tests: $TotalTests"
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red

if ($FailedTests -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    exit 1
}
EOF
        
        echo -e "${GREEN}✓ PowerShell scripts created${NC}"
    fi
}

# Main setup process
main() {
    echo -e "${YELLOW}This script will set up the complete testing environment for the Zero Day Attack Detection System.${NC}"
    echo ""
    
    # Check prerequisites
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python is not installed. Please install Python 3.10+ first.${NC}"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️ Docker is not installed. Some tests will not be available.${NC}"
    fi
    
    echo -e "${GREEN}✓ Prerequisites check complete${NC}"
    echo ""
    
    # Run setup steps
    install_dependencies
    setup_test_env
    run_initial_tests
    
    if command -v docker &> /dev/null; then
        build_docker_images
    fi
    
    create_windows_scripts
    
    echo ""
    echo -e "${GREEN}🎉 Test environment setup complete!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run all tests: ./run-tests.sh (Linux/Mac) or run-tests.ps1 (Windows)"
    echo "2. Run specific test suites:"
    echo "   - Frontend: cd frontend && npm test"
    echo "   - Backend: cd backend && npm test"
    echo "   - API: cd api && pytest"
    echo "3. Run with Docker: docker-compose -f docker-compose.test.yml up"
    echo ""
    echo -e "${YELLOW}For detailed testing documentation, see TESTING.md${NC}"
}

# Run main function
main "$@"