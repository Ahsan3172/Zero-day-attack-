# PowerShell Test Runner for Zero Day Attack Detection System
param(
    [switch]$SkipDocker,
    [switch]$Frontend,
    [switch]$Backend, 
    [switch]$Api,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "=== Zero Day Attack Detection System - Test Suite ===" -ForegroundColor Blue
Write-Host ""

$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

function Invoke-TestSuite {
    param(
        [string]$TestName,
        [string]$TestCommand,
        [string]$TestDir = ""
    )
    
    Write-Host "Running $TestName..." -ForegroundColor Blue
    $script:TotalTests++
    
    $originalLocation = Get-Location
    
    try {
        if ($TestDir -and (Test-Path $TestDir)) {
            Set-Location $TestDir
        }
        
        if ($Verbose) {
            Write-Host "Command: $TestCommand" -ForegroundColor Gray
            Write-Host "Directory: $(Get-Location)" -ForegroundColor Gray
        }
        
        Invoke-Expression $TestCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] $TestName PASSED" -ForegroundColor Green
            $script:PassedTests++
        } else {
            Write-Host "[FAILED] $TestName FAILED" -ForegroundColor Red
            $script:FailedTests++
        }
    } catch {
        Write-Host "[ERROR] $TestName FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $script:FailedTests++
    } finally {
        Set-Location $originalLocation
    }
    Write-Host ""
}

# Check if services should be started (not in skip mode)
if (-not $SkipDocker) {
    Write-Host "Checking Docker services..." -ForegroundColor Yellow
    try {
        docker --version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "Docker not available, skipping service checks" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Frontend Tests
if ($Frontend -or (-not $Backend -and -not $Api)) {
    Write-Host "=== Frontend Tests ===" -ForegroundColor Blue
    
    if (Test-Path "frontend") {
        Invoke-TestSuite "Frontend Dependencies Check" "npm list --depth=0" "frontend"
        Invoke-TestSuite "Frontend Type Check" "npm run type-check" "frontend"
        Invoke-TestSuite "Frontend Lint" "npm run lint" "frontend"  
        Invoke-TestSuite "Frontend Unit Tests" "npm run test" "frontend"
        Invoke-TestSuite "Frontend Build" "npm run build" "frontend"
    } else {
        Write-Host "Frontend directory not found, skipping frontend tests" -ForegroundColor Yellow
    }
}

# Backend Tests  
if ($Backend -or (-not $Frontend -and -not $Api)) {
    Write-Host "=== Backend Tests ===" -ForegroundColor Blue
    
    if (Test-Path "backend") {
        Invoke-TestSuite "Backend Dependencies Check" "npm list --depth=0" "backend"
        Invoke-TestSuite "Backend Lint" "npm run lint" "backend"
        Invoke-TestSuite "Backend Unit Tests" "npm test" "backend"
    } else {
        Write-Host "Backend directory not found, skipping backend tests" -ForegroundColor Yellow
    }
}

# API Tests
if ($Api -or (-not $Frontend -and -not $Backend)) {
    Write-Host "=== API Tests ===" -ForegroundColor Blue
    
    if (Test-Path "api") {
        Invoke-TestSuite "API Dependencies Check" "pip list" "api"
        Invoke-TestSuite "API Unit Tests" "python -m pytest tests/test_models.py -v" "api"
        Invoke-TestSuite "API Integration Tests" "python -m pytest tests/test_api.py -v" "api"
        Invoke-TestSuite "API Utils Tests" "python -m pytest tests/test_utils.py -v" "api"
        Invoke-TestSuite "API Security Tests" "python -m pytest -m security -v" "api"
    } else {
        Write-Host "API directory not found, skipping API tests" -ForegroundColor Yellow
    }
}

# Test Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Blue
Write-Host "Total Tests Run: $TotalTests"
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red

if ($TotalTests -eq 0) {
    Write-Host "No tests were run. Use flags to specify test suites." -ForegroundColor Yellow
    exit 0
}

$successRate = [math]::Round(($PassedTests / $TotalTests) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor Cyan

if ($FailedTests -eq 0) {
    Write-Host ""
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "$FailedTests test(s) failed!" -ForegroundColor Red
    Write-Host "Use -Verbose flag for detailed error output" -ForegroundColor Yellow
    exit 1
}