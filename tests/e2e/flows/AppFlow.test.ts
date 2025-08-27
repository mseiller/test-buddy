import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Application Flow E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    
    // Mock authentication
    await helpers.mockAuth({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    // Mock file processing
    await helpers.mockFileProcessing();

    // Mock OpenRouter service
    await helpers.mockOpenRouterService();

    // Navigate to the app
    await page.goto('/');
    await helpers.waitForAppReady();
  });

  test('Complete user journey: File upload to quiz completion', async ({ page }) => {
    // Step 1: Verify initial state (authentication)
    await helpers.expectElementVisible('[data-testid="user-info"]');
    await helpers.expectTextPresent('Test User');

    // Step 2: File upload
    await helpers.expectElementVisible('[data-testid="file-upload-section"]');
    await helpers.uploadTestFile('sample-document.txt');
    
    // Wait for file processing
    await helpers.waitForLoadingComplete();
    await helpers.expectElementVisible('[data-testid="file-processed"]');
    await helpers.expectTextPresent('sample-document.txt');

    // Step 3: Quiz configuration
    await helpers.expectElementVisible('[data-testid="quiz-config-section"]');
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 5,
      difficulty: 'medium',
      includeExplanations: true
    });

    // Step 4: Generate quiz
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Step 5: Take quiz
    await helpers.expectElementVisible('[data-testid="quiz-display"]');
    await helpers.expectTextPresent('What is the main purpose of testing?');
    
    // Answer questions
    await helpers.answerQuizQuestions([3, 'quality']); // MCQ and fill-in-the-blank
    
    // Submit quiz
    await page.click('[data-testid="submit-quiz-button"]');
    await helpers.waitForLoadingComplete();

    // Step 6: View results
    await helpers.expectElementVisible('[data-testid="quiz-results"]');
    await helpers.expectTextPresent('Quiz Results');
    await helpers.expectTextPresent('Score:');
  });

  test('Navigation between different app states', async ({ page }) => {
    // Test navigation to different states
    const states = ['upload', 'quiz', 'results', 'history', 'folders'];
    
    for (const state of states) {
      await helpers.navigateToState(state);
      await page.waitForTimeout(500);
      
      // Verify appropriate content is shown
      switch (state) {
        case 'upload':
          await helpers.expectElementVisible('[data-testid="file-upload-section"]');
          break;
        case 'quiz':
          await helpers.expectElementVisible('[data-testid="quiz-config-section"]');
          break;
        case 'results':
          await helpers.expectElementVisible('[data-testid="results-section"]');
          break;
        case 'history':
          await helpers.expectElementVisible('[data-testid="history-section"]');
          break;
        case 'folders':
          await helpers.expectElementVisible('[data-testid="folders-section"]');
          break;
      }
    }
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test with invalid file
    await helpers.expectElementVisible('[data-testid="file-upload-section"]');
    
    // Try to upload without selecting file
    await page.click('[data-testid="process-file-button"]');
    await helpers.expectElementVisible('[data-testid="error-message"]');
    
    // Test with empty quiz configuration
    await helpers.uploadTestFile('test.txt');
    await helpers.waitForLoadingComplete();
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.expectElementVisible('[data-testid="error-message"]');
  });

  test('Responsive design and mobile compatibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile-friendly layout
    await helpers.expectElementVisible('[data-testid="mobile-menu-button"]');
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await helpers.expectElementVisible('[data-testid="mobile-menu"]');
    
    // Test touch interactions
    await page.touchscreen.tap(200, 300); // Tap on screen
  });

  test('Performance under load', async ({ page }) => {
    // Test with multiple rapid operations
    const startTime = Date.now();
    
    // Perform multiple file uploads
    for (let i = 0; i < 3; i++) {
      await helpers.uploadTestFile(`test-${i}.txt`);
      await helpers.waitForLoadingComplete();
      await page.waitForTimeout(100);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify performance is acceptable (should complete in under 10 seconds)
    expect(totalTime).toBeLessThan(10000);
  });

  test('Accessibility features', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Test screen reader support
    const accessibilityElements = [
      '[aria-label]',
      '[role]',
      '[alt]',
      '[aria-describedby]'
    ];
    
    for (const selector of accessibilityElements) {
      const count = await page.locator(selector).count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Cross-browser compatibility', async ({ page }) => {
    // Test basic functionality across different browsers
    await helpers.expectElementVisible('[data-testid="app-container"]');
    await helpers.expectElementVisible('[data-testid="file-upload-section"]');
    
    // Test CSS properties that might differ between browsers
    const uploadSection = page.locator('[data-testid="file-upload-section"]');
    const computedStyle = await uploadSection.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity
      };
    });
    
    expect(computedStyle.display).not.toBe('none');
    expect(computedStyle.visibility).not.toBe('hidden');
    expect(parseFloat(computedStyle.opacity)).toBeGreaterThan(0);
  });
});
