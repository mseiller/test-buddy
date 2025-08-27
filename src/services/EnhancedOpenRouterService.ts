/**
 * Enhanced OpenRouter Service
 * Improved version with comprehensive validation and error handling
 */

import { Question, QuizType } from '@/types';
import { ApiResponseValidator, InputSanitizer, SchemaValidator } from './validation';
import { FirebaseRetry, RetryOptions } from './firebase/FirebaseRetry';
import { FirebaseError, FirebaseErrorCode } from './firebase/FirebaseError';

export interface GenerateQuizOptions {
  questionCount?: number;
  modelOverride?: string;
  isImageBased?: boolean;
  retryOptions?: RetryOptions;
  maxTokens?: number;
  temperature?: number;
}

export class EnhancedOpenRouterService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'qwen/qwen3-235b-a22b:free';
  private static readonly FALLBACK_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
  private static readonly IMAGE_MODEL = 'mistralai/mistral-small-3.2-24b-instruct:free';

  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    timeout: 60000,
  };

  /**
   * Generate quiz with comprehensive validation
   */
  static async generateQuiz(
    text: string,
    quizType: QuizType,
    options: GenerateQuizOptions = {}
  ): Promise<Question[]> {
    // Validate and sanitize input
    const sanitizedText = InputSanitizer.sanitizeExtractedText(text);
    if (!sanitizedText || sanitizedText.length < 50) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Text content is too short or empty for quiz generation'
      );
    }

    const {
      questionCount = 5,
      modelOverride,
      isImageBased = false,
      retryOptions,
      maxTokens,
      temperature = 0.5
    } = options;

    // Validate question count
    if (questionCount < 1 || questionCount > 20) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'Question count must be between 1 and 20'
      );
    }

    // Determine model and max tokens
    const model = modelOverride || (isImageBased ? this.IMAGE_MODEL : this.DEFAULT_MODEL);
    const calculatedMaxTokens = maxTokens || this.calculateMaxTokens(questionCount);

    return FirebaseRetry.execute(
      async () => {
        const response = await this.makeApiRequest(
          sanitizedText,
          quizType,
          questionCount,
          model,
          calculatedMaxTokens,
          temperature
        );

        return this.processApiResponse(response, questionCount);
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      `Generate ${questionCount} ${quizType} questions`
    );
  }

  /**
   * Make API request with timeout and validation
   */
  private static async makeApiRequest(
    text: string,
    quizType: QuizType,
    questionCount: number,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log(`OpenRouter: Making request to ${model} for ${questionCount} ${quizType} questions`);

      const prompt = this.generatePrompt(text, quizType, questionCount);
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'Test Buddy - AI Quiz Generator',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      clearTimeout(timeoutId);

      console.log('OpenRouter: Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter: Error response:', errorText);
        throw new FirebaseError(
          FirebaseErrorCode.NETWORK_ERROR,
          `OpenRouter API error: ${response.status} ${response.statusText}`
        );
      }

      const responseText = await response.text();
      console.log('OpenRouter: Raw response length:', responseText.length);

      if (!responseText || responseText.trim() === '') {
        throw new FirebaseError(
          FirebaseErrorCode.NETWORK_ERROR,
          'Empty response from OpenRouter API'
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `Invalid JSON response from OpenRouter: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof FirebaseError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new FirebaseError(
          FirebaseErrorCode.NETWORK_ERROR,
          'Network error - please check your internet connection'
        );
      }

      throw new FirebaseError(
        FirebaseErrorCode.UNKNOWN_ERROR,
        `Unexpected error during API request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process and validate API response
   */
  private static async processApiResponse(response: any, expectedQuestionCount: number): Promise<Question[]> {
    // Validate OpenRouter response structure
    const responseValidation = ApiResponseValidator.validateOpenRouterResponse(response);
    
    if (!responseValidation.isValid) {
      console.error('OpenRouter response validation failed:', responseValidation.errors);
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `Invalid OpenRouter response: ${responseValidation.errors.join(', ')}`
      );
    }

    // Log warnings
    if (responseValidation.warnings.length > 0) {
      console.warn('OpenRouter response warnings:', responseValidation.warnings);
    }

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        'No content received from OpenRouter API'
      );
    }

    // Log token usage
    if (response.usage) {
      const tokensPerQuestion = response.usage.completion_tokens / expectedQuestionCount;
      console.log(`OpenRouter: Token usage - Total: ${response.usage.total_tokens}, Per question: ${Math.round(tokensPerQuestion)}`);
      
      if (tokensPerQuestion > 200) {
        console.warn(`High token usage per question: ${Math.round(tokensPerQuestion)} tokens`);
      }
    }

    // Validate and parse quiz content
    const contentValidation = ApiResponseValidator.validateQuizContent(content, expectedQuestionCount);
    
    if (!contentValidation.isValid) {
      console.error('Quiz content validation failed:', contentValidation.errors);
      
      // Try fallback model if primary model failed
      if (response.model !== this.FALLBACK_MODEL) {
        console.log('Attempting fallback model...');
        throw new FirebaseError(
          FirebaseErrorCode.VALIDATION_ERROR,
          `Quiz content validation failed: ${contentValidation.errors.join(', ')}. Trying fallback model.`
        );
      }
      
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `Invalid quiz content: ${contentValidation.errors.join(', ')}`
      );
    }

    // Log warnings
    if (contentValidation.warnings.length > 0) {
      console.warn('Quiz content warnings:', contentValidation.warnings);
    }

    const questions = contentValidation.data!;

    // Additional schema validation
    const schemaValidation = SchemaValidator.validateQuestions(questions);
    
    if (!schemaValidation.isValid) {
      console.error('Schema validation failed:', schemaValidation.errors);
      throw new FirebaseError(
        FirebaseErrorCode.VALIDATION_ERROR,
        `Quiz schema validation failed: ${schemaValidation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Log schema warnings
    if (schemaValidation.warnings.length > 0) {
      console.warn('Schema validation warnings:', schemaValidation.warnings);
    }

    // Sanitize questions
    const sanitizedQuestions = questions.map(question => this.sanitizeQuestion(question));

    console.log(`OpenRouter: Successfully generated and validated ${sanitizedQuestions.length} questions`);
    
    return sanitizedQuestions;
  }

  /**
   * Sanitize individual question
   */
  private static sanitizeQuestion(question: Question): Question {
    return {
      ...question,
      id: InputSanitizer.sanitizeText(question.id, { maxLength: 50, allowSpecialChars: false }),
      question: InputSanitizer.sanitizeQuestionText(question.question),
      options: question.options?.map(option => 
        InputSanitizer.sanitizeAnswerText(option)
      ),
      explanation: question.explanation 
        ? InputSanitizer.sanitizeText(question.explanation, { maxLength: 500, allowSpecialChars: true })
        : undefined,
      // correctAnswer and other fields are validated by schema, no sanitization needed
    };
  }

  /**
   * Generate system prompt
   */
  private static getSystemPrompt(): string {
    return `You are Test Buddy, an AI exam generator. Create dynamic practice tests from study material.

Rules:
1. Mix question types: MCQ (4-5 options), MSQ (multiple correct), True/False, Fill-in-blank, Essay
2. Use MSQ ONLY when naturally requiring multiple answers (e.g., "Select all that apply")
3. Vary difficulty: easy recall to complex analysis
4. Provide correct answers and explanations
5. Output ONLY raw JSON array - no markdown, no extra text

Format:
[
  {
    "id": "q1",
    "type": "MCQ",
    "question": "What does CIA stand for in cybersecurity?",
    "options": ["Confidentiality, Integrity, Availability", "..."],
    "correctAnswer": 0,
    "explanation": "CIA refers to the core triad of information security.",
    "points": 1
  }
]

CRITICAL: Respond with ONLY the JSON array. Start with [ and end with ].`;
  }

  /**
   * Generate user prompt
   */
  private static generatePrompt(text: string, quizType: QuizType, questionCount: number): string {
    const typeInstruction = quizType === 'Mixed' 
      ? 'Mix different question types (MCQ, MSQ, True-False, Fill-in-blank, Essay)'
      : `Focus primarily on ${quizType} questions`;

    return `Create ${questionCount} practice questions from this content. ${typeInstruction}.

Content:
${text.substring(0, 8000)} // Limit content to prevent token overflow

Generate exactly ${questionCount} questions in JSON format.`;
  }

  /**
   * Calculate appropriate max tokens based on question count
   */
  private static calculateMaxTokens(questionCount: number): number {
    // Base tokens + tokens per question (estimated)
    const baseTokens = 200;
    const tokensPerQuestion = 150;
    const buffer = 100;
    
    return baseTokens + (questionCount * tokensPerQuestion) + buffer;
  }

  /**
   * Health check for OpenRouter API
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      const testResponse = await this.generateQuiz(
        'This is a test document about basic mathematics. Addition is the process of combining numbers.',
        'MCQ',
        { questionCount: 1, retryOptions: { maxAttempts: 1, timeout: 10000 } }
      );

      if (testResponse && testResponse.length > 0) {
        return { status: 'healthy', details: 'OpenRouter API is responding correctly' };
      } else {
        return { status: 'unhealthy', details: 'OpenRouter API returned empty response' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: `OpenRouter API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}
