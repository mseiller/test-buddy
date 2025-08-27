import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Quiz Component E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    
    // Mock authentication
    await helpers.mockAuth({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    // Mock quiz data
    await page.addInitScript(() => {
      (window as any).mockQuizData = {
        questions: [
          {
            id: '1',
            type: 'MCQ',
            question: 'What is the primary goal of software testing?',
            options: ['To find bugs', 'To improve code quality', 'To meet deadlines', 'To satisfy requirements'],
            correctAnswer: 1,
            explanation: 'The primary goal is to improve code quality by identifying and fixing issues.',
            points: 10
          },
          {
            id: '2',
            type: 'Fill-in-the-blank',
            question: 'Testing helps ensure software _____ meets user expectations.',
            correctAnswer: 'quality',
            explanation: 'Quality assurance is a key benefit of testing.',
            points: 10
          },
          {
            id: '3',
            type: 'True-False',
            question: 'Automated testing can completely replace manual testing.',
            correctAnswer: false,
            explanation: 'Both automated and manual testing have their place in a comprehensive testing strategy.',
            points: 10
          },
          {
            id: '4',
            type: 'Essay',
            question: 'Explain the importance of test coverage in software development.',
            explanation: 'Test coverage helps ensure that all parts of the code are tested.',
            points: 20
          }
        ],
        quizType: 'Mixed',
        totalPoints: 50
      };
    });

    // Navigate to quiz section
    await page.goto('/?state=quiz');
    await helpers.waitForAppReady();
  });

  test('Quiz generation and configuration', async ({ page }) => {
    // Verify quiz configuration form
    await helpers.expectElementVisible('[data-testid="quiz-config-form"]');
    
    // Test different quiz types
    const quizTypes = ['MCQ', 'Fill-in-the-blank', 'Essay', 'Mixed'];
    
    for (const quizType of quizTypes) {
      await page.selectOption('[data-testid="quiz-type-select"]', quizType);
      await helpers.expectTextPresent(quizType);
    }
    
    // Test question count input
    await page.fill('[data-testid="question-count-input"]', '15');
    await helpers.expectElementVisible('[data-testid="question-count-input"]');
    
    // Test difficulty selection
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    
    for (const difficulty of difficulties) {
      await page.selectOption('[data-testid="difficulty-select"]', difficulty);
      await helpers.expectTextPresent(difficulty);
    }
    
    // Test additional options
    await page.check('[data-testid="include-explanations-checkbox"]');
    await page.check('[data-testid="randomize-questions-checkbox"]');
    await page.check('[data-testid="time-limit-checkbox"]');
    
    // Set time limit
    await page.fill('[data-testid="time-limit-input"]', '30');
    
    // Generate quiz
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Verify quiz was generated
    await helpers.expectElementVisible('[data-testid="quiz-display"]');
  });

  test('Taking different question types', async ({ page }) => {
    // Generate a quiz first
    await helpers.fillQuizConfig({
      quizType: 'Mixed',
      questionCount: 4,
      difficulty: 'medium',
      includeExplanations: true
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Answer MCQ question
    await helpers.expectElementVisible('[data-testid="question-1"]');
    await helpers.expectTextPresent('What is the primary goal of software testing?');
    
    // Select answer
    await page.click('[data-testid="question-1-option-1"]');
    await helpers.expectElementVisible('[data-testid="question-1-option-1-selected"]');
    
    // Answer fill-in-the-blank
    await helpers.expectElementVisible('[data-testid="question-2"]');
    await page.fill('[data-testid="question-2-answer-input"]', 'quality');
    
    // Answer true-false
    await helpers.expectElementVisible('[data-testid="question-3"]');
    await page.click('[data-testid="question-3-false"]');
    
    // Answer essay question
    await helpers.expectElementVisible('[data-testid="question-4"]');
    await page.fill('[data-testid="question-4-answer-textarea"]', 'Test coverage is important because it helps ensure that all parts of the code are tested and validated.');
    
    // Verify all questions are answered
    await helpers.expectElementVisible('[data-testid="all-questions-answered"]');
  });

  test('Quiz navigation and progress tracking', async ({ page }) => {
    // Generate quiz
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 10,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Check progress indicator
    await helpers.expectElementVisible('[data-testid="quiz-progress"]');
    await helpers.expectTextPresent('Question 1 of 10');
    
    // Navigate to next question
    await page.click('[data-testid="next-question-button"]');
    await helpers.expectTextPresent('Question 2 of 10');
    
    // Navigate to previous question
    await page.click('[data-testid="previous-question-button"]');
    await helpers.expectTextPresent('Question 1 of 10');
    
    // Jump to specific question
    await page.click('[data-testid="question-5-nav"]');
    await helpers.expectTextPresent('Question 5 of 10');
    
    // Check question navigation menu
    await page.click('[data-testid="question-nav-menu"]');
    await helpers.expectElementVisible('[data-testid="question-navigation-list"]');
    
    // Verify all questions are accessible
    for (let i = 1; i <= 10; i++) {
      await helpers.expectElementVisible(`[data-testid="question-${i}-nav"]`);
    }
  });

  test('Quiz timer and time management', async ({ page }) => {
    // Generate quiz with time limit
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 5,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.check('[data-testid="time-limit-checkbox"]');
    await page.fill('[data-testid="time-limit-input"]', '2'); // 2 minutes for testing
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Check timer is visible
    await helpers.expectElementVisible('[data-testid="quiz-timer"]');
    await helpers.expectTextPresent('Time remaining:');
    
    // Answer questions quickly
    for (let i = 1; i <= 5; i++) {
      await page.click(`[data-testid="question-${i}-option-0"]`);
      if (i < 5) {
        await page.click('[data-testid="next-question-button"]');
      }
    }
    
    // Submit before time runs out
    await page.click('[data-testid="submit-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Verify quiz was submitted successfully
    await helpers.expectElementVisible('[data-testid="quiz-results"]');
  });

  test('Quiz results and analysis', async ({ page }) => {
    // Generate and take quiz
    await helpers.fillQuizConfig({
      quizType: 'Mixed',
      questionCount: 4,
      difficulty: 'medium',
      includeExplanations: true
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Answer questions
    await page.click('[data-testid="question-1-option-1"]'); // Correct answer
    await page.fill('[data-testid="question-2-answer-input"]', 'quality'); // Correct answer
    await page.click('[data-testid="question-3-true"]'); // Wrong answer
    await page.fill('[data-testid="question-4-answer-textarea"]', 'Good answer for essay question');
    
    // Submit quiz
    await page.click('[data-testid="submit-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Check results display
    await helpers.expectElementVisible('[data-testid="quiz-results"]');
    await helpers.expectElementVisible('[data-testid="score-display"]');
    await helpers.expectElementVisible('[data-testid="performance-chart"]');
    
    // Verify score calculation
    await helpers.expectTextPresent('Score:');
    const scoreText = await helpers.getElementText('[data-testid="score-value"]');
    expect(parseInt(scoreText)).toBeGreaterThan(0);
    
    // Check question review
    await helpers.expectElementVisible('[data-testid="question-review"]');
    
    // Verify correct answers are shown
    await helpers.expectElementVisible('[data-testid="question-1-correct"]');
    await helpers.expectElementVisible('[data-testid="question-2-correct"]');
    await helpers.expectElementVisible('[data-testid="question-3-incorrect"]');
    
    // Check explanations
    await helpers.expectElementVisible('[data-testid="question-1-explanation"]');
    await helpers.expectTextPresent('The primary goal is to improve code quality');
  });

  test('Quiz saving and sharing', async ({ page }) => {
    // Generate and complete quiz
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 3,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Answer questions
    for (let i = 1; i <= 3; i++) {
      await page.click(`[data-testid="question-${i}-option-0"]`);
      if (i < 3) {
        await page.click('[data-testid="next-question-button"]');
      }
    }
    
    // Submit quiz
    await page.click('[data-testid="submit-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Save quiz
    await page.click('[data-testid="save-quiz-button"]');
    await helpers.expectElementVisible('[data-testid="save-quiz-modal"]');
    
    // Fill quiz details
    await page.fill('[data-testid="quiz-title-input"]', 'Software Testing Quiz');
    await page.fill('[data-testid="quiz-description-input"]', 'A comprehensive quiz about software testing principles');
    
    // Select folder
    await page.click('[data-testid="folder-selector"]');
    await page.click('[data-testid="folder-Work Documents"]');
    
    // Save
    await page.click('[data-testid="confirm-save-quiz"]');
    await helpers.waitForLoadingComplete();
    
    // Verify save success
    await helpers.expectTextPresent('Quiz saved successfully');
    
    // Test quiz sharing
    await page.click('[data-testid="share-quiz-button"]');
    await helpers.expectElementVisible('[data-testid="share-quiz-modal"]');
    
    // Generate share link
    await page.click('[data-testid="generate-share-link"]');
    await helpers.expectElementVisible('[data-testid="share-link-display"]');
    
    // Copy link
    await page.click('[data-testid="copy-share-link"]');
    await helpers.expectTextPresent('Link copied to clipboard');
  });

  test('Quiz accessibility and keyboard navigation', async ({ page }) => {
    // Generate quiz
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 3,
      difficulty: 'easy',
      includeExplanations: false
    });
    
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Verify focus management
    await helpers.expectElementVisible('[data-testid="question-1-focused"]');
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    
    // Verify selection
    await helpers.expectElementVisible('[data-testid="question-1-option-2-selected"]');
    
    // Test screen reader support
    const accessibilityElements = [
      '[aria-label]',
      '[role="radio"]',
      '[aria-checked]',
      '[aria-describedby]'
    ];
    
    for (const selector of accessibilityElements) {
      const count = await page.locator(selector).count();
      expect(count).toBeGreaterThan(0);
    }
    
    // Test high contrast mode
    await page.click('[data-testid="accessibility-menu"]');
    await page.click('[data-testid="high-contrast-toggle"]');
    
    // Verify high contrast styles applied
    const body = page.locator('body');
    const computedStyle = await body.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color
      };
    });
    
    // High contrast should have distinct colors
    expect(computedStyle.backgroundColor).not.toBe(computedStyle.color);
  });

  test('Quiz performance and responsiveness', async ({ page }) => {
    // Test with large number of questions
    await helpers.fillQuizConfig({
      quizType: 'MCQ',
      questionCount: 50,
      difficulty: 'medium',
      includeExplanations: true
    });
    
    const startTime = Date.now();
    await page.click('[data-testid="generate-quiz-button"]');
    await helpers.waitForLoadingComplete();
    const generationTime = Date.now() - startTime;
    
    // Quiz generation should be reasonably fast
    expect(generationTime).toBeLessThan(10000); // 10 seconds max
    
    // Test smooth scrolling through questions
    await page.click('[data-testid="question-25-nav"]');
    await helpers.expectTextPresent('Question 25 of 50');
    
    // Test rapid question navigation
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="next-question-button"]');
      await page.waitForTimeout(100);
    }
    
    // Verify smooth transitions
    await helpers.expectElementVisible('[data-testid="question-35"]');
    
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile-friendly layout
    await helpers.expectElementVisible('[data-testid="mobile-quiz-nav"]');
    await helpers.expectElementVisible('[data-testid="mobile-progress-bar"]');
  });
});
