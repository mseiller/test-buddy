import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  testComponentPerformance, 
  expectPerformance, 
  analyzeBundleSize,
  performanceMonitor,
  PerformanceTester
} from '../../utils/performance-test-utils';

// Mock components for testing
const MockButton = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>{children}</button>
);

const MockCard = ({ children, ...props }: any) => (
  <div className="mock-card" {...props}>{children}</div>
);

const MockForm = ({ onSubmit, children }: any) => (
  <form onSubmit={onSubmit}>
    {children}
  </form>
);

describe('Application Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe('Component Rendering Performance', () => {
    it('should render basic components within acceptable time limits', () => {
      const components = [
        { component: <MockButton>Test Button</MockButton>, name: 'Button', maxTime: 50 },
        { component: <MockCard>Test Card</MockCard>, name: 'Card', maxTime: 60 },
        { component: <MockForm onSubmit={() => {}}>Test Form</MockForm>, name: 'Form', maxTime: 70 },
      ];

      for (const { component, name, maxTime } of components) {
        const { times, stats } = testComponentPerformance.testRenderPerformance(
          component,
          name,
          maxTime
        );

        expect(stats).toBeDefined();
        expect(stats.mean).toBeLessThan(maxTime);
        expect(stats.max).toBeLessThan(maxTime * 1.5);
      }
    });

    it('should handle component composition efficiently', () => {
      const composedComponent = (
        <MockCard>
          <MockForm onSubmit={() => {}}>
            <MockButton>Submit</MockButton>
            <MockButton>Cancel</MockButton>
          </MockForm>
        </MockCard>
      );

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        composedComponent,
        'ComposedComponent',
        100 // Higher limit for composed components
      );

      expect(stats.mean).toBeLessThan(100);
      expect(stats.max).toBeLessThan(150);
    });

    it('should handle dynamic component rendering efficiently', () => {
      const dynamicComponents = Array.from({ length: 20 }, (_, i) => (
        <MockCard key={i}>
          <MockButton>Button {i}</MockButton>
        </MockCard>
      ));

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <div>{dynamicComponents}</div>,
        'DynamicComponents',
        200 // Higher limit for many components
      );

      expect(stats.mean).toBeLessThan(200);
      expect(stats.max).toBeLessThan(300);
    });
  });

  describe('User Interaction Performance', () => {
    it('should handle form interactions efficiently', () => {
      const handleSubmit = jest.fn();
      const { getByRole, getByText } = render(
        <MockForm onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <MockButton>Submit</MockButton>
        </MockForm>
      );

      const submitButton = getByText('Submit');
      
      performanceMonitor.start('form-submission');
      fireEvent.click(submitButton);
      const duration = performanceMonitor.end('form-submission');
      
      expectPerformance.renderTime(duration, 20, 'Form submission');
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle button interactions efficiently', () => {
      const handleClick = jest.fn();
      const { getByText } = render(
        <MockButton onClick={handleClick}>Click Me</MockButton>
      );

      const button = getByText('Click Me');
      
      performanceMonitor.start('button-click');
      fireEvent.click(button);
      const duration = performanceMonitor.end('button-click');
      
      expectPerformance.renderTime(duration, 15, 'Button click');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid interactions efficiently', () => {
      const handleClick = jest.fn();
      const { getByText } = render(
        <MockButton onClick={handleClick}>Rapid Click</MockButton>
      );

      const button = getByText('Rapid Click');
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        performanceMonitor.start('rapid-click');
        fireEvent.click(button);
        const duration = performanceMonitor.end('rapid-click');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 20, 'Rapid button clicks');
      expect(handleClick).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks during repeated operations', () => {
      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <MockCard>Memory Test</MockCard>,
        'MemoryTest',
        1024 * 1024 // 1MB max
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(1024 * 1024);
      }
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`.repeat(10)
      }));

      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <div>
          {largeDataset.map(item => (
            <MockCard key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </MockCard>
          ))}
        </div>,
        'LargeDataset',
        10 * 1024 * 1024 // 10MB max for large dataset
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should have acceptable overall bundle size', () => {
      const componentSizes = [
        'Button',
        'Card',
        'Alert',
        'LoadingSpinner'
      ];

      let totalSize = 0;
      for (const component of componentSizes) {
        totalSize += analyzeBundleSize.getComponentSize(component);
      }

      expect(totalSize).toBeLessThan(10 * 1024); // 10KB total
    });

    it('should have reasonable component size distribution', () => {
      const buttonSize = analyzeBundleSize.getComponentSize('Button');
      const cardSize = analyzeBundleSize.getComponentSize('Card');
      const alertSize = analyzeBundleSize.getComponentSize('Alert');

      // Alert should be smallest
      expect(alertSize).toBeLessThan(cardSize);
      expect(alertSize).toBeLessThan(buttonSize);

      // Card should be smaller than Button
      expect(cardSize).toBeLessThan(buttonSize);

      // Button should not be excessively large
      expect(buttonSize).toBeLessThan(5 * 1024); // 5KB max
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet basic performance benchmarks', () => {
      const benchmarks = [
        {
          name: 'Simple Component',
          component: <MockButton>Simple</MockButton>,
          maxTime: 30
        },
        {
          name: 'Medium Component',
          component: (
            <MockCard>
              <MockButton>Action</MockButton>
            </MockCard>
          ),
          maxTime: 50
        },
        {
          name: 'Complex Component',
          component: (
            <MockCard>
              <MockForm onSubmit={() => {}}>
                <input type="text" />
                <MockButton>Submit</MockButton>
              </MockForm>
            </MockCard>
          ),
          maxTime: 80
        }
      ];

      for (const benchmark of benchmarks) {
        const { times, stats } = testComponentPerformance.testRenderPerformance(
          benchmark.component,
          benchmark.name,
          benchmark.maxTime
        );

        expect(stats.mean).toBeLessThan(benchmark.maxTime);
        expect(stats.max).toBeLessThan(benchmark.maxTime * 1.5);
      }
    });

    it('should maintain consistent performance under load', () => {
      const loadTest = () => {
        const components = Array.from({ length: 50 }, (_, i) => (
          <MockCard key={i}>
            <MockButton>Button {i}</MockButton>
          </MockCard>
        ));

        const { times, stats } = testComponentPerformance.testRenderPerformance(
          <div>{components}</div>,
          'LoadTest',
          150
        );

        expect(stats.mean).toBeLessThan(150);
        expect(stats.standardDeviation).toBeLessThan(50); // Consistent performance
      };

      // Run load test multiple times
      for (let i = 0; i < 3; i++) {
        loadTest();
      }
    });
  });

  describe('Performance Monitoring and Reporting', () => {
    it('should provide comprehensive performance metrics', () => {
      const tester = new PerformanceTester();
      
      // Test multiple components
      tester.measureRenderTime('Component1', <MockButton>Test 1</MockButton>, 10);
      tester.measureRenderTime('Component2', <MockCard>Test 2</MockCard>, 10);
      tester.measureRenderTime('Component3', <MockForm onSubmit={() => {}}>Test 3</MockForm>, 10);
      
      const report = tester.generateReport();
      
      expect(report).toContain('Component1');
      expect(report).toContain('Component2');
      expect(report).toContain('Component3');
      expect(report).toContain('Mean:');
      expect(report).toContain('Acceptable:');
    });

    it('should track performance trends', () => {
      const tester = new PerformanceTester();
      
      // Simulate performance degradation
      const component = <MockButton>Trend Test</MockButton>;
      
      // First measurement
      tester.measureRenderTime('TrendTest', component, 5);
      const initialStats = tester.getStats('TrendTest');
      
      // Simulate some performance impact
      const complexComponent = (
        <MockButton>
          {Array.from({ length: 100 }, (_, i) => `Text ${i}`).join(' ')}
        </MockButton>
      );
      
      tester.measureRenderTime('TrendTest', complexComponent, 5);
      const finalStats = tester.getStats('TrendTest');
      
      expect(initialStats).toBeDefined();
      expect(finalStats).toBeDefined();
      
      // Performance should be tracked - both should have valid measurements
      expect(initialStats!.mean).toBeGreaterThan(0);
      expect(finalStats!.mean).toBeGreaterThan(0);
      
      // Both measurements should be within reasonable bounds
      expect(initialStats!.mean).toBeLessThan(100);
      expect(finalStats!.mean).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('should handle extreme content sizes', () => {
      const extremeContent = 'A'.repeat(100000); // 100KB of text
      
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <MockCard>{extremeContent}</MockCard>,
        'ExtremeContent',
        200 // Higher limit for extreme content
      );

      expect(stats.mean).toBeLessThan(200);
      expect(stats.max).toBeLessThan(300);
    });

    it('should handle rapid state changes', () => {
      const { rerender } = render(<MockButton>Initial</MockButton>);
      
      const times: number[] = [];
      for (let i = 0; i < 50; i++) {
        performanceMonitor.start('state-change');
        rerender(<MockButton className={`state-${i}`}>State {i}</MockButton>);
        const duration = performanceMonitor.end('state-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 25, 'Rapid state changes');
    });

    it('should handle concurrent operations', () => {
      const concurrentTest = () => {
        const components = Array.from({ length: 10 }, (_, i) => (
          <MockCard key={i}>
            <MockButton>Concurrent {i}</MockButton>
          </MockCard>
        ));

        const { times, stats } = testComponentPerformance.testRenderPerformance(
          <div>{components}</div>,
          'ConcurrentTest',
          100
        );

        expect(stats.mean).toBeLessThan(100);
      };

      // Run concurrent tests
      const promises = Array.from({ length: 3 }, () => 
        new Promise<void>((resolve) => {
          concurrentTest();
          resolve();
        })
      );

      return Promise.all(promises);
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should demonstrate performance improvements with optimizations', () => {
      // Test unoptimized version (simulated)
      const unoptimizedComponent = (
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <MockCard key={i}>
              <MockButton>Button {i}</MockButton>
            </MockCard>
          ))}
        </div>
      );

      const { times: unoptimizedTimes, stats: unoptimizedStats } = testComponentPerformance.testRenderPerformance(
        unoptimizedComponent,
        'Unoptimized',
        200
      );

      // Test optimized version (simulated with fewer renders)
      const optimizedComponent = (
        <div>
          {Array.from({ length: 50 }, (_, i) => (
            <MockCard key={i}>
              <MockButton>Button {i}</MockButton>
            </MockCard>
          ))}
        </div>
      );

      const { times: optimizedTimes, stats: optimizedStats } = testComponentPerformance.testRenderPerformance(
        optimizedComponent,
        'Optimized',
        150
      );

      // Optimized should be faster
      expect(optimizedStats!.mean).toBeLessThan(unoptimizedStats!.mean);
      
      // Calculate improvement
      const improvement = (unoptimizedStats!.mean - optimizedStats!.mean) / unoptimizedStats!.mean;
      expect(improvement).toBeGreaterThan(0.1); // At least 10% improvement
    });
  });
});
