import { Question, QuizType, UserAnswer, FeedbackSummary } from '@/types';

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
    
    if (questionCount > 100) {
      console.warn(`OpenRouter: Requested ${questionCount} questions, but capping at 100 for optimal performance.`);
      adjustedQuestionCount = 100;
      maxTokens = 32000; // High limit for 131k context model
    } else if (questionCount > 75) {
      maxTokens = 28000;
    } else if (questionCount > 50) {
      maxTokens = 24000;
    } else if (questionCount > 25) {
      maxTokens = 20000;
    } else {
      maxTokens = 16000;
    }

    const prompt = this.createPrompt(text, quizType, adjustedQuestionCount);

    // Use the qwen/qwen3-235b-a22b:free model with 131k context
    const model = 'qwen/qwen3-235b-a22b:free';
    
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
          model: 'qwen/qwen3-235b-a22b:free', // Use new free model for validation
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 100,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  static feedbackSystemPrompt(): string {
    return `You are Test Buddy, an AI learning coach. You will receive:
- the quiz name,
- overall score,
- the list of questions with the user's answers, correctness, correct answers, and explanations.

Your job:
1) Identify the top 3–6 "Focus Areas" the learner should work on, combining similar mistakes under one topic.
2) For each Focus Area, explain WHY it matters using the learner's own mistakes (be specific but concise).
3) Give 2–4 practical "Study Actions" for each Focus Area (actionable, 1–2 lines each).
4) Keep it encouraging and concrete. No fluff.

CRITICAL: You must respond with ONLY valid JSON. Do not include any text before or after the JSON. Do not use code fences, markdown, or <think> tags. Do not include explanatory text or reasoning.

Your response must start with { and end with }. Nothing else.

Output strictly in this JSON schema:

{
  "overall_assessment": "1–3 sentence summary of performance and trends.",
  "strengths": ["short bullet", "short bullet"],
  "focus_areas": [
    {
      "topic": "short topic name",
      "why": "1–2 sentence reason grounded in the user's errors",
      "examples": ["quote or paraphrase 1 user mistake", "another if helpful"],
      "study_actions": ["action 1", "action 2", "action 3"]
    }
  ],
  "suggested_next_quiz": {
    "difficulty": "easy|mixed|hard (pick one)",
    "question_mix": ["multiple_choice","fill_blank","true_false","scenario"],
    "target_topics": ["topic1","topic2"]
  }
}

If the context is insufficient, say so in "overall_assessment" and leave arrays empty.
Never invent facts not in the provided context.
Remember: ONLY return the JSON object, nothing else.`;
  }

  // Build a compact, token-friendly context
  private static buildFeedbackContext(
    testName: string,
    score: number,
    questions: Question[],
    answers: UserAnswer[]
  ): string {
    const lines: string[] = [];
    lines.push(`Test: ${testName}`);
    lines.push(`Score: ${score}%`);
    lines.push(`Questions (${questions.length}):`);
    
    // Helper to clamp and clean strings
    const clamp = (s: any, n: number) => (s ?? '').toString().replace(/\s+/g, ' ').slice(0, n);
    
    questions.forEach((q, i) => {
      const ua = answers[i];
      const correct = ua?.isCorrect ? 'correct' : 'incorrect';
      
      // More compact format to reduce truncation risk
      lines.push(
        `#${i+1} [${q.type}] ${correct}\n` +
        `Q: ${clamp(q.question, 180)}\n` +
        `User: ${clamp(ua?.answer, 120)}\n` +
        `Correct: ${clamp(q.correctAnswer, 120)}\n` +
        `Why: ${clamp(q.explanation, 160)}`
      );
    });
    
    return lines.join('\n');
  }

  private static stripReasoningAndFences(text: string): string {
    // Remove <think> blocks
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Remove code fences
    text = text.replace(/```[\s\S]*?```/g, '');
    return text.trim();
  }

  private static extractBalancedJson(text: string): string | null {
    // Find first '{' then walk to matching '}' with string-awareness
    const s = text;
    const start = s.indexOf('{');
    if (start < 0) return null;

    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return s.slice(start, i + 1);
        }
      }
    }
    return null; // likely truncated
  }

  private static tryJsonRepair(text: string): string {
    // Minimal "repair": remove trailing commas and fix common truncations
    return text
      .replace(/,\s*([}\]])/g, '$1')   // trailing commas
      .replace(/[\u0000-\u001f]/g, ''); // stray control chars
  }

  private static safeParseFeedbackJSON(text: string): FeedbackSummary {
    console.log('OpenRouter: Raw feedback response:', text.substring(0, 300) + '...');
    
    let cleaned = this.stripReasoningAndFences(text);
    console.log('OpenRouter: After cleaning reasoning/fences:', cleaned.substring(0, 200) + '...');
    
    let jsonString = this.extractBalancedJson(cleaned);

    if (!jsonString) {
      console.warn('OpenRouter: No balanced JSON found, trying repair...');
      // try aggressive cleaning
      cleaned = this.tryJsonRepair(cleaned);
      jsonString = this.extractBalancedJson(cleaned);
    }
    
    if (!jsonString) {
      console.warn('OpenRouter: Still no JSON found, using text as fallback');
      // final fallback: treat whole string as summary to avoid hard failure
      return {
        overall_assessment: cleaned.slice(0, 500) || 'Unable to generate detailed feedback at this time.',
        strengths: [],
        focus_areas: [],
        suggested_next_quiz: { 
          difficulty: 'mixed', 
          question_mix: ['multiple_choice','scenario'], 
          target_topics: [] 
        }
      };
    }

    console.log('OpenRouter: Extracted JSON string:', jsonString.substring(0, 200) + '...');

    try {
      const parsed = JSON.parse(jsonString);
      console.log('OpenRouter: Successfully parsed feedback JSON');
      return parsed;
    } catch (error) {
      console.warn('OpenRouter: JSON parse failed, trying repair...', error);
      const repaired = this.tryJsonRepair(jsonString);
      try {
        const parsed = JSON.parse(repaired);
        console.log('OpenRouter: Successfully parsed repaired JSON');
        return parsed;
      } catch (repairError) {
        console.error('OpenRouter: All JSON parsing attempts failed:', repairError);
        // Return graceful fallback
        return {
          overall_assessment: 'Unable to generate detailed feedback due to parsing issues. Please try regenerating.',
          strengths: [],
          focus_areas: [],
          suggested_next_quiz: { 
            difficulty: 'mixed', 
            question_mix: ['multiple_choice','scenario'], 
            target_topics: [] 
          }
        };
      }
    }
  }

  static async generateFeedbackSummary(
    testName: string,
    score: number,
    questions: Question[],
    answers: UserAnswer[]
  ): Promise<FeedbackSummary> {
    if (!this.API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    const system = this.feedbackSystemPrompt();
    const user = this.buildFeedbackContext(testName, score, questions, answers);

    console.log('OpenRouter: Generating feedback summary for:', testName);
    console.log('OpenRouter: Score:', score, '% | Questions:', questions.length);

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Test Buddy',
        // Best-effort headers to suppress reasoning/thinking
        'X-OpenRouter-Ignore-Reasoning': 'true',
        'x-omit-thoughts': 'true'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { 
            role: 'system', 
            content: system + '\n\nReturn ONLY valid JSON. No commentary. No code fences. No thinking process.' 
          },
          { role: 'user', content: user }
        ],
        temperature: 0.5,
        max_tokens: 1200,
        // Force structured JSON output if supported by the model
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter: Primary model failed:', data?.error?.message);
      // Try fallback with backup model without response_format
      return this.tryFallbackGeneration(system, user);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI model returned empty response');
    }

    console.log('OpenRouter: Full API response structure:', {
      choices: data?.choices?.length || 0,
      hasContent: !!content,
      contentLength: content?.length || 0,
      usage: data?.usage
    });

    return this.safeParseFeedbackJSON(content);
  }

  private static async tryFallbackGeneration(systemPrompt: string, userPrompt: string): Promise<FeedbackSummary> {
    console.log('OpenRouter: Trying fallback model without response_format...');
    
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Test Buddy'
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-4k-instruct:free',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt + '\n\nIMPORTANT: Return ONLY a JSON object. Start with { and end with }. No other text.' 
          },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data?.error?.message || 'All feedback models failed');
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Fallback model returned empty response');
    }

    return this.safeParseFeedbackJSON(content);
  }

  private static async tryGenerateFeedback(
    system: string,
    user: string,
    modelName: string,
    temperature: number,
    maxTokens: number
  ): Promise<FeedbackSummary> {
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Test Buddy',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: 0.9
      })
    });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenRouter feedback error:', data);
        throw new Error(data?.error?.message || 'OpenRouter feedback request failed');
      }

      // Check if we have any content at all
      let text = data?.choices?.[0]?.message?.content ?? '';
      text = text.trim();
      
      console.log('OpenRouter: Full API response structure:', {
        choices: data?.choices?.length,
        hasContent: !!text,
        contentLength: text.length,
        usage: data?.usage
      });
      
      if (!text || text.length === 0) {
        console.error('OpenRouter: Received empty content from API');
        console.error('OpenRouter: Full response data:', JSON.stringify(data, null, 2));
        throw new Error('AI model returned empty response. This might be due to content filtering or model issues.');
      }
      
      console.log('OpenRouter: Raw feedback response:', text.substring(0, 300) + '...');
      
      // Try multiple strategies to extract JSON
      let jsonString = text;
      
      // Strategy 1: Remove <think> tags if present (common with some models)
      if (text.includes('<think>')) {
        // Remove everything from <think> to </think> or end of <think> block
        jsonString = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
        console.log('OpenRouter: Removed <think> tags');
      }
      
      // Strategy 2: Remove code fences if present
      if (jsonString.includes('```json') || jsonString.includes('```')) {
        const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1].trim();
          console.log('OpenRouter: Extracted JSON from code block');
        }
      }
      
      // Strategy 3: Find JSON object boundaries
      if (!jsonString.startsWith('{')) {
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('OpenRouter: Extracted JSON using regex match');
        }
      }
      
      // Strategy 4: Clean up common formatting issues
      jsonString = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^\s*Here's the feedback:\s*/i, '')
        .replace(/^\s*Response:\s*/i, '')
        .replace(/<\/?think>/gi, '') // Remove any remaining think tags
        .trim();

      console.log('OpenRouter: Cleaned JSON string:', jsonString.substring(0, 200) + '...');

      let parsed: FeedbackSummary = {
        overall_assessment: 'Unable to generate detailed feedback at this time.',
        strengths: [],
        focus_areas: [],
        suggested_next_quiz: { 
          difficulty: 'mixed', 
          question_mix: ['multiple_choice', 'scenario'], 
          target_topics: [] 
        }
      };
      
      try {
        parsed = JSON.parse(jsonString);
        console.log('OpenRouter: Successfully parsed feedback JSON');
      } catch (parseError) {
        console.warn('OpenRouter: Failed to parse feedback JSON, trying more aggressive cleaning...');
        
        // Try to fix common JSON issues
        const fixedJson = jsonString
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // Fix unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"')  // Fix single quotes
          .replace(/\n/g, ' ')  // Remove newlines that might break JSON
          .replace(/\t/g, ' ')  // Remove tabs
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        try {
          parsed = JSON.parse(fixedJson);
          console.log('OpenRouter: Successfully parsed feedback JSON after fixing');
        } catch (secondError) {
          console.warn('OpenRouter: Fixed JSON also failed, trying to find JSON anywhere in response...');
          
          // Last resort: try to find any JSON object in the entire response
          const allJsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          let foundValidJson = false;
          
          if (allJsonMatches) {
            for (const match of allJsonMatches) {
              try {
                const testParsed = JSON.parse(match);
                if (testParsed.overall_assessment || testParsed.focus_areas) {
                  parsed = testParsed;
                  foundValidJson = true;
                  console.log('OpenRouter: Found valid JSON in response!');
                  break;
                }
              } catch {
                // Continue searching
              }
            }
          }
          
          if (!foundValidJson) {
            console.error('OpenRouter: All JSON parsing attempts failed:', secondError);
            console.error('OpenRouter: Original text:', text.substring(0, 500));
            console.error('OpenRouter: Final attempt:', fixedJson.substring(0, 500));
            // Keep the default fallback value that was already assigned
          }
        }
      }
      
      return parsed;
  }
} 