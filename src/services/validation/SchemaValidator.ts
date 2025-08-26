/**
 * JSON Schema Validation
 * Provides schema-based validation for complex data structures
 */

import { Question, UserAnswer, TestHistory, QuizType } from '@/types';

export interface ValidationSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: ValidationSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: Array<{
    path: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    path: string;
    message: string;
    value?: any;
  }>;
}

export class SchemaValidator {
  /**
   * Question schema definition
   */
  static readonly QUESTION_SCHEMA: ValidationSchema = {
    type: 'object',
    required: ['id', 'type', 'question', 'correctAnswer', 'points'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      type: {
        type: 'string',
        enum: ['MCQ', 'MSQ', 'True-False', 'Fill-in-the-blank', 'Essay']
      },
      question: {
        type: 'string',
        minLength: 5,
        maxLength: 1000
      },
      options: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 200
        },
        minimum: 2,
        maximum: 10
      },
      correctAnswer: {
        // Can be string, number, boolean, or array of numbers
      },
      explanation: {
        type: 'string',
        maxLength: 500
      },
      points: {
        type: 'number',
        minimum: 0.1,
        maximum: 100
      },
      selectCount: {
        type: 'number',
        minimum: 1,
        maximum: 10
      }
    }
  };

  /**
   * User Answer schema definition
   */
  static readonly USER_ANSWER_SCHEMA: ValidationSchema = {
    type: 'object',
    required: ['questionId', 'answer', 'isCorrect'],
    properties: {
      questionId: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      answer: {
        // Can be string, number, boolean, or array of numbers
      },
      isCorrect: {
        type: 'boolean'
      },
      timeSpent: {
        type: 'number',
        minimum: 0
      },
      markedForReview: {
        type: 'boolean'
      }
    }
  };

  /**
   * Test History schema definition
   */
  static readonly TEST_HISTORY_SCHEMA: ValidationSchema = {
    type: 'object',
    required: [
      'userId', 'testName', 'fileName', 'fileType', 
      'extractedText', 'quizType', 'questions', 'answers', 
      'score', 'createdAt'
    ],
    properties: {
      id: {
        type: 'string',
        minLength: 1
      },
      userId: {
        type: 'string',
        minLength: 1,
        maxLength: 128
      },
      testName: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      fileName: {
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      fileType: {
        type: 'string',
        enum: ['txt', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
      },
      extractedText: {
        type: 'string',
        minLength: 10,
        maxLength: 500000
      },
      quizType: {
        type: 'string',
        enum: ['MCQ', 'Fill-in-the-blank', 'Essay', 'Mixed']
      },
      questions: {
        type: 'array',
        items: this.QUESTION_SCHEMA,
        minimum: 1,
        maximum: 50
      },
      answers: {
        type: 'array',
        items: this.USER_ANSWER_SCHEMA,
        minimum: 1,
        maximum: 50
      },
      score: {
        type: 'number',
        minimum: 0,
        maximum: 100
      },
      createdAt: {
        // Date object or ISO string
      },
      completedAt: {
        // Date object or ISO string
      },
      folderId: {
        type: 'string',
        minLength: 1
      }
    }
  };

  /**
   * Validate data against a schema
   */
  static validate(data: any, schema: ValidationSchema, path: string = ''): SchemaValidationResult {
    const errors: Array<{ path: string; message: string; value?: any }> = [];
    const warnings: Array<{ path: string; message: string; value?: any }> = [];

    this.validateRecursive(data, schema, path, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate question data
   */
  static validateQuestion(question: any): SchemaValidationResult {
    const result = this.validate(question, this.QUESTION_SCHEMA, 'question');

    // Additional custom validation for questions
    if (question && typeof question === 'object') {
      // Type-specific validation
      if (question.type === 'MCQ' || question.type === 'MSQ') {
        if (!Array.isArray(question.options) || question.options.length < 2) {
          result.errors.push({
            path: 'question.options',
            message: 'MCQ and MSQ questions must have at least 2 options',
            value: question.options
          });
        }

        if (question.type === 'MCQ') {
          if (typeof question.correctAnswer !== 'number' || 
              question.correctAnswer < 0 || 
              (question.options && question.correctAnswer >= question.options.length)) {
            result.errors.push({
              path: 'question.correctAnswer',
              message: 'MCQ correctAnswer must be a valid option index',
              value: question.correctAnswer
            });
          }
        }

        if (question.type === 'MSQ') {
          if (!Array.isArray(question.correctAnswer)) {
            result.errors.push({
              path: 'question.correctAnswer',
              message: 'MSQ correctAnswer must be an array',
              value: question.correctAnswer
            });
          } else {
            question.correctAnswer.forEach((answer: any, index: number) => {
              if (typeof answer !== 'number' || 
                  answer < 0 || 
                  (question.options && answer >= question.options.length)) {
                result.errors.push({
                  path: `question.correctAnswer[${index}]`,
                  message: 'MSQ correctAnswer must contain valid option indices',
                  value: answer
                });
              }
            });
          }

          if (question.selectCount && question.correctAnswer) {
            if (question.selectCount !== question.correctAnswer.length) {
              result.warnings.push({
                path: 'question.selectCount',
                message: 'selectCount does not match number of correct answers',
                value: question.selectCount
              });
            }
          }
        }
      }

      if (question.type === 'True-False') {
        if (typeof question.correctAnswer !== 'boolean') {
          result.errors.push({
            path: 'question.correctAnswer',
            message: 'True-False correctAnswer must be boolean',
            value: question.correctAnswer
          });
        }
      }

      if (question.type === 'Fill-in-the-blank' || question.type === 'Essay') {
        if (typeof question.correctAnswer !== 'string' || !question.correctAnswer.trim()) {
          result.errors.push({
            path: 'question.correctAnswer',
            message: `${question.type} correctAnswer must be a non-empty string`,
            value: question.correctAnswer
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate array of questions
   */
  static validateQuestions(questions: any[]): SchemaValidationResult {
    const allErrors: Array<{ path: string; message: string; value?: any }> = [];
    const allWarnings: Array<{ path: string; message: string; value?: any }> = [];

    if (!Array.isArray(questions)) {
      return {
        isValid: false,
        errors: [{ path: 'questions', message: 'Questions must be an array' }],
        warnings: []
      };
    }

    if (questions.length === 0) {
      return {
        isValid: false,
        errors: [{ path: 'questions', message: 'Questions array cannot be empty' }],
        warnings: []
      };
    }

    // Validate each question
    questions.forEach((question, index) => {
      const result = this.validateQuestion(question);
      
      // Prefix paths with array index
      result.errors.forEach(error => {
        allErrors.push({
          ...error,
          path: `questions[${index}].${error.path.replace('question.', '')}`
        });
      });

      result.warnings.forEach(warning => {
        allWarnings.push({
          ...warning,
          path: `questions[${index}].${warning.path.replace('question.', '')}`
        });
      });
    });

    // Check for duplicate IDs
    const ids = questions.map((q, index) => ({ id: q?.id, index })).filter(item => item.id);
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();

    ids.forEach(({ id, index }) => {
      if (seenIds.has(id)) {
        duplicateIds.add(id);
      } else {
        seenIds.add(id);
      }
    });

    duplicateIds.forEach(id => {
      allErrors.push({
        path: 'questions',
        message: `Duplicate question ID found: ${id}`,
        value: id
      });
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Validate user answer
   */
  static validateUserAnswer(answer: any): SchemaValidationResult {
    return this.validate(answer, this.USER_ANSWER_SCHEMA, 'answer');
  }

  /**
   * Validate test history
   */
  static validateTestHistory(testHistory: any): SchemaValidationResult {
    const result = this.validate(testHistory, this.TEST_HISTORY_SCHEMA, 'testHistory');

    // Additional validation
    if (testHistory && typeof testHistory === 'object') {
      // Validate questions and answers arrays match
      if (testHistory.questions && testHistory.answers) {
        if (testHistory.questions.length !== testHistory.answers.length) {
          result.errors.push({
            path: 'testHistory',
            message: 'Questions and answers arrays must have the same length',
            value: { 
              questionsLength: testHistory.questions.length, 
              answersLength: testHistory.answers.length 
            }
          });
        }

        // Validate that each answer has a corresponding question
        testHistory.answers.forEach((answer: any, index: number) => {
          if (answer?.questionId) {
            const hasMatchingQuestion = testHistory.questions.some((q: any) => q?.id === answer.questionId);
            if (!hasMatchingQuestion) {
              result.errors.push({
                path: `testHistory.answers[${index}].questionId`,
                message: 'Answer references non-existent question ID',
                value: answer.questionId
              });
            }
          }
        });
      }

      // Validate score makes sense
      if (typeof testHistory.score === 'number' && testHistory.answers) {
        const correctAnswers = testHistory.answers.filter((a: any) => a?.isCorrect).length;
        const totalQuestions = testHistory.answers.length;
        const calculatedScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        if (Math.abs(testHistory.score - calculatedScore) > 5) { // Allow 5% tolerance
          result.warnings.push({
            path: 'testHistory.score',
            message: `Score (${testHistory.score}%) does not match calculated score (${calculatedScore}%)`,
            value: { recorded: testHistory.score, calculated: calculatedScore }
          });
        }
      }
    }

    return result;
  }

  /**
   * Recursive validation helper
   */
  private static validateRecursive(
    data: any,
    schema: ValidationSchema,
    path: string,
    errors: Array<{ path: string; message: string; value?: any }>,
    warnings: Array<{ path: string; message: string; value?: any }>
  ): void {
    // Check required fields
    if (schema.required && typeof data === 'object' && data !== null) {
      schema.required.forEach(field => {
        if (!(field in data) || data[field] === undefined) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: `Required field '${field}' is missing`,
            value: undefined
          });
        }
      });
    }

    // Type validation
    if (schema.type && data !== null && data !== undefined) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      
      if (schema.type !== actualType) {
        errors.push({
          path,
          message: `Expected type '${schema.type}' but got '${actualType}'`,
          value: data
        });
        return; // Skip further validation if type is wrong
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value: data
      });
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength && data.length < schema.minLength) {
        errors.push({
          path,
          message: `String length (${data.length}) is less than minimum (${schema.minLength})`,
          value: data
        });
      }

      if (schema.maxLength && data.length > schema.maxLength) {
        errors.push({
          path,
          message: `String length (${data.length}) exceeds maximum (${schema.maxLength})`,
          value: data
        });
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push({
            path,
            message: `String does not match required pattern: ${schema.pattern}`,
            value: data
          });
        }
      }
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path,
          message: `Value (${data}) is less than minimum (${schema.minimum})`,
          value: data
        });
      }

      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path,
          message: `Value (${data}) exceeds maximum (${schema.maximum})`,
          value: data
        });
      }
    }

    // Array validations
    if (Array.isArray(data)) {
      if (schema.minimum !== undefined && data.length < schema.minimum) {
        errors.push({
          path,
          message: `Array length (${data.length}) is less than minimum (${schema.minimum})`,
          value: data.length
        });
      }

      if (schema.maximum !== undefined && data.length > schema.maximum) {
        errors.push({
          path,
          message: `Array length (${data.length}) exceeds maximum (${schema.maximum})`,
          value: data.length
        });
      }

      // Validate array items
      if (schema.items) {
        data.forEach((item, index) => {
          this.validateRecursive(
            item,
            schema.items!,
            path ? `${path}[${index}]` : `[${index}]`,
            errors,
            warnings
          );
        });
      }
    }

    // Object property validations
    if (schema.properties && typeof data === 'object' && data !== null) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key in data) {
          this.validateRecursive(
            data[key],
            propSchema,
            path ? `${path}.${key}` : key,
            errors,
            warnings
          );
        }
      });
    }
  }
}
