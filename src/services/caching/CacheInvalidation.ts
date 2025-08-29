/**
 * Intelligent Cache Invalidation Service
 * Provides sophisticated cache invalidation strategies and dependency tracking
 */

import { CacheManager } from './CacheManager';
import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export type InvalidationStrategy = 'immediate' | 'lazy' | 'scheduled' | 'dependency-based';
export type InvalidationEventType = 'create' | 'update' | 'delete' | 'expire' | 'manual';

export interface InvalidationRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  strategy: InvalidationStrategy;
  dependencies?: string[];
  conditions?: Array<{
    field: string;
    operator: '=' | '!=' | '>' | '<' | 'contains' | 'regex';
    value: any;
  }>;
  delay?: number; // milliseconds for scheduled invalidation
  enabled: boolean;
  priority: number; // 1-10, higher = more priority
  createdAt: number;
  lastTriggered?: number;
  triggerCount: number;
}

export interface InvalidationEvent {
  id: string;
  type: InvalidationEventType;
  entityType: string;
  entityId: string;
  timestamp: number;
  metadata?: Record<string, any>;
  triggeredRules: string[];
}

export interface DependencyGraph {
  nodes: Map<string, Set<string>>; // key -> dependent keys
  reverseNodes: Map<string, Set<string>>; // key -> keys it depends on
}

export interface InvalidationStats {
  totalInvalidations: number;
  invalidationsByStrategy: Record<InvalidationStrategy, number>;
  invalidationsByEvent: Record<string, number>;
  averageInvalidationTime: number;
  rulesProcessed: number;
  dependenciesResolved: number;
  scheduledInvalidations: number;
  failedInvalidations: number;
}

export class CacheInvalidation {
  private static instance: CacheInvalidation;
  private cacheManagers = new Map<string, CacheManager>();
  private rules = new Map<string, InvalidationRule>();
  private dependencyGraph: DependencyGraph;
  private scheduledInvalidations = new Map<string, NodeJS.Timeout>();
  private eventHistory: InvalidationEvent[] = [];
  private stats: InvalidationStats;
  private performanceCollector: PerformanceCollector;

