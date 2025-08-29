/**
 * Health Check API Endpoint
 * Provides system health status and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonitoringAPI } from '@/services/monitoring/MonitoringAPI';

export async function GET(_request: NextRequest) {
  try {
    const monitoringAPI = MonitoringAPI.getInstance();
    const response = await monitoringAPI.getHealthStatus();
    
    // Set HTTP status based on health
    let httpStatus = 200;
    if (response.success && response.data?.overall?.status === 'degraded') {
      httpStatus = 503; // Service Unavailable
    } else if (response.success && response.data?.overall?.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (!response.success) {
      httpStatus = 500; // Internal Server Error
    }
    
    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      timestamp: Date.now(),
      requestId: `req_${Date.now()}_error`
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
