# End-to-End (E2E) Testing

This directory contains comprehensive end-to-end tests for the Test Buddy application using Playwright.

## 🚀 Overview

E2E tests simulate real user interactions and workflows, ensuring that the entire application works correctly from the user's perspective. These tests cover:

- **Complete user journeys** from authentication to quiz completion
- **Cross-browser compatibility** across Chrome, Firefox, Safari, and mobile browsers
- **Responsive design** testing on various screen sizes
- **Accessibility** features and keyboard navigation
- **Performance** under load and stress conditions
- **Error handling** and edge cases

## 📁 Directory Structure

```
tests/e2e/
├── README.md                 # This file
├── global-setup.ts          # Global test environment setup
├── utils/
│   └── test-helpers.ts      # Common test utilities and helper functions
├── flows/                   # Complete user flow tests
│   ├── AppFlow.test.ts      # Main application user journey
│   ├── FolderManagement.test.ts # Folder management workflows
│   └── PlanManagement.test.ts   # Subscription and plan management
└── components/              # Component-specific tests
    └── QuizComponent.test.ts # Quiz generation and taking
```

## 🛠️ Setup and Installation

### Prerequisites

- Node.js 18+ and npm
- Test Buddy application running on `http://localhost:3000`

### Installation

1. **Install Playwright** (already done):
   ```bash
   npm install --save-dev @playwright/test
   ```

2. **Install browsers** (already done):
   ```bash
   npx playwright install
   ```

3. **Verify setup**:
   ```bash
   npx playwright --version
   ```

## 🏃‍♂️ Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Files

```bash
# Run only application flow tests
npx playwright test tests/e2e/flows/AppFlow.test.ts

# Run only folder management tests
npx playwright test tests/e2e/flows/FolderManagement.test.ts

# Run only quiz component tests
npx playwright test tests/e2e/components/QuizComponent.test.ts
```

### Run Tests in Specific Browsers

```bash
# Run in Chrome only
npx playwright test --project=chromium

# Run in Firefox only
npx playwright test --project=firefox

# Run in Safari only
npx playwright test --project=webkit

# Run in mobile Chrome
npx playwright test --project="Mobile Chrome"

# Run in mobile Safari
npx playwright test --project="Mobile Safari"
```

### Run Tests with UI Mode

```bash
npx playwright test --ui
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### Run Tests with Debug Mode

```bash
npx playwright test --debug
```

## 📊 Test Reports

After running tests, you can view detailed reports:

### HTML Report

```bash
npx playwright show-report
```

### Generate Reports

```bash
# Generate HTML report
npx playwright test --reporter=html

# Generate JUnit XML report
npx playwright test --reporter=junit

# Generate JSON report
npx playwright test --reporter=json
```

## 🔧 Configuration

The E2E tests are configured in `playwright.config.ts` at the project root. Key configuration options:

- **Browsers**: Chrome, Firefox, Safari, and mobile variants
- **Test directory**: `./tests/e2e`
- **Base URL**: `http://localhost:3000`
- **Web server**: Automatically starts `npm run dev`
- **Screenshots**: Taken on test failures
- **Videos**: Recorded on test failures
- **Traces**: Collected on first retry

## 🧪 Test Structure

### Test Files

Each test file follows this structure:

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';

