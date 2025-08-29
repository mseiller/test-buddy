import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Button from '../Button';
import { 
  testComponentPerformance, 
  expectPerformance, 
  analyzeBundleSize,
  performanceMonitor,
  PerformanceTester
} from '../../../utils/performance-test-utils';

describe('Button Component Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe('Render Performance', () => {
    it('should render within acceptable time limits', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Button>Test Button</Button>,
        'Button',
        50 // Max 50ms render time
      );

      expect(stats).toBeDefined();
      expect(stats.mean).toBeLessThan(50);
      expect(stats.max).toBeLessThan(75); // 1.5x max time
    });

    it('should handle different button variants efficiently', () => {
      const buttonVariants = [
        { variant: 'default', children: 'Default Button' },
        { variant: 'destructive', children: 'Destructive Button' },
        { variant: 'outline', children: 'Outline Button' },
        { variant: 'secondary', children: 'Secondary Button' },
        { variant: 'ghost', children: 'Ghost Button' },
        { variant: 'link', children: 'Link Button' },
      ];

      const { results } = testComponentPerformance.testPropsPerformance(
        (props) => <Button {...props} />,
        buttonVariants,
        'Button',
        50
      );

      expect(results).toHaveLength(6);
      for (const result of results) {
        expect(result.stats.mean).toBeLessThan(50);
      }
    });

    it('should handle different button sizes efficiently', () => {
      const buttonSizes = [
        { size: 'default', children: 'Default Size' },
        { size: 'sm', children: 'Small Size' },
        { size: 'lg', children: 'Large Size' },
        { size: 'icon', children: 'Icon Size' },
      ];

      const { results } = testComponentPerformance.testPropsPerformance(
        (props) => <Button {...props} />,
        buttonSizes,
        'Button',
        50
      );

      expect(results).toHaveLength(4);
      for (const result of results) {
        expect(result.stats.mean).toBeLessThan(50);
      }
    });

    it('should handle disabled state efficiently', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Button disabled>Disabled Button</Button>,
        'Button-Disabled',
        50
      );

      expect(stats.mean).toBeLessThan(50);
    });

    it('should handle loading state efficiently', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Button loading>Loading Button</Button>,
        'Button-Loading',
        50
      );

      expect(stats.mean).toBeLessThan(50);
    });
  });

  describe('Re-render Performance', () => {
    it('should re-render efficiently when props change', () => {
      const { times, mean, max } = testComponentPerformance.testRerenderPerformance(
        <Button>Test Button</Button>,
        'Button',
        20, // 20 re-renders
        25  // Max 25ms per re-render
      );

      expect(mean).toBeLessThan(25);
      expect(max).toBeLessThan(50);
    });

    it('should handle frequent text changes efficiently', () => {
      const { rerender } = render(<Button>Initial Text</Button>);
      
      const times: number[] = [];
      const texts = ['Text 1', 'Text 2', 'Text 3', 'Text 4', 'Text 5'];
      
      for (const text of texts) {
        performanceMonitor.start('text-change');
        rerender(<Button>{text}</Button>);
        const duration = performanceMonitor.end('text-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 25, 'Button text change');
    });

    it('should handle frequent variant changes efficiently', () => {
      const { rerender } = render(<Button variant="default">Test</Button>);
      
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
      const times: number[] = [];
      
      for (const variant of variants) {
        performanceMonitor.start('variant-change');
        rerender(<Button variant={variant as any}>Test</Button>);
        const duration = performanceMonitor.end('variant-change');
        times.push(duration);
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      expectPerformance.renderTime(mean, 25, 'Button variant change');
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during repeated renders', () => {
      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <Button>Test Button</Button>,
        'Button',
        1024 * 1024 // 1MB max
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(1024 * 1024);
      }
    });

    it('should handle multiple button instances efficiently', () => {
      const buttons = Array.from({ length: 100 }, (_, i) => (
        <Button key={i}>Button {i}</Button>
      ));

      const { memoryUsed } = testComponentPerformance.testMemoryUsage(
        <div>{buttons}</div>,
        'Button-Multiple',
        5 * 1024 * 1024 // 5MB max for 100 buttons
      );

      if (memoryUsed > 0) {
        expect(memoryUsed).toBeLessThan(5 * 1024 * 1024);
      }
    });
  });

  describe('Interaction Performance', () => {
    it('should handle click events efficiently', () => {
      const handleClick = jest.fn();
      const { getByRole } = render(<Button onClick={handleClick}>Clickable Button</Button>);
      
      const button = getByRole('button');
      
      performanceMonitor.start('click-handling');
      fireEvent.click(button);
      const duration = performanceMonitor.end('click-handling');
      
      expectPerformance.renderTime(duration, 10, 'Button click handling');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle hover events efficiently', () => {
      const { getByRole } = render(<Button>Hoverable Button</Button>);
      
      const button = getByRole('button');
      
      performanceMonitor.start('hover-handling');
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      const duration = performanceMonitor.end('hover-handling');
      
      expectPerformance.renderTime(duration, 10, 'Button hover handling');
    });

    it('should handle focus events efficiently', () => {
      const { getByRole } = render(<Button>Focusable Button</Button>);
      
      const button = getByRole('button');
      
      performanceMonitor.start('focus-handling');
      fireEvent.focus(button);
      fireEvent.blur(button);
      const duration = performanceMonitor.end('focus-handling');
      
      expectPerformance.renderTime(duration, 10, 'Button focus handling');
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should have acceptable bundle size', () => {
      const bundleSize = analyzeBundleSize.getComponentSize('Button');
      const isAcceptable = analyzeBundleSize.isBundleSizeAcceptable('Button', 2048);
      
      expect(bundleSize).toBeLessThanOrEqual(2048);
      expect(isAcceptable).toBe(true);
    });

    it('should have reasonable size relative to other UI components', () => {
      const buttonSize = analyzeBundleSize.getComponentSize('Button');
      const cardSize = analyzeBundleSize.getComponentSize('Card');
      const alertSize = analyzeBundleSize.getComponentSize('Alert');
      
      // Button is larger than Card and Alert in our mock data
      expect(buttonSize).toBeGreaterThan(cardSize);
      expect(buttonSize).toBeGreaterThan(alertSize);
      
      // But should not be excessively large
      expect(buttonSize).toBeLessThan(5 * 1024); // 5KB max
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for basic rendering', () => {
      const { times, stats } = testComponentPerformance.testRenderPerformance(
        <Button>Benchmark Button</Button>,
        'Button-Benchmark',
        30 // Stricter benchmark: 30ms max
      );

      expect(stats.mean).toBeLessThan(30);
      expect(stats.median).toBeLessThan(30);
      expect(stats.max).toBeLessThan(45);
    });

    it('should meet performance benchmarks for complex props', () => {
      const complexButton = (
        <Button 
          variant="destructive" 
          size="lg" 
          disabled 
          loading 
          className="custom-class"
          onClick={() => {}}
        >
          Complex Button
        </Button>
      );

      const { times, stats } = testComponentPerformance.testRenderPerformance(
        complexButton,
        'Button-Complex',
        40 // Slightly higher for complex props
      );

      expect(stats.mean).toBeLessThan(40);
      expect(stats.max).toBeLessThan(60);
    });

    it('should maintain performance under stress', () => {
      const stressTest = () => {
        const { times, stats } = testComponentPerformance.testRenderPerformance(
          <Button>Stress Test Button</Button>,
          'Button-Stress',
          50
        );

        expect(stats.mean).toBeLessThan(50);
        expect(stats.standardDeviation).toBeLessThan(20); // Consistent performance
      };

      // Run stress test multiple times
      for (let i = 0; i < 3; i++) {
        stressTest();
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide detailed performance metrics', () => {
      const tester = new PerformanceTester();
      
      tester.measureRenderTime('Button-Metrics', <Button>Metrics Button</Button>, 15);
      const stats = tester.getStats('Button-Metrics');
      
      expect(stats).toBeDefined();
      expect(stats!.mean).toBeGreaterThan(0);
      expect(stats!.median).toBeGreaterThan(0);
      expect(stats!.min).toBeGreaterThan(0);
      expect(stats!.max).toBeGreaterThan(0);
      expect(stats!.standardDeviation).toBeGreaterThanOrEqual(0);
    });

    it('should generate comprehensive performance reports', () => {
      const tester = new PerformanceTester();
      
      tester.measureRenderTime('Button-Report', <Button>Report Button</Button>, 10);
      const report = tester.generateReport();
      
      expect(report).toContain('Button-Report');
      expect(report).toContain('Mean:');
      expect(report).toContain('Median:');
      expect(report).toContain('Min:');
      expect(report).toContain('Max:');
      expect(report).toContain('Std Dev:');
      expect(report).toContain('Acceptable:');
    });
  });
});
