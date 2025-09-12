import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if OpenRouter API key is available
    const hasOpenRouterKey = !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL;
    
    // Don't expose the actual key, just check if it exists
    const openRouterKeyLength = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY?.length || 0;
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      hasOpenRouterKey,
      openRouterKeyLength,
      hasAppUrl,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to check environment',
      details: error.message 
    }, { status: 500 });
  }
}
