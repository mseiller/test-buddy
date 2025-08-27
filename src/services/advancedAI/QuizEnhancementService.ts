import { Question, UserAnswer, TestHistory, User } from '@/types';
import { OpenRouterService } from '../openRouter';

export interface LearningProfile {
  userId: string;
  strengths: string[];
  weaknesses: string[];
  preferredQuestionTypes: string[];
  difficultyProgression: {
    [topic: string]: number; // 0-100 scale
  };
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  pacePreference: 'slow' | 'moderate' | 'fast';
  lastUpdated: Date;
}

export interface AdaptiveQuestion {
  question: Question;
  difficulty: number;
  estimatedTime: number;
  learningValue: number;
  topicRelevance: number;
  userEngagement: number;
}

export interface QuizEnhancementOptions {
  enablePersonalization: boolean;
  enableAdaptiveDifficulty: boolean;
  enableLearningAnalytics: boolean;
  enableSmartReview: boolean;
  enableTopicMastery: boolean;
}

export class QuizEnhancementService {
  private static instance: QuizEnhancementService;
  private openRouterService: OpenRouterService;
  private learningProfiles: Map<string, LearningProfile> = new Map();

  private constructor() {
    this.openRouterService = OpenRouterService.getInstance();
  }

  public static getInstance(): QuizEnhancementService {
    if (!QuizEnhancementService.instance) {
      QuizEnhancementService.instance = new QuizEnhancementService();
    }
    return QuizEnhancementService.instance;
  }

  /**
   * Generate personalized quiz questions based on user's learning profile
   */
  async generatePersonalizedQuestions(
    content: string,
    user: User,
    options: QuizEnhancementOptions,
    questionCount: number = 10
  ): Promise<Question[]> {
    try {
      // Get or create user's learning profile
      const learningProfile = await this.getLearningProfile(user.uid);
      
      // Analyze content for topics and complexity
      const contentAnalysis = await this.analyzeContent(content);
      
      // Generate base questions
      const baseQuestions = await this.generateBaseQuestions(content, questionCount);
      
      if (!options.enablePersonalization) {
        return baseQuestions;
      }

      // Enhance questions based on learning profile
      const enhancedQuestions = await this.enhanceQuestionsForUser(
        baseQuestions,
        learningProfile,
        contentAnalysis,
        options
      );

      return enhancedQuestions;
    } catch (error) {
      console.error('Failed to generate personalized questions:', error);
      // Fallback to basic question generation
      return this.generateBaseQuestions(content, questionCount);
    }
  }

