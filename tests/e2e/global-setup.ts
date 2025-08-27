import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests and sets up the test environment
 */

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🚀 Setting up E2E test environment...');

    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    
    console.log('✅ Application loaded successfully');

    // Set up test data if needed
    await setupTestData(page);
    
    // Verify critical components are accessible
    await verifyCriticalComponents(page);
    
    console.log('✅ E2E test environment setup completed');
    
  } catch (error) {
    console.error('❌ E2E test environment setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Set up test data for E2E tests
 */
async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  try {
    // Mock authentication state
    await page.addInitScript(() => {
      // Mock localStorage for authentication
      localStorage.setItem('test-auth', JSON.stringify({
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          plan: 'free'
        },
        timestamp: Date.now()
      }));
      
      // Mock sessionStorage
      sessionStorage.setItem('test-session', JSON.stringify({
        isAuthenticated: true,
        lastActivity: Date.now()
      }));
    });
    
    // Mock API responses
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/api/auth/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uid: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            plan: 'free'
          })
        });
      } else if (url.includes('/api/usage')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            testsGenerated: 2,
            testsRemaining: 3,
            maxTests: 5
          })
        });
      } else if (url.includes('/api/folders')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'folder-1',
              name: 'Work Documents',
              description: 'Important work-related documents',
              color: '#3B82F6',
              createdAt: new Date('2024-01-01').toISOString(),
              updatedAt: new Date('2024-01-15').toISOString()
            },
            {
              id: 'folder-2',
              name: 'Study Materials',
              description: 'Educational content and study guides',
              color: '#10B981',
              createdAt: new Date('2024-01-05').toISOString(),
              updatedAt: new Date('2024-01-10').toISOString()
            }
          ])
        });
      } else {
        // Default mock response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    console.log('✅ Test data setup completed');
    
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    throw error;
  }
}

/**
 * Verify critical components are accessible
 */
async function verifyCriticalComponents(page: any) {
  console.log('🔍 Verifying critical components...');
  
  try {
    // Check if main app container is present
    const appContainer = await page.locator('[data-testid="app-container"]');
    if (!(await appContainer.count())) {
      throw new Error('Main app container not found');
    }
    
    // Check if navigation is accessible
    const navigation = await page.locator('[data-testid="navigation"]');
    if (!(await navigation.count())) {
      console.warn('⚠️ Navigation component not found');
    }
    
    // Check if file upload is accessible
    const fileUpload = await page.locator('[data-testid="file-upload-section"]');
    if (!(await fileUpload.count())) {
      console.warn('⚠️ File upload component not found');
    }
    
    console.log('✅ Critical components verification completed');
    
  } catch (error) {
    console.error('❌ Critical components verification failed:', error);
    throw error;
  }
}

export default globalSetup;
