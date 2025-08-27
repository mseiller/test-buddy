import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

// Performance measurement utilities
export class PerformanceTester {
  private measurements: Map<string, number[]> = new Map();
  private memorySnapshots: Map<string, number> = new Map();

  // Measure component render time
  measureRenderTime(componentName: string, component: React.ReactElement, iterations: number = 10): number[] {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      render(component);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    this.measurements.set(componentName, times);
    return times;
  }

  // Measure memory usage (approximate)
  measureMemoryUsage(componentName: string, component: React.ReactElement): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const beforeMemory = (performance as any).memory.usedJSHeapSize;
      render(component);
      const afterMemory = (performance as any).memory.usedJSHeapSize;
      const memoryUsed = afterMemory - beforeMemory;
      this.memorySnapshots.set(componentName, memoryUsed);
      return memoryUsed;
    }
    return 0;
  }

  // Get performance statistics
  getStats(componentName: string): {
    mean: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
  } | null {
    const times = this.measurements.get(componentName);
    if (!times || times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);

    return { mean, median, min, max, standardDeviation };
  }

  // Check if performance is within acceptable bounds
  isPerformanceAcceptable(componentName: string, maxRenderTime: number = 100): boolean {
    const stats = this.getStats(componentName);
    if (!stats) return false;
    
    return stats.mean <= maxRenderTime && stats.max <= maxRenderTime * 1.5;
  }

  // Generate performance report
  generateReport(): string {
    let report = 'Performance Test Report\n';
    report += '========================\n\n';

    for (const [componentName, times] of this.measurements) {
      const stats = this.getStats(componentName);
      if (stats) {
        report += `${componentName}:\n`;
        report += `  Mean: ${stats.mean.toFixed(2)}ms\n`;
        report += `  Median: ${stats.median.toFixed(2)}ms\n`;
        report += `  Min: ${stats.min.toFixed(2)}ms\n`;
        report += `  Max: ${stats.max.toFixed(2)}ms\n`;
        report += `  Std Dev: ${stats.standardDeviation.toFixed(2)}ms\n`;
        report += `  Acceptable: ${this.isPerformanceAcceptable(componentName) ? 'Yes' : 'No'}\n\n`;
      }
    }

    return report;
  }

  // Clear all measurements
  clear(): void {
    this.measurements.clear();
    this.memorySnapshots.clear();
  }
}

// Component performance testing utilities
export const testComponentPerformance = {
  // Test basic component rendering
  testRenderPerformance: (component: React.ReactElement, componentName: string, maxTime: number = 100) => {
    const tester = new PerformanceTester();
    const times = tester.measureRenderTime(componentName, component);
    const stats = tester.getStats(componentName);
    
    expect(stats).toBeDefined();
    expect(stats!.mean).toBeLessThan(maxTime);
    expect(stats!.max).toBeLessThan(maxTime * 1.5);
    
    return { times, stats, tester };
  },

  // Test component with different props
  testPropsPerformance: (
    componentFactory: (props: any) => React.ReactElement,
    propsVariations: any[],
    componentName: string,
    maxTime: number = 100
  ) => {
    const tester = new PerformanceTester();
    const results: Array<{ props: any; times: number[]; stats: any }> = [];

    for (const props of propsVariations) {
      const component = componentFactory(props);
      const times = tester.measureRenderTime(`${componentName}-${JSON.stringify(props)}`, component);
      const stats = tester.getStats(`${componentName}-${JSON.stringify(props)}`);
      results.push({ props, times, stats });
    }

    // Check that all variations perform acceptably
    for (const result of results) {
      expect(result.stats!.mean).toBeLessThan(maxTime);
    }

    return { results, tester };
  },

  // Test component re-rendering performance
  testRerenderPerformance: (
    component: React.ReactElement,
    componentName: string,
    rerenderCount: number = 10,
    maxTime: number = 50
  ) => {
    const tester = new PerformanceTester();
    const { rerender } = render(component);
    
    const times: number[] = [];
    for (let i = 0; i < rerenderCount; i++) {
      const startTime = performance.now();
      rerender(component);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    expect(mean).toBeLessThan(maxTime);
    expect(max).toBeLessThan(maxTime * 2);

    return { times, mean, max };
  },

  // Test component memory usage
  testMemoryUsage: (component: React.ReactElement, componentName: string, maxMemory: number = 1024 * 1024) => {
    const tester = new PerformanceTester();
    const memoryUsed = tester.measureMemoryUsage(componentName, component);
    
    if (memoryUsed > 0) {
      expect(memoryUsed).toBeLessThan(maxMemory);
    }
    
    return { memoryUsed, tester };
  }
};

// Performance assertions
export const expectPerformance = {
  // Assert render time is within bounds
  renderTime: (actualTime: number, expectedMaxTime: number, componentName?: string) => {
    const message = componentName 
      ? `${componentName} render time ${actualTime}ms exceeds maximum ${expectedMaxTime}ms`
      : `Render time ${actualTime}ms exceeds maximum ${expectedMaxTime}ms`;
    
    expect(actualTime).toBeLessThan(expectedMaxTime, message);
  },

  // Assert memory usage is within bounds
  memoryUsage: (actualMemory: number, expectedMaxMemory: number, componentName?: string) => {
    const message = componentName 
      ? `${componentName} memory usage ${actualMemory} bytes exceeds maximum ${expectedMaxMemory} bytes`
      : `Memory usage ${actualMemory} bytes exceeds maximum ${expectedMaxMemory} bytes`;
    
    expect(actualMemory).toBeLessThan(expectedMaxMemory, message);
  },

  // Assert performance improvement
  improvement: (beforeTime: number, afterTime: number, minImprovement: number = 0.1) => {
    const improvement = (beforeTime - afterTime) / beforeTime;
    expect(improvement).toBeGreaterThan(minImprovement, 
      `Performance improvement ${(improvement * 100).toFixed(1)}% is less than expected ${(minImprovement * 100).toFixed(1)}%`
    );
  }
};

// Bundle size analysis utilities
export const analyzeBundleSize = {
  // Mock bundle size analysis (in real implementation, this would use webpack-bundle-analyzer)
  getComponentSize: (componentName: string): number => {
    // This is a mock implementation
    const mockSizes: Record<string, number> = {
      'Button': 2048,
      'Card': 1536,
      'Alert': 1024,
      'LoadingSpinner': 512,
    };
    
    return mockSizes[componentName] || 1024;
  },

  // Check if bundle size is acceptable
  isBundleSizeAcceptable: (componentName: string, maxSize: number = 2048): boolean => {
    const size = analyzeBundleSize.getComponentSize(componentName);
    return size <= maxSize;
  }
};

// Performance monitoring utilities
export const performanceMonitor = {
  // Start performance measurement
  start: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  },

  // End performance measurement
  end: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      return measure.duration;
    }
    return 0;
  },

  // Clear performance marks
  clear: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
};
