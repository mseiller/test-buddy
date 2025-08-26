/**
 * API Response Validation
 * Provides comprehensive validation for external API responses
 */

import { Question, QuizType } from '@/types';

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ApiResponseValidator {
  /**
   * Validate OpenRouter API response structure
   */
  static validateOpenRouterResponse(response: any): ValidationResult<OpenRouterResponse> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!response || typeof response !== 'object') {
      return {
        isValid: false,
        errors: ['Response is null, undefined, or not an object'],
        warnings: []
      };
    }

    // Check for API error in response
    if (response.error) {
      errors.push(`OpenRouter API error: ${response.error.message || 'Unknown error'}`);
    }

    // Validate choices array
    if (!response.choices || !Array.isArray(response.choices)) {
      errors.push('Response missing or invalid choices array');
    } else {
      if (response.choices.length === 0) {
        errors.push('Response choices array is empty');
      } else {
        // Validate first choice (we typically only use the first one)
        const firstChoice = response.choices[0];
        if (!firstChoice || typeof firstChoice !== 'object') {
          errors.push('First choice is invalid');
        } else if (!firstChoice.message || typeof firstChoice.message !== 'object') {
          errors.push('First choice missing message object');
        } else if (!firstChoice.message.content || typeof firstChoice.message.content !== 'string') {
          errors.push('First choice message missing content string');
        }
      }
    }

    // Validate usage information (optional but useful for monitoring)
    if (response.usage) {
      if (typeof response.usage !== 'object') {
        warnings.push('Usage information is not an object');
      } else {
        if (typeof response.usage.total_tokens !== 'number') {
          warnings.push('Usage total_tokens is not a number');
        } else if (response.usage.total_tokens > 10000) {
          warnings.push(`High token usage detected: ${response.usage.total_tokens} tokens`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? response : undefined,
      errors,
      warnings
    };
  }

  /**
   * Validate and parse quiz content from OpenRouter response
   */
  static validateQuizContent(content: string, expectedQuestionCount: number = 5): ValidationResult<Question[]> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        errors: ['Content is null, undefined, or not a string'],
        warnings: []
      };
    }

    // Clean the content - remove markdown blocks and extra whitespace
    let cleanedContent = content.trim();
    
    // Remove markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Check for excessive whitespace
    const whitespaceRatio = (content.length - cleanedContent.length) / content.length;
    if (whitespaceRatio > 0.3) {
      warnings.push(`Content contains ${Math.round(whitespaceRatio * 100)}% whitespace - may indicate token waste`);
    }

    // Try to parse JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      // Try to extract JSON from the content if it's wrapped in other text
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
          warnings.push('JSON was embedded in other text - extracted successfully');
        } catch (secondParseError) {
          return {
            isValid: false,
            errors: [`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`],
            warnings
          };
        }
      } else {
        return {
          isValid: false,
          errors: [`Failed to parse JSON and no JSON array found in content: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`],
          warnings
        };
      }
    }

    // Validate it's an array
    if (!Array.isArray(parsedData)) {
      return {
        isValid: false,
        errors: ['Parsed data is not an array'],
        warnings
      };
    }

    // Check question count
    if (parsedData.length === 0) {
      return {
        isValid: false,
        errors: ['Questions array is empty'],
        warnings
      };
    }

    if (parsedData.length < expectedQuestionCount * 0.5) {
      warnings.push(`Received ${parsedData.length} questions, expected around ${expectedQuestionCount}`);
    }

    // Validate each question
    const validatedQuestions: Question[] = [];
    
    parsedData.forEach((item: any, index: number) => {
      const questionErrors = this.validateQuestionStructure(item, index);
      errors.push(...questionErrors);
      
      if (questionErrors.length === 0) {
        validatedQuestions.push(item as Question);
      }
    });

    // Check for duplicate IDs
    const ids = validatedQuestions.map(q => q.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate question IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      isValid: errors.length === 0 && validatedQuestions.length > 0,
      data: validatedQuestions,
      errors,
      warnings
    };
  }

  /**
   * Validate individual question structure
   */
  private static validateQuestionStructure(question: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Question ${index + 1}:`;

    if (!question || typeof question !== 'object') {
      return [`${prefix} Question is not an object`];
    }

    // Required fields
    if (!question.id || typeof question.id !== 'string') {
      errors.push(`${prefix} Missing or invalid id`);
    }

    if (!question.type || typeof question.type !== 'string') {
      errors.push(`${prefix} Missing or invalid type`);
    } else {
      const validTypes: QuizType[] = ['MCQ', 'Fill-in-the-blank', 'Essay', 'Mixed'];
      if (!validTypes.includes(question.type) && question.type !== 'MSQ' && question.type !== 'True-False') {
        errors.push(`${prefix} Invalid question type: ${question.type}`);
      }
    }

    if (!question.question || typeof question.question !== 'string' || question.question.trim().length === 0) {
      errors.push(`${prefix} Missing or empty question text`);
    }

    if (question.correctAnswer === undefined || question.correctAnswer === null) {
      errors.push(`${prefix} Missing correctAnswer`);
    }

    if (typeof question.points !== 'number' || question.points <= 0) {
      errors.push(`${prefix} Missing or invalid points (must be positive number)`);
    }

    // Type-specific validation
    if (question.type === 'MCQ' || question.type === 'MSQ') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`${prefix} MCQ/MSQ questions must have at least 2 options`);
      } else {
        // Validate options are strings
        question.options.forEach((option: any, optIndex: number) => {
          if (typeof option !== 'string' || option.trim().length === 0) {
            errors.push(`${prefix} Option ${optIndex + 1} is not a valid string`);
          }
        });

        // Validate correctAnswer for MCQ
        if (question.type === 'MCQ') {
          if (typeof question.correctAnswer !== 'number' || 
              question.correctAnswer < 0 || 
              question.correctAnswer >= question.options.length) {
            errors.push(`${prefix} MCQ correctAnswer must be valid option index (0-${question.options.length - 1})`);
          }
        }

        // Validate correctAnswer for MSQ
        if (question.type === 'MSQ') {
          if (!Array.isArray(question.correctAnswer)) {
            errors.push(`${prefix} MSQ correctAnswer must be an array`);
          } else {
            question.correctAnswer.forEach((answer: any) => {
              if (typeof answer !== 'number' || answer < 0 || answer >= question.options.length) {
                errors.push(`${prefix} MSQ correctAnswer contains invalid option index: ${answer}`);
              }
            });
          }

          // Validate selectCount if present
          if (question.selectCount !== undefined) {
            if (typeof question.selectCount !== 'number' || question.selectCount <= 0) {
              errors.push(`${prefix} MSQ selectCount must be a positive number`);
            } else if (question.selectCount > question.options.length) {
              errors.push(`${prefix} MSQ selectCount cannot exceed number of options`);
            }
          }
        }
      }
    }

    // Validate True-False
    if (question.type === 'True-False') {
      if (typeof question.correctAnswer !== 'boolean') {
        errors.push(`${prefix} True-False correctAnswer must be boolean`);
      }
    }

    // Validate Fill-in-the-blank and Essay
    if (question.type === 'Fill-in-the-blank' || question.type === 'Essay') {
      if (typeof question.correctAnswer !== 'string' || question.correctAnswer.trim().length === 0) {
        errors.push(`${prefix} ${question.type} correctAnswer must be a non-empty string`);
      }
    }

    // Validate explanation (optional but recommended)
    if (question.explanation && (typeof question.explanation !== 'string' || question.explanation.trim().length === 0)) {
      errors.push(`${prefix} Explanation must be a non-empty string if provided`);
    }

    return errors;
  }

  /**
   * Validate image OCR API response
   */
  static validateImageOcrResponse(response: any): ValidationResult<string> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!response || typeof response !== 'object') {
      return {
        isValid: false,
        errors: ['Response is null, undefined, or not an object'],
        warnings: []
      };
    }

    // Check for error in response
    if (response.error) {
      errors.push(`OCR API error: ${response.error}`);
    }

    // Validate text content
    if (!response.text || typeof response.text !== 'string') {
      errors.push('Response missing text field or text is not a string');
    } else {
      if (response.text.trim().length === 0) {
        warnings.push('Extracted text is empty - image may not contain readable text');
      } else if (response.text.length < 10) {
        warnings.push('Extracted text is very short - image may have limited readable content');
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? response.text : undefined,
      errors,
      warnings
    };
  }

  /**
   * Validate file processing response
   */
  static validateFileProcessingResponse(response: any, fileName: string): ValidationResult<string> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!response || typeof response !== 'object') {
      return {
        isValid: false,
        errors: ['File processing response is null, undefined, or not an object'],
        warnings: []
      };
    }

    // Check for error
    if (response.error) {
      errors.push(`File processing error for ${fileName}: ${response.error}`);
    }

    // Validate extracted text
    if (!response.text || typeof response.text !== 'string') {
      errors.push(`No text extracted from ${fileName}`);
    } else {
      const textLength = response.text.trim().length;
      if (textLength === 0) {
        errors.push(`No readable text found in ${fileName}`);
      } else if (textLength < 50) {
        warnings.push(`Very little text extracted from ${fileName} (${textLength} characters)`);
      } else if (textLength > 100000) {
        warnings.push(`Large amount of text extracted from ${fileName} (${textLength} characters) - may impact processing`);
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? response.text : undefined,
      errors,
      warnings
    };
  }
}
