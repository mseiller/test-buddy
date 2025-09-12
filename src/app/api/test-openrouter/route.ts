import { NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function GET() {
  try {
    console.log('Test OpenRouter API called');
    
    if (!API_KEY) {
      return NextResponse.json({ 
        error: 'OpenRouter API key not configured',
        hasKey: false 
      }, { status: 500 });
    }

    // Test with a simple request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Test Buddy - API Test'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, Test Buddy API is working!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API test failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      return NextResponse.json({ 
        error: 'OpenRouter API test failed',
        status: response.status,
        statusText: response.statusText,
        details: errorData.error?.message || 'Unknown error'
      }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      success: true,
      message: 'OpenRouter API is working',
      response: responseText,
      hasKey: true,
      keyLength: API_KEY.length
    });

  } catch (error: any) {
    console.error('Test OpenRouter API Error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message || 'Unknown error',
      hasKey: !!API_KEY,
      keyLength: API_KEY?.length || 0
    }, { status: 500 });
  }
}
