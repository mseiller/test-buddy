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

    const prompt = this.createPrompt(text, quizType, questionCount);

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
          model: 'gpt-oss-20b',
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
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenRouter API');
      }

      return this.parseQuizResponse(content);
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to generate quiz questions');
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
      // Clean the content to extract JSON - try multiple approaches
      let jsonString = '';
      
      // First, try to extract JSON from markdown code blocks
      const markdownMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (markdownMatch) {
        jsonString = markdownMatch[1];
      } else {
        // Try to find JSON array in the content
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        } else {
          // If no array found, try to find JSON object and wrap it
          const objectMatch = content.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            jsonString = `[${objectMatch[0]}]`;
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // Try to fix common JSON issues
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

      console.log('Attempting to parse JSON:', jsonString.substring(0, 200) + '...');
      
      const questions = JSON.parse(jsonString);
      
      // Ensure questions is an array
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array of questions');
      }
      
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
      console.error('Failed to parse quiz response:', error);
      console.error('Raw content:', content.substring(0, 500) + '...');
      
      // Return a fallback question if parsing fails
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
          model: 'gpt-oss-20b',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
} 