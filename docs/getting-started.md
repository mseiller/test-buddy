# Getting Started with Test Buddy

Welcome to Test Buddy! This guide will help you get up and running with the application quickly.

## 🎯 What is Test Buddy?

Test Buddy is an AI-powered quiz generation application that helps educators and learners create personalized assessments from various document formats. It supports:

- **Multiple File Formats**: DOCX, PDF, TXT, and images (JPG, PNG)
- **AI-Powered Generation**: Uses advanced language models for intelligent quiz creation
- **Customizable Quizzes**: Multiple question types and difficulty levels
- **Performance Analytics**: Track learning progress and identify areas for improvement
- **Secure & Scalable**: Built with enterprise-grade security and performance

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed on your system
- **npm or yarn** package manager
- **Git** for version control
- **Firebase project** (for backend services)
- **OpenRouter API key** (for AI quiz generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/test-buddy.git
   cd test-buddy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your environment**
   Edit `.env.local` with your actual values:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # OpenRouter API
   OPENROUTER_API_KEY=your_openrouter_api_key
   
   # Security
   NEXT_PUBLIC_ENCRYPTION_SECRET=your_encryption_secret
   
   # Optional: Analytics
   NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
test-buddy/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   └── layout/         # Layout components
│   ├── services/           # Business logic services
│   │   ├── firebase/       # Firebase integration
│   │   ├── security/       # Security services
│   │   ├── caching/        # Caching services
│   │   └── performance/    # Performance monitoring
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── types/              # TypeScript type definitions
│   └── lib/                # Utility libraries
├── public/                 # Static assets
├── docs/                   # Documentation
└── tests/                  # Test files
```

## 🔧 Configuration

### Firebase Setup

1. **Create a Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable services**
   - **Authentication**: Enable Email/Password and Google sign-in
   - **Firestore**: Create a database in test mode
   - **Storage**: Enable Cloud Storage

3. **Configure security rules**
   - Set up Firestore security rules
   - Configure Storage security rules
   - Set up Authentication providers

### OpenRouter Setup

1. **Get an API key**
   - Visit [OpenRouter](https://openrouter.ai/)
   - Sign up and get your API key
   - Add it to your `.env.local` file

2. **Configure models**
   - Choose your preferred AI models
   - Set rate limits and usage quotas

## 📱 First Steps

### 1. Create an Account

1. Open the application in your browser
2. Click "Sign Up" in the top right
3. Enter your email and password
4. Verify your email (if required)

### 2. Upload Your First Document

1. Click "Upload Document" on the dashboard
2. Select a document (DOCX, PDF, TXT, or image)
3. Choose your quiz preferences:
   - Number of questions
   - Question types
   - Difficulty level
4. Click "Generate Quiz"

### 3. Take the Quiz

1. Review the generated questions
2. Answer each question
3. Submit your answers
4. Review your results and AI feedback

### 4. Explore Features

- **Folder Management**: Organize your documents and quizzes
- **Performance Analytics**: Track your learning progress
- **AI Feedback**: Get personalized study recommendations
- **History**: Review past quizzes and performance

## 🧪 Testing

Run the test suite to ensure everything is working:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   - Push your code to GitHub
   - Connect your repository to Vercel

2. **Configure environment variables**
   - Add all environment variables in Vercel dashboard
   - Ensure production values are correct

3. **Deploy**
   - Vercel will automatically deploy on push
   - Monitor the deployment logs

### Other Platforms

- **Netlify**: Similar to Vercel, supports Next.js
- **AWS Amplify**: Full-stack deployment solution
- **Docker**: Containerized deployment option

## 🔍 Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Verify your Firebase configuration
   - Check if services are enabled
   - Ensure security rules allow access

2. **OpenRouter API errors**
   - Verify your API key
   - Check rate limits and quotas
   - Ensure the model is available

3. **Build errors**
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility
   - Verify TypeScript configuration

### Getting Help

- **Documentation**: Check this documentation first
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord or Slack channel

## 📚 Next Steps

Now that you're up and running, explore:

- [API Reference](./api-reference.md) - Learn about available APIs
- [Component Library](./components.md) - Understand the UI components
- [Development Guide](./development.md) - Contribute to the project
- [Security Guide](./security.md) - Learn about security features

## 🎉 Congratulations!

You've successfully set up Test Buddy! The application is now ready to help you create engaging, AI-powered quizzes from your documents.

---

*Need help? Check our [troubleshooting guide](./troubleshooting.md) or [contact support](./support.md).*
