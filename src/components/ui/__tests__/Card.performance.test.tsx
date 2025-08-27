import React from 'react';
import { render } from '@testing-library/react';
import Card from '../Card';
import { 
  testComponentPerformance, 
  expectPerformance, 
  analyzeBundleSize,
  performanceMonitor 
} from '../../../utils/performance-test-utils';

describe('Card Component Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe('Render Performance', () => {
    it('should render within acceptable time limits', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Card>Test Card Content</Card>,
        'Card',
        60 // Max 60ms render time
      );

      expect(stats).toBeDefined();
      if (stats) {
        expect(stats.mean).toBeLessThan(60);
        expect(stats.max).toBeLessThan(90); // 1.5x max time
      }
    });

    it('should handle different card variants efficiently', () => {
      const cardVariants = [
        { children: 'Default Card' },
        { className: 'custom-card', children: 'Custom Card' },
        { padding: 'sm', children: 'Small Padding Card' },
        { shadow: 'lg', children: 'Large Shadow Card' },
      ];

      const { results } = testComponentPerformance.testPropsPerformance(
        (props) => <Card {...props} />,
        cardVariants,
        'Card',
        60
      );

      expect(results).toHaveLength(4);
      for (const result of results) {
        if (result.stats) {
          expect(result.stats.mean).toBeLessThan(60);
        }
      }
    });

    it('should handle complex content efficiently', () => {
      const complexCard = (
        <Card>
          <div className="card-header">
            <h2>Complex Card Title</h2>
            <p>This is a complex card with multiple elements and nested content</p>
          </div>
          <div className="card-body">
            <p>Card body content with multiple paragraphs and elements</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
              <li>List item 3</li>
            </ul>
          </div>
          <div className="card-footer">
            <button>Action 1</button>
            <button>Action 2</button>
          </div>
        </Card>
      );

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        complexCard,
        'Card-Complex',
        80 // Higher limit for complex content
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(80);
        expect(stats.max).toBeLessThan(120);
      }
    });

    it('should handle nested cards efficiently', () => {
      const nestedCards = (
        <Card>
          <Card>
            <Card>
              <p>Nested card content</p>
            </Card>
          </Card>
        </Card>
      );

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        nestedCards,
        'Card-Nested',
        100 // Higher limit for nested cards
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(100);
        expect(stats.max).toBeLessThan(150);
      }
    });
  });

  describe('Re-render Performance', () => {
    it('should re-render efficiently when props change', () => {
      const { times, mean, max } = testComponentPerformance.testRerenderPerformance(
        <Card>Test Card</Card>,
        'Card',
        15, // 15 re-renders
        30  // Max 30ms per re-render
      );

      expect(mean).toBeLessThan(30);
      expect(max).toBeLessThan(60);
    });

    it('should handle frequent content changes efficiently', () => {
      const { rerender } = render(<Card>Initial Content</Card>);
      
      const times: number[] = [];
      const contents = [
        'Content 1',
        'Content 2 with more text',
        'Content 3 with even more text and complexity',
        'Content 4',
        'Content 5'
      ];
      
      for (const content of contents) {
        performanceMonitor.start('content-change');
        rerender(<Card>{content}</Card>);
        const duration = performanceMonitor.end('content-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 30, 'Card content change');
    });

    it('should handle frequent className changes efficiently', () => {
      const { rerender } = render(<Card className="initial-class">Test</Card>);
      
      const classes = ['class-1', 'class-2', 'class-3', 'class-4', 'class-5'];
      const times: number[] = [];
      
      for (const className of classes) {
        performanceMonitor.start('class-change');
        rerender(<Card className={className}>Test</Card>);
        const duration = performanceMonitor.end('class-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 30, 'Card className change');
    });

    it('should handle frequent padding changes efficiently', () => {
      const { rerender } = render(<Card padding="md">Test</Card>);
      
      const paddings: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];
      const times: number[] = [];
      
      for (const padding of paddings) {
        performanceMonitor.start('padding-change');
        rerender(<Card padding={padding}>Test</Card>);
        const duration = performanceMonitor.end('padding-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 30, 'Card padding change');
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during repeated renders', () => {
      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <Card>Test Card</Card>,
        'Card',
        1024 * 1024 // 1MB max
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(1024 * 1024);
      }
    });

    it('should handle multiple card instances efficiently', () => {
      const cards = Array.from({ length: 50 }, (_, i) => (
        <Card key={i}>Card {i}</Card>
      ));

      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <div>{cards}</div>,
        'Card-Multiple',
        3 * 1024 * 1024 // 3MB max for 50 cards
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(3 * 1024 * 1024);
      }
    });

    it('should handle large content efficiently', () => {
      const largeContent = 'A'.repeat(10000); // 10KB of text
      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <Card>{largeContent}</Card>,
        'Card-LargeContent',
        2 * 1024 * 1024 // 2MB max
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(2 * 1024 * 1024);
      }
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should have acceptable bundle size', () => {
      const bundleSize = analyzeBundleSize.getComponentSize('Card');
      const isAcceptable = analyzeBundleSize.isBundleSizeAcceptable('Card', 2048);
      
      expect(bundleSize).toBeLessThanOrEqual(2048);
      expect(isAcceptable).toBe(true);
    });

    it('should be appropriately sized relative to other components', () => {
      const cardSize = analyzeBundleSize.getComponentSize('Card');
      const buttonSize = analyzeBundleSize.getComponentSize('Button');
      const alertSize = analyzeBundleSize.getComponentSize('Alert');
      
      // Card should be reasonably sized
      expect(cardSize).toBeLessThan(alertSize * 2); // Not excessively large
      expect(cardSize).toBeGreaterThan(0); // Has some size
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for basic rendering', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Card>Benchmark Card</Card>,
        'Card-Benchmark',
        40 // Stricter benchmark: 40ms max
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(40);
        expect(stats.median).toBeLessThan(40);
        expect(stats.max).toBeLessThan(60);
      }
    });

    it('should meet performance benchmarks for complex content', () => {
      const complexCard = (
        <Card>
          <header>
            <h1>Title</h1>
            <p>Description</p>
          </header>
          <main>
            <section>
              <h2>Section 1</h2>
              <p>Content...</p>
            </section>
            <section>
              <h2>Section 2</h2>
              <p>More content...</p>
            </section>
          </main>
          <footer>
            <button>Action</button>
          </footer>
        </Card>
      );

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        complexCard,
        'Card-ComplexBenchmark',
        60 // Higher for complex content
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(60);
        expect(stats.max).toBeLessThan(90);
      }
    });

    it('should maintain performance under stress', () => {
      const stressTest = () => {
        const { times, stats } = testComponentPerformance.testRenderPerformance(
          <Card>Stress Test Card</Card>,
          'Card-Stress',
          60
        );

        if (stats) {
          expect(stats.mean).toBeLessThan(60);
          expect(stats.standardDeviation).toBeLessThan(25); // Consistent performance
        }
      };

      // Run stress test multiple times
      for (let i = 0; i < 3; i++) {
        stressTest();
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide detailed performance metrics', () => {
      const tester = new (require('../../../utils/performance-test-utils').PerformanceTester)();
      
      tester.measureRenderTime('Card-Metrics', <Card>Metrics Card</Card>, 15);
      const stats = tester.getStats('Card-Metrics');
      
      expect(stats).toBeDefined();
      if (stats) {
        expect(stats.mean).toBeGreaterThan(0);
        expect(stats.median).toBeGreaterThan(0);
        expect(stats.min).toBeGreaterThan(0);
        expect(stats.max).toBeGreaterThan(0);
        expect(stats.standardDeviation).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate comprehensive performance reports', () => {
      const tester = new (require('../../../utils/performance-test-utils').PerformanceTester)();
      
      tester.measureRenderTime('Card-Report', <Card>Report Card</Card>, 10);
      const report = tester.generateReport();
      
      expect(report).toContain('Card-Report');
      expect(report).toContain('Mean:');
      expect(report).toContain('Median:');
      expect(report).toContain('Min:');
      expect(report).toContain('Max:');
      expect(report).toContain('Std Dev:');
      expect(report).toContain('Acceptable:');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content efficiently', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Card>Empty Content</Card>,
        'Card-Empty',
        40 // Lower limit for empty content
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(40);
      }
    });

    it('should handle very long content efficiently', () => {
      const longContent = 'A'.repeat(50000); // 50KB of text
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Card>{longContent}</Card>,
        'Card-VeryLong',
        120 // Higher limit for very long content
      );

      if (stats) {
        expect(stats.mean).toBeLessThan(120);
      }
    });

    it('should handle frequent prop changes efficiently', () => {
      const { rerender } = render(<Card>Initial</Card>);
      
      const times: number[] = [];
      for (let i = 0; i < 20; i++) {
        performanceMonitor.start('prop-change');
        rerender(<Card className={`class-${i}`}>Content {i}</Card>);
        const duration = performanceMonitor.end('prop-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 35, 'Card frequent prop changes');
    });
  });
});
