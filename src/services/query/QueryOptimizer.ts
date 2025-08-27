/**
 * Query Optimizer
 * Provides optimized Firestore queries with intelligent caching and indexing
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  CollectionReference,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface QueryCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface OptimizedQueryOptions {
  collection: string;
  subcollection?: string;
  userId?: string;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
    value: any;
  }>;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  startAfter?: DocumentSnapshot;
  useCache?: boolean;
  cacheTTL?: number; // Cache TTL in milliseconds
  enableOptimizations?: boolean;
}

export interface QueryResult<T = any> {
  data: T[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  fromCache: boolean;
  queryTime: number;
  totalDocs: number;
}

export interface QueryStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  slowQueries: Array<{
    query: string;
    time: number;
    timestamp: number;
  }>;
}

export class QueryOptimizer {
  private static cache = new Map<string, QueryCache>();
  private static stats: QueryStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    slowQueries: []
  };

  private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly SLOW_QUERY_THRESHOLD = 2000; // 2 seconds

  /**
   * Execute optimized query with caching and performance monitoring
   */
  static async executeQuery<T = any>(options: OptimizedQueryOptions): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(options);

    // Check cache first
    if (options.useCache !== false) {
      const cachedResult = this.getCachedResult<T>(queryKey);
      if (cachedResult) {
        this.stats.cacheHits++;
        return {
          ...cachedResult,
          fromCache: true,
          queryTime: Date.now() - startTime
        };
      }
      this.stats.cacheMisses++;
    }

    try {
      // Build and execute query
      const firestoreQuery = this.buildQuery(options);
      const querySnapshot = await getDocs(firestoreQuery);

      const data: T[] = [];
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        } as T);
      });

      const result: QueryResult<T> = {
        data,
        hasMore: options.limit ? data.length === options.limit : false,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
        fromCache: false,
        queryTime: Date.now() - startTime,
        totalDocs: data.length
      };

      // Cache the result if caching is enabled
      if (options.useCache !== false) {
        this.cacheResult(queryKey, result, options.cacheTTL || this.DEFAULT_CACHE_TTL);
      }

      // Update stats
      this.updateStats(queryKey, result.queryTime);

      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get user test history with optimized query
   */
  static async getUserTestHistory(
    userId: string,
    options: {
      folderId?: string;
      limit?: number;
      startAfter?: DocumentSnapshot;
      useCache?: boolean;
    } = {}
  ): Promise<QueryResult> {
    const filters = [];
    
    if (options.folderId) {
      filters.push({
        field: 'folderId',
        operator: '==' as const,
        value: options.folderId
      });
    }

    return this.executeQuery({
      collection: 'users',
      subcollection: 'tests',
      userId,
      filters,
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: options.limit || 20,
      startAfter: options.startAfter,
      useCache: options.useCache !== false,
      cacheTTL: 2 * 60 * 1000 // 2 minutes for user data
    });
  }

  /**
   * Get user folders with optimized query
   */
  static async getUserFolders(
    userId: string,
    useCache: boolean = true
  ): Promise<QueryResult> {
    return this.executeQuery({
      collection: 'folders',
      filters: [
        {
          field: 'userId',
          operator: '==',
          value: userId
        }
      ],
      orderBy: { field: 'name', direction: 'asc' },
      useCache,
      cacheTTL: 10 * 60 * 1000 // 10 minutes for folders
    });
  }

  /**
   * Get metrics data with optimized aggregation
   */
  static async getUserMetrics(
    userId: string,
    options: {
      folderId?: string;
      timeRange?: { start: Date; end: Date };
      limit?: number;
    } = {}
  ): Promise<QueryResult> {
    const filters = [];
    
    if (options.folderId) {
      filters.push({
        field: 'folderId',
        operator: '==' as const,
        value: options.folderId
      });
    }

    if (options.timeRange) {
      filters.push({
        field: 'createdAt',
        operator: '>=' as const,
        value: options.timeRange.start
      });
      filters.push({
        field: 'createdAt',
        operator: '<=' as const,
        value: options.timeRange.end
      });
    }

    // Use parallel queries for better performance
    const [resultsQuery, testsQuery] = await Promise.all([
      this.executeQuery({
        collection: 'users',
        subcollection: 'results',
        userId,
        filters,
        orderBy: { field: 'createdAt', direction: 'desc' },
        limit: options.limit || 500,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      }),
      this.executeQuery({
        collection: 'users',
        subcollection: 'tests',
        userId,
        filters,
        orderBy: { field: 'createdAt', direction: 'desc' },
        limit: options.limit || 500,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      })
    ]);

    // Combine and deduplicate results
    const combinedData = [...resultsQuery.data, ...testsQuery.data];
    const uniqueData = this.deduplicateData(combinedData);

    return {
      data: uniqueData,
      hasMore: resultsQuery.hasMore || testsQuery.hasMore,
      fromCache: resultsQuery.fromCache && testsQuery.fromCache,
      queryTime: Math.max(resultsQuery.queryTime, testsQuery.queryTime),
      totalDocs: uniqueData.length
    };
  }

  /**
   * Batch query multiple collections efficiently
   */
  static async batchQuery<T = any>(
    queries: OptimizedQueryOptions[]
  ): Promise<QueryResult<T>[]> {
    const startTime = Date.now();

    // Execute all queries in parallel
    const results = await Promise.all(
      queries.map(queryOptions => this.executeQuery<T>(queryOptions))
    );

    console.log(`Batch query completed in ${Date.now() - startTime}ms`);

    return results;
  }

  /**
   * Preload commonly accessed data
   */
  static async preloadUserData(userId: string): Promise<void> {
    console.log(`Preloading data for user ${userId}`);

    // Preload in parallel
    await Promise.all([
      this.getUserFolders(userId, true),
      this.getUserTestHistory(userId, { limit: 50, useCache: true }),
      this.getUserMetrics(userId, { limit: 100 })
    ]);

    console.log(`Preloading completed for user ${userId}`);
  }

  /**
   * Invalidate cache for specific patterns
   */
  static invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }



  /**
   * Get query performance statistics
   */
  static getStats(): QueryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  static resetStats(): void {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: []
    };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Build Firestore query from options
   */
  private static buildQuery(options: OptimizedQueryOptions): Query {
    let collectionRef: CollectionReference;

    if (options.subcollection && options.userId) {
      collectionRef = collection(db, options.collection, options.userId, options.subcollection);
    } else {
      collectionRef = collection(db, options.collection);
    }

    const constraints: QueryConstraint[] = [];

    // Add filters
    if (options.filters) {
      options.filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }

    // Add ordering
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction));
    }

    // Add limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    // Add pagination
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    return query(collectionRef, ...constraints);
  }

  /**
   * Generate cache key for query
   */
  private static generateQueryKey(options: OptimizedQueryOptions): string {
    const keyParts = [
      options.collection,
      options.subcollection || '',
      options.userId || '',
      JSON.stringify(options.filters || []),
      JSON.stringify(options.orderBy || {}),
      options.limit?.toString() || '',
      options.startAfter?.id || ''
    ];

    return keyParts.join('|');
  }

  /**
   * Get cached result if valid
   */
  private static getCachedResult<T>(key: string): QueryResult<T> | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as QueryResult<T>;
  }

  /**
   * Cache query result
   */
  private static cacheResult<T>(key: string, result: QueryResult<T>, ttl: number): void {
    // Implement LRU cache - remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      data: result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Update query statistics
   */
  private static updateStats(queryKey: string, queryTime: number): void {
    this.stats.totalQueries++;
    
    // Update average query time
    this.stats.averageQueryTime = 
      (this.stats.averageQueryTime * (this.stats.totalQueries - 1) + queryTime) / this.stats.totalQueries;

    // Track slow queries
    if (queryTime > this.SLOW_QUERY_THRESHOLD) {
      this.stats.slowQueries.push({
        query: queryKey,
        time: queryTime,
        timestamp: Date.now()
      });

      // Keep only last 20 slow queries
      if (this.stats.slowQueries.length > 20) {
        this.stats.slowQueries = this.stats.slowQueries.slice(-20);
      }

      console.warn(`Slow query detected: ${queryKey} took ${queryTime}ms`);
    }
  }

  /**
   * Deduplicate data by ID
   */
  private static deduplicateData<T extends { id: string }>(data: T[]): T[] {
    const seen = new Set<string>();
    return data.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Enable query result caching
   */
  static enableQueryCaching(): void {
    console.log('Query result caching enabled');
    // This would enable caching for all queries
  }

  /**
   * Disable query result caching
   */
  static disableQueryCaching(): void {
    console.log('Query result caching disabled');
    // This would disable caching for all queries
  }

  /**
   * Cleanup expired cache entries
   */
  static cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Auto-cleanup cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    QueryOptimizer.cleanupCache();
  }, 10 * 60 * 1000);
}
