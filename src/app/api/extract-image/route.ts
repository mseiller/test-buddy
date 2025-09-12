import { NextResponse } from 'next/server';

// Use the same pattern as the working OpenRouter service
const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: Request) {
  try {
    console.log('OCR API called');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Check file size (max 4MB for Vercel compatibility)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image file too large. Please use images smaller than 4MB.' }, { status: 413 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Use OpenRouter's vision model to extract text
    console.log('OCR API - Environment check:', {
      hasApiKey: !!API_KEY,
      keyLength: API_KEY?.length || 0,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (!API_KEY) {
      console.error('OCR API - Missing OpenRouter API key');
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    console.log('Starting OCR for file:', file.name, 'Size:', file.size);

    // Use GPT-4 Vision for OCR
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Test Buddy - Image OCR'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only the text content without any additional commentary or formatting.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OCR API - OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        headers: Object.fromEntries(response.headers.entries())
      });
      return NextResponse.json({ 
        error: 'OCR service failed',
        details: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      }, { status: 500 });
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No text found in image' 
      }, { status: 400 });
    }

    console.log('OCR successful. Text length:', extractedText.length);

    return NextResponse.json({
      text: extractedText.trim(),
      fileName: file.name,
      fileSize: file.size,
      success: true
    });

  } catch (error: any) {
    console.error('OCR API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process image',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}