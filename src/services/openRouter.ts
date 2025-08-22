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

    // Adjust token limits with the new high-capacity model
    let maxTokens = 16000; // Start with 16k as requested
    let adjustedQuestionCount = questionCount;
    
    if (questionCount > 50) {
      console.warn(`OpenRouter: Requested ${questionCount} questions, but the free model works best with 50 or fewer questions. Adjusting to 50.`);
      adjustedQuestionCount = 50;
      maxTokens = 10000; // Slightly higher for Llama model
    } else if (questionCount > 25) {
      maxTokens = 8000;  // Increased for better generation
    } else if (questionCount > 15) {
      maxTokens = 6000;  // Increased
    } else {
      maxTokens = 4000;  // Increased
    }

    const prompt = this.createPrompt(text, quizType, adjustedQuestionCount);

    // Use the meta-llama/llama-3.2-3b-instruct:free model
    const model = 'meta-llama/llama-3.2-3b-instruct:free';
    
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
              content: `You are Test Buddy, an AI exam generator. 
Your job is to create dynamic practice tests from the provided study material. 

Rules:
1. Mix up question types:
   - Multiple choice (4–5 options, with 1 correct answer).
   - True/False.
   - Fill-in-the-blank (with short answers).
   - Short essay/analysis questions.
   - Scenario-based questions (give a situation and ask what the learner should do).

2. Always shuffle structure:
   - Rephrase questions instead of repeating text directly.
   - Vary difficulty: some questions easy recall, some requiring analysis.
   - If possible, combine multiple concepts into one question.

3. Provide correct answers and short explanations for each.

4. Keep output JSON structured for easy parsing as an array:
[
  {
    "id": "q1",
    "type": "MCQ",
    "question": "What does CIA in cybersecurity stand for?",
    "options": ["Confidentiality, Integrity, Availability", "Control, Identity, Access", "Confidential, Internal, Audit", "Cybersecurity, Integrity, Authentication"],
    "correctAnswer": 0,
    "explanation": "CIA refers to the core triad of information security.",
    "points": 1
  },
  {
    "id": "q2", 
    "type": "Essay",
    "question": "A company's database was accidentally exposed. Analyze which principle of CIA is most impacted and propose three remediation steps.",
    "correctAnswer": "Confidentiality is most impacted. Steps: 1) Immediate containment, 2) Impact assessment, 3) Notification procedures",
    "explanation": "Unauthorized access affects confidentiality. Quick response minimizes damage.",
    "points": 1
  }
]

5. Be creative but accurate. The goal is to challenge the learner and prevent rote memorization.

CRITICAL: Respond with ONLY raw JSON array. Do NOT wrap in markdown code blocks. Do NOT include any text before or after the JSON. Start directly with [ and end with ]. Ensure all JSON is properly formatted with correct syntax.`
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
      console.log('OpenRouter: Full response data:', data);
      
      // Check for API errors in response
      if (data.error) {
        console.error('OpenRouter: API returned error:', data.error);
        throw new Error(`OpenRouter API error: ${data.error.message || data.error}`);
      }
      
      const content = data.choices[0]?.message?.content;
      console.log('OpenRouter: Content from API:', content ? `${content.length} characters` : 'NO CONTENT');

      if (!content || content.trim() === '') {
        console.error('OpenRouter: No content in response data:', data);
        throw new Error('No content received from OpenRouter API - possible timeout or generation limit exceeded');
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
    let typeInstruction = '';
    
    switch (quizType) {
      case 'MCQ':
        typeInstruction = 'IMPORTANT: Create ONLY multiple choice questions with exactly 4-5 options each. Do NOT create any other question types.';
        break;
      case 'Fill-in-the-blank':
        typeInstruction = 'IMPORTANT: Create ONLY fill-in-the-blank questions with clear, concise answers. Do NOT create any other question types.';
        break;
      case 'Essay':
        typeInstruction = 'IMPORTANT: Create ONLY essay questions that require analysis and critical thinking. Do NOT create any other question types.';
        break;
      case 'Mixed':
        typeInstruction = 'Create a balanced mix of question types: multiple choice, true/false, fill-in-the-blank, and essay questions. Vary the difficulty levels.';
        break;
      default:
        typeInstruction = 'Create a variety of question types appropriate for the content.';
    }

    return `Generate exactly ${questionCount} dynamic practice questions from this study material.

${typeInstruction}

Study Material:
${text.substring(0, 8000)}${text.length > 8000 ? '\n\n[Content truncated for length - focus on key concepts covered above]' : ''}

Requirements:
- Create ${questionCount} questions that test deep understanding, not just memorization
- Rephrase concepts rather than copying text directly
- Include scenario-based questions where appropriate
- Vary difficulty from basic recall to analysis
- Combine multiple concepts when possible
- Provide clear explanations for all answers`;
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
      
      // Check for common issues
      if (error instanceof SyntaxError) {
        if (error.message.includes('Unexpected end of JSON input')) {
          console.error('OpenRouter: JSON was truncated - likely due to token limit or timeout');
        } else if (error.message.includes('Unexpected token')) {
          console.error('OpenRouter: JSON syntax error - AI may have added extra text');
        }
      }
      
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
          model: 'meta-llama/llama-3.2-3b-instruct:free', // Use new free model for validation
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