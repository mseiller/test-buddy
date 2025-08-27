import { FirebaseService } from '../firebaseService';
import { User, Question, UserAnswer, TestHistory } from '@/types';

export interface AnalyticsEvent {
  eventType: string;
  userId: string;
  timestamp: Date;
  properties: { [key: string]: any };
  sessionId: string;
  pageUrl: string;
  userAgent: string;
}

export interface LearningAnalytics {
  userId: string;
  topicMastery: { [topic: string]: number };
  questionTypePerformance: { [type: string]: { correct: number; total: number; successRate: number } };
  timeSpentPerTopic: { [topic: string]: number };
  difficultyProgression: { [topic: string]: number[] };
  learningStreak: number;
  averageScore: number;
  totalTestsTaken: number;
  lastActiveDate: Date;
}

export interface UserBehaviorAnalytics {
  userId: string;
  pageViews: { [page: string]: number };
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  featureUsage: { [feature: string]: number };
  engagementScore: number;
  retentionRate: number;
}

export interface BusinessIntelligence {
  totalUsers: number;
  activeUsers: number;
  revenueMetrics: {
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    lifetimeValue: number;
  };
  usageMetrics: {
    totalTestsGenerated: number;
    averageTestsPerUser: number;
    peakUsageTime: string;
    featureAdoptionRate: { [feature: string]: number };
  };
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    userSatisfactionScore: number;
  };
}

export interface AnalyticsConfig {
  enableTracking: boolean;
  enableLearningAnalytics: boolean;
  enableBehaviorAnalytics: boolean;
  enableBusinessIntelligence: boolean;
  enableRealTimeAnalytics: boolean;
  enablePredictiveAnalytics: boolean;
  enableA/BTesting: boolean;
  enableHeatmaps: boolean;
  enableSessionRecording: boolean;
  enableConversionTracking: boolean;
}

export class AdvancedAnalyticsService {
  private static instance: AdvancedAnalyticsService;
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private learningProfiles: Map<string, LearningAnalytics> = new Map();
  private userBehaviors: Map<string, UserBehaviorAnalytics> = new Map();
  private sessionData: Map<string, { startTime: Date; pageViews: string[] }> = new Map();
  private conversionGoals: Map<string, { goal: string; value: number; achieved: boolean }> = new Map();

  private constructor() {
    this.config = {
      enableTracking: true,
      enableLearningAnalytics: true,
      enableBehaviorAnalytics: true,
      enableBusinessIntelligence: true,
      enableRealTimeAnalytics: true,
      enablePredictiveAnalytics: true,
      enableA/BTesting: true,
      enableHeatmaps: true,
      enableSessionRecording: true,
      enableConversionTracking: true
    };

    this.initializeAnalytics();
  }

  public static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  /**
   * Initialize analytics system
   */
  private initializeAnalytics(): void {
    if (typeof window !== 'undefined') {
      this.setupEventTracking();
      this.setupSessionTracking();
      this.setupConversionTracking();
      this.setupHeatmapTracking();
      this.setupSessionRecording();
    }
  }

  /**
   * Set up event tracking
   */
  private setupEventTracking(): void {
    // Track page views
    this.trackPageView(window.location.pathname);

    // Track user interactions
    document.addEventListener('click', (event) => {
      this.trackUserInteraction(event);
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.trackFormSubmission(event);
    });

    // Track scroll depth
    this.trackScrollDepth();

    // Track time on page
    this.trackTimeOnPage();
  }

  /**
   * Set up session tracking
   */
  private setupSessionTracking(): void {
    const sessionId = this.generateSessionId();
    sessionStorage.setItem('analyticsSessionId', sessionId);
    
    const sessionData = {
      startTime: new Date(),
      pageViews: [window.location.pathname]
    };
    
    this.sessionData.set(sessionId, sessionData);

    // Track session end
    window.addEventListener('beforeunload', () => {
      this.endSession(sessionId);
    });
  }

