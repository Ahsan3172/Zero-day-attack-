# Zero Day Attack Detection System - Testing Guide

This document provides comprehensive information about the testing strategy and implementation for the Zero Day Attack Detection System.

## 🧪 Testing Overview

Our testing strategy follows industry best practices and covers all aspects mentioned in the testing approach image:

### Testing Types Implemented

1. **Unit Testing (Python/TypeScript/JavaScript)**
   - **Frontend**: Vitest + React Testing Library (≥70% coverage)
   - **Backend**: Jest + Supertest (≥70% coverage)
   - **API**: Pytest (≥70% coverage)

2. **Property Testing**
   - **Frontend**: Using Hypothesis-like approaches
   - **API**: Hypothesis for property-based testing

3. **Type & Style Checks**
   - **Frontend**: TypeScript compiler + ESLint
   - **Backend**: ESLint + StandardJS
   - **API**: MyPy + Black + Flake8

4. **Security SAST**
   - **All**: Bandit, ESLint security rules, Semgrep
   - **Dependencies**: Safety, npm audit, Snyk

5. **Secrets Detection**
   - GitLeaks, TruffleHog for repository scanning

6. **API Functional Testing**
   - Pytest + httpx for comprehensive API testing
   - OpenAPI/Swagger validation

7. **Frontend E2E Testing**
   - Playwright for cross-browser testing
   - Accessibility testing with axe-core

8. **Component Testing**
   - React Testing Library for component isolation
   - DOM rendering and interaction testing

9. **JavaScript/TypeScript SAST**
   - ESLint with security plugins
   - TypeScript strict mode checks

10. **Accessibility Testing**
    - Automated axe-core scans
    - Keyboard navigation testing

11. **DAST (Dynamic Security)**
    - OWASP ZAP baseline and full scans
    - Nuclei vulnerability scanning

12. **Dependency Audit**
    - npm audit, safety check, Snyk monitoring

13. **Load/Stress Testing**
    - k6 for API load testing
    - Locust for stress testing

14. **Benchmarking**
    - pytest-benchmark for performance metrics
    - Memory usage monitoring

15. **ML/Data Validation**
    - Data quality checks
    - Model performance validation
    - Drift detection

16. **Adversarial Robustness**
    - ML model security testing
    - Input fuzzing

17. **CI/CD Automation**
    - GitHub Actions for all test types
    - Automated deployment pipelines

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- Git

### Running All Tests

```bash
# Using Docker Compose (Recommended)
docker-compose -f docker-compose.test.yml up --build

# Or run locally
./run-tests.sh
```

### Individual Test Suites

#### Frontend Tests
```bash
cd frontend

# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

#### Backend Tests
```bash
cd backend

# Unit tests
npm test

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Security audit
npm run security:audit

# Linting
npm run lint
```

#### API Tests
```bash
cd api

# Unit tests
pytest tests/test_models.py -v

# Integration tests
pytest tests/test_api.py -v

# All tests with coverage
pytest --cov=. --cov-report=html

# Security tests
pytest -m security

# Performance tests
pytest -m performance --benchmark-only

