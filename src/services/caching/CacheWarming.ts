/**
 * Advanced Cache Warming Service
 * Provides intelligent cache preloading and warming strategies
 */

import { CacheManager } from './CacheManager';
import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export type WarmingStrategy = 'eager' | 'lazy' | 'predictive' | 'scheduled' | 'user-triggered';
export type WarmingPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WarmingRule {
  id: string;
  name: string;
  strategy: WarmingStrategy;
  priority: WarmingPriority;
  pattern: string | RegExp;
  dataLoader: (key: string) => Promise<any>;
  conditions?: Array<{
    field: string;
    operator: '=' | '!=' | '>' | '<' | 'exists';
    value?: any;
  }>;
  schedule?: {
    cron?: string;
    interval?: number; // milliseconds
    immediate?: boolean;
  };
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  enabled: boolean;
  createdAt: number;
  lastExecuted?: number;
  successCount: number;
  failureCount: number;
}

export interface WarmingJob {
  id: string;
  ruleId: string;
  keys: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: WarmingPriority;
  startTime?: number;
  endTime?: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  errors: Array<{
    key: string;
    error: string;
    timestamp: number;
  }>;
}

export interface WarmingStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  keysWarmed: number;
  averageWarmingTime: number;
  cacheHitImprovement: number;
  memoryUsage: number;
  scheduledWarmings: number;
  predictiveAccuracy: number;
}

export interface PredictiveModel {
  userPatterns: Map<string, {
    accessFrequency: Map<string, number>;
    accessTimes: Map<string, number[]>;
    lastAccess: Map<string, number>;
  }>;
  globalPatterns: {
    popularKeys: Map<string, number>;
    timeBasedAccess: Map<number, Set<string>>; // hour -> keys
    sequentialPatterns: Map<string, string[]>; // key -> likely next keys
  };
}

export class CacheWarming {
  private static instance: CacheWarming;
  private cacheManagers = new Map<string, CacheManager>();
  private rules = new Map<string, WarmingRule>();
  private jobs = new Map<string, WarmingJob>();
  private jobQueue: WarmingJob[] = [];
  private runningJobs = new Set<string>();
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private predictiveModel: PredictiveModel;
  private stats: WarmingStats;
  private performanceCollector: PerformanceCollector;
  private isProcessing = false;
  private maxConcurrentJobs = 3;

  private constructor() {
    this.predictiveModel = {
      userPatterns: new Map(),
      globalPatterns: {
        popularKeys: new Map(),
        timeBasedAccess: new Map(),
        sequentialPatterns: new Map()
      }
    };

    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      keysWarmed: 0,
      averageWarmingTime: 0,
      cacheHitImprovement: 0,
      memoryUsage: 0,
      scheduledWarmings: 0,
      predictiveAccuracy: 0.75 // Default starting accuracy
    };

    this.performanceCollector = PerformanceCollector.getInstance();
    this.startJobProcessor();
    this.startPatternLearning();
    this.setupDefaultRules();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheWarming {
    if (!CacheWarming.instance) {
      CacheWarming.instance = new CacheWarming();
    }
    return CacheWarming.instance;
  }

  /**
   * Register cache manager
   */
  registerCacheManager(name: string, cacheManager: CacheManager): void {
    this.cacheManagers.set(name, cacheManager);
    console.log(`Cache manager '${name}' registered for warming`);
  }

  /**
   * Add warming rule
   */
  addRule(rule: Omit<WarmingRule, 'id' | 'createdAt' | 'successCount' | 'failureCount'>): string {
    const id = this.generateRuleId(rule.name);
    const fullRule: WarmingRule = {
      id,
      createdAt: Date.now(),
      successCount: 0,
      failureCount: 0,
      ...rule
    };

    this.rules.set(id, fullRule);

    // Set up scheduling if specified
    if (rule.schedule) {
      this.scheduleRule(fullRule);
    }

    this.performanceCollector.recordMetric({
      name: 'cache.warming_rule_added',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: { 
        strategy: rule.strategy,
        priority: rule.priority
      }
    });

    console.log(`Warming rule '${rule.name}' added with strategy: ${rule.strategy}`);
    return id;
  }

  /**
   * Remove warming rule
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    // Cancel any scheduled jobs for this rule
    if (this.scheduledJobs.has(ruleId)) {
      clearTimeout(this.scheduledJobs.get(ruleId)!);
      this.scheduledJobs.delete(ruleId);
    }

    this.rules.delete(ruleId);
    return true;
  }

  /**
   * Start warming based on keys
   */
  async warmKeys(keys: string[], ruleId?: string, priority: WarmingPriority = 'medium'): Promise<string> {
    const jobId = this.generateJobId();
    const rule = ruleId ? this.rules.get(ruleId) : this.getDefaultRule();

    if (!rule) {
      throw new Error('No warming rule available');
    }

    const job: WarmingJob = {
      id: jobId,
      ruleId: rule.id,
      keys: [...keys],
      status: 'pending',
      priority,
      progress: {
        total: keys.length,
        completed: 0,
        failed: 0,
        skipped: 0
      },
      errors: []
    };

    this.jobs.set(jobId, job);
    this.addJobToQueue(job);
    this.stats.totalJobs++;

    console.log(`Warming job '${jobId}' created for ${keys.length} keys`);
    return jobId;
  }

