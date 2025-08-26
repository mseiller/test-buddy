export interface User {
  uid: string;
  email: string;
  displayName?: string;
  plan?: "free" | "student" | "pro";
  createdAt?: Date;
}

export type QuizType = 'MCQ' | 'Fill-in-the-blank' | 'Essay' | 'Mixed';

export interface Question {
  id: string;
  type: 'MCQ' | 'MSQ' | 'Fill-in-the-blank' | 'Essay' | 'True-False';
  question: string;
  options?: string[]; // For MCQ and MSQ
  correctAnswer?: string | number | boolean | number[]; // MCQ (index), MSQ (array of indices), Fill-in-the-blank (text), True-False (boolean)
  explanation?: string;
  points: number;
  // For MSQ questions - specify how many answers to select
  selectCount?: number; // e.g., "Select 2 answers", "Select all that apply" (undefined = all that apply)
}

export interface UserAnswer {
  questionId: string;
  answer: string | number | number[] | boolean; // Support multiple selections for MSQ and boolean for True-False
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

export type FeedbackSummary = {
  overall_assessment: string;
  strengths: string[];
  focus_areas: {
    topic: string;
    why: string;
    examples: string[];
    study_actions: string[];
  }[];
  suggested_next_quiz: {
    difficulty: 'easy' | 'mixed' | 'hard';
    question_mix: Array<'multiple_choice'|'fill_blank'|'true_false'|'scenario'|'short_answer'|'essay'>;
    target_topics: string[];
  };
};

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