# Code quality
flake8 .
mypy . --ignore-missing-imports
black --check .
bandit -r . -x tests/
```

## 📊 Test Coverage Requirements

- **Minimum Coverage**: 70% for all components
- **Critical Paths**: 90% coverage required
- **Security Functions**: 100% coverage required

## 🔧 CI/CD Pipeline

### GitHub Actions Workflows

1. **Main CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Runs on every push/PR
   - Full test suite execution
   - Automated deployment

2. **Security Scanning** (`.github/workflows/security-scan.yml`)
   - SAST, DAST, dependency scanning
   - Secrets detection
   - Container security

3. **Performance Testing** (`.github/workflows/performance-testing.yml`)
   - Load testing with k6
   - Stress testing with Locust
   - Database performance benchmarks

### Pipeline Stages

1. **Code Quality**
   - Linting and formatting
   - Type checking
   - Static analysis

2. **Unit & Integration Testing**
   - Component isolation tests
   - API endpoint testing
   - Database integration

3. **Security Scanning**
   - Vulnerability assessment
   - Secrets detection
   - Container scanning

4. **E2E & Performance**
   - Cross-browser testing
   - Load testing
   - Accessibility validation

5. **Deployment**
   - Automated deployment on main branch
   - Environment-specific configurations

## 🛡️ Security Testing

### SAST (Static Application Security Testing)
- **Bandit**: Python security scanning
- **ESLint Security**: JavaScript/TypeScript vulnerabilities
- **Semgrep**: Multi-language security patterns

### DAST (Dynamic Application Security Testing)
- **OWASP ZAP**: Web application security scanning
- **Nuclei**: Vulnerability templates

### Dependency Security
- **Safety**: Python package vulnerabilities
- **npm audit**: Node.js package vulnerabilities
- **Snyk**: Continuous monitoring

### Secrets Detection
- **GitLeaks**: Git repository secret scanning
- **TruffleHog**: High-entropy string detection

## 🎯 Performance Testing

### Load Testing (k6)
```javascript
// API Load Test Example
export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let response = http.get('http://localhost:8000/health');
  check(response, { 'status was 200': (r) => r.status == 200 });
}
```

### Stress Testing (Locust)
```python
# Stress Test Example
class ZeroDayUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def predict_attack(self):
        self.client.post("/predictions/predict-single", 
                        json={"features": [1,2,3,4,5], "model": "random_forest"})
```

## 🧪 Test Data Management

### Fixtures and Mocks
- **Frontend**: MSW (Mock Service Worker) for API mocking
- **Backend**: Jest mocks for database and external services
- **API**: Pytest fixtures for test data generation

### Test Databases
- Separate test database instances
- Automated cleanup between test runs
- Transaction rollback for isolation

## 📈 Monitoring and Reporting

### Test Results
- **Coverage Reports**: HTML, LCOV, XML formats
- **Performance Metrics**: Response times, throughput
- **Security Findings**: SARIF format for GitHub Security tab

### Dashboards
- **SonarCloud**: Code quality metrics
- **GitHub Actions**: CI/CD pipeline status
- **Codecov**: Coverage tracking

## 🔍 Test Organization

### Directory Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── security/      # Security tests
├── performance/   # Performance tests
├── fixtures/      # Test data
└── utils/         # Test utilities
```

### Naming Conventions
- Test files: `*.test.{js,ts,py}`
- Spec files: `*.spec.{js,ts}`
- Fixtures: `fixture_*.py`, `*.fixture.js`

## 🚨 Troubleshooting

### Common Issues

1. **Tests Timeout**
   - Increase timeout values in test configuration
   - Check service startup times

2. **Coverage Below Threshold**
   - Add tests for uncovered code paths
   - Review exclusion patterns

3. **Flaky E2E Tests**
   - Add proper wait conditions
   - Use data-testid attributes

4. **Security Scan Failures**
   - Update dependencies
   - Add security exceptions for false positives

### Debug Commands
```bash
# Debug frontend tests
npm run test:debug

# Debug API tests
pytest --pdb tests/

# Debug E2E tests
npm run test:e2e:debug
```

## 📚 Best Practices

### Test Writing
1. **Arrange-Act-Assert** pattern
2. **Single responsibility** per test
3. **Descriptive test names**
4. **Independent tests** (no interdependencies)
5. **Fast feedback** (optimize test execution time)

### Security Testing
1. **Input validation** testing
2. **Authentication/authorization** verification
3. **SQL injection** prevention
4. **XSS protection** validation
5. **CSRF protection** testing

### Performance Testing
1. **Baseline establishment**
2. **Gradual load increase**
3. **Resource monitoring**
4. **Bottleneck identification**
5. **Regression detection**

## 🔄 Continuous Improvement

### Metrics to Track
- Test coverage percentage
- Test execution time
- Flaky test rate
- Security vulnerability count
- Performance regression incidents

### Regular Activities
- **Weekly**: Review test failures and flaky tests
- **Monthly**: Update testing dependencies
- **Quarterly**: Review and update testing strategy
- **Continuously**: Monitor security vulnerabilities

## 📞 Support

For questions about testing:
1. Check this documentation
2. Review existing test examples
3. Check GitHub Issues
4. Contact the development team

---

**Remember**: Good tests are an investment in system reliability and security. Always write tests before fixing bugs and ensure new features have comprehensive test coverage.