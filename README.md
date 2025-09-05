# Test Buddy - AI-Powered Quiz Generator

Test Buddy is a React-based web application that allows users to upload documents (.doc, .txt, .pdf, .csv, .xls files) and automatically generate personalized quiz questions using AI. The app supports multiple question types including Multiple Choice, Fill-in-the-blank, Essay questions, and Mixed formats.

## Features

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

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **File Processing**: 
  - Mammoth (for .doc/.docx files)
  - pdf-parse (for PDF files)
  - xlsx (for Excel files)
  - Native processing for text and CSV files
- **AI Integration**: OpenRouter API
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd test-buddy
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Configuration

Create a \`.env.local\` file in the root directory with the following variables:

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# OpenRouter API Configuration
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here
\`\`\`

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable the following services:
   - **Authentication**: Enable Email/Password sign-in method
   - **Firestore Database**: Create in production mode
4. Go to Project Settings > General > Your apps
5. Register a web app and copy the configuration values
6. Update your \`.env.local\` file with these values

### 5. OpenRouter Setup

1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and verify your email
3. Go to API Keys section and generate a new API key
4. Add credits to your account for API usage
5. Update your \`.env.local\` file with the API key

### 6. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
src/
├── app/
│   ├── api/
│   │   └── extract-pdf/
│   │       └── route.ts          # PDF text extraction API
│   ├── globals.css               # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main application page
├── components/
│   ├── AuthForm.tsx             # Authentication form
│   ├── FileUpload.tsx           # File upload component
│   ├── QuizConfig.tsx           # Quiz configuration
│   ├── QuizDisplay.tsx          # Quiz taking interface
│   ├── QuizResults.tsx          # Results and review
│   └── TestHistory.tsx          # Test history display
├── lib/
│   └── firebase.ts              # Firebase configuration
├── services/
│   ├── fileProcessor.ts         # File processing logic
│   ├── firebaseService.ts       # Firebase operations
│   └── openRouter.ts            # OpenRouter API integration
├── types/
│   └── index.ts                 # TypeScript type definitions
└── utils/                       # Utility functions
\`\`\`

## Usage Guide

### 1. Sign Up / Sign In
- Create a new account or sign in with existing credentials
- All test history is saved per user account

### 2. Upload a Document
- Drag and drop or click to select a file
- Supported formats: .txt, .pdf, .doc, .docx, .csv, .xls, .xlsx
- Maximum file size: 10MB

### 3. Configure Your Quiz
- Choose quiz type: MCQ, Fill-in-the-blank, Essay, or Mixed
- Set number of questions (5-15)
- Optionally name your test

### 4. Take the Quiz
- Navigate through questions using the sidebar or navigation buttons
- Flag questions for review
- Track your progress with the progress bar

### 5. Review Results
- View your score and detailed breakdown
- Review answers with explanations
- Access test history for future reference

## API Integration

### OpenRouter
The app uses OpenRouter API for generating quiz questions. The service:
- Sends extracted text content to the AI model
- Requests specific question types and quantities
- Parses structured JSON responses
- Handles error cases and validation

### Firebase
Firebase provides:
- User authentication and session management
- Firestore database for storing test history
- Real-time data synchronization
- Offline support

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:
1. Check the console for error messages
2. Verify your environment variables are correctly set
3. Ensure you have sufficient credits in your OpenRouter account
4. Check Firebase console for authentication and database issues

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- All Firebase configuration variables
- OpenRouter API key
- Any additional production-specific settings
