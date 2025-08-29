/**
 * Performance Optimization Analysis API
 * Analyzes current performance and provides optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceOptimizer } from '@/services/performance/PerformanceOptimizer';

export async function GET(_request: NextRequest) {
  try {
    const optimizer = PerformanceOptimizer.getInstance();
    const analysis = await optimizer.analyzePerformance();

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: Date.now()
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Performance optimization analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze performance',
      timestamp: Date.now()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
