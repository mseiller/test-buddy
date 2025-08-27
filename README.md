# Test Buddy - AI-Powered Quiz Generator

Test Buddy is a React-based web application that allows users to upload documents (.doc, .txt, .pdf, .csv, .xls files) and automatically generate personalized quiz questions using AI. The app supports multiple question types including Multiple Choice, Fill-in-the-blank, Essay questions, and Mixed formats.

## 🚀 Features

- **File Upload & Processing**: Support for .doc/.txt/.pdf/.csv/.xls files with automatic text extraction
- **AI-Powered Quiz Generation**: Uses OpenRouter API to generate intelligent quiz questions
- **Multiple Quiz Types**: 
  - Multiple Choice Questions (MCQ)
  - Fill-in-the-blank
  - Essay Questions
  - Mixed (combination of all types)
- **Interactive Quiz Interface**: User-friendly quiz taking experience with progress tracking
- **Detailed Results**: Score analysis with explanations and answer review
- **User Authentication**: Firebase-based user authentication
- **Test History**: Save and track all quiz attempts with detailed analytics
- **Responsive Design**: Works on desktop and mobile devices
- **Advanced Security**: Comprehensive security infrastructure with encryption and monitoring
- **Performance Optimization**: Advanced caching, monitoring, and optimization features

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **File Processing**: 
  - Mammoth (for .doc/.docx files)
  - pdf-parse (for PDF files)
  - xlsx (for Excel files)
  - Native processing for text and CSV files
- **AI Integration**: OpenRouter API
- **Icons**: Lucide React
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- OpenRouter API key

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd test-buddy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com

# OpenRouter API
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Encryption Secret (for enhanced security)
NEXT_PUBLIC_ENCRYPTION_SECRET=your_encryption_secret_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: `src/**/*.test.{ts,tsx}`
- **Integration Tests**: `src/**/*.spec.{ts,tsx}`
- **Test Utilities**: `src/__tests__/`

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

The project uses Husky and lint-staged to ensure code quality:

- ESLint checks on staged files
- Prettier formatting on staged files
- TypeScript type checking

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── features/          # Feature-specific components
│   ├── ui/               # Reusable UI components
│   └── errors/           # Error handling components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── services/             # Business logic and external services
│   ├── firebase/         # Firebase services
│   ├── security/         # Security services
│   ├── caching/          # Caching services
│   ├── errors/           # Error handling services
│   ├── monitoring/       # Performance monitoring
│   └── validation/       # Data validation
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## 📚 API Documentation

### OpenRouter Integration

The app uses OpenRouter API for generating quiz questions:

```typescript
// Generate quiz from text content
const quiz = await OpenRouterService.generateQuiz({
  text: extractedText,
  quizType: 'MCQ',
  questionCount: 10,
  isImageBased: false
});

// Generate AI feedback
const feedback = await OpenRouterService.generateFeedbackSummary(
  testName,
  score,
  questions,
  answers
);
```

### Firebase Services

```typescript
// User authentication
const user = await FirebaseService.signIn(email, password);

// Save test results
await FirebaseService.saveTestResult(testData);

// Get user history
const history = await FirebaseService.getTestHistory(userId);
```

## 🔒 Security Features

- **Input Validation**: Comprehensive validation for all user inputs
- **Data Sanitization**: Protection against XSS and injection attacks
- **Rate Limiting**: Configurable rate limiting with blocking capabilities
- **Encryption**: AES-GCM encryption for sensitive data
- **Audit Logging**: Complete security event tracking
- **Firebase Security Rules**: Granular access control for Firestore and Storage

## 📊 Performance Features

- **Smart Caching**: Multi-strategy caching with intelligent invalidation
- **Query Optimization**: Optimized Firestore queries with indexing
- **Performance Monitoring**: Real-time metrics and health scoring
- **Error Handling**: Advanced error handling with recovery strategies
- **Circuit Breaker**: Resilience patterns for external service calls

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables

Ensure all required environment variables are set in your deployment platform:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_OPENROUTER_API_KEY`
- `NEXT_PUBLIC_ENCRYPTION_SECRET` (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Run tests and ensure they pass
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Follow React best practices
- Use proper error handling
- Document complex functions and components

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the console for error messages
2. Verify your environment variables are correctly set
3. Review the Firebase and OpenRouter documentation
4. Check the test coverage for related functionality
5. Open an issue with detailed information

## 🔄 Changelog

### Version 0.1.0
- Initial release with core quiz generation functionality
- Firebase authentication and data persistence
- Basic file upload and processing
- Multiple question type support
- Comprehensive security infrastructure
- Performance optimization and monitoring
- Advanced error handling and recovery
