/**
 * Alerts API Endpoint
 * Handles alert retrieval and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonitoringAPI } from '@/services/monitoring/MonitoringAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('resolved') === 'true';
    
    const monitoringAPI = MonitoringAPI.getInstance();
    const response = await monitoringAPI.getAlerts(includeResolved);
    
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
    console.error('Alerts GET API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve alerts',
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action } = body;
    
    if (!alertId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: alertId, action',
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
    let response;
    
    switch (action) {
      case 'resolve':
        response = await monitoringAPI.resolveAlert(alertId);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: resolve`,
          timestamp: Date.now(),
          requestId: `req_${Date.now()}_error`
        }, {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
    }
    
    return NextResponse.json(response, {
      status: response.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Alerts PATCH API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update alert',
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
