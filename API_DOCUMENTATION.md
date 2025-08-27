# Test Buddy API Documentation

This document provides comprehensive documentation for all APIs and services in the Test Buddy application.

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Quiz Generation](#quiz-generation)
3. [File Processing](#file-processing)
4. [User Management](#user-management)
5. [Performance Monitoring](#performance-monitoring)
6. [Security Services](#security-services)
7. [Error Handling](#error-handling)

## 🔐 Authentication

### Firebase Authentication
The application uses Firebase Authentication for user management.

#### Sign In
```typescript
// Component usage
<AuthForm onAuth={handleAuth} />

// Service call
const user = await FirebaseService.signIn(email, password);
```

#### Sign Up
```typescript
// Component usage
<AuthForm onAuth={handleAuth} />

// Service call
const user = await FirebaseService.signUp(email, password, displayName);
```

#### Sign Out
```typescript
// Service call
await FirebaseService.signOut();
```

## 🎯 Quiz Generation

### OpenRouter API Integration

#### Generate Quiz
```typescript
// Service usage
const quiz = await OpenRouterService.generateQuiz({
  text: extractedText,
  quizType: 'MCQ', // 'MCQ' | 'Fill-in-the-blank' | 'Essay' | 'Mixed'
  questionCount: 10,
  isImageBased: false
});

// Response structure
interface QuizResponse {
  questions: Question[];
  tokenUsage: {
    total: number;
    prompt: number;
    completion: number;
  };
}
```

#### Generate Feedback
```typescript
// Service usage
const feedback = await OpenRouterService.generateFeedbackSummary(
  testName,
  score,
  questions,
  answers
);

// Response structure
interface FeedbackSummary {
  overall_assessment: string;
  strengths: string[];
  focus_areas: FocusArea[];
  suggested_next_quiz: NextQuizSuggestion;
}
```

### Quiz Types

#### Multiple Choice Questions (MCQ)
```typescript
interface MCQQuestion {
  id: string;
  type: 'MCQ';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}
```

#### Fill-in-the-blank
```typescript
interface FillInQuestion {
  id: string;
  type: 'Fill-in-the-blank';
  question: string;
  correctAnswer: string;
  explanation: string;
  points: number;
}
```

#### Essay Questions
```typescript
interface EssayQuestion {
  id: string;
  type: 'Essay';
  question: string;
  explanation: string;
  points: number;
}
```

## 📁 File Processing

### Supported File Types
- **Text**: `.txt`
- **Documents**: `.doc`, `.docx`
- **PDFs**: `.pdf`
- **Spreadsheets**: `.csv`, `.xls`, `.xlsx`
- **Images**: `.jpg`, `.jpeg`, `.png`

### File Processing Service
```typescript
// Service usage
const text = await FileProcessor.extractText(file);

// Processing methods
await FileProcessor.extractFromText(file);
await FileProcessor.extractFromPdf(file);
await FileProcessor.extractFromDocx(file);
await FileProcessor.extractFromImage(file);
```

### Image OCR Processing
```typescript
// API endpoint
POST /api/extract-image

// Request
{
  file: File // Image file (JPG, PNG)
}

// Response
{
  text: string;
  confidence: number;
}
```

## 👥 User Management

### User Profile
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  plan: UserPlan;
  createdAt: Date;
  lastLogin: Date;
}
```

### User Plans
```typescript
enum UserPlan {
  STUDENT = 'student',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

interface PlanFeatures {
  maxQuestions: number;
  maxFileSize: number;
  imageUpload: boolean;
  imageModel: string;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}
```

### Usage Tracking
```typescript
interface UsageRecord {
  userId: string;
  date: Date;
  quizzesGenerated: number;
  filesProcessed: number;
  tokensUsed: number;
  plan: UserPlan;
}
```

## 📊 Performance Monitoring

### Performance Dashboard
```typescript
// Component usage
<PerformanceDashboard />

// API endpoints
GET /api/monitoring/dashboard
GET /api/monitoring/health
```

### Performance Metrics
```typescript
interface PerformanceMetrics {
  systemHealth: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  activeUsers: number;
  slowQueries: QueryPerformance[];
}
```

### Optimization API
```typescript
// Analyze performance
GET /api/monitoring/optimization/analyze

// Apply optimization
POST /api/monitoring/optimization/apply
{
  strategyId: string;
}
```

## 🔒 Security Services

### Security Manager
```typescript
// Service usage
const securityManager = SecurityManager.getInstance();

// Input validation
const isValid = await securityManager.validateInput(input);

// Rate limiting
const isAllowed = await securityManager.checkRateLimit(userId, action);

// Security logging
await securityManager.logSecurityEvent({
  userId,
  eventType: 'api_request',
  details: { endpoint: '/api/quiz', method: 'POST' },
  severity: 'low'
});
```

### Encryption Service
```typescript
// Service usage
const encryptionService = new EncryptionService();

// Encrypt data
const encrypted = await encryptionService.encryptUserData(data, userId);

// Decrypt data
const decrypted = await encryptionService.decryptUserData(encrypted, userId);
```

### Security Headers
The application automatically sets security headers:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

## ⚠️ Error Handling

### Error Management Service
```typescript
// Service usage
const errorManager = ErrorManagementService.getInstance();

// Execute with protection
const result = await errorManager.executeWithProtection(
  async () => {
    // Your code here
    return await riskyOperation();
  },
  {
    operation: 'quiz_generation',
    userId,
    fallback: () => defaultQuiz
  }
);
```

### Error Boundaries
```typescript
// Component usage
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Error boundary provides:
// - Error display
// - Retry functionality
// - Reset functionality
// - Error reporting
```

### Error Categories
```typescript
enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  INTERNAL_SERVER_ERROR = 'internal_server_error'
}
```

## 🧪 Testing APIs

### Test Data Management
```typescript
// Save test results
await FirebaseService.saveTestResult({
  userId,
  testName,
  questions,
  answers,
  score,
  timeSpent,
  completedAt
});

// Get test history
const history = await FirebaseService.getTestHistory(userId);

// Get test analytics
const analytics = await MetricsService.getUserAnalytics(userId);
```

### Test Results
```typescript
interface TestResult {
  id: string;
  userId: string;
  testName: string;
  questions: Question[];
  answers: UserAnswer[];
  score: number;
  timeSpent: number;
  completedAt: Date;
  feedback?: FeedbackSummary;
}
```

## 🔄 Caching & Performance

### Cache Service
```typescript
// Service usage
const cacheService = CacheService.getInstance();

// Set cache
await cacheService.set('quiz:123', quizData, userId);

// Get cache
const quizData = await cacheService.get('quiz:123', userId);

// Invalidate cache
await cacheService.invalidate('quiz:123', userId);
```

### Query Optimization
```typescript
// Service usage
const queryOptimizer = QueryOptimizer.getInstance();

// Optimized query
const results = await queryOptimizer.optimizedQuery(
  collection('tests'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(10)
);
```

## 📈 Analytics & Reporting

### Metrics Service
```typescript
// Service usage
const metricsService = MetricsService.getInstance();

// Get user analytics
const analytics = await metricsService.getUserAnalytics(userId, timeframe);

// Get system metrics
const systemMetrics = await metricsService.getSystemMetrics();
```

### Analytics Data
```typescript
interface UserAnalytics {
  totalQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  favoriteTopics: string[];
  improvementTrend: number;
  planUtilization: number;
}
```

## 🚀 Deployment & Configuration

### Environment Variables
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket

# OpenRouter API
NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key

# Security
NEXT_PUBLIC_ENCRYPTION_SECRET=your_secret
```

### Build Configuration
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  serverExternalPackages: ['pdf-parse'],
  images: {
    unoptimized: true,
  },
};
```

## 📝 API Response Formats

### Standard Response
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

### Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'AUTHENTICATION_ERROR' | 'RATE_LIMIT_EXCEEDED';
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId: string;
}
```

## 🔍 Rate Limiting

### Rate Limit Configuration
```typescript
interface RateLimitConfig {
  windowMs: number; // 15 minutes
  maxRequests: number; // 100 requests per window
  message: string;
  statusCode: number; // 429
}
```

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📚 Additional Resources

- [Development Guide](./DEVELOPMENT.md)
- [README](./README.md)
- [TypeScript Types](./src/types/index.ts)
- [Firebase Security Rules](./firestore.rules)
- [Storage Security Rules](./storage.rules)

---

**Note**: This documentation is continuously updated. For the latest information, check the source code and component documentation.
