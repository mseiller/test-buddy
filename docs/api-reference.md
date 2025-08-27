# API Reference

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

The application uses Firebase Authentication for user management with support for multiple providers.

#### Sign In

```typescript
// Component usage
<AuthForm onAuth={handleAuth} />

// Service call
const user = await FirebaseService.signIn(email, password);
```

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
- `User` object with user information

#### Sign Up

```typescript
// Component usage
<AuthForm onAuth={handleAuth} />

// Service call
const user = await FirebaseService.signUp(email, password, displayName);
```

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (minimum 6 characters)
- `displayName` (string, optional): User's display name

**Returns:**
- `User` object with user information

#### Google Sign In

```typescript
// Service call
const user = await FirebaseService.signInWithGoogle();
```

**Returns:**
- `User` object with user information

#### Sign Out

```typescript
// Service call
await FirebaseService.signOut();
```

## 🎯 Quiz Generation

### OpenRouter Service

The OpenRouter service handles AI-powered quiz generation using various language models.

#### Generate Quiz

```typescript
// Service call
const quiz = await OpenRouterService.generateQuiz(
  content,
  quizConfig,
  retryOptions
);
```

**Parameters:**
- `content` (string): Document content to generate quiz from
- `quizConfig` (QuizConfig): Quiz configuration options
- `retryOptions` (RetryOptions, optional): Retry configuration

**QuizConfig Interface:**
```typescript
interface QuizConfig {
  questionCount: number;
  questionTypes: QuizType[];
  difficulty: 'easy' | 'medium' | 'hard';
  topics?: string[];
  customInstructions?: string;
}
```

**Returns:**
- `Quiz` object with questions and metadata

#### Generate Feedback Summary

```typescript
// Service call
const feedback = await OpenRouterService.generateFeedbackSummary(
  questions,
  answers,
  performance
);
```

**Parameters:**
- `questions` (Question[]): Quiz questions
- `answers` (UserAnswer[]): User's answers
- `performance` (PerformanceData): Performance metrics

**Returns:**
- `AIFeedback` object with personalized recommendations

#### Model Selection

```typescript
// Get appropriate model for quiz type
const model = OpenRouterService.getModelForQuizType(quizType);
```

**Parameters:**
- `quizType` (QuizType): Type of quiz to generate

**Returns:**
- `string`: Model identifier

## 📄 File Processing

### File Processor Service

Handles various document formats and extracts text content for quiz generation.

#### Process Document

```typescript
// Service call
const result = await FileProcessor.processFile(file, options);
```

**Parameters:**
- `file` (File): Document file to process
- `options` (ProcessingOptions): Processing configuration

**ProcessingOptions Interface:**
```typescript
interface ProcessingOptions {
  extractImages?: boolean;
  ocrEnabled?: boolean;
  maxFileSize?: number;
  allowedFormats?: string[];
}
```

**Supported Formats:**
- **DOCX**: Microsoft Word documents
- **PDF**: Portable Document Format
- **TXT**: Plain text files
- **Images**: JPG, PNG with OCR support

**Returns:**
- `ProcessingResult` with extracted text and metadata

#### Extract Text from DOCX

```typescript
// Service call
const text = await FileProcessor.extractTextFromDocx(file);
```

**Parameters:**
- `file` (File): DOCX file

**Returns:**
- `string`: Extracted text content

#### Extract Text from PDF

```typescript
// Service call
const text = await FileProcessor.extractTextFromPdf(file);
```

**Parameters:**
- `file` (File): PDF file

**Returns:**
- `string`: Extracted text content

#### Process Image with OCR

```typescript
// Service call
const text = await FileProcessor.processImageWithOCR(file);
```

**Parameters:**
- `file` (File): Image file (JPG, PNG)

**Returns:**
- `string`: Extracted text from image

## 👤 User Management

### User Service

Manages user profiles, preferences, and account settings.

#### Get User Profile

```typescript
// Service call
const profile = await UserService.getProfile(userId);
```

**Parameters:**
- `userId` (string): User's unique identifier

**Returns:**
- `UserProfile` object with user information

#### Update User Profile

```typescript
// Service call
await UserService.updateProfile(userId, updates);
```

**Parameters:**
- `userId` (string): User's unique identifier
- `updates` (Partial<UserProfile>): Profile updates

**Returns:**
- `Promise<void>`

#### Get User Plan

```typescript
// Service call
const plan = await UserService.getUserPlan(userId);
```

**Parameters:**
- `userId` (string): User's unique identifier

**Returns:**
- `UserPlan` object with subscription details

### Folder Management

#### Create Folder

```typescript
// Service call
const folder = await FolderService.createFolder(userId, folderData);
```

**Parameters:**
- `userId` (string): User's unique identifier
- `folderData` (CreateFolderData): Folder information

**CreateFolderData Interface:**
```typescript
interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
}
```

**Returns:**
- `Folder` object

#### Get User Folders

```typescript
// Service call
const folders = await FolderService.getUserFolders(userId);
```

**Parameters:**
- `userId` (string): User's unique identifier

**Returns:**
- `Folder[]` array

## 📊 Performance Monitoring

### Performance Service

Monitors application performance and provides optimization recommendations.

#### Record Metric

```typescript
// Service call
await PerformanceService.recordMetric(metric);
```

**Metric Interface:**
```typescript
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}
```

#### Get Performance Insights

