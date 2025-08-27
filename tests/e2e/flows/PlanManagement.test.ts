import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Plan Management E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    
    // Mock authentication
    await helpers.mockAuth({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    // Mock user plan data
    await page.addInitScript(() => {
      (window as any).mockUserPlan = {
        plan: 'free',
        usage: {
          testsGenerated: 2,
          testsRemaining: 3,
          maxTests: 5
        },
        features: {
          unlimitedTests: false,
          advancedAnalytics: false,
          customBranding: false,
          prioritySupport: false
        }
      };
    });

    // Navigate to the app
    await page.goto('/');
    await helpers.waitForAppReady();
  });

  test('Free plan limitations and upgrade prompts', async ({ page }) => {
    // Verify free plan indicators
    await helpers.expectElementVisible('[data-testid="plan-indicator"]');
    await helpers.expectTextPresent('Free Plan');
    
    // Check usage display
    await helpers.expectElementVisible('[data-testid="usage-display"]');
    await helpers.expectTextPresent('2 of 5 tests used');
    
    // Try to access premium feature
    await helpers.navigateToState('upload');
    await helpers.waitForAppReady();
    
    // Upload file and try to generate quiz
    await helpers.uploadTestFile('premium-test.txt');
    await helpers.waitForLoadingComplete();
    
    // Attempt to generate quiz with premium settings
    await helpers.fillQuizConfig({
      quizType: 'Mixed',
      questionCount: 20, // Premium feature
      difficulty: 'expert', // Premium feature
      includeExplanations: true
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    
    // Should show upgrade prompt
    await helpers.expectElementVisible('[data-testid="upgrade-prompt"]');
    await helpers.expectTextPresent('Upgrade to Pro');
  });

  test('Plan upgrade flow', async ({ page }) => {
    // Navigate to plan management
    await page.click('[data-testid="plan-management-button"]');
    await helpers.expectElementVisible('[data-testid="plan-selection-modal"]');
    
    // View different plans
    await helpers.expectElementVisible('[data-testid="plan-student"]');
    await helpers.expectElementVisible('[data-testid="plan-pro"]');
    
    // Select Pro plan
    await page.click('[data-testid="plan-pro"]');
    await helpers.expectElementVisible('[data-testid="plan-details-pro"]');
    
    // Verify Pro plan features
    await helpers.expectTextPresent('Unlimited Tests');
    await helpers.expectTextPresent('Advanced Analytics');
    await helpers.expectTextPresent('Custom Branding');
    await helpers.expectTextPresent('Priority Support');
    
    // Click upgrade button
    await page.click('[data-testid="upgrade-to-pro-button"]');
    
    // Should show payment form
    await helpers.expectElementVisible('[data-testid="payment-form"]');
    
    // Fill payment details (mocked)
    await page.fill('[data-testid="card-number-input"]', '4242424242424242');
    await page.fill('[data-testid="expiry-input"]', '12/25');
    await page.fill('[data-testid="cvc-input"]', '123');
    await page.fill('[data-testid="name-input"]', 'Test User');
    
    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');
    
    // Wait for payment processing
    await helpers.expectElementVisible('[data-testid="payment-processing"]');
    await helpers.waitForLoadingComplete();
    
    // Verify upgrade success
    await helpers.expectElementVisible('[data-testid="upgrade-success"]');
    await helpers.expectTextPresent('Welcome to Pro!');
  });

  test('Feature gating based on plan', async ({ page }) => {
    // Test with free plan
    await helpers.expectElementHidden('[data-testid="advanced-analytics-button"]');
    await helpers.expectElementHidden('[data-testid="custom-branding-button"]');
    
    // Upgrade to Pro (simulate)
    await page.addInitScript(() => {
      (window as any).mockUserPlan.plan = 'pro';
      (window as any).mockUserPlan.features = {
        unlimitedTests: true,
        advancedAnalytics: true,
        customBranding: true,
        prioritySupport: true
      };
    });
    
    // Refresh page to see changes
    await page.reload();
    await helpers.waitForAppReady();
    
    // Verify Pro features are now available
    await helpers.expectElementVisible('[data-testid="advanced-analytics-button"]');
    await helpers.expectElementVisible('[data-testid="custom-branding-button"]');
    await helpers.expectElementVisible('[data-testid="priority-support-button"]');
  });

  test('Usage tracking and limits', async ({ page }) => {
    // Check current usage
    await helpers.expectElementVisible('[data-testid="usage-display"]');
    await helpers.expectTextPresent('2 of 5 tests used');
    
    // Generate a test to see usage increase
    await helpers.navigateToState('upload');
    await helpers.waitForAppReady();
    
    await helpers.uploadTestFile('usage-test.txt');
    await helpers.waitForLoadingComplete();
    
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 5,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Check updated usage
    await helpers.expectTextPresent('3 of 5 tests used');
    
    // Try to exceed limit
    await helpers.navigateToState('upload');
    await helpers.waitForAppReady();
    
    await helpers.uploadTestFile('limit-test.txt');
    await helpers.waitForLoadingComplete();
    
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 5,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    
    // Should show limit reached message
    await helpers.expectElementVisible('[data-testid="limit-reached-message"]');
    await helpers.expectTextPresent('Monthly limit reached');
  });

  test('Plan downgrade and cancellation', async ({ page }) => {
    // Start with Pro plan
    await page.addInitScript(() => {
      (window as any).mockUserPlan.plan = 'pro';
    });
    
    await page.reload();
    await helpers.waitForAppReady();
    
    // Navigate to plan management
    await page.click('[data-testid="plan-management-button"]');
    await helpers.expectElementVisible('[data-testid="plan-selection-modal"]');
    
    // Click on current plan to see options
    await page.click('[data-testid="current-plan-pro"]');
    await helpers.expectElementVisible('[data-testid="plan-options-modal"]');
    
    // Click downgrade
    await page.click('[data-testid="downgrade-button"]');
    await helpers.expectElementVisible('[data-testid="downgrade-confirmation"]');
    
    // Confirm downgrade
    await page.click('[data-testid="confirm-downgrade"]');
    await helpers.waitForLoadingComplete();
    
    // Verify downgrade success
    await helpers.expectElementVisible('[data-testid="downgrade-success"]');
    await helpers.expectTextPresent('Plan downgraded to Free');
    
    // Verify plan changed
    await helpers.expectTextPresent('Free Plan');
  });

  test('Billing and subscription management', async ({ page }) => {
    // Navigate to billing section
    await page.click('[data-testid="billing-button"]');
    await helpers.expectElementVisible('[data-testid="billing-section"]');
    
    // View billing history
    await helpers.expectElementVisible('[data-testid="billing-history"]');
    await helpers.expectElementVisible('[data-testid="invoice-list"]');
    
    // Download invoice
    await page.click('[data-testid="download-invoice-button"]');
    await helpers.expectElementVisible('[data-testid="download-progress"]');
    
    // Update payment method
    await page.click('[data-testid="update-payment-method"]');
    await helpers.expectElementVisible('[data-testid="payment-method-form"]');
    
    // Fill new payment details
    await page.fill('[data-testid="new-card-number"]', '5555555555554444');
    await page.fill('[data-testid="new-expiry"]', '12/26');
    await page.fill('[data-testid="new-cvc"]', '321');
    
    // Save new payment method
    await page.click('[data-testid="save-payment-method"]');
    await helpers.waitForLoadingComplete();
    
    // Verify update success
    await helpers.expectElementVisible('[data-testid="payment-update-success"]');
  });

  test('Student plan verification', async ({ page }) => {
    // Navigate to plan selection
    await page.click('[data-testid="plan-management-button"]');
    await helpers.expectElementVisible('[data-testid="plan-selection-modal"]');
    
    // Select Student plan
    await page.click('[data-testid="plan-student"]');
    await helpers.expectElementVisible('[data-testid="plan-details-student"]');
    
    // Verify student plan features
    await helpers.expectTextPresent('Student Discount');
    await helpers.expectTextPresent('50 Tests per Month');
    await helpers.expectTextPresent('Basic Analytics');
    
    // Click upgrade to student
    await page.click('[data-testid="upgrade-to-student-button"]');
    
    // Should show student verification form
    await helpers.expectElementVisible('[data-testid="student-verification-form"]');
    
    // Fill student details
    await page.fill('[data-testid="school-name-input"]', 'Test University');
    await page.fill('[data-testid="student-id-input"]', 'ST12345');
    await page.fill('[data-testid="graduation-year-input"]', '2025');
    
    // Upload student ID
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="student-id-upload"]');
    const fileChooser = await fileChooserPromise;
    
    const studentIdFile = Buffer.from('Mock student ID image');
    await fileChooser.setFiles([{
      name: 'student-id.jpg',
      mimeType: 'image/jpeg',
      buffer: studentIdFile,
    }]);
    
    // Submit verification
    await page.click('[data-testid="submit-verification"]');
    await helpers.waitForLoadingComplete();
    
    // Verify submission success
    await helpers.expectElementVisible('[data-testid="verification-submitted"]');
    await helpers.expectTextPresent('Verification submitted');
  });

  test('Promotional offers and discounts', async ({ page }) => {
    // Navigate to plan selection
    await page.click('[data-testid="plan-management-button"]');
    await helpers.expectElementVisible('[data-testid="plan-selection-modal"]');
    
    // Check for promotional offers
    await helpers.expectElementVisible('[data-testid="promotional-offers"]');
    
    // Apply promotional code
    await page.fill('[data-testid="promo-code-input"]', 'WELCOME50');
    await page.click('[data-testid="apply-promo-code"]');
    
    // Verify discount applied
    await helpers.expectElementVisible('[data-testid="discount-applied"]');
    await helpers.expectTextPresent('50% off applied');
    
    // Check updated pricing
    const originalPrice = await helpers.getElementText('[data-testid="original-price"]');
    const discountedPrice = await helpers.getElementText('[data-testid="discounted-price"]');
    
    expect(discountedPrice).not.toBe(originalPrice);
  });

  test('Plan comparison and features', async ({ page }) => {
    // Navigate to plan comparison
    await page.click('[data-testid="compare-plans-button"]');
    await helpers.expectElementVisible('[data-testid="plan-comparison-table"]');
    
    // Verify all plans are displayed
    await helpers.expectElementVisible('[data-testid="plan-free"]');
    await helpers.expectElementVisible('[data-testid="plan-student"]');
    await helpers.expectElementVisible('[data-testid="plan-pro"]');
    
    // Check feature comparison
    const features = [
      'Tests per Month',
      'Advanced Analytics',
      'Custom Branding',
      'Priority Support',
      'API Access'
    ];
    
    for (const feature of features) {
      await helpers.expectTextPresent(feature);
    }
    
    // Verify feature availability for each plan
    await helpers.expectElementVisible('[data-testid="feature-free-tests-per-month"]');
    await helpers.expectElementVisible('[data-testid="feature-pro-unlimited-tests"]');
    await helpers.expectElementVisible('[data-testid="feature-pro-advanced-analytics"]');
  });
});
