/**
 * Monitoring Dashboard API Endpoint
 * Provides comprehensive monitoring data for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonitoringAPI } from '@/services/monitoring/MonitoringAPI';

export async function GET(_request: NextRequest) {
  try {
    const monitoringAPI = MonitoringAPI.getInstance();
    const response = await monitoringAPI.getDashboardData();
    
    return NextResponse.json(response, {
      status: response.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
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
