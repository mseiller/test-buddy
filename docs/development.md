# Development Guide

This guide provides comprehensive information for developers contributing to the Test Buddy project.

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Code Standards](#code-standards)
3. [Testing](#testing)
4. [Architecture Patterns](#architecture-patterns)
5. [Performance Guidelines](#performance-guidelines)
6. [Security Guidelines](#security-guidelines)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

## 🚀 Development Setup

### Prerequisites

- **Node.js 18+** (LTS version recommended)
- **npm 8+** or **yarn 1.22+**
- **Git** for version control
- **VS Code** (recommended editor with extensions)

### Required VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Initial Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/your-org/test-buddy.git
   cd test-buddy
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development values
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 📝 Code Standards

### TypeScript

- **Strict Mode**: Always enabled
- **Type Safety**: Prefer explicit types over inference
- **Interfaces**: Use interfaces for object shapes
- **Generics**: Use generics for reusable components

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
}

function updateProfile<T extends UserProfile>(
  profile: T,
  updates: Partial<T>
): T {
  return { ...profile, ...updates };
}

// ❌ Avoid
function updateProfile(profile: any, updates: any): any {
  return { ...profile, ...updates };
}
```

### React Components

- **Functional Components**: Use functional components with hooks
- **Props Interface**: Define props interface for each component
- **Error Boundaries**: Wrap components in error boundaries
- **Performance**: Use React.memo and useMemo when appropriate

```typescript
// ✅ Good
interface QuizCardProps {
  quiz: Quiz;
  onSelect: (quizId: string) => void;
  isSelected?: boolean;
}

export const QuizCard: React.FC<QuizCardProps> = React.memo(({
  quiz,
  onSelect,
  isSelected = false
}) => {
  const handleClick = useCallback(() => {
    onSelect(quiz.id);
  }, [quiz.id, onSelect]);

  return (
    <div 
      className={`quiz-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <h3>{quiz.title}</h3>
      <p>{quiz.description}</p>
    </div>
  );
});

QuizCard.displayName = 'QuizCard';
```

### File Naming

- **Components**: PascalCase (e.g., `QuizCard.tsx`)
- **Services**: camelCase (e.g., `quizService.ts`)
- **Types**: PascalCase (e.g., `QuizTypes.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

### Import Organization

```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 2. Internal components
import { QuizCard } from '@/components/QuizCard';
import { QuizList } from '@/components/QuizList';

// 3. Internal services
import { QuizService } from '@/services/QuizService';

// 4. Types and constants
import { Quiz, QuizType } from '@/types';
import { API_ENDPOINTS } from '@/constants';

// 5. Styles
import styles from './QuizPage.module.css';
```

## 🧪 Testing

### Testing Framework

- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Testing Library Jest DOM**: Custom matchers

### Test Structure

```typescript
// __tests__/components/QuizCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizCard } from '@/components/QuizCard';
import { createMockQuiz } from '@/__tests__/utils/test-utils';

describe('QuizCard', () => {
  const mockQuiz = createMockQuiz();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('renders quiz information correctly', () => {
    render(<QuizCard quiz={mockQuiz} onSelect={mockOnSelect} />);
    
    expect(screen.getByText(mockQuiz.title)).toBeInTheDocument();
    expect(screen.getByText(mockQuiz.description)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    render(<QuizCard quiz={mockQuiz} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockQuiz.id);
  });

  it('applies selected styles when isSelected is true', () => {
    render(
      <QuizCard 
        quiz={mockQuiz} 
        onSelect={mockOnSelect} 
        isSelected={true} 
      />
    );
    
    expect(screen.getByRole('button')).toHaveClass('selected');
  });
});
```

### Test Utilities

```typescript
// __tests__/utils/test-utils.tsx
export const createMockQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
  id: 'quiz-1',
  title: 'Test Quiz',
  description: 'A test quiz for testing',
  questions: [],
  metadata: {
    difficulty: 'medium',
    questionCount: 10,
    estimatedTime: 15
  },
  createdAt: new Date(),
  ...overrides
});

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  plan: 'free',
  createdAt: new Date(),
  ...overrides
});
```

### Testing Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // ✅ Good - Test what the user sees
   expect(screen.getByText('Submit')).toBeInTheDocument();
   
   // ❌ Avoid - Test implementation details
   expect(component.state.isSubmitted).toBe(true);
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // ✅ Good
   it('displays error message when form submission fails', () => {
   
   // ❌ Avoid
   it('handles error', () => {
   ```

3. **Test Edge Cases**
   ```typescript
   it('handles empty quiz list gracefully', () => {
     render(<QuizList quizzes={[]} />);
     expect(screen.getByText('No quizzes found')).toBeInTheDocument();
   });
   ```

## 🏗 Architecture Patterns

### Service Layer Pattern

```typescript
// services/QuizService.ts
export class QuizService {
  private static instance: QuizService;
  
  static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService();
    }
    return QuizService.instance;
  }

  async generateQuiz(content: string, config: QuizConfig): Promise<Quiz> {
    try {
      // 1. Validate input
      this.validateQuizConfig(config);
      
      // 2. Process content
      const processedContent = await this.processContent(content);
      
      // 3. Generate quiz via AI
      const quiz = await this.generateQuizWithAI(processedContent, config);
      
      // 4. Cache result
      await this.cacheQuiz(quiz);
      
      return quiz;
    } catch (error) {
      await ErrorManagementService.handleError(error, {
        component: 'QuizService',
        action: 'generateQuiz',
        metadata: { config }
      });
      throw error;
    }
  }

  private validateQuizConfig(config: QuizConfig): void {
    if (config.questionCount < 1 || config.questionCount > 100) {
      throw new Error('Question count must be between 1 and 100');
    }
  }
}
```

### Repository Pattern

```typescript
// repositories/QuizRepository.ts
export interface QuizRepository {
  findById(id: string): Promise<Quiz | null>;
  save(quiz: Quiz): Promise<Quiz>;
  findByUserId(userId: string): Promise<Quiz[]>;
  delete(id: string): Promise<void>;
}

export class FirebaseQuizRepository implements QuizRepository {
  async findById(id: string): Promise<Quiz | null> {
    try {
      const doc = await getDoc(doc(db, 'quizzes', id));
      return doc.exists() ? this.mapDocumentToQuiz(doc) : null;
    } catch (error) {
      throw new FirebaseError('Failed to fetch quiz', error);
    }
  }

  private mapDocumentToQuiz(doc: DocumentSnapshot): Quiz {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      metadata: data.metadata,
      createdAt: data.createdAt.toDate()
    };
  }
}
```

### Factory Pattern

```typescript
// factories/QuizFactory.ts
export class QuizFactory {
  static createQuiz(config: QuizConfig): Quiz {
    return {
      id: generateId(),
      title: config.title || 'Generated Quiz',
      description: config.description || '',
      questions: [],
      metadata: {
        difficulty: config.difficulty,
        questionCount: config.questionCount,
        estimatedTime: this.calculateEstimatedTime(config),
        createdAt: new Date()
      }
    };
  }

  private static calculateEstimatedTime(config: QuizConfig): number {
    const baseTimePerQuestion = 60; // seconds
    return config.questionCount * baseTimePerQuestion;
  }
}
```

## ⚡ Performance Guidelines

### Code Splitting

```typescript
// Lazy load components
const QuizEditor = lazy(() => import('@/components/QuizEditor'));
const PerformanceDashboard = lazy(() => import('@/components/PerformanceDashboard'));

// Use Suspense
<Suspense fallback={<QuizEditorSkeleton />}>
  <QuizEditor />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return performExpensiveCalculation(data);
}, [data]);

// Memoize callbacks
const handleSubmit = useCallback((formData: FormData) => {
  submitForm(formData);
}, [submitForm]);
```

### Virtual Scrolling

```typescript
// For large lists
import { FixedSizeList as List } from 'react-window';

const QuizList: React.FC<{ quizzes: Quiz[] }> = ({ quizzes }) => (
  <List
    height={400}
    itemCount={quizzes.length}
    itemSize={80}
    itemData={quizzes}
  >
    {({ index, style, data }) => (
      <QuizCard
        quiz={data[index]}
        style={style}
        onSelect={handleSelect}
      />
    )}
  </List>
);
```

## 🔒 Security Guidelines

### Input Validation

```typescript
// Always validate input
export class InputValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): boolean {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
  }

  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input);
  }
}
```

### Authentication

```typescript
// Use Firebase Auth
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
```

### Rate Limiting

```typescript
// Implement rate limiting
export class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(userId: string, action: string, limit: number, window: number): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < window);
    
    if (recentRequests.length >= limit) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
}
```

## 🚀 Deployment

### Environment Configuration

```bash
# Production environment variables
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_domain
OPENROUTER_API_KEY=your_production_key
NEXT_PUBLIC_ENCRYPTION_SECRET=your_production_secret
NODE_ENV=production
```

### Build Process

```bash
# Build the application
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel --prod
```

### Monitoring

```typescript
// Implement performance monitoring
export class PerformanceMonitor {
  static recordMetric(name: string, value: number, tags: Record<string, string>) {
    // Send to monitoring service
    analytics.track('performance_metric', {
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  static recordError(error: Error, context: ErrorContext) {
    // Send to error tracking service
    Sentry.captureException(error, {
      extra: context
    });
  }
}
```

## 🤝 Contributing

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/quiz-editor-improvements
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: improve quiz editor with drag and drop

   - Add drag and drop functionality for questions
   - Implement question reordering
   - Add visual feedback during drag operations
   
   Closes #123"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/quiz-editor-improvements
   # Create PR on GitHub
   ```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add Google OAuth support
fix(quiz): resolve question rendering issue
docs(api): update authentication endpoints
style(components): improve button styling
```

### Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed

## 📚 Additional Resources

- [API Reference](./api-reference.md)
- [Component Library](./components.md)
- [Security Guide](./security.md)
- [Performance Guide](./performance.md)
- [Testing Guide](./testing.md)

## 🆘 Getting Help

- **Documentation**: Check this guide first
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Join community discussions
- **Code Review**: Ask questions during PR reviews

---

*Happy coding! 🚀*