  /**
   * Start predictive warming for user
   */
  async warmPredictive(userId: string, limit: number = 50): Promise<string> {
    const predictedKeys = this.predictUserKeys(userId, limit);
    
    if (predictedKeys.length === 0) {
      throw new Error('No predictive keys available for user');
    }

    const jobId = await this.warmKeys(predictedKeys, undefined, 'high');
    
    this.performanceCollector.recordMetric({
      name: 'cache.predictive_warming_started',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: { 
        user_id: userId,
        predicted_keys: predictedKeys.length.toString()
      }
    });

    return jobId;
  }

  /**
   * Warm popular content
   */
  async warmPopular(limit: number = 100): Promise<string> {
    const popularKeys = Array.from(this.predictiveModel.globalPatterns.popularKeys.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key]) => key);

    if (popularKeys.length === 0) {
      throw new Error('No popular keys available');
    }

    return this.warmKeys(popularKeys, undefined, 'medium');
  }

  /**
   * Warm based on time patterns
   */
  async warmByTimePattern(): Promise<string> {
    const currentHour = new Date().getHours();
    const keysForHour = this.predictiveModel.globalPatterns.timeBasedAccess.get(currentHour);

    if (!keysForHour || keysForHour.size === 0) {
      throw new Error('No time-based keys available for current hour');
    }

    const keys = Array.from(keysForHour);
    return this.warmKeys(keys, undefined, 'low');
  }

  /**
   * Record cache access for learning
   */
  recordAccess(userId: string | null, key: string): void {
    const now = Date.now();
    const hour = new Date().getHours();

    // Update global patterns
    const currentCount = this.predictiveModel.globalPatterns.popularKeys.get(key) || 0;
    this.predictiveModel.globalPatterns.popularKeys.set(key, currentCount + 1);

    if (!this.predictiveModel.globalPatterns.timeBasedAccess.has(hour)) {
      this.predictiveModel.globalPatterns.timeBasedAccess.set(hour, new Set());
    }
    this.predictiveModel.globalPatterns.timeBasedAccess.get(hour)!.add(key);

    // Update user patterns if user is known
    if (userId) {
      if (!this.predictiveModel.userPatterns.has(userId)) {
        this.predictiveModel.userPatterns.set(userId, {
          accessFrequency: new Map(),
          accessTimes: new Map(),
          lastAccess: new Map()
        });
      }

      const userPattern = this.predictiveModel.userPatterns.get(userId)!;
      
      // Update frequency
      const frequency = userPattern.accessFrequency.get(key) || 0;
      userPattern.accessFrequency.set(key, frequency + 1);

      // Update access times
      if (!userPattern.accessTimes.has(key)) {
        userPattern.accessTimes.set(key, []);
      }
      userPattern.accessTimes.get(key)!.push(now);

      // Update last access
      const lastKey = Array.from(userPattern.lastAccess.entries())
        .sort(([, a], [, b]) => b - a)[0]?.[0];
      
      if (lastKey && lastKey !== key) {
        // Learn sequential pattern
        if (!this.predictiveModel.globalPatterns.sequentialPatterns.has(lastKey)) {
          this.predictiveModel.globalPatterns.sequentialPatterns.set(lastKey, []);
        }
        const sequence = this.predictiveModel.globalPatterns.sequentialPatterns.get(lastKey)!;
        if (!sequence.includes(key)) {
          sequence.push(key);
        }
      }

      userPattern.lastAccess.set(key, now);
    }
  }

  /**
   * Get warming job status
   */
  getJobStatus(jobId: string): WarmingJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel warming job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') {
      return false;
    }

    job.status = 'cancelled';
    this.runningJobs.delete(jobId);

    this.performanceCollector.recordMetric({
      name: 'cache.warming_job_cancelled',
      type: 'counter',
      value: 1,
      unit: 'count'
    });

    return true;
  }

  /**
   * Get warming statistics
   */
  getStats(): WarmingStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get predictive model insights
   */
  getPredictiveInsights(): {
    topPopularKeys: Array<{ key: string; accessCount: number }>;
    peakHours: Array<{ hour: number; keyCount: number }>;
    userPredictionAccuracy: number;
    sequentialPatterns: Array<{ key: string; nextKeys: string[] }>;
  } {
    const topPopularKeys = Array.from(this.predictiveModel.globalPatterns.popularKeys.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([key, count]) => ({ key, accessCount: count }));

    const peakHours = Array.from(this.predictiveModel.globalPatterns.timeBasedAccess.entries())
      .map(([hour, keys]) => ({ hour, keyCount: keys.size }))
      .sort((a, b) => b.keyCount - a.keyCount);

    const sequentialPatterns = Array.from(this.predictiveModel.globalPatterns.sequentialPatterns.entries())
      .filter(([, nextKeys]) => nextKeys.length > 1)
      .slice(0, 10)
      .map(([key, nextKeys]) => ({ key, nextKeys: [...nextKeys] }));

    return {
      topPopularKeys,
      peakHours,
      userPredictionAccuracy: this.stats.predictiveAccuracy,
      sequentialPatterns
    };
  }

  /**
   * Export warming configuration
   */
  exportConfig(): {
    rules: WarmingRule[];
    predictiveModel: any; // Simplified for export
  } {
    return {
      rules: Array.from(this.rules.values()),
      predictiveModel: {
        popularKeys: Array.from(this.predictiveModel.globalPatterns.popularKeys.entries()),
        timeBasedAccess: Array.from(this.predictiveModel.globalPatterns.timeBasedAccess.entries())
          .map(([hour, keys]) => [hour, Array.from(keys)]),
        sequentialPatterns: Array.from(this.predictiveModel.globalPatterns.sequentialPatterns.entries())
      }
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private predictUserKeys(userId: string, limit: number): string[] {
    const userPattern = this.predictiveModel.userPatterns.get(userId);
    if (!userPattern) {
      return [];
    }

    // Get keys sorted by frequency and recency
    const scoredKeys = Array.from(userPattern.accessFrequency.entries())
      .map(([key, frequency]) => {
        const lastAccess = userPattern.lastAccess.get(key) || 0;
        const recencyScore = Math.max(0, 1 - (Date.now() - lastAccess) / 86400000); // Decay over 24 hours
        const frequencyScore = Math.min(1, frequency / 10); // Normalize frequency
        return {
          key,
          score: (frequencyScore * 0.7) + (recencyScore * 0.3)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredKeys.map(item => item.key);
  }

  private addJobToQueue(job: WarmingJob): void {
    // Insert job in priority order
    const priorityOrder: WarmingPriority[] = ['critical', 'high', 'medium', 'low'];
    const jobPriorityIndex = priorityOrder.indexOf(job.priority);
    
    let insertIndex = this.jobQueue.length;
    for (let i = 0; i < this.jobQueue.length; i++) {
      const queuedJobPriorityIndex = priorityOrder.indexOf(this.jobQueue[i].priority);
      if (jobPriorityIndex < queuedJobPriorityIndex) {
        insertIndex = i;
        break;
      }
    }

    this.jobQueue.splice(insertIndex, 0, job);
    this.processJobQueue();
  }

  private async processJobQueue(): Promise<void> {
    if (this.isProcessing || this.runningJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    this.isProcessing = true;

    while (this.jobQueue.length > 0 && this.runningJobs.size < this.maxConcurrentJobs) {
      const job = this.jobQueue.shift()!;
      if (job.status === 'cancelled') continue;

      this.runningJobs.add(job.id);
      this.executeJob(job).catch(error => {
        console.error(`Job execution failed for ${job.id}:`, error);
      });
    }

    this.isProcessing = false;
  }

  private async executeJob(job: WarmingJob): Promise<void> {
    const rule = this.rules.get(job.ruleId);
    if (!rule) {
      job.status = 'failed';
      job.errors.push({
        key: 'rule',
        error: 'Warming rule not found',
        timestamp: Date.now()
      });
      this.runningJobs.delete(job.id);
      return;
    }

    job.status = 'running';
    job.startTime = Date.now();

    console.log(`Starting warming job '${job.id}' with ${job.keys.length} keys`);

    try {
      await this.processJobKeys(job, rule);
      
      job.status = 'completed';
      job.endTime = Date.now();
      rule.successCount++;
      rule.lastExecuted = Date.now();
      this.stats.completedJobs++;

      this.performanceCollector.recordMetric({
        name: 'cache.warming_job_completed',
        type: 'timer',
        value: job.endTime - job.startTime!,
        unit: 'milliseconds',
        tags: {
          keys_count: job.keys.length.toString(),
          priority: job.priority
        }
      });

    } catch (error) {
      job.status = 'failed';
      job.endTime = Date.now();
      rule.failureCount++;
      this.stats.failedJobs++;

      job.errors.push({
        key: 'job',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      console.error(`Warming job '${job.id}' failed:`, error);
    }

    this.runningJobs.delete(job.id);
    this.processJobQueue();
  }

  private async processJobKeys(job: WarmingJob, rule: WarmingRule): Promise<void> {
    const batches = this.createBatches(job.keys, rule.batchSize);
    
    for (const batch of batches) {
      if (job.status === 'cancelled') break;

      const batchPromises = batch.map(key => 
        this.warmSingleKey(key, rule, job).catch(error => {
          job.errors.push({
            key,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
          });
          job.progress.failed++;
          return null;
        })
      );

      const results = await Promise.allSettled(batchPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value !== null) {
          job.progress.completed++;
          this.stats.keysWarmed++;
        }
      });

      // Rate limiting between batches
      if (rule.retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, rule.retryDelay));
      }
    }
  }

  private async warmSingleKey(key: string, rule: WarmingRule, job: WarmingJob): Promise<boolean> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= rule.retryAttempts) {
      try {
        const value = await rule.dataLoader(key);
        
        // Store in all registered cache managers
        const storePromises = Array.from(this.cacheManagers.values()).map(cacheManager =>
          cacheManager.set(key, value, undefined, { warmingJob: job.id })
        );

        await Promise.all(storePromises);
        return true;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;
        
        if (attempts <= rule.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, rule.retryDelay * attempts));
        }
      }
    }

    throw lastError || new Error('Unknown warming error');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private scheduleRule(rule: WarmingRule): void {
    if (!rule.schedule) return;

    if (rule.schedule.immediate) {
      // Execute immediately
      this.executeRuleWarming(rule);
    }

    if (rule.schedule.interval) {
      // Set up interval-based scheduling
      const interval = setInterval(() => {
        this.executeRuleWarming(rule);
      }, rule.schedule.interval);

      this.scheduledJobs.set(rule.id, interval);
      this.stats.scheduledWarmings++;
    }

    // TODO: Implement cron-based scheduling if needed
  }

  private async executeRuleWarming(rule: WarmingRule): Promise<void> {
    try {
      // Generate keys based on rule pattern
      const keys = await this.generateKeysFromRule(rule);
      if (keys.length > 0) {
        await this.warmKeys(keys, rule.id, rule.priority);
      }
    } catch (error) {
      console.error(`Scheduled warming failed for rule '${rule.name}':`, error);
    }
  }

  private async generateKeysFromRule(rule: WarmingRule): Promise<string[]> {
    // This is a simplified implementation
    // In practice, this would analyze the pattern and generate appropriate keys
    if (typeof rule.pattern === 'string') {
      return [rule.pattern]; // Simplified
    }
    return [];
  }

  private getDefaultRule(): WarmingRule {
    return {
      id: 'default',
      name: 'Default Warming Rule',
      strategy: 'eager',
      priority: 'medium',
      pattern: '*',
      dataLoader: async () => null,
      batchSize: 10,
      maxConcurrency: 3,
      retryAttempts: 2,
      retryDelay: 1000,
      enabled: true,
      createdAt: Date.now(),
      successCount: 0,
      failureCount: 0
    };
  }

  private setupDefaultRules(): void {
    // Popular content warming
    this.addRule({
      name: 'Popular Content Warming',
      strategy: 'scheduled',
      priority: 'medium',
      pattern: /^(test_history|user|folder):.*/,
      dataLoader: async () => ({}), // Placeholder
      schedule: {
        interval: 3600000, // Every hour
        immediate: false
      },
      batchSize: 20,
      maxConcurrency: 2,
      retryAttempts: 1,
      retryDelay: 2000,
      enabled: true
    });
  }

  private startJobProcessor(): void {
    setInterval(() => {
      this.processJobQueue();
    }, 5000); // Check queue every 5 seconds
  }

  private startPatternLearning(): void {
    // Clean up old patterns periodically
    setInterval(() => {
      this.cleanupOldPatterns();
    }, 3600000); // Every hour
  }

  private cleanupOldPatterns(): void {
    const cutoff = Date.now() - 604800000; // 7 days ago

    for (const [userId, userPattern] of this.predictiveModel.userPatterns) {
      // Remove old access times
      for (const [key, times] of userPattern.accessTimes) {
        const recentTimes = times.filter(time => time > cutoff);
        if (recentTimes.length === 0) {
          userPattern.accessTimes.delete(key);
          userPattern.accessFrequency.delete(key);
          userPattern.lastAccess.delete(key);
        } else {
          userPattern.accessTimes.set(key, recentTimes);
        }
      }

      // Remove users with no recent activity
      if (userPattern.accessTimes.size === 0) {
        this.predictiveModel.userPatterns.delete(userId);
      }
    }
  }

  private updateStats(): void {
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    size += this.predictiveModel.userPatterns.size * 1000; // Rough per-user overhead
    size += this.predictiveModel.globalPatterns.popularKeys.size * 100;
    size += this.jobs.size * 500;
    return size;
  }

  private generateRuleId(name: string): string {
    return `warming_rule_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private generateJobId(): string {
    return `warming_job_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
