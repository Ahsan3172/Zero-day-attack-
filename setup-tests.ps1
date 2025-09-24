# Zero Day Attack Detection System - Test Setup Script (PowerShell)
param(
    [switch]$SkipDocker,
    [switch]$SkipDependencies,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

Write-Host "=== Zero Day Attack Detection System - Test Setup ===" -ForegroundColor Blue
Write-Host ""

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $missing = @()
    
    # Check Node.js
    try {
        $nodeVersion = & node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Node.js found: $nodeVersion"
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-ErrorMsg "Node.js is not installed. Please install Node.js 18+ first."
        $missing += "Node.js"
    }
    
    # Check Python
    try {
        $pythonVersion = & python --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Python found: $pythonVersion"
        } else {
            # Try python3
            $pythonVersion = & python3 --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Python3 found: $pythonVersion"
            } else {
                throw "Python not found"
            }
        }
    } catch {
        Write-ErrorMsg "Python is not installed. Please install Python 3.10+ first."
        $missing += "Python"
    }
    
    # Check Docker (optional)
    if (-not $SkipDocker) {
        try {
            $dockerVersion = & docker --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker found: $dockerVersion"
            } else {
                throw "Docker not found"
            }
        } catch {
            Write-Warning "Docker is not installed. Some tests will not be available."
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-ErrorMsg "Missing prerequisites: $($missing -join ', ')"
        Write-Host "Please install the missing software and run this script again." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Success "Prerequisites check complete"
    Write-Host ""
}

# Install dependencies
function Install-Dependencies {
    if ($SkipDependencies) {
        Write-Warning "Skipping dependency installation"
        return
    }
    
    Write-Info "Installing dependencies..."
    
    # Frontend dependencies
    if (Test-Path "frontend") {
        Write-Info "Installing frontend dependencies..."
        $currentLocation = Get-Location
        try {
            Set-Location "frontend"
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Frontend dependencies installed"
            } else {
                Write-ErrorMsg "Frontend dependency installation failed"
            }
        } catch {
            Write-ErrorMsg "Frontend dependency installation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    # Backend dependencies
    if (Test-Path "backend") {
        Write-Info "Installing backend dependencies..."
        $currentLocation = Get-Location
        try {
            Set-Location "backend"
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Backend dependencies installed"
            } else {
                Write-ErrorMsg "Backend dependency installation failed"
            }
        } catch {
            Write-ErrorMsg "Backend dependency installation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    # API dependencies
    if (Test-Path "api") {
        Write-Info "Installing API dependencies..."
        $currentLocation = Get-Location
        try {
            Set-Location "api"
            pip install -r requirements.txt
            if ($LASTEXITCODE -eq 0) {
                Write-Success "API dependencies installed"
            } else {
                Write-ErrorMsg "API dependency installation failed"
            }
        } catch {
            Write-ErrorMsg "API dependency installation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    Write-Host ""
}

# Initialize test environment
function Initialize-TestEnvironment {
    Write-Info "Setting up test environment..."
    
    # Create test directories
    $testDirs = @("test-results", "coverage-reports", "test-data", "load-test-results")
    
    foreach ($dir in $testDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Created directory: $dir"
        }
    }
    
    # Create sample test data
    $sampleDatasetContent = @(
        "feature1,feature2,feature3,feature4,feature5,label",
        "1.0,2.0,3.0,4.0,5.0,0",
        "6.0,7.0,8.0,9.0,10.0,1",
        "11.0,12.0,13.0,14.0,15.0,0",
        "16.0,17.0,18.0,19.0,20.0,1",
        "21.0,22.0,23.0,24.0,25.0,0"
    )
    
    $predictionDataContent = @(
        "feature1,feature2,feature3,feature4,feature5",
        "1.5,2.5,3.5,4.5,5.5",
        "6.5,7.5,8.5,9.5,10.5",
        "11.5,12.5,13.5,14.5,15.5"
    )
    
    try {
        $sampleDatasetContent | Out-File -FilePath "test-data/sample-dataset.csv" -Encoding UTF8
        $predictionDataContent | Out-File -FilePath "test-data/prediction-data.csv" -Encoding UTF8
        Write-Success "Test data files created"
    } catch {
        Write-ErrorMsg "Failed to create test data files: $($_.Exception.Message)"
    }
    
    Write-Success "Test environment setup complete"
    Write-Host ""
}

# Test initial setup
function Test-InitialSetup {
    Write-Info "Running initial test validation..."
    
    # Frontend validation
    if (Test-Path "frontend/package.json") {
        $currentLocation = Get-Location
        try {
            Set-Location "frontend"
            & npm run type-check 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Frontend type checking passed"
            } else {
                Write-Warning "Frontend type checking failed"
            }
        } catch {
            Write-Warning "Frontend validation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    # Backend validation
    if (Test-Path "backend/package.json") {
        $currentLocation = Get-Location
        try {
            Set-Location "backend"
            & npm run lint 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Backend linting passed"
            } else {
                Write-Warning "Backend linting failed"
            }
        } catch {
            Write-Warning "Backend validation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    # API validation
    if (Test-Path "api/requirements.txt") {
        $currentLocation = Get-Location
        try {
            Set-Location "api"
            & python -m pytest --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "API testing framework available"
            } else {
                Write-Warning "API testing framework not available"
            }
        } catch {
            Write-Warning "API validation failed: $($_.Exception.Message)"
        } finally {
            Set-Location $currentLocation
        }
    }
    
    Write-Success "Initial test validation complete"
    Write-Host ""
}

# Build Docker images (optional)
function Build-DockerImages {
    if ($SkipDocker) {
        Write-Warning "Skipping Docker image builds"
        return
    }
    
    Write-Info "Building Docker images for testing..."
    
    try {
        if (Test-Path "docker-compose.test.yml") {
            & docker-compose -f docker-compose.test.yml build
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker images built successfully"
            } else {
                Write-Warning "Docker image build failed"
            }
        } else {
            Write-Warning "docker-compose.test.yml not found, skipping Docker builds"
        }
    } catch {
        Write-Warning "Docker build failed: $($_.Exception.Message)"
    }
    
    Write-Host ""
}

# Main execution
function Main {
    Write-Info "This script will set up the complete testing environment for the Zero Day Attack Detection System."
    Write-Host ""
    
    Test-Prerequisites
    Install-Dependencies
    Initialize-TestEnvironment
    Test-InitialSetup
    Build-DockerImages
    
    Write-Host ""
    Write-Host "Test environment setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "1. Run all tests: .\run-tests.ps1"
    Write-Host "2. Run specific test suites:"
    Write-Host "   - Frontend only: .\run-tests.ps1 -Frontend"
    Write-Host "   - Backend only: .\run-tests.ps1 -Backend"
    Write-Host "   - API only: .\run-tests.ps1 -Api"
    Write-Host "3. For verbose output: .\run-tests.ps1 -Verbose"
    Write-Host ""
    Write-Host "For detailed testing documentation, see TESTING.md" -ForegroundColor Yellow
}

# Execute main function
try {
    Main
} catch {
    Write-ErrorMsg "Setup failed: $($_.Exception.Message)"
    exit 1
}