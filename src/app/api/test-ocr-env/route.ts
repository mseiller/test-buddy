import { NextResponse } from 'next/server';

export async function GET() {
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!openRouterApiKey,
    keyLength: openRouterApiKey?.length || 0,
    keyPrefix: openRouterApiKey?.substring(0, 10) || 'none',
    environment: process.env.NODE_ENV
  });
}