  /**
   * Analyze content for topics, complexity, and learning objectives
   */
  private async analyzeContent(content: string): Promise<any> {
    const prompt = `
      Analyze the following content and provide a structured analysis:
      
      Content: ${content.substring(0, 2000)}
      
      Please provide:
      1. Main topics and subtopics
      2. Complexity level (beginner, intermediate, advanced)
      3. Key learning objectives
      4. Suggested question types
      5. Estimated difficulty distribution
      
      Format as JSON:
      {
        "topics": ["topic1", "topic2"],
        "complexity": "intermediate",
        "objectives": ["objective1", "objective2"],
        "questionTypes": ["MCQ", "True/False", "Fill-in"],
        "difficultyDistribution": {"easy": 0.3, "medium": 0.5, "hard": 0.2}
      }
    `;

    try {
      const response = await this.openRouterService.generateResponse(prompt, {
        model: 'qwen/qwen3-235b-a22b:free',
        maxTokens: 500,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        topics: ['general'],
        complexity: 'intermediate',
        objectives: ['understanding'],
        questionTypes: ['MCQ'],
        difficultyDistribution: { easy: 0.4, medium: 0.4, hard: 0.2 }
      };
    }
  }

  /**
   * Generate base questions from content
   */
  private async generateBaseQuestions(content: string, count: number): Promise<Question[]> {
    const prompt = `
      Generate ${count} diverse quiz questions from the following content:
      
      Content: ${content.substring(0, 3000)}
      
      Requirements:
      - Mix of question types (MCQ, True/False, Fill-in)
      - Varying difficulty levels
      - Clear, unambiguous questions
      - Accurate answers
      - Educational value
      
      Format as JSON array:
      [
        {
          "id": "unique_id",
          "type": "MCQ|True/False|Fill-in",
          "question": "Question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "correct_answer",
          "explanation": "Why this is correct",
          "difficulty": 1-5,
          "topic": "main_topic"
        }
      ]
    `;

    try {
      const response = await this.openRouterService.generateResponse(prompt, {
        model: 'qwen/qwen3-235b-a22b:free',
        maxTokens: 2000,
        temperature: 0.7
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Question generation failed:', error);
      return this.generateFallbackQuestions(content, count);
    }
  }

  /**
   * Enhance questions based on user's learning profile
   */
  private async enhanceQuestionsForUser(
    questions: Question[],
    profile: LearningProfile,
    contentAnalysis: any,
    options: QuizEnhancementOptions
  ): Promise<Question[]> {
    const enhancedQuestions: Question[] = [];

    for (const question of questions) {
      let enhancedQuestion = { ...question };

      // Adjust difficulty based on user's topic mastery
      if (options.enableAdaptiveDifficulty) {
        enhancedQuestion = await this.adjustQuestionDifficulty(
          enhancedQuestion,
          profile,
          contentAnalysis
        );
      }

      // Add personalized explanations
      if (options.enablePersonalization) {
        enhancedQuestion = await this.addPersonalizedExplanation(
          enhancedQuestion,
          profile
        );
      }

      // Add learning tips based on user's learning style
      if (options.enableLearningAnalytics) {
        enhancedQuestion = await this.addLearningTips(
          enhancedQuestion,
          profile
        );
      }

      enhancedQuestions.push(enhancedQuestion);
    }

    // Sort questions by learning value and user engagement
    if (options.enableSmartReview) {
      enhancedQuestions.sort((a, b) => {
        const aValue = this.calculateQuestionValue(a, profile);
        const bValue = this.calculateQuestionValue(b, profile);
        return bValue - aValue;
      });
    }

    return enhancedQuestions;
  }

  /**
   * Adjust question difficulty based on user's topic mastery
   */
  private async adjustQuestionDifficulty(
    question: Question,
    profile: LearningProfile,
    contentAnalysis: any
  ): Promise<Question> {
    const topic = question.topic || 'general';
    const userMastery = profile.difficultyProgression[topic] || 50;
    
    let adjustedQuestion = { ...question };

    if (userMastery > 80) {
      // User is strong in this topic - increase difficulty
      adjustedQuestion = await this.increaseQuestionDifficulty(question);
    } else if (userMastery < 30) {
      // User struggles with this topic - decrease difficulty
      adjustedQuestion = await this.decreaseQuestionDifficulty(question);
    }

    return adjustedQuestion;
  }

  /**
   * Increase question difficulty
   */
  private async increaseQuestionDifficulty(question: Question): Promise<Question> {
    if (question.type === 'MCQ') {
      // Add more complex options or make correct answer less obvious
      const prompt = `
        Make this multiple choice question more challenging:
        
        Question: ${question.question}
        Current options: ${question.options?.join(', ')}
        Correct answer: ${question.correctAnswer}
        
        Provide more challenging options that make the correct answer less obvious.
        Format as JSON with new options array.
      `;

      try {
        const response = await this.openRouterService.generateResponse(prompt, {
          model: 'qwen/qwen3-235b-a22b:free',
          maxTokens: 300,
          temperature: 0.8
        });

        const enhancedOptions = JSON.parse(response);
        return {
          ...question,
          options: enhancedOptions.options,
          difficulty: Math.min(5, (question.difficulty || 3) + 1)
        };
      } catch (error) {
        console.error('Failed to increase question difficulty:', error);
        return question;
      }
    }

    return question;
  }

  /**
   * Decrease question difficulty
   */
  private async decreaseQuestionDifficulty(question: Question): Promise<Question> {
    if (question.type === 'MCQ') {
      // Simplify options or add hints
      const prompt = `
        Make this multiple choice question easier:
        
        Question: ${question.question}
        Current options: ${question.options?.join(', ')}
        Correct answer: ${question.correctAnswer}
        
        Provide simpler options and add a hint to make the question easier.
        Format as JSON with new options array and hint.
      `;

      try {
        const response = await this.openRouterService.generateResponse(prompt, {
          model: 'qwen/qwen3-235b-a22b:free',
          maxTokens: 300,
          temperature: 0.8
        });

        const simplifiedQuestion = JSON.parse(response);
        return {
          ...question,
          options: simplifiedQuestion.options,
          hint: simplifiedQuestion.hint,
          difficulty: Math.max(1, (question.difficulty || 3) - 1)
        };
      } catch (error) {
        console.error('Failed to decrease question difficulty:', error);
        return question;
      }
    }

    return question;
  }

  /**
   * Add personalized explanations based on user's learning profile
   */
  private async addPersonalizedExplanation(
    question: Question,
    profile: LearningProfile
  ): Promise<Question> {
    const prompt = `
      Provide a personalized explanation for this question based on the user's learning profile:
      
      Question: ${question.question}
      Correct answer: ${question.correctAnswer}
      User's learning style: ${profile.learningStyle}
      User's pace preference: ${profile.pacePreference}
      
      Provide an explanation that matches the user's learning style and pace.
      Format as JSON with personalized explanation.
    `;

    try {
      const response = await this.openRouterService.generateResponse(prompt, {
        model: 'qwen/qwen3-235b-a22b:free',
        maxTokens: 400,
        temperature: 0.6
      });

      const personalized = JSON.parse(response);
      return {
        ...question,
        explanation: personalized.explanation
      };
    } catch (error) {
      console.error('Failed to add personalized explanation:', error);
      return question;
    }
  }

  /**
   * Add learning tips based on user's learning style
   */
  private async addLearningTips(
    question: Question,
    profile: LearningProfile
  ): Promise<Question> {
    const learningTips: { [key: string]: string } = {
      visual: 'Try drawing a diagram or mind map to visualize this concept.',
      auditory: 'Read this question aloud or discuss it with someone.',
      kinesthetic: 'Act out this scenario or use physical objects to understand.',
      reading: 'Take notes and summarize the key points in your own words.'
    };

    return {
      ...question,
      learningTip: learningTips[profile.learningStyle] || 'Review the material and practice regularly.'
    };
  }

  /**
   * Calculate question value for smart review
   */
  private calculateQuestionValue(question: Question, profile: LearningProfile): number {
    const topic = question.topic || 'general';
    const userMastery = profile.difficultyProgression[topic] || 50;
    const difficulty = question.difficulty || 3;
    
    // Higher value for questions that match user's current learning needs
    let value = 0;
    
    // Questions in weak areas get higher priority
    if (userMastery < 50) {
      value += 20;
    }
    
    // Questions at appropriate difficulty level
    if (Math.abs(difficulty - (userMastery / 20)) <= 1) {
      value += 15;
    }
    
    // Questions matching preferred question types
    if (profile.preferredQuestionTypes.includes(question.type)) {
      value += 10;
    }
    
    return value;
  }

  /**
   * Get or create user's learning profile
   */
  private async getLearningProfile(userId: string): Promise<LearningProfile> {
    if (this.learningProfiles.has(userId)) {
      return this.learningProfiles.get(userId)!;
    }

    // Create default learning profile
    const defaultProfile: LearningProfile = {
      userId,
      strengths: [],
      weaknesses: [],
      preferredQuestionTypes: ['MCQ'],
      difficultyProgression: {},
      learningStyle: 'reading',
      pacePreference: 'moderate',
      lastUpdated: new Date()
    };

    this.learningProfiles.set(userId, defaultProfile);
    return defaultProfile;
  }

  /**
   * Update learning profile based on quiz results
   */
  async updateLearningProfile(
    userId: string,
    questions: Question[],
    answers: UserAnswer[],
    score: number
  ): Promise<void> {
    const profile = await this.getLearningProfile(userId);
    
    // Analyze performance by topic
    const topicPerformance: { [topic: string]: { correct: number; total: number } } = {};
    
    questions.forEach((question, index) => {
      const topic = question.topic || 'general';
      const isCorrect = answers[index]?.answer === question.correctAnswer;
      
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      
      topicPerformance[topic].total++;
      if (isCorrect) {
        topicPerformance[topic].correct++;
      }
    });

    // Update difficulty progression
    Object.entries(topicPerformance).forEach(([topic, performance]) => {
      const successRate = performance.correct / performance.total;
      const currentMastery = profile.difficultyProgression[topic] || 50;
      
      // Adjust mastery based on performance
      if (successRate > 0.8) {
        profile.difficultyProgression[topic] = Math.min(100, currentMastery + 10);
      } else if (successRate < 0.4) {
        profile.difficultyProgression[topic] = Math.max(0, currentMastery - 10);
      }
    });

    // Update preferred question types based on performance
    const questionTypePerformance = this.analyzeQuestionTypePerformance(questions, answers);
    profile.preferredQuestionTypes = questionTypePerformance
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map(qt => qt.type);

    profile.lastUpdated = new Date();
    this.learningProfiles.set(userId, profile);
  }

  /**
   * Analyze performance by question type
   */
  private analyzeQuestionTypePerformance(
    questions: Question[],
    answers: UserAnswer[]
  ): Array<{ type: string; successRate: number }> {
    const typePerformance: { [type: string]: { correct: number; total: number } } = {};
    
    questions.forEach((question, index) => {
      const type = question.type;
      const isCorrect = answers[index]?.answer === question.correctAnswer;
      
      if (!typePerformance[type]) {
        typePerformance[type] = { correct: 0, total: 0 };
      }
      
      typePerformance[type].total++;
      if (isCorrect) {
        typePerformance[type].correct++;
      }
    });

    return Object.entries(typePerformance).map(([type, performance]) => ({
      type,
      successRate: performance.correct / performance.total
    }));
  }

  /**
   * Generate fallback questions if AI generation fails
   */
  private generateFallbackQuestions(content: string, count: number): Question[] {
    const questions: Question[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const sentence = sentences[i].trim();
      const words = sentence.split(' ');
      
      if (words.length > 5) {
        const question: Question = {
          id: `fallback_${i}`,
          type: 'MCQ',
          question: `What is the main idea of: "${sentence.substring(0, 100)}..."?`,
          options: [
            'The text discusses important concepts',
            'The text provides examples',
            'The text explains a process',
            'The text describes a situation'
          ],
          correctAnswer: 'The text discusses important concepts',
          explanation: 'This is a general understanding question about the provided text.',
          difficulty: 2,
          topic: 'general'
        };
        
        questions.push(question);
      }
    }
    
    return questions;
  }

  /**
   * Get learning insights for user
   */
  async getLearningInsights(userId: string): Promise<any> {
    const profile = await this.getLearningProfile(userId);
    
    return {
      profile,
      recommendations: this.generateRecommendations(profile),
      progress: this.calculateProgress(profile),
      nextSteps: this.suggestNextSteps(profile)
    };
  }

  /**
   * Generate personalized learning recommendations
   */
  private generateRecommendations(profile: LearningProfile): string[] {
    const recommendations: string[] = [];
    
    // Identify weak areas
    const weakTopics = Object.entries(profile.difficultyProgression)
      .filter(([_, mastery]) => mastery < 40)
      .map(([topic, _]) => topic);
    
    if (weakTopics.length > 0) {
      recommendations.push(`Focus on improving your understanding of: ${weakTopics.join(', ')}`);
    }
    
    // Suggest question types
    if (profile.preferredQuestionTypes.length < 3) {
      recommendations.push('Try different question types to improve your learning diversity');
    }
    
    // Pace recommendations
    if (profile.pacePreference === 'slow') {
      recommendations.push('Take your time with each question and review explanations thoroughly');
    } else if (profile.pacePreference === 'fast') {
      recommendations.push('Consider slowing down slightly to ensure thorough understanding');
    }
    
    return recommendations;
  }

  /**
   * Calculate overall learning progress
   */
  private calculateProgress(profile: LearningProfile): number {
    const topics = Object.values(profile.difficultyProgression);
    if (topics.length === 0) return 0;
    
    const averageMastery = topics.reduce((sum, mastery) => sum + mastery, 0) / topics.length;
    return Math.round(averageMastery);
  }

  /**
   * Suggest next learning steps
   */
  private suggestNextSteps(profile: LearningProfile): string[] {
    const nextSteps: string[] = [];
    
    // Find topics ready for advancement
    const advancedTopics = Object.entries(profile.difficultyProgression)
      .filter(([_, mastery]) => mastery > 70)
      .map(([topic, _]) => topic);
    
    if (advancedTopics.length > 0) {
      nextSteps.push(`You're ready for advanced challenges in: ${advancedTopics.join(', ')}`);
    }
    
    // Suggest new topics
    if (Object.keys(profile.difficultyProgression).length < 5) {
      nextSteps.push('Explore new topics to broaden your knowledge base');
    }
    
    return nextSteps;
  }
}