  private constructor() {
    this.dependencyGraph = {
      nodes: new Map(),
      reverseNodes: new Map()
    };

    this.stats = {
      totalInvalidations: 0,
      invalidationsByStrategy: {
        immediate: 0,
        lazy: 0,
        scheduled: 0,
        'dependency-based': 0
      },
      invalidationsByEvent: {},
      averageInvalidationTime: 0,
      rulesProcessed: 0,
      dependenciesResolved: 0,
      scheduledInvalidations: 0,
      failedInvalidations: 0
    };

    this.performanceCollector = PerformanceCollector.getInstance();
    this.setupDefaultRules();
    this.startCleanupTasks();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheInvalidation {
    if (!CacheInvalidation.instance) {
      CacheInvalidation.instance = new CacheInvalidation();
    }
    return CacheInvalidation.instance;
  }

  /**
   * Register a cache manager
   */
  registerCacheManager(name: string, cacheManager: CacheManager): void {
    this.cacheManagers.set(name, cacheManager);
    console.log(`Cache manager '${name}' registered for invalidation`);
  }

  /**
   * Add invalidation rule
   */
  addRule(rule: Omit<InvalidationRule, 'id' | 'createdAt' | 'triggerCount'>): string {
    const id = this.generateRuleId(rule.name);
    const fullRule: InvalidationRule = {
      id,
      createdAt: Date.now(),
      triggerCount: 0,
      ...rule
    };

    this.rules.set(id, fullRule);
    
    this.performanceCollector.recordMetric({
      name: 'cache.invalidation_rule_added',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: { 
        strategy: rule.strategy,
        pattern: typeof rule.pattern === 'string' ? rule.pattern : 'regex'
      }
    });

    console.log(`Invalidation rule '${rule.name}' added with ID: ${id}`);
    return id;
  }

  /**
   * Remove invalidation rule
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    // Cancel any scheduled invalidations for this rule
    if (this.scheduledInvalidations.has(ruleId)) {
      clearTimeout(this.scheduledInvalidations.get(ruleId)!);
      this.scheduledInvalidations.delete(ruleId);
    }

    this.rules.delete(ruleId);
    
    this.performanceCollector.recordMetric({
      name: 'cache.invalidation_rule_removed',
      type: 'counter',
      value: 1,
      unit: 'count'
    });

    return true;
  }

  /**
   * Add dependency relationship
   */
  addDependency(key: string, dependsOn: string): void {
    // Add forward dependency
    if (!this.dependencyGraph.nodes.has(dependsOn)) {
      this.dependencyGraph.nodes.set(dependsOn, new Set());
    }
    this.dependencyGraph.nodes.get(dependsOn)!.add(key);

    // Add reverse dependency
    if (!this.dependencyGraph.reverseNodes.has(key)) {
      this.dependencyGraph.reverseNodes.set(key, new Set());
    }
    this.dependencyGraph.reverseNodes.get(key)!.add(dependsOn);

    console.log(`Dependency added: '${key}' depends on '${dependsOn}'`);
  }

  /**
   * Remove dependency relationship
   */
  removeDependency(key: string, dependsOn: string): void {
    this.dependencyGraph.nodes.get(dependsOn)?.delete(key);
    this.dependencyGraph.reverseNodes.get(key)?.delete(dependsOn);
  }

  /**
   * Invalidate cache entries based on event
   */
  async invalidate(
    eventType: InvalidationEventType,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();
    const eventId = this.generateEventId();
    const triggeredRules: string[] = [];

    try {
      // Find matching rules
      const matchingRules = this.findMatchingRules(eventType, entityType, entityId, metadata);
      
      // Sort rules by priority (higher first)
      matchingRules.sort((a, b) => b.priority - a.priority);

      // Process each matching rule
      for (const rule of matchingRules) {
        if (!rule.enabled) continue;

        try {
          await this.processRule(rule, eventType, entityType, entityId, metadata);
          triggeredRules.push(rule.id);
          rule.triggerCount++;
          rule.lastTriggered = Date.now();
          this.stats.rulesProcessed++;
        } catch (error) {
          console.error(`Failed to process invalidation rule '${rule.name}':`, error);
          this.stats.failedInvalidations++;
        }
      }

      // Record event
      const event: InvalidationEvent = {
        id: eventId,
        type: eventType,
        entityType,
        entityId,
        timestamp: Date.now(),
        metadata: metadata || {},
        triggeredRules
      };

      this.eventHistory.push(event);
      this.cleanupEventHistory();

      // Update statistics
      this.stats.totalInvalidations++;
      this.stats.invalidationsByEvent[eventType] = (this.stats.invalidationsByEvent[eventType] || 0) + 1;
      this.updateAverageInvalidationTime(Date.now() - startTime);

      // Record performance metrics
      this.performanceCollector.recordMetric({
        name: 'cache.invalidation_processed',
        type: 'timer',
        value: Date.now() - startTime,
        unit: 'milliseconds',
        tags: {
          event_type: eventType,
          entity_type: entityType,
          rules_triggered: triggeredRules.length.toString()
        }
      });

    } catch (error) {
      console.error('Cache invalidation failed:', error);
      this.stats.failedInvalidations++;
      throw error;
    }
  }

  /**
   * Invalidate by pattern across all cache managers
   */
  async invalidatePattern(pattern: string | RegExp, reason?: string): Promise<number> {
    const startTime = Date.now();
    let totalInvalidated = 0;

    for (const [name, cacheManager] of this.cacheManagers) {
      try {
        const count = await cacheManager.invalidatePattern(pattern);
        totalInvalidated += count;
        
        console.log(`Invalidated ${count} entries from cache '${name}' with pattern: ${pattern}`);
      } catch (error) {
        console.error(`Failed to invalidate pattern in cache '${name}':`, error);
      }
    }

    this.performanceCollector.recordMetric({
      name: 'cache.pattern_invalidation_bulk',
      type: 'counter',
      value: totalInvalidated,
      unit: 'count',
      tags: {
        pattern: pattern.toString(),
        reason: reason || 'manual',
        duration: (Date.now() - startTime).toString()
      }
    });

    return totalInvalidated;
  }

  /**
   * Invalidate dependencies of a key
   */
  async invalidateDependencies(key: string): Promise<number> {
    const dependencies = this.dependencyGraph.nodes.get(key);
    if (!dependencies || dependencies.size === 0) {
      return 0;
    }

    let totalInvalidated = 0;
    const invalidationPromises: Promise<void>[] = [];

    for (const dependentKey of dependencies) {
      for (const [, cacheManager] of this.cacheManagers) {
        invalidationPromises.push(
          cacheManager.delete(dependentKey).then(success => {
            if (success) totalInvalidated++;
          })
        );
      }

      // Recursively invalidate dependencies of dependencies
      invalidationPromises.push(
        this.invalidateDependencies(dependentKey).then(count => {
          totalInvalidated += count;
        })
      );
    }

    await Promise.all(invalidationPromises);

    this.stats.dependenciesResolved += totalInvalidated;
    
    this.performanceCollector.recordMetric({
      name: 'cache.dependency_invalidation',
      type: 'counter',
      value: totalInvalidated,
      unit: 'count',
      tags: { root_key: key }
    });

    return totalInvalidated;
  }

  /**
   * Schedule invalidation for later execution
   */
  scheduleInvalidation(
    delay: number,
    pattern: string | RegExp,
    reason?: string
  ): string {
    const scheduleId = this.generateScheduleId();
    
    const timeout = setTimeout(async () => {
      try {
        await this.invalidatePattern(pattern, reason);
        this.scheduledInvalidations.delete(scheduleId);
        
        this.performanceCollector.recordMetric({
          name: 'cache.scheduled_invalidation_executed',
          type: 'counter',
          value: 1,
          unit: 'count',
          tags: { pattern: pattern.toString() }
        });
      } catch (error) {
        console.error('Scheduled invalidation failed:', error);
      }
    }, delay);

    this.scheduledInvalidations.set(scheduleId, timeout);
    this.stats.scheduledInvalidations++;

    console.log(`Invalidation scheduled for ${delay}ms with pattern: ${pattern}`);
    return scheduleId;
  }

  /**
   * Cancel scheduled invalidation
   */
  cancelScheduledInvalidation(scheduleId: string): boolean {
    const timeout = this.scheduledInvalidations.get(scheduleId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledInvalidations.delete(scheduleId);
      return true;
    }
    return false;
  }

  /**
   * Get invalidation statistics
   */
  getStats(): InvalidationStats {
    return { ...this.stats };
  }

  /**
   * Get recent invalidation events
   */
  getRecentEvents(limit: number = 50): InvalidationEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get dependency graph information
   */
  getDependencyInfo(): {
    totalDependencies: number;
    mostDependentKeys: Array<{ key: string; dependentCount: number }>;
    circularDependencies: string[][];
  } {
    const mostDependent = Array.from(this.dependencyGraph.nodes.entries())
      .map(([key, deps]) => ({ key, dependentCount: deps.size }))
      .sort((a, b) => b.dependentCount - a.dependentCount)
      .slice(0, 10);

    const circularDependencies = this.detectCircularDependencies();

    return {
      totalDependencies: this.dependencyGraph.nodes.size,
      mostDependentKeys: mostDependent,
      circularDependencies
    };
  }

  /**
   * Export invalidation rules for backup
   */
  exportRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Import invalidation rules from backup
   */
  importRules(rules: InvalidationRule[]): void {
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }
    console.log(`Imported ${rules.length} invalidation rules`);
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private findMatchingRules(
    _eventType: InvalidationEventType,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ): InvalidationRule[] {
    const matchingRules: InvalidationRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check pattern match
      const testString = `${entityType}:${entityId}`;
      const patternMatch = typeof rule.pattern === 'string' 
        ? testString.includes(rule.pattern)
        : rule.pattern.test(testString);

      if (!patternMatch) continue;

      // Check conditions
      if (rule.conditions && !this.evaluateConditions(rule.conditions, metadata)) {
        continue;
      }

      matchingRules.push(rule);
    }

    return matchingRules;
  }