  /**
   * Set up conversion tracking
   */
  private setupConversionTracking(): void {
    // Define conversion goals
    const conversionGoals = [
      { id: 'test_completion', goal: 'Complete a quiz', value: 10 },
      { id: 'account_creation', goal: 'Create account', value: 25 },
      { id: 'plan_upgrade', goal: 'Upgrade plan', value: 100 },
      { id: 'folder_creation', goal: 'Create folder', value: 5 },
      { id: 'referral', goal: 'Refer a friend', value: 50 }
    ];

    conversionGoals.forEach(goal => {
      this.conversionGoals.set(goal.id, { ...goal, achieved: false });
    });
  }

  /**
   * Set up heatmap tracking
   */
  private setupHeatmapTracking(): void {
    if (!this.config.enableHeatmaps) return;

    // Track mouse movements
    document.addEventListener('mousemove', (event) => {
      this.trackMouseMovement(event);
    });

    // Track clicks for heatmap
    document.addEventListener('click', (event) => {
      this.trackClickForHeatmap(event);
    });
  }

  /**
   * Set up session recording
   */
  private setupSessionRecording(): void {
    if (!this.config.enableSessionRecording) return;

    // Record DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this.recordDOMMutation(mutation);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
  }

  /**
   * Track page view
   */
  trackPageView(pageUrl: string): void {
    if (!this.config.enableTracking) return;

    const event: AnalyticsEvent = {
      eventType: 'page_view',
      userId: this.getCurrentUserId(),
      timestamp: new Date(),
      properties: { pageUrl, referrer: document.referrer },
      sessionId: this.getCurrentSessionId(),
      pageUrl,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.updateSessionData(pageUrl);
    this.sendAnalyticsEvent(event);
  }

  /**
   * Track user interaction
   */
  private trackUserInteraction(event: Event): void {
    if (!this.config.enableTracking) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    const eventType = 'user_interaction';
    const properties = {
      elementType: target.tagName.toLowerCase(),
      elementId: target.id,
      elementClass: target.className,
      elementText: target.textContent?.substring(0, 100),
      eventType: event.type,
      pageUrl: window.location.pathname
    };

    this.trackEvent(eventType, properties);
  }

  /**
   * Track form submission
   */
  private trackFormSubmission(event: Event): void {
    if (!this.config.enableTracking) return;

    const form = event.target as HTMLFormElement;
    if (!form) return;

    const properties = {
      formId: form.id,
      formAction: form.action,
      formMethod: form.method,
      fieldCount: form.elements.length,
      pageUrl: window.location.pathname
    };

    this.trackEvent('form_submission', properties);
  }

  /**
   * Track scroll depth
   */
  private trackScrollDepth(): void {
    let maxScrollDepth = 0;
    
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;
        
        // Track significant scroll milestones
        if (scrollPercent % 25 === 0) {
          this.trackEvent('scroll_depth', { depth: scrollPercent, pageUrl: window.location.pathname });
        }
      }
    });
  }

  /**
   * Track time on page
   */
  private trackTimeOnPage(): void {
    const startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - startTime;
      this.trackEvent('time_on_page', { 
        timeOnPage, 
        pageUrl: window.location.pathname,
        sessionId: this.getCurrentSessionId()
      });
    });
  }

  /**
   * Track mouse movement for heatmap
   */
  private trackMouseMovement(event: MouseEvent): void {
    if (!this.config.enableHeatmaps) return;

    const properties = {
      x: event.clientX,
      y: event.clientY,
      pageUrl: window.location.pathname,
      timestamp: Date.now()
    };

    // Only track every 100ms to reduce data volume
    if (Date.now() % 100 === 0) {
      this.trackEvent('mouse_movement', properties);
    }
  }

  /**
   * Track click for heatmap
   */
  private trackClickForHeatmap(event: MouseEvent): void {
    if (!this.config.enableHeatmaps) return;

    const target = event.target as HTMLElement;
    const properties = {
      x: event.clientX,
      y: event.clientY,
      elementType: target.tagName.toLowerCase(),
      elementId: target.id,
      elementClass: target.className,
      pageUrl: window.location.pathname
    };

    this.trackEvent('click_heatmap', properties);
  }

  /**
   * Record DOM mutation for session recording
   */
  private recordDOMMutation(mutation: MutationRecord): void {
    if (!this.config.enableSessionRecording) return;

    const properties = {
      type: mutation.type,
      target: mutation.target.nodeName,
      addedNodes: mutation.addedNodes.length,
      removedNodes: mutation.removedNodes.length,
      attributeName: mutation.attributeName,
      pageUrl: window.location.pathname,
      timestamp: Date.now()
    };

    this.trackEvent('dom_mutation', properties);
  }

  /**
   * Track learning analytics
   */
  trackLearningEvent(
    userId: string,
    eventType: string,
    properties: { [key: string]: any }
  ): void {
    if (!this.config.enableLearningAnalytics) return;

    this.trackEvent(eventType, { ...properties, userId });
    this.updateLearningProfile(userId, eventType, properties);
  }

  /**
   * Update learning profile
   */
  private updateLearningProfile(
    userId: string,
    eventType: string,
    properties: { [key: string]: any }
  ): void {
    let profile = this.learningProfiles.get(userId);
    
    if (!profile) {
      profile = this.createDefaultLearningProfile(userId);
    }

    switch (eventType) {
      case 'question_answered':
        this.updateQuestionPerformance(profile, properties);
        break;
      case 'test_completed':
        this.updateTestCompletion(profile, properties);
        break;
      case 'topic_studied':
        this.updateTopicMastery(profile, properties);
        break;
    }

    this.learningProfiles.set(userId, profile);
  }

  /**
   * Create default learning profile
   */
  private createDefaultLearningProfile(userId: string): LearningAnalytics {
    return {
      userId,
      topicMastery: {},
      questionTypePerformance: {},
      timeSpentPerTopic: {},
      difficultyProgression: {},
      learningStreak: 0,
      averageScore: 0,
      totalTestsTaken: 0,
      lastActiveDate: new Date()
    };
  }

  /**
   * Update question performance
   */
  private updateQuestionPerformance(
    profile: LearningAnalytics,
    properties: { [key: string]: any }
  ): void {
    const { questionType, isCorrect, topic, difficulty } = properties;
    
    // Update question type performance
    if (!profile.questionTypePerformance[questionType]) {
      profile.questionTypePerformance[questionType] = { correct: 0, total: 0, successRate: 0 };
    }
    
    const typeStats = profile.questionTypePerformance[questionType];
    typeStats.total++;
    if (isCorrect) typeStats.correct++;
    typeStats.successRate = typeStats.correct / typeStats.total;

    // Update topic mastery
    if (topic) {
      if (!profile.topicMastery[topic]) {
        profile.topicMastery[topic] = 50; // Start at 50%
      }
      
      const masteryChange = isCorrect ? 2 : -1;
      profile.topicMastery[topic] = Math.max(0, Math.min(100, profile.topicMastery[topic] + masteryChange));
    }

    // Update difficulty progression
    if (topic && difficulty) {
      if (!profile.difficultyProgression[topic]) {
        profile.difficultyProgression[topic] = [];
      }
      profile.difficultyProgression[topic].push(difficulty);
      
      // Keep only last 10 difficulty levels
      if (profile.difficultyProgression[topic].length > 10) {
        profile.difficultyProgression[topic] = profile.difficultyProgression[topic].slice(-10);
      }
    }
  }

  /**
   * Update test completion
   */
  private updateTestCompletion(
    profile: LearningAnalytics,
    properties: { [key: string]: any }
  ): void {
    const { score, totalQuestions, timeSpent, topics } = properties;
    
    profile.totalTestsTaken++;
    profile.averageScore = (profile.averageScore * (profile.totalTestsTaken - 1) + score) / profile.totalTestsTaken;
    profile.lastActiveDate = new Date();

    // Update learning streak
    const today = new Date().toDateString();
    const lastActive = profile.lastActiveDate.toDateString();
    if (today === lastActive) {
      profile.learningStreak++;
    } else {
      profile.learningStreak = 1;
    }

    // Update time spent per topic
    if (topics && timeSpent) {
      const timePerTopic = timeSpent / topics.length;
      topics.forEach((topic: string) => {
        if (!profile.timeSpentPerTopic[topic]) {
          profile.timeSpentPerTopic[topic] = 0;
        }
        profile.timeSpentPerTopic[topic] += timePerTopic;
      });
    }
  }

  /**
   * Update topic mastery
   */
  private updateTopicMastery(
    profile: LearningAnalytics,
    properties: { [key: string]: any }
  ): void {
    const { topic, timeSpent, difficulty } = properties;
    
    if (!profile.topicMastery[topic]) {
      profile.topicMastery[topic] = 50;
    }

    // Increase mastery based on time spent and difficulty
    const masteryIncrease = Math.min(5, (timeSpent / 60) * (difficulty / 5));
    profile.topicMastery[topic] = Math.min(100, profile.topicMastery[topic] + masteryIncrease);
  }

  /**
   * Track conversion goal
   */
  trackConversion(goalId: string, userId: string, value?: number): void {
    if (!this.config.enableConversionTracking) return;

    const goal = this.conversionGoals.get(goalId);
    if (goal && !goal.achieved) {
      goal.achieved = true;
      goal.value = value || goal.value;

      this.trackEvent('conversion_achieved', {
        goalId,
        goal: goal.goal,
        value: goal.value,
        userId
      });
    }
  }

  /**
   * Generate learning insights
   */
  generateLearningInsights(userId: string): any {
    const profile = this.learningProfiles.get(userId);
    if (!profile) return null;

    const insights = {
      strengths: this.identifyStrengths(profile),
      weaknesses: this.identifyWeaknesses(profile),
      recommendations: this.generateLearningRecommendations(profile),
      progress: this.calculateLearningProgress(profile),
      nextSteps: this.suggestNextSteps(profile)
    };

    return insights;
  }

  /**
   * Identify user strengths
   */
  private identifyStrengths(profile: LearningAnalytics): string[] {
    const strengths: string[] = [];
    
    // Topics with high mastery
    Object.entries(profile.topicMastery)
      .filter(([_, mastery]) => mastery >= 80)
      .forEach(([topic, _]) => {
        strengths.push(`Strong understanding of ${topic}`);
      });

    // Question types with high success rate
    Object.entries(profile.questionTypePerformance)
      .filter(([_, stats]) => stats.successRate >= 0.8)
      .forEach(([type, _]) => {
        strengths.push(`Excellent performance with ${type} questions`);
      });

    // Learning streak
    if (profile.learningStreak >= 7) {
      strengths.push(`Consistent learning streak of ${profile.learningStreak} days`);
    }

    return strengths;
  }

  /**
   * Identify user weaknesses
   */
  private identifyWeaknesses(profile: LearningAnalytics): string[] {
    const weaknesses: string[] = [];
    
    // Topics with low mastery
    Object.entries(profile.topicMastery)
      .filter(([_, mastery]) => mastery <= 30)
      .forEach(([topic, _]) => {
        weaknesses.push(`Needs improvement in ${topic}`);
      });

    // Question types with low success rate
    Object.entries(profile.questionTypePerformance)
      .filter(([_, stats]) => stats.successRate <= 0.4)
      .forEach(([type, _]) => {
        weaknesses.push(`Struggles with ${type} questions`);
      });

    return weaknesses;
  }

  /**
   * Generate learning recommendations
   */
  private generateLearningRecommendations(profile: LearningAnalytics): string[] {
    const recommendations: string[] = [];
    
    // Focus on weak topics
    const weakTopics = Object.entries(profile.topicMastery)
      .filter(([_, mastery]) => mastery <= 40)
      .map(([topic, _]) => topic);
    
    if (weakTopics.length > 0) {
      recommendations.push(`Focus on improving: ${weakTopics.join(', ')}`);
    }

    // Practice weak question types
    const weakQuestionTypes = Object.entries(profile.questionTypePerformance)
      .filter(([_, stats]) => stats.successRate <= 0.5)
      .map(([type, _]) => type);
    
    if (weakQuestionTypes.length > 0) {
      recommendations.push(`Practice more: ${weakQuestionTypes.join(', ')} questions`);
    }

    // Maintain learning streak
    if (profile.learningStreak > 0) {
      recommendations.push(`Keep up your ${profile.learningStreak}-day learning streak!`);
    }

    return recommendations;
  }

  /**
   * Calculate learning progress
   */
  private calculateLearningProgress(profile: LearningAnalytics): number {
    const topics = Object.values(profile.topicMastery);
    if (topics.length === 0) return 0;
    
    const averageMastery = topics.reduce((sum, mastery) => sum + mastery, 0) / topics.length;
    return Math.round(averageMastery);
  }

  /**
   * Suggest next steps
   */
  private suggestNextSteps(profile: LearningAnalytics): string[] {
    const nextSteps: string[] = [];
    
    // Advanced topics for strong users
    const strongTopics = Object.entries(profile.topicMastery)
      .filter(([_, mastery]) => mastery >= 70)
      .map(([topic, _]) => topic);
    
    if (strongTopics.length > 0) {
      nextSteps.push(`You're ready for advanced challenges in: ${strongTopics.join(', ')}`);
    }

    // New topics to explore
    if (Object.keys(profile.topicMastery).length < 5) {
      nextSteps.push('Explore new topics to broaden your knowledge base');
    }

    // Practice recommendations
    if (profile.totalTestsTaken < 10) {
      nextSteps.push('Take more practice tests to improve your skills');
    }

    return nextSteps;
  }

  /**
   * Generate business intelligence report
   */
  async generateBusinessIntelligenceReport(): Promise<BusinessIntelligence> {
    if (!this.config.enableBusinessIntelligence) {
      throw new Error('Business intelligence is not enabled');
    }

    // This would typically fetch data from your database
    // For now, we'll return mock data
    const report: BusinessIntelligence = {
      totalUsers: 1000,
      activeUsers: 750,
      revenueMetrics: {
        monthlyRecurringRevenue: 5000,
        averageRevenuePerUser: 5,
        churnRate: 0.05,
        lifetimeValue: 60
      },
      usageMetrics: {
        totalTestsGenerated: 5000,
        averageTestsPerUser: 5,
        peakUsageTime: '14:00-16:00',
        featureAdoptionRate: {
          'quiz_generation': 0.8,
          'folder_management': 0.6,
          'analytics': 0.4
        }
      },
      performanceMetrics: {
        averageResponseTime: 250,
        errorRate: 0.02,
        uptime: 0.999,
        userSatisfactionScore: 4.5
      }
    };

    return report;
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    // This would typically get the current user ID from your auth system
    return sessionStorage.getItem('userId') || 'anonymous';
  }

  /**
   * Get current session ID
   */
  private getCurrentSessionId(): string {
    return sessionStorage.getItem('analyticsSessionId') || 'unknown';
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update session data
   */
  private updateSessionData(pageUrl: string): void {
    const sessionId = this.getCurrentSessionId();
    const sessionData = this.sessionData.get(sessionId);
    
    if (sessionData) {
      sessionData.pageViews.push(pageUrl);
    }
  }

  /**
   * End session
   */
  private endSession(sessionId: string): void {
    const sessionData = this.sessionData.get(sessionId);
    if (sessionData) {
      const duration = Date.now() - sessionData.startTime.getTime();
      
      this.trackEvent('session_end', {
        sessionId,
        duration,
        pageViews: sessionData.pageViews.length,
        startTime: sessionData.startTime,
        endTime: new Date()
      });
    }
  }

  /**
   * Track generic event
   */
  trackEvent(eventType: string, properties: { [key: string]: any }): void {
    if (!this.config.enableTracking) return;

    const event: AnalyticsEvent = {
      eventType,
      userId: this.getCurrentUserId(),
      timestamp: new Date(),
      properties,
      sessionId: this.getCurrentSessionId(),
      pageUrl: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.sendAnalyticsEvent(event);
  }

  /**
   * Send analytics event
   */
  private sendAnalyticsEvent(event: AnalyticsEvent): void {
    // In a real implementation, you would send this to your analytics service
    // For now, we'll just log it
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }

    // You could send to:
    // - Google Analytics
    // - Mixpanel
    // - Amplitude
    // - Custom analytics endpoint
  }

  /**
   * Get analytics events
   */
  getAnalyticsEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get learning analytics for user
   */
  getLearningAnalytics(userId: string): LearningAnalytics | null {
    return this.learningProfiles.get(userId) || null;
  }

  /**
   * Get user behavior analytics
   */
  getUserBehaviorAnalytics(userId: string): UserBehaviorAnalytics | null {
    return this.userBehaviors.get(userId) || null;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeAnalytics();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.events = [];
    this.learningProfiles.clear();
    this.userBehaviors.clear();
    this.sessionData.clear();
    this.conversionGoals.clear();
  }
}
