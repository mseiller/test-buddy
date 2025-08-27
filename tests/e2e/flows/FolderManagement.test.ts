import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Folder Management E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    
    // Mock authentication
    await helpers.mockAuth({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    // Mock folder data
    await page.addInitScript(() => {
      (window as any).mockFolders = [
        {
          id: 'folder-1',
          name: 'Work Documents',
          description: 'Important work-related documents',
          color: '#3B82F6',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'folder-2',
          name: 'Study Materials',
          description: 'Educational content and study guides',
          color: '#10B981',
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-10')
        }
      ];
    });

    // Navigate to folders section
    await page.goto('/?state=folders');
    await helpers.waitForAppReady();
  });

  test('Create and organize folders', async ({ page }) => {
    // Test folder creation
    await helpers.expectElementVisible('[data-testid="create-folder-button"]');
    await page.click('[data-testid="create-folder-button"]');
    
    // Fill folder details
    await helpers.expectElementVisible('[data-testid="folder-form"]');
    await page.fill('[data-testid="folder-name-input"]', 'New Test Folder');
    await page.fill('[data-testid="folder-description-input"]', 'A test folder for E2E testing');
    await page.click('[data-testid="folder-color-blue"]');
    
    // Save folder
    await page.click('[data-testid="save-folder-button"]');
    await helpers.waitForLoadingComplete();
    
    // Verify folder was created
    await helpers.expectElementVisible('[data-testid="folder-New Test Folder"]');
    await helpers.expectTextPresent('New Test Folder');
  });

  test('Edit existing folders', async ({ page }) => {
    // Find and edit an existing folder
    const folderElement = page.locator('[data-testid="folder-Work Documents"]');
    await folderElement.click();
    
    // Click edit button
    await page.click('[data-testid="edit-folder-button"]');
    await helpers.expectElementVisible('[data-testid="folder-edit-form"]');
    
    // Modify folder details
    await page.fill('[data-testid="folder-name-input"]', 'Updated Work Documents');
    await page.fill('[data-testid="folder-description-input"]', 'Updated description');
    
    // Save changes
    await page.click('[data-testid="save-folder-button"]');
    await helpers.waitForLoadingComplete();
    
    // Verify changes
    await helpers.expectTextPresent('Updated Work Documents');
    await helpers.expectTextPresent('Updated description');
  });

  test('Delete folders', async ({ page }) => {
    // Find a folder to delete
    const folderElement = page.locator('[data-testid="folder-Study Materials"]');
    await folderElement.click();
    
    // Click delete button
    await page.click('[data-testid="delete-folder-button"]');
    
    // Confirm deletion
    await helpers.expectElementVisible('[data-testid="delete-confirmation-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify folder was deleted
    await helpers.expectElementHidden('[data-testid="folder-Study Materials"]');
  });

  test('Organize tests into folders', async ({ page }) => {
    // Create a test folder first
    await page.click('[data-testid="create-folder-button"]');
    await page.fill('[data-testid="folder-name-input"]', 'Test Organization');
    await page.click('[data-testid="save-folder-button"]');
    await helpers.waitForLoadingComplete();
    
    // Navigate to upload section
    await helpers.navigateToState('upload');
    await helpers.waitForAppReady();
    
    // Upload a test file
    await helpers.uploadTestFile('organize-test.txt');
    await helpers.waitForLoadingComplete();
    
    // Generate quiz
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 3,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Take quiz
    await helpers.answerQuizQuestions([2, 1, 3]);
    await page.click('[data-testid="submit-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Save to folder
    await helpers.expectElementVisible('[data-testid="save-to-folder-button"]');
    await page.click('[data-testid="save-to-folder-button"]');
    
    // Select folder
    await helpers.expectElementVisible('[data-testid="folder-selection-modal"]');
    await page.click('[data-testid="folder-Test Organization"]');
    await page.click('[data-testid="confirm-folder-selection"]');
    
    // Verify test was saved
    await helpers.expectTextPresent('Test saved to Test Organization');
  });

  test('Search and filter folders', async ({ page }) => {
    // Test search functionality
    await helpers.expectElementVisible('[data-testid="folder-search-input"]');
    await page.fill('[data-testid="folder-search-input"]', 'Work');
    
    // Verify search results
    await helpers.expectElementVisible('[data-testid="folder-Work Documents"]');
    await helpers.expectElementHidden('[data-testid="folder-Study Materials"]');
    
    // Clear search
    await page.fill('[data-testid="folder-search-input"]', '');
    await helpers.expectElementVisible('[data-testid="folder-Study Materials"]');
    
    // Test filtering by color
    await page.click('[data-testid="color-filter-blue"]');
    await helpers.expectElementVisible('[data-testid="folder-Work Documents"]');
    await helpers.expectElementHidden('[data-testid="folder-Study Materials"]');
  });

  test('Folder sharing and collaboration', async ({ page }) => {
    // Test folder sharing
    const folderElement = page.locator('[data-testid="folder-Work Documents"]');
    await folderElement.click();
    
    await page.click('[data-testid="share-folder-button"]');
    await helpers.expectElementVisible('[data-testid="share-modal"]');
    
    // Add collaborator
    await page.fill('[data-testid="collaborator-email-input"]', 'collaborator@example.com');
    await page.selectOption('[data-testid="permission-select"]', 'edit');
    await page.click('[data-testid="add-collaborator-button"]');
    
    // Verify collaborator was added
    await helpers.expectTextPresent('collaborator@example.com');
    await helpers.expectTextPresent('edit');
  });

  test('Folder statistics and analytics', async ({ page }) => {
    // Navigate to folder details
    const folderElement = page.locator('[data-testid="folder-Work Documents"]');
    await folderElement.click();
    
    // Check folder statistics
    await helpers.expectElementVisible('[data-testid="folder-stats"]');
    await helpers.expectElementVisible('[data-testid="test-count"]');
    await helpers.expectElementVisible('[data-testid="last-activity"]');
    
    // Verify statistics are displayed
    const testCount = await helpers.getElementText('[data-testid="test-count"]');
    expect(parseInt(testCount)).toBeGreaterThanOrEqual(0);
  });

  test('Bulk folder operations', async ({ page }) => {
    // Select multiple folders
    await page.check('[data-testid="folder-select-Work Documents"]');
    await page.check('[data-testid="folder-select-Study Materials"]');
    
    // Verify bulk actions are available
    await helpers.expectElementVisible('[data-testid="bulk-actions-menu"]');
    
    // Test bulk delete
    await page.click('[data-testid="bulk-delete-button"]');
    await helpers.expectElementVisible('[data-testid="bulk-delete-confirmation"]');
    
    // Cancel bulk delete
    await page.click('[data-testid="cancel-bulk-delete"]');
    
    // Test bulk move
    await page.click('[data-testid="bulk-move-button"]');
    await helpers.expectElementVisible('[data-testid="bulk-move-modal"]');
    
    // Select destination folder
    await page.click('[data-testid="destination-folder-select"]');
    await page.click('[data-testid="folder-Work Documents"]');
    await page.click('[data-testid="confirm-bulk-move"]');
    
    // Verify bulk operation completed
    await helpers.expectTextPresent('Items moved successfully');
  });

  test('Folder import and export', async ({ page }) => {
    // Test folder export
    await page.click('[data-testid="export-folders-button"]');
    await helpers.expectElementVisible('[data-testid="export-options-modal"]');
    
    // Select export format
    await page.check('[data-testid="export-format-json"]');
    await page.click('[data-testid="confirm-export"]');
    
    // Verify export started
    await helpers.expectTextPresent('Exporting folders...');
    
    // Test folder import
    await page.click('[data-testid="import-folders-button"]');
    await helpers.expectElementVisible('[data-testid="import-modal"]');
    
    // Select import file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="import-file-input"]');
    const fileChooser = await fileChooserPromise;
    
    const importFile = Buffer.from(JSON.stringify({
      folders: [
        {
          name: 'Imported Folder',
          description: 'Folder imported from E2E test',
          color: '#EF4444'
        }
      ]
    }));
    
    await fileChooser.setFiles([{
      name: 'folders-import.json',
      mimeType: 'application/json',
      buffer: importFile,
    }]);
    
    // Confirm import
    await page.click('[data-testid="confirm-import"]');
    await helpers.waitForLoadingComplete();
    
    // Verify import was successful
    await helpers.expectElementVisible('[data-testid="folder-Imported Folder"]');
  });
});
