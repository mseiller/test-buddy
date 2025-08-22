import { Question, QuizType } from '@/types';

export class OpenRouterService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  static async generateQuiz(
    text: string,
    quizType: QuizType,
    questionCount: number = 5
  ): Promise<Question[]> {
    if (!this.API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    // Adjust token limits and warn about question count limits
    let maxTokens = 8000;
    let adjustedQuestionCount = questionCount;
    
    if (questionCount > 40) {
      console.warn(`OpenRouter: Requested ${questionCount} questions, but free model is limited to ~40 questions. Adjusting to 40.`);
      adjustedQuestionCount = 40;
      maxTokens = 8000;
    } else if (questionCount > 25) {
      maxTokens = 8000;
    } else if (questionCount > 10) {
      maxTokens = 6000;
    } else {
      maxTokens = 4000;
    }

    const prompt = this.createPrompt(text, quizType, adjustedQuestionCount);

    // Use the free gpt-oss-20b:free model for all question counts
    const model = 'gpt-oss-20b:free';
    
    console.log('OpenRouter: Starting API request to:', this.API_URL);
    console.log('OpenRouter: API Key configured:', !!this.API_KEY);
    console.log('OpenRouter: Selected model:', model, 'for', adjustedQuestionCount, 'questions', adjustedQuestionCount !== questionCount ? `(reduced from ${questionCount})` : '');
    console.log('OpenRouter: Max tokens:', maxTokens);
    console.log('OpenRouter: Request payload size:', JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: '...' },
        { role: 'user', content: prompt.substring(0, 100) + '...' }
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
    }).length, 'characters');
    
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'Test Buddy Quiz Generator',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert quiz generator. Generate high-quality questions based on the provided content. CRITICAL: Respond with ONLY raw JSON array. Do NOT wrap in markdown code blocks (```json). Do NOT include any text before or after the JSON. Start directly with [ and end with ]. Ensure all JSON is properly formatted with correct syntax.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: maxTokens,
        }),
      });

      console.log('OpenRouter: Response status:', response.status, response.statusText);
      console.log('OpenRouter: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter: Error response body:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OpenRouter: Response data structure:', Object.keys(data));
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('OpenRouter: No content in response data:', data);
        throw new Error('No content received from OpenRouter API');
      }

      console.log('OpenRouter: Content received, length:', content.length);
      return this.parseQuizResponse(content);
    } catch (error) {
      console.error('OpenRouter: Detailed error information:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('OpenRouter: Network error - this usually means:');
        console.error('1. No internet connection');
        console.error('2. CORS issue');
        console.error('3. API endpoint is down');
        console.error('4. Request timeout');
      }
      throw new Error(`Failed to generate quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static createPrompt(text: string, quizType: QuizType, questionCount: number): string {
    const basePrompt = `Based on the following text content, generate ${questionCount} ${quizType === 'Mixed' ? 'mixed-type' : quizType} questions.

Content:
${text.substring(0, 6000)} ${text.length > 6000 ? '...' : ''}

Requirements:
- Generate exactly ${questionCount} questions
- Each question should test understanding of the content
- Include explanations for answers
- For larger question counts (15+), ensure variety in topics covered
- Format the response as a JSON array with the following structure:

[
  {
    "id": "q1",
    "type": "MCQ" | "Fill-in-the-blank" | "Essay",
    "question": "Question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Only for MCQ
    "correctAnswer": 0 | "answer text", // Index for MCQ, text for Fill-in-the-blank
    "explanation": "Explanation of the answer",
    "points": 1
  }
]

`;

    switch (quizType) {
      case 'MCQ':
        return basePrompt + `
- All questions should be multiple choice with 4 options each
- correctAnswer should be the index (0-3) of the correct option
- Make questions challenging but fair`;

      case 'Fill-in-the-blank':
        return basePrompt + `
- All questions should be fill-in-the-blank format
- Use underscores or brackets to indicate blanks: "The capital of France is _____"
- correctAnswer should be the exact text that fills the blank
- Accept reasonable variations in your explanations`;

      case 'Essay':
        return basePrompt + `
- All questions should be essay questions requiring detailed answers
- Questions should encourage critical thinking and analysis
- No correctAnswer field needed for essay questions
- Focus on "why" and "how" questions`;

      case 'Mixed':
        return basePrompt + `
- Mix different question types (MCQ, Fill-in-the-blank, Essay)
- Distribute evenly across question types
- Vary the difficulty levels
- Ensure good coverage of the content`;

      default:
        return basePrompt;
    }
  }

  private static parseQuizResponse(content: string): Question[] {
    try {
      console.log('OpenRouter: Starting JSON parsing of response...');
      console.log('OpenRouter: Content length:', content.length);
      
      // Clean the content to extract JSON - try multiple approaches
      let jsonString = '';
      
      // First, try to extract JSON from markdown code blocks
      const markdownMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (markdownMatch) {
        jsonString = markdownMatch[1];
        console.log('OpenRouter: Found JSON in markdown code block');
      } else {
        // Try to find JSON array in the content
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('OpenRouter: Found JSON array in content');
        } else {
          // If no array found, try to find JSON object and wrap it
          const objectMatch = content.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            jsonString = `[${objectMatch[0]}]`;
            console.log('OpenRouter: Found JSON object, wrapped in array');
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // Try to fix common JSON issues
      console.log('OpenRouter: Cleaning JSON string...');
      jsonString = jsonString
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
        .replace(/\\"/g, '"') // Fix escaped quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\\t/g, ' ') // Replace tabs with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/```json\s*/g, '') // Remove any remaining markdown
        .replace(/```\s*/g, '') // Remove any remaining markdown
        .trim();

      // Additional JSON fixes for common AI mistakes
      jsonString = jsonString
        .replace(/([^\\])"/g, '$1"') // Fix unescaped quotes (but not escaped ones)
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas before } or ]
        .replace(/([a-zA-Z0-9])\s*:\s*"/g, '$1": "') // Fix spacing around colons
        .replace(/"\s*,\s*([a-zA-Z0-9])/g, '", "$1') // Fix spacing around commas
        .replace(/\n/g, ' ') // Remove all newlines
        .replace(/\r/g, ' ') // Remove carriage returns
        .replace(/\t/g, ' ') // Remove tabs
        .replace(/\s+/g, ' ') // Normalize all whitespace
        .trim();

      console.log('OpenRouter: Attempting to parse cleaned JSON...');
      console.log('OpenRouter: JSON preview (first 300 chars):', jsonString.substring(0, 300) + '...');
      
      const questions = JSON.parse(jsonString);
      
      // Ensure questions is an array
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array of questions');
      }
      
      console.log('OpenRouter: Successfully parsed JSON, found', questions.length, 'questions');
      
      // Validate and format questions
      return questions.map((q: any, index: number) => {
        if (!q || typeof q !== 'object') {
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        return {
          id: q.id || `q${index + 1}`,
          type: q.type || 'MCQ',
          question: q.question || `Question ${index + 1}`,
          options: q.options || undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'No explanation provided',
          points: q.points || 1,
        };
      });
    } catch (error) {
      console.error('OpenRouter: Failed to parse quiz response:', error);
      console.error('OpenRouter: Raw content (first 1000 chars):', content.substring(0, 1000) + '...');
      
      // Try to extract partial JSON if possible
      try {
        console.log('OpenRouter: Attempting to extract partial JSON...');
        
        // Look for complete question objects in the content
        const questionMatches = content.match(/\{[^}]*"id"[^}]*"type"[^}]*"question"[^}]*\}/g);
        
        if (questionMatches && questionMatches.length > 0) {
          console.log('OpenRouter: Found', questionMatches.length, 'potential question objects');
          
          const validQuestions = [];
          
          for (let i = 0; i < questionMatches.length; i++) {
            try {
              const questionJson = questionMatches[i];
              console.log('OpenRouter: Attempting to parse question', i + 1, ':', questionJson.substring(0, 100) + '...');
              
              // Clean the question JSON
              let cleanedQuestion = questionJson
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/\n/g, ' ')
                .replace(/\r/g, ' ')
                .replace(/\t/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              // Try to complete the JSON if it's cut off
              if (!cleanedQuestion.endsWith('}')) {
                // Find the last complete property
                const lastCompleteMatch = cleanedQuestion.match(/"[^"]*"\s*:\s*"[^"]*"$/);
                if (lastCompleteMatch) {
                  cleanedQuestion += '}';
                }
              }
              
              const question = JSON.parse(cleanedQuestion);
              
              // Validate the question has required fields
              if (question.id && question.type && question.question) {
                validQuestions.push({
                  id: question.id,
                  type: question.type,
                  question: question.question,
                  options: question.options || undefined,
                  correctAnswer: question.correctAnswer,
                  explanation: question.explanation || 'No explanation provided',
                  points: question.points || 1,
                });
                console.log('OpenRouter: Successfully parsed question', i + 1);
              }
            } catch (questionError) {
              console.error('OpenRouter: Failed to parse question', i + 1, ':', questionError);
              // Continue with next question
            }
          }
          
          if (validQuestions.length > 0) {
            console.log('OpenRouter: Successfully extracted', validQuestions.length, 'valid questions from partial JSON');
            return validQuestions;
          }
        }
        
        // Fallback: try to find any JSON array structure
        const partialMatch = content.match(/\[[\s\S]*?\]/);
        if (partialMatch) {
          const partialJson = partialMatch[0];
          console.log('OpenRouter: Found partial JSON array, attempting to fix...');
          
          // Try to fix the partial JSON
          const fixedJson = partialJson
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const questions = JSON.parse(fixedJson);
          if (Array.isArray(questions) && questions.length > 0) {
            console.log('OpenRouter: Successfully parsed partial JSON with', questions.length, 'questions');
            return questions.map((q: any, index: number) => ({
              id: q.id || `q${index + 1}`,
              type: q.type || 'MCQ',
              question: q.question || `Question ${index + 1}`,
              options: q.options || undefined,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || 'No explanation provided',
              points: q.points || 1,
            }));
          }
        }
      } catch (partialError) {
        console.error('OpenRouter: Partial JSON parsing also failed:', partialError);
      }
      
      // Return a fallback question if all parsing fails
      return [{
        id: 'q1',
        type: 'MCQ',
        question: 'There was an issue generating questions. Please try again with a different document or quiz type.',
        options: ['Try again', 'Use a different document', 'Change quiz type', 'Contact support'],
        correctAnswer: 0,
        explanation: 'The AI service encountered an error while generating questions. Please try again.',
        points: 1,
      }];
    }
  }

  static async validateApiKey(): Promise<boolean> {
    if (!this.API_KEY) return false;

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-oss-20b:free', // Use free model for validation
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
} 