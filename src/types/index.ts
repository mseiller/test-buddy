export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export type QuizType = 'MCQ' | 'Fill-in-the-blank' | 'Essay' | 'Mixed';

export interface Question {
  id: string;
  type: 'MCQ' | 'Fill-in-the-blank' | 'Essay';
  question: string;
  options?: string[]; // For MCQ
  correctAnswer?: string | number; // For MCQ (index) or Fill-in-the-blank (text)
  explanation?: string;
  points: number;
}

export interface UserAnswer {
  questionId: string;
  answer: string | number;
  isCorrect?: boolean;
  timeSpent?: number;
  markedForReview?: boolean; // Track if question is marked for review
}

export interface FileUpload {
  file: File;
  extractedText: string;
  fileName: string;
  fileType: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestHistory {
  id: string;
  userId: string;
  testName: string;
  fileName: string;
  fileType?: string; // Optional for backward compatibility
  extractedText?: string; // Optional for backward compatibility
  quizType: QuizType;
  questions: Question[];
  answers: UserAnswer[];
  score?: number;
  createdAt: Date;
  completedAt?: Date;
  folderId?: string; // Optional: associate test with a folder
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface QuizGenerationRequest {
  text: string;
  quizType: QuizType;
  questionCount: number;
}

export interface QuizState {
  currentQuestion: number;
  answers: UserAnswer[];
  markedForReview: Set<string>; // Set of question IDs marked for review
  isReviewing: boolean; // Whether user is in review mode
  reviewQuestions: string[]; // List of question IDs to review
} 