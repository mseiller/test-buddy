/**
 * Performance Optimization Application API
 * Applies optimization strategies and measures improvements
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceOptimizer } from '@/services/performance/PerformanceOptimizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyId } = body;

    if (!strategyId) {
      return NextResponse.json({
        success: false,
        error: 'Strategy ID is required',
        timestamp: Date.now()
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const optimizer = PerformanceOptimizer.getInstance();
    const result = await optimizer.applyOptimization(strategyId);

    return NextResponse.json({
      success: result.success,
      data: {
        strategyId,
        improvement: result.improvement,
        message: result.message
      },
      timestamp: Date.now()
    }, {
      status: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Performance optimization application error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to apply optimization',
      timestamp: Date.now()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
