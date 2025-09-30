#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}=== Zero Day Attack Detection System - Test Suite ===${NC}"
echo ""

# Function to run tests and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    echo -e "${BLUE}Running $test_name...${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir" || exit 1
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    if [ -n "$test_dir" ]; then
        cd - > /dev/null || exit 1
    fi
}

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${BLUE}Checking service health...${NC}"
curl -f http://test-api:8000/health || exit 1
curl -f http://test-backend:5000/api/health || exit 1
curl -f http://test-frontend:3000/health || exit 1
echo -e "${GREEN}All services are healthy${NC}"
echo ""

# Frontend Tests
echo -e "${BLUE}=== Frontend Tests ===${NC}"
run_test "Frontend Unit Tests" "npm run test:coverage" "frontend"
run_test "Frontend Type Checking" "npm run type-check" "frontend"
run_test "Frontend Linting" "npm run lint" "frontend"
run_test "Frontend E2E Tests" "npm run test:e2e" "frontend"

# Backend Tests
echo -e "${BLUE}=== Backend Tests ===${NC}"
run_test "Backend Unit Tests" "npm run test:coverage" "backend"
run_test "Backend Integration Tests" "npm run test:integration" "backend"
run_test "Backend Linting" "npm run lint" "backend"
run_test "Backend Security Audit" "npm audit --audit-level moderate" "backend"

# API Tests
echo -e "${BLUE}=== API Tests ===${NC}"
run_test "API Unit Tests" "pytest tests/test_models.py tests/test_utils.py -v --cov=." "api"
run_test "API Integration Tests" "pytest tests/test_api.py -v --cov=. --cov-append" "api"
run_test "API Security Tests" "pytest -m security -v" "api"
run_test "API Performance Tests" "echo 'API performance tests are disabled in CI/run-tests script'" "api"
run_test "API Code Quality" "flake8 . && mypy . --ignore-missing-imports" "api"
run_test "API Security Scan" "bandit -r . -x tests/" "api"

# Cross-service Integration Tests
echo -e "${BLUE}=== Cross-Service Integration Tests ===${NC}"
run_test "End-to-End Workflow Test" "./scripts/e2e-workflow-test.sh" "."
run_test "API-Backend Integration" "./scripts/api-backend-integration-test.sh" "."
run_test "Full Stack Test" "./scripts/full-stack-test.sh" "."

# Load and Performance Tests
echo -e "${BLUE}=== Load and Performance Tests ===${NC}"
run_test "API Load Test" "k6 run --vus 10 --duration 30s load-tests/api-load-test.js" "."
run_test "Backend Load Test" "k6 run --vus 10 --duration 30s load-tests/backend-load-test.js" "."
run_test "Database Performance Test" "node backend/db_performance_test.js" "."

# Security Tests
echo -e "${BLUE}=== Security Tests ===${NC}"
run_test "Container Security Scan" "trivy image zda-test-api" "."
run_test "OWASP ZAP Baseline Scan" "zap-baseline.py -t http://test-frontend:3000" "."
run_test "SQL Injection Tests" "python scripts/sql-injection-test.py" "."
run_test "XSS Tests" "python scripts/xss-test.py" "."

# Generate Test Report
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi