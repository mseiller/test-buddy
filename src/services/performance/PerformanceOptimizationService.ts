import { FirebaseService } from '../firebaseService';

export interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  bundleSize: number;
  cacheHitRate: number;
  apiResponseTime: number;
  memoryUsage: number;
}

export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableCaching: boolean;
  enableCompression: boolean;
  enableCDN: boolean;
  enableServiceWorker: boolean;
  enablePreloading: boolean;
  enableImageOptimization: boolean;
  enableCodeSplitting: boolean;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
  enableCompression: boolean;
  enableVersioning: boolean;
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private performanceObserver: PerformanceObserver | null = null;
  private metrics: PerformanceMetrics[] = [];
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private config: PerformanceConfig;
  private cacheConfig: CacheConfig;

  private constructor() {
    this.config = {
      enableLazyLoading: true,
      enableCaching: true,
      enableCompression: true,
      enableCDN: true,
      enableServiceWorker: true,
      enablePreloading: true,
      enableImageOptimization: true,
      enableCodeSplitting: true
    };

    this.cacheConfig = {
      maxSize: 100,
      ttl: 5 * 60 * 1000, // 5 minutes
      strategy: 'LRU',
      enableCompression: true,
      enableVersioning: true
    };

    this.initializePerformanceMonitoring();
  }

  public static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Monitor navigation timing
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceEntry(entry);
          }
        });

        this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
      } catch (error) {
        console.warn('Performance monitoring initialization failed:', error);
      }
    }

    // Monitor bundle size
    this.monitorBundleSize();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor API performance
    this.monitorAPIPerformance();
  }

  /**
   * Record performance entry
   */
  private recordPerformanceEntry(entry: PerformanceEntry): void {
    const metrics: Partial<PerformanceMetrics> = {};

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
        metrics.timeToInteractive = navEntry.domInteractive - navEntry.fetchStart;
        break;

      case 'paint':
        const paintEntry = entry as PerformancePaintTiming;
        if (paintEntry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = paintEntry.startTime;
        }
        break;

      case 'largest-contentful-paint':
        const lcpEntry = entry as LargestContentfulPaint;
        metrics.largestContentfulPaint = lcpEntry.startTime;
        break;

      case 'layout-shift':
        const lsEntry = entry as LayoutShift;
        metrics.cumulativeLayoutShift = lsEntry.value;
        break;

      case 'first-input':
        const fiEntry = entry as FirstInputDelay;
        metrics.firstInputDelay = fiEntry.processingStart - fiEntry.startTime;
        break;
    }

    if (Object.keys(metrics).length > 0) {
      this.metrics.push({
        ...this.getDefaultMetrics(),
        ...metrics,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      pageLoadTime: 0,
      timeToInteractive: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      bundleSize: 0,
      cacheHitRate: 0,
      apiResponseTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * Monitor bundle size
   */
  private monitorBundleSize(): void {
    if (typeof window !== 'undefined') {
      // Estimate bundle size from performance entries
      const resources = performance.getEntriesByType('resource');
      const totalSize = resources.reduce((sum, resource) => {
        const size = (resource as PerformanceResourceTiming).transferSize || 0;
        return sum + size;
      }, 0);

      this.metrics.push({
        ...this.getDefaultMetrics(),
        bundleSize: totalSize,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        setInterval(() => {
          this.metrics.push({
            ...this.getDefaultMetrics(),
            memoryUsage: memory.usedJSHeapSize,
            timestamp: Date.now()
          });
        }, 30000); // Every 30 seconds
      }
    }
  }

  /**
   * Monitor API performance
   */
  private monitorAPIPerformance(): void {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        try {
          const response = await originalFetch(...args);
          const endTime = performance.now();
          
          this.metrics.push({
            ...this.getDefaultMetrics(),
            apiResponseTime: endTime - startTime,
            timestamp: Date.now()
          });
          
          return response;
        } catch (error) {
          const endTime = performance.now();
          
          this.metrics.push({
            ...this.getDefaultMetrics(),
            apiResponseTime: endTime - startTime,
            timestamp: Date.now()
          });
          
          throw error;
        }
      };
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const latest = this.metrics[this.metrics.length - 1];
    return latest || this.getDefaultMetrics();
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const metrics = this.getCurrentMetrics();
    let score = 100;

    // Deduct points for poor performance
    if (metrics.pageLoadTime > 3000) score -= 20;
    if (metrics.timeToInteractive > 5000) score -= 20;
    if (metrics.firstContentfulPaint > 2000) score -= 15;
    if (metrics.largestContentfulPaint > 4000) score -= 15;
    if (metrics.cumulativeLayoutShift > 0.1) score -= 10;
    if (metrics.firstInputDelay > 100) score -= 10;
    if (metrics.bundleSize > 500000) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Cache data with TTL
   */
  setCache(key: string, data: any, ttl?: number): void {
    if (!this.config.enableCaching) return;

    const timestamp = Date.now();
    const cacheTTL = ttl || this.cacheConfig.ttl;

    // Implement LRU cache eviction
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp,
      ttl: cacheTTL
    });
  }

  /**
   * Get cached data
   */
  getCache(key: string): any | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; keys: string[] } {
    const keys = Array.from(this.cache.keys());
    const hitRate = this.calculateCacheHitRate();
    
    return {
      size: this.cache.size,
      hitRate,
      keys
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track actual hits vs misses
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder
  }

  /**
   * Enable lazy loading for images
   */
  enableLazyLoading(): void {
    if (!this.config.enableLazyLoading) return;

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src attribute
      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources(): void {
    if (!this.config.enablePreloading) return;

    const criticalResources = [
      '/api/auth/user',
      '/api/usage',
      '/api/folders'
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize images
   */
  optimizeImages(): void {
    if (!this.config.enableImageOptimization) return;

    if (typeof window !== 'undefined') {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        
        // Add loading="lazy" for images below the fold
        if (imgElement.offsetTop > window.innerHeight) {
          imgElement.loading = 'lazy';
        }
        
        // Add srcset for responsive images
        if (!imgElement.srcset) {
          const src = imgElement.src;
          if (src) {
            imgElement.srcset = `${src} 1x, ${src.replace(/\.(\w+)$/, '@2x.$1')} 2x`;
          }
        }
      });
    }
  }

  /**
   * Enable code splitting
   */
  enableCodeSplitting(): void {
    if (!this.config.enableCodeSplitting) return;

    // This would typically be handled by the bundler (webpack, vite, etc.)
    // Here we can add runtime code splitting logic
    console.log('Code splitting enabled - ensure your bundler is configured for dynamic imports');
  }

  /**
   * Compress data
   */
  async compressData(data: any): Promise<ArrayBuffer> {
    if (!this.config.enableCompression) {
      return new TextEncoder().encode(JSON.stringify(data)).buffer;
    }

    try {
      const jsonString = JSON.stringify(data);
      const textEncoder = new TextEncoder();
      const uint8Array = textEncoder.encode(jsonString);
      
      // Use CompressionStream if available
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        await writer.write(uint8Array);
        await writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const compressedLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(compressedLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return compressed.buffer;
      } else {
        // Fallback to no compression
        return uint8Array.buffer;
      }
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
      return new TextEncoder().encode(JSON.stringify(data)).buffer;
    }
  }

  /**
   * Decompress data
   */
  async decompressData(compressedData: ArrayBuffer): Promise<any> {
    if (!this.config.enableCompression) {
      const uint8Array = new Uint8Array(compressedData);
      const jsonString = new TextDecoder().decode(uint8Array);
      return JSON.parse(jsonString);
    }

    try {
      // Use DecompressionStream if available
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        await writer.write(compressedData);
        await writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const decompressedLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const decompressed = new Uint8Array(decompressedLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        const jsonString = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonString);
      } else {
        // Fallback to no compression
        const uint8Array = new Uint8Array(compressedData);
        const jsonString = new TextDecoder().decode(uint8Array);
        return JSON.parse(jsonString);
      }
    } catch (error) {
      console.warn('Decompression failed, using compressed data as-is:', error);
      return compressedData;
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): any {
    const currentMetrics = this.getCurrentMetrics();
    const score = this.getPerformanceScore();
    const cacheStats = this.getCacheStats();
    
    return {
      timestamp: new Date().toISOString(),
      score,
      metrics: currentMetrics,
      cache: cacheStats,
      recommendations: this.generateRecommendations(currentMetrics, score),
      history: this.getMetricsHistory(10)
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, score: number): string[] {
    const recommendations: string[] = [];
    
    if (score < 80) {
      if (metrics.pageLoadTime > 3000) {
        recommendations.push('Optimize page load time by reducing bundle size and implementing lazy loading');
      }
      
      if (metrics.timeToInteractive > 5000) {
        recommendations.push('Improve time to interactive by optimizing JavaScript execution and reducing blocking resources');
      }
      
      if (metrics.firstContentfulPaint > 2000) {
        recommendations.push('Optimize first contentful paint by improving server response time and critical rendering path');
      }
      
      if (metrics.largestContentfulPaint > 4000) {
        recommendations.push('Optimize largest contentful paint by optimizing images and reducing layout shifts');
      }
      
      if (metrics.cumulativeLayoutShift > 0.1) {
        recommendations.push('Reduce cumulative layout shift by setting explicit dimensions for images and avoiding dynamic content insertion');
      }
      
      if (metrics.firstInputDelay > 100) {
        recommendations.push('Improve first input delay by reducing JavaScript execution time and optimizing event handlers');
      }
      
      if (metrics.bundleSize > 500000) {
        recommendations.push('Reduce bundle size by implementing code splitting and removing unused dependencies');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent! Keep up the good work.');
    }
    
    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(newConfig: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.clearCache();
    this.metrics = [];
  }
}
