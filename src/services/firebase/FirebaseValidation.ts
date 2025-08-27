/**
 * Firebase Data Validation
 * Provides comprehensive validation for all Firebase operations
 */

import { FirebaseError, FirebaseErrorCode } from './FirebaseError';
import { TestHistory, Folder, Question, UserAnswer } from '@/types';

export class FirebaseValidation {
  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    if (!email) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Email is required'
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Invalid email format'
      );
    }
  }
  
  /**
   * Validate password strength
   */
  static validatePassword(password: string): void {
    if (!password) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Password is required'
      );
    }
    
    if (password.length < 6) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Password must be at least 6 characters long'
      );
    }
  }
  
  /**
   * Validate user ID
   */
  static validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Valid user ID is required'
      );
    }
  }
  
  /**
   * Validate test history data
   */
  static validateTestHistory(testHistory: Omit<TestHistory, 'id'>): void {
    if (!testHistory) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Test history data is required'
      );
    }
    
    // Required fields
    if (!testHistory.userId) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'User ID is required for test history'
      );
    }
    
    if (!testHistory.testName || testHistory.testName.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Test name is required'
      );
    }
    
    if (!testHistory.fileName || testHistory.fileName.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'File name is required'
      );
    }
    
    if (!testHistory.fileType) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'File type is required'
      );
    }
    
    if (!testHistory.extractedText || testHistory.extractedText.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Extracted text is required'
      );
    }
    
    if (!testHistory.quizType) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Quiz type is required'
      );
    }
    
    if (!Array.isArray(testHistory.questions) || testHistory.questions.length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Questions array is required and must not be empty'
      );
    }
    
    if (!Array.isArray(testHistory.answers)) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Answers array is required'
      );
    }
    
    if (typeof testHistory.score !== 'number' || testHistory.score < 0 || testHistory.score > 100) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Score must be a number between 0 and 100'
      );
    }
    
    if (!testHistory.createdAt) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Created date is required'
      );
    }
    
    // Validate questions
    testHistory.questions.forEach((question, index) => {
      this.validateQuestion(question, `Question ${index + 1}`);
    });
    
    // Validate answers
    testHistory.answers.forEach((answer, index) => {
      this.validateUserAnswer(answer, `Answer ${index + 1}`);
    });
  }
  
  /**
   * Validate question data
   */
  static validateQuestion(question: Question, context: string = 'Question'): void {
    if (!question) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Question data is required`
      );
    }
    
    if (!question.id) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Question ID is required`
      );
    }
    
    if (!question.question || question.question.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Question text is required`
      );
    }
    
    if (!question.type) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Question type is required`
      );
    }
    
    const validTypes = ['MCQ', 'MSQ', 'True-False', 'Fill-in-the-blank', 'Essay'];
    if (!validTypes.includes(question.type)) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Invalid question type. Must be one of: ${validTypes.join(', ')}`
      );
    }
    
    // Validate options for MCQ and MSQ
    if (['MCQ', 'MSQ'].includes(question.type)) {
      if (!Array.isArray(question.options) || question.options.length === 0) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `${context}: Options array is required for ${question.type} questions`
        );
      }
      
      if (question.options.length < 2) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `${context}: At least 2 options are required for ${question.type} questions`
        );
      }
    }
    
    // Validate correct answer exists
    if (question.correctAnswer === undefined || question.correctAnswer === null) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Correct answer is required`
      );
    }
    
    // Validate points
    if (typeof question.points !== 'number' || question.points <= 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Points must be a positive number`
      );
    }
  }
  
  /**
   * Validate user answer data
   */
  static validateUserAnswer(answer: UserAnswer, context: string = 'Answer'): void {
    if (!answer) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Answer data is required`
      );
    }
    
    if (!answer.questionId) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Question ID is required`
      );
    }
    
    // Answer can be various types, but should not be null/undefined
    if (answer.answer === null || answer.answer === undefined) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: Answer value is required`
      );
    }
    
    if (typeof answer.isCorrect !== 'boolean') {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `${context}: isCorrect must be a boolean`
      );
    }
  }
  
  /**
   * Validate folder data
   */
  static validateFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!folder) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Folder data is required'
      );
    }
    
    if (!folder.userId) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'User ID is required for folder'
      );
    }
    
    if (!folder.name || folder.name.trim().length === 0) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Folder name is required'
      );
    }
    
    if (folder.name.length > 50) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Folder name must be 50 characters or less'
      );
    }
    
    if (folder.description && folder.description.length > 200) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Folder description must be 200 characters or less'
      );
    }
  }
  
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    let sanitized = input.trim();
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }
    
    return sanitized;
  }
  
  /**
   * Validate and sanitize object for Firestore
   * Removes undefined values and validates structure
   */
  static sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Handle null values (Firestore allows null)
      if (value === null) {
        sanitized[key] = null;
        continue;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? this.sanitizeForFirestore(item)
            : item
        );
        continue;
      }
      
      // Handle objects
      if (typeof value === 'object' && value !== null) {
        // Check if it's a Date or Timestamp (keep as-is)
        if (value instanceof Date || value.toDate) {
          sanitized[key] = value;
          continue;
        }
        
        sanitized[key] = this.sanitizeForFirestore(value);
        continue;
      }
      
      // Handle primitive values
      sanitized[key] = value;
    }
    
    return sanitized;
  }
}