  private evaluateConditions(
    conditions: InvalidationRule['conditions'],
    metadata?: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    if (!metadata) return false;

    return conditions.every(condition => {
      const value = metadata[condition.field];
      
      switch (condition.operator) {
        case '=':
          return value === condition.value;
        case '!=':
          return value !== condition.value;
        case '>':
          return value > condition.value;
        case '<':
          return value < condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'regex':
          return new RegExp(condition.value).test(String(value));
        default:
          return false;
      }
    });
  }

  private async processRule(
    rule: InvalidationRule,
    _eventType: InvalidationEventType,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const pattern = this.buildInvalidationPattern(rule, entityType, entityId, metadata);
    
    switch (rule.strategy) {
      case 'immediate':
        await this.invalidatePattern(pattern, `Rule: ${rule.name}`);
        this.stats.invalidationsByStrategy.immediate++;
        break;

      case 'lazy':
        // Mark for lazy invalidation (implement lazy loading check in cache manager)
        this.stats.invalidationsByStrategy.lazy++;
        break;

      case 'scheduled':
        if (rule.delay) {
          this.scheduleInvalidation(rule.delay, pattern, `Scheduled rule: ${rule.name}`);
        }
        this.stats.invalidationsByStrategy.scheduled++;
        break;

      case 'dependency-based':
        const key = `${entityType}:${entityId}`;
        await this.invalidateDependencies(key);
        this.stats.invalidationsByStrategy['dependency-based']++;
        break;
    }
  }

