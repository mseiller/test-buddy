import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helper Functions
 * Provides common utilities for end-to-end testing
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the application to be fully loaded
   */
  async waitForAppReady() {
    await this.page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific app state
   */
  async navigateToState(state: string) {
    await this.page.evaluate((targetState) => {
      window.history.pushState({}, '', `?state=${targetState}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, state);
    await this.page.waitForTimeout(500);
  }

  /**
   * Mock authentication for testing
   */
  async mockAuth(user: { uid: string; email: string; displayName?: string }) {
    await this.page.addInitScript((userData) => {
      // Mock Firebase auth
      (window as any).mockFirebaseAuth = {
        currentUser: userData,
        onAuthStateChanged: (callback: (user: any) => void) => {
          callback(userData);
          return () => {};
        },
        signOut: () => Promise.resolve(),
      };
      
      // Mock user context
      (window as any).mockUserContext = {
        user: userData,
        loading: false,
        error: null,
      };
    }, user);
  }

  /**
   * Mock file processing service
   */
  async mockFileProcessing() {
    await this.page.addInitScript(() => {
      (window as any).mockFileProcessor = {
        processFile: async (file: File) => ({
          extractedText: 'This is sample extracted text for testing purposes.',
          fileName: file.name,
          fileType: file.type,
        }),
      };
    });
  }

  /**
   * Mock OpenRouter service
   */
  async mockOpenRouterService() {
    await this.page.addInitScript(() => {
      (window as any).mockOpenRouter = {
        generateQuiz: async () => ({
          questions: [
            {
              id: '1',
              type: 'MCQ',
              question: 'What is the main purpose of testing?',
              options: ['To find bugs', 'To improve quality', 'To meet requirements', 'All of the above'],
              correctAnswer: 3,
              explanation: 'Testing serves multiple purposes including finding bugs, improving quality, and meeting requirements.',
              points: 10,
            },
            {
              id: '2',
              type: 'Fill-in-the-blank',
              question: 'Testing helps ensure software _____ meets user expectations.',
              correctAnswer: 'quality',
              explanation: 'Quality assurance is a key benefit of testing.',
              points: 10,
            },
          ],
          quizType: 'MCQ',
        }),
      };
    });
  }

  /**
   * Upload a test file
   */
  async uploadTestFile(fileName: string = 'test-document.txt') {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.click('[data-testid="file-upload-input"]');
    const fileChooser = await fileChooserPromise;
    
    // Create a test file
    const testFile = Buffer.from('This is a test document for E2E testing.');
    await fileChooser.setFiles([{
      name: fileName,
      mimeType: 'text/plain',
      buffer: testFile,
    }]);
  }

  /**
   * Fill quiz configuration form
   */
  async fillQuizConfig(config: {
    quizType: string;
    questionCount: number;
    difficulty: string;
    includeExplanations: boolean;
  }) {
    await this.page.selectOption('[data-testid="quiz-type-select"]', config.quizType);
    await this.page.fill('[data-testid="question-count-input"]', config.questionCount.toString());
    await this.page.selectOption('[data-testid="difficulty-select"]', config.difficulty);
    
    if (config.includeExplanations) {
      await this.page.check('[data-testid="include-explanations-checkbox"]');
    }
  }

  /**
   * Answer quiz questions
   */
  async answerQuizQuestions(answers: (string | number)[]) {
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      if (typeof answer === 'number') {
        // Multiple choice
        await this.page.click(`[data-testid="question-${i + 1}"] [data-testid="option-${answer}"]`);
      } else {
        // Fill in the blank or text
        await this.page.fill(`[data-testid="question-${i + 1}"] [data-testid="answer-input"]`, answer);
      }
    }
  }

  /**
   * Create a test folder
   */
  async createTestFolder(folderName: string = 'Test Folder') {
    await this.page.click('[data-testid="create-folder-button"]');
    await this.page.fill('[data-testid="folder-name-input"]', folderName);
    await this.page.click('[data-testid="save-folder-button"]');
    await this.page.waitForSelector(`[data-testid="folder-${folderName}"]`);
  }

  /**
   * Assert element is visible
   */
  async expectElementVisible(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Assert element is hidden
   */
  async expectElementHidden(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toBeHidden({ timeout });
  }

  /**
   * Assert text is present
   */
  async expectTextPresent(text: string, timeout: number = 5000) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout });
  }

  /**
   * Assert URL contains expected path
   */
  async expectUrlContains(expected: string) {
    await expect(this.page.url()).toContain(expected);
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 10000 });
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Get element text content
   */
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * Wait for network request to complete
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Mock API responses
   */
  async mockAPIResponse(url: string, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }
}

/**
 * Create test helpers instance
 */
export function createTestHelpers(page: Page): TestHelpers {
  return new TestHelpers(page);
}
