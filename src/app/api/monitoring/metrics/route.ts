/**
 * Metrics API Endpoint
 * Handles custom metric recording and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonitoringAPI } from '@/services/monitoring/MonitoringAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const duration = parseInt(searchParams.get('duration') || '3600000'); // Default 1 hour
    const type = searchParams.get('type') || 'analytics';
    
    const monitoringAPI = MonitoringAPI.getInstance();
    let response;
    
    switch (type) {
      case 'analytics':
        response = await monitoringAPI.getAnalytics(duration);
        break;
      case 'history':
        response = await monitoringAPI.getPerformanceHistory(duration);
        break;
      case 'system':
        response = await monitoringAPI.getSystemMetrics();
        break;
      default:
        response = await monitoringAPI.getAnalytics(duration);
    }
    
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
    console.error('Metrics GET API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve metrics',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, value, unit, tags, metadata } = body;
    
    // Validate required fields
    if (!name || !type || typeof value !== 'number' || !unit) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, type, value, unit',
        timestamp: Date.now(),
        requestId: `req_${Date.now()}_error`
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Validate metric type
    const validTypes = ['counter', 'gauge', 'histogram', 'timer'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid metric type. Must be one of: ${validTypes.join(', ')}`,
        timestamp: Date.now(),
        requestId: `req_${Date.now()}_error`
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const monitoringAPI = MonitoringAPI.getInstance();
    const response = await monitoringAPI.recordMetric({
      name,
      type,
      value,
      unit,
      tags: tags || {},
      metadata: metadata || {}
    });
    
    return NextResponse.json(response, {
      status: response.success ? 201 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Metrics POST API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to record metric',
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
