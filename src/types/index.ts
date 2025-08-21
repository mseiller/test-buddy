export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface TestHistory {
  id: string;
  userId: string;
  testName: string;
  fileName: string;
  fileType: string;
  extractedText: string; // Store the extracted text for retaking
  quizType: QuizType;
  questions: Question[];
  answers: UserAnswer[];
  score?: number;
  createdAt: Date;
  completedAt?: Date;
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
}

export interface FileUpload {
  file: File;
  extractedText: string;
  fileName: string;
  fileType: string;
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