```typescript
// Service call
const insights = await PerformanceService.getInsights(timeframe);
```

**Parameters:**
- `timeframe` (string): Time range for insights

**Returns:**
- `PerformanceInsights` object

#### Optimize Performance

```typescript
// Service call
const recommendations = await PerformanceService.optimize();
```

**Returns:**
- `OptimizationRecommendation[]` array

## 🔒 Security Services

### Security Service

Provides comprehensive security features including encryption, rate limiting, and threat detection.

#### Encrypt Data

```typescript
// Service call
const encrypted = await SecurityService.encrypt(data, key);
```

**Parameters:**
- `data` (string): Data to encrypt
- `key` (string): Encryption key

**Returns:**
- `string`: Encrypted data

#### Decrypt Data

```typescript
// Service call
const decrypted = await SecurityService.decrypt(encryptedData, key);
```

**Parameters:**
- `encryptedData` (string): Encrypted data
- `key` (string): Decryption key

**Returns:**
- `string`: Decrypted data

#### Rate Limiting

```typescript
// Service call
const allowed = await SecurityService.checkRateLimit(userId, action);
```

**Parameters:**
- `userId` (string): User's unique identifier
- `action` (string): Action being performed

**Returns:**
- `boolean`: Whether action is allowed

#### Threat Detection

```typescript
// Service call
const threat = await SecurityService.detectThreat(userId, action, context);
```

**Parameters:**
- `userId` (string): User's unique identifier
- `action` (string): Action being performed
- `context` (ThreatContext): Context information

**Returns:**
- `ThreatAssessment` object

## ⚠️ Error Handling

### Error Management Service

Provides comprehensive error handling, reporting, and recovery strategies.

#### Handle Error

```typescript
// Service call
await ErrorManagementService.handleError(error, context);
```

**Parameters:**
- `error` (Error): Error object
- `context` (ErrorContext): Error context

**ErrorContext Interface:**
```typescript
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operationId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}
```

#### Get Error Statistics

```typescript
// Service call
const stats = await ErrorManagementService.getErrorStats(timeframe);
```

**Parameters:**
- `timeframe` (string): Time range for statistics

**Returns:**
- `ErrorStats` object

#### Recovery Strategies

```typescript
// Service call
const strategy = await ErrorManagementService.getRecoveryStrategy(error);
```

**Parameters:**
- `error` (Error): Error object

**Returns:**
- `RecoveryStrategy` object

## 🔄 Caching Services

### Cache Service

Provides intelligent caching for improved performance and reduced API calls.

#### Get Cached Data

```typescript
// Service call
const result = await CacheService.get(key, fallback);
```

**Parameters:**
- `key` (string): Cache key
- `fallback` (() => Promise<T>): Fallback function

**Returns:**
- `T`: Cached or fresh data

#### Set Cache

```typescript
// Service call
await CacheService.set(key, data, options);
```

**Parameters:**
- `key` (string): Cache key
- `data` (T): Data to cache
- `options` (CacheOptions): Caching options

**CacheOptions Interface:**
```typescript
interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
```

#### Invalidate Cache

```typescript
// Service call
await CacheService.invalidate(pattern);
```

**Parameters:**
- `pattern` (string): Cache invalidation pattern

## 📝 Data Types

### Core Types

```typescript
// User types
interface User {
  uid: string;
  email: string;
  displayName?: string;
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
}

// Quiz types
interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  metadata: QuizMetadata;
  createdAt: Date;
}

interface Question {
  id: string;
  type: QuizType;
  question: string;
  options?: string[];
  correctAnswer: string | number | boolean | number[];
  explanation?: string;
  points: number;
}

// Performance types
interface PerformanceData {
  score: number;
  timeTaken: number;
  accuracy: number;
  difficulty: string;
  topics: string[];
}
```

## 🚀 Usage Examples

### Complete Quiz Generation Flow

```typescript
import { FileProcessor, OpenRouterService, QuizService } from '@/services';

async function generateQuizFromDocument(file: File) {
  try {
    // 1. Process document
    const content = await FileProcessor.processFile(file);
    
    // 2. Generate quiz
    const quiz = await OpenRouterService.generateQuiz(content, {
      questionCount: 10,
      questionTypes: ['MCQ', 'True-False'],
      difficulty: 'medium'
    });
    
    // 3. Save quiz
    const savedQuiz = await QuizService.saveQuiz(quiz);
    
    return savedQuiz;
  } catch (error) {
    await ErrorManagementService.handleError(error, {
      component: 'QuizGeneration',
      action: 'generateQuiz',
      metadata: { fileName: file.name }
    });
    throw error;
  }
}
```

### Error Handling with Recovery

```typescript
import { ErrorManagementService } from '@/services';

async function performOperation() {
  try {
    return await riskyOperation();
  } catch (error) {
    const strategy = await ErrorManagementService.getRecoveryStrategy(error);
    
    if (strategy.type === 'retry') {
      return await retryOperation(strategy.attempts);
    } else if (strategy.type === 'fallback') {
      return await fallbackOperation();
    }
    
    throw error;
  }
}
```

## 📚 Additional Resources

- [Getting Started Guide](./getting-started.md)
- [Component Library](./components.md)
- [Security Guide](./security.md)
- [Performance Guide](./performance.md)
- [Development Guide](./development.md)

---

*For technical support or questions about the API, please [open an issue](https://github.com/your-org/test-buddy/issues) or [contact the development team](./support.md).*