  private buildInvalidationPattern(
    rule: InvalidationRule,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ): string | RegExp {
    if (typeof rule.pattern === 'string') {
      return rule.pattern
        .replace('{entityType}', entityType)
        .replace('{entityId}', entityId)
        .replace('{userId}', metadata?.userId || '*');
    }
    
    return rule.pattern;
  }

  private setupDefaultRules(): void {
    // User data invalidation
    this.addRule({
      name: 'User Profile Update',
      pattern: 'user:{entityId}:*',
      strategy: 'immediate',
      enabled: true,
      priority: 9
    });

    // Test history invalidation
    this.addRule({
      name: 'Test Completion',
      pattern: /test_history:.*/,
      strategy: 'immediate',
      enabled: true,
      priority: 8
    });

    // Folder changes invalidation
    this.addRule({
      name: 'Folder Changes',
      pattern: 'folder:{entityId}:*',
      strategy: 'dependency-based',
      enabled: true,
      priority: 7
    });

    // Analytics data scheduled refresh
    this.addRule({
      name: 'Analytics Refresh',
      pattern: /analytics:.*/,
      strategy: 'scheduled',
      delay: 300000, // 5 minutes
      enabled: true,
      priority: 5
    });
  }

  private detectCircularDependencies(): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (key: string, path: string[]): void => {
      if (recursionStack.has(key)) {
        const cycleStart = path.indexOf(key);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat([key]));
        }
        return;
      }

      if (visited.has(key)) return;

      visited.add(key);
      recursionStack.add(key);
      path.push(key);

      const dependencies = this.dependencyGraph.reverseNodes.get(key);
      if (dependencies) {
        for (const dep of dependencies) {
          dfs(dep, [...path]);
        }
      }

      recursionStack.delete(key);
      path.pop();
    };

    for (const key of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(key)) {
        dfs(key, []);
      }
    }

    return cycles;
  }

  private generateRuleId(name: string): string {
    return `rule_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private updateAverageInvalidationTime(newTime: number): void {
    const count = this.stats.totalInvalidations;
    this.stats.averageInvalidationTime = ((this.stats.averageInvalidationTime * (count - 1)) + newTime) / count;
  }

  private cleanupEventHistory(): void {
    const maxEvents = 1000;
    if (this.eventHistory.length > maxEvents) {
      this.eventHistory = this.eventHistory.slice(-maxEvents);
    }
  }

  private startCleanupTasks(): void {
    // Clean up old events every hour
    setInterval(() => {
      const cutoff = Date.now() - 86400000; // 24 hours ago
      this.eventHistory = this.eventHistory.filter(event => event.timestamp > cutoff);
    }, 3600000);

    // Clean up completed scheduled invalidations
    setInterval(() => {
      // This is a simplified cleanup - in production, you might track completion differently
      // For now, we'll just let the Map grow and rely on the timeout completion to clean up
      console.log(`Scheduled invalidations active: ${this.scheduledInvalidations.size}`);
    }, 300000); // Every 5 minutes
  }
}