test.describe('Feature Name E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    // Setup for each test
  });

  test('Test description', async ({ page }) => {
    // Test implementation
  });
});
```

### Test Helpers

The `TestHelpers` class provides common utilities:

- **Authentication mocking**: `mockAuth()`
- **File operations**: `uploadTestFile()`
- **Quiz configuration**: `fillQuizConfig()`
- **Assertions**: `expectElementVisible()`, `expectTextPresent()`
- **Navigation**: `navigateToState()`
- **Performance monitoring**: `waitForLoadingComplete()`

## 🎯 Test Coverage

### Application Flows

- ✅ **Complete user journey**: File upload → Quiz generation → Quiz taking → Results
- ✅ **Navigation**: State transitions between different app sections
- ✅ **Error handling**: Invalid inputs, network failures, edge cases
- ✅ **Responsive design**: Mobile and desktop layouts
- ✅ **Performance**: Load testing and stress scenarios
- ✅ **Accessibility**: Keyboard navigation and screen reader support

### Folder Management

- ✅ **CRUD operations**: Create, read, update, delete folders
- ✅ **Organization**: Test categorization and folder assignment
- ✅ **Search and filtering**: Find folders by name, color, date
- ✅ **Sharing**: Collaboration and permission management
- ✅ **Bulk operations**: Multi-select actions
- ✅ **Import/Export**: Data portability

### Plan Management

- ✅ **Subscription flows**: Plan selection and upgrades
- ✅ **Feature gating**: Access control based on plan
- ✅ **Usage tracking**: Test limits and consumption
- ✅ **Billing**: Payment processing and invoice management
- ✅ **Student verification**: Academic discount validation
- ✅ **Promotional offers**: Discount codes and special pricing

### Quiz Components

- ✅ **Generation**: Different quiz types and configurations
- ✅ **Question types**: MCQ, fill-in-the-blank, essay, true-false
- ✅ **Navigation**: Question progression and review
- ✅ **Timer functionality**: Time limits and management
- ✅ **Results analysis**: Scoring and performance metrics
- ✅ **Saving and sharing**: Persistence and collaboration

## 🚨 Troubleshooting

### Common Issues

1. **Application not running**:
   ```bash
   npm run dev
   ```

2. **Browser not found**:
   ```bash
   npx playwright install
   ```

3. **Tests timing out**:
   - Check if the app is responsive
   - Increase timeout values in config
   - Verify network connectivity

4. **Element not found**:
   - Check if `data-testid` attributes are present
   - Verify component rendering
   - Check for conditional rendering

### Debug Mode

Run tests with debug mode to step through execution:

```bash
npx playwright test --debug
```

### Trace Viewer

View detailed execution traces:

```bash
npx playwright show-trace trace.zip
```

## 📝 Adding New Tests

### 1. Create Test File

```bash
touch tests/e2e/flows/NewFeature.test.ts
```

### 2. Import Dependencies

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../utils/test-helpers';
```

### 3. Write Test Structure

```typescript
test.describe('New Feature E2E Tests', () => {
  let helpers: ReturnType<typeof createTestHelpers>;

  test.beforeEach(async ({ page }) => {
    helpers = createTestHelpers(page);
    // Setup
  });

  test('Feature functionality', async ({ page }) => {
    // Test steps
  });
});
```

### 4. Add Test IDs

Ensure components have `data-testid` attributes:

```tsx
<div data-testid="new-feature-section">
  <button data-testid="new-feature-button">Click me</button>
</div>
```

### 5. Run Tests

```bash
npx playwright test tests/e2e/flows/NewFeature.test.ts
```

## 🔄 Continuous Integration

### GitHub Actions

E2E tests can be integrated into CI/CD pipelines:

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    CI: true
```

### Parallel Execution

Tests run in parallel by default. For CI environments:

```bash
npx playwright test --workers=2
```

## 📈 Performance Testing

E2E tests include performance validation:

- **Load times**: Component rendering performance
- **Responsiveness**: User interaction latency
- **Memory usage**: Resource consumption patterns
- **Stress testing**: Behavior under load

## 🎨 Visual Testing

### Screenshots

Screenshots are automatically captured on test failures:

```bash
# View screenshots
open test-results/screenshots/
```

### Visual Regression

Compare screenshots across test runs:

```bash
npx playwright test --update-snapshots
```

## 🤝 Contributing

When adding new E2E tests:

1. **Follow naming conventions**: `FeatureName.test.ts`
2. **Use test helpers**: Leverage existing utilities
3. **Add test IDs**: Ensure components are testable
4. **Document complex flows**: Add comments for clarity
5. **Test edge cases**: Include error scenarios
6. **Verify accessibility**: Test keyboard navigation

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Debug Tools](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

## 🏁 Next Steps

With E2E testing established, consider:

1. **Visual regression testing** for UI consistency
2. **Performance benchmarking** for critical user flows
3. **Accessibility testing** with screen readers
4. **Cross-browser compatibility** validation
5. **Mobile device testing** on real devices
6. **Load testing** for production scenarios

---

**Happy Testing! 🧪✨**
