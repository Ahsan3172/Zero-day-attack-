import { test, expect } from '@playwright/test';

test.describe('Zero Day Attack Detection System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'testpass');
      await page.click('[data-testid="submit-login"]');
      
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'invalid');
      await page.fill('[data-testid="password-input"]', 'invalid');
      await page.click('[data-testid="submit-login"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Navigation', () => {
    test('should navigate between different sections', async ({ page }) => {
      // Login first
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'testpass');
      await page.click('[data-testid="submit-login"]');

      // Test navigation
      await page.click('[data-testid="models-nav"]');
      await expect(page).toHaveURL('/models');
      
      await page.click('[data-testid="predictions-nav"]');
      await expect(page).toHaveURL('/predictions');
      
      await page.click('[data-testid="datasets-nav"]');
      await expect(page).toHaveURL('/datasets');
    });
  });

  test.describe('File Upload Workflow', () => {
    test('should upload dataset file successfully', async ({ page }) => {
      // Login and navigate to upload
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'testpass');
      await page.click('[data-testid="submit-login"]');
      
      await page.click('[data-testid="datasets-nav"]');
      
      // Upload file
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('test-data/sample-dataset.csv');
      
      await page.click('[data-testid="upload-button"]');
      
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('should show error for invalid file format', async ({ page }) => {
      // Login and navigate to upload
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'testpass');
      await page.click('[data-testid="submit-login"]');
      
      await page.click('[data-testid="datasets-nav"]');
      
      // Upload invalid file
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('test-data/invalid-file.txt');
      
      await page.click('[data-testid="upload-button"]');
      
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    });
  });

  test.describe('Prediction Workflow', () => {
    test('should make prediction successfully', async ({ page }) => {
      // Login and navigate to predictions
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'testpass');
      await page.click('[data-testid="submit-login"]');
      
      await page.click('[data-testid="predictions-nav"]');
      
      // Fill prediction form
      await page.selectOption('[data-testid="model-select"]', 'random_forest');
      const fileInput = page.locator('[data-testid="prediction-file-input"]');
      await fileInput.setInputFiles('test-data/prediction-data.csv');
      
      await page.click('[data-testid="predict-button"]');
      
      // Wait for results
      await expect(page.locator('[data-testid="prediction-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="prediction-accuracy"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const loginButton = page.locator('[data-testid="login-button"]');
      await expect(loginButton).toHaveAttribute('aria-label');
    });
  });

  test.describe('Performance Tests', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });
});