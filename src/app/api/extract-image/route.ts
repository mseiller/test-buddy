import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Check supported image formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!supportedFormats.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Unsupported image format. Please use JPG or PNG files.' 
      }, { status: 400 });
    }

    // Check file size (max 10MB for images)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Image file too large. Please use images smaller than 10MB.' 
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Use OpenRouter's vision model to extract text
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    console.log('IMAGE OCR - Starting text extraction for image:', file.name, 'Size:', file.size);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Test Buddy - Image OCR'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'You are an OCR (Optical Character Recognition) assistant. Extract ALL text content from the provided image. Return only the extracted text, maintaining the original formatting and structure as much as possible. If there are tables, preserve them in a readable format. If there are multiple columns, indicate the column breaks. Do not add any commentary or explanations - just return the extracted text.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this image. Maintain formatting and structure.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${fileType};base64,${base64Image}`
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
      console.error('IMAGE OCR - OpenRouter API error:', response.status, errorData);
      return NextResponse.json({ 
        error: 'OCR service temporarily unavailable. Please try again later.' 
      }, { status: 500 });
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText || extractedText.trim().length === 0) {
      console.warn('IMAGE OCR - No text extracted from image');
      return NextResponse.json({ 
        error: 'No text content found in the image. Please ensure the image contains readable text.' 
      }, { status: 400 });
    }

    console.log('IMAGE OCR - Text extraction successful. Text length:', extractedText.length);

    return NextResponse.json({
      text: extractedText.trim(),
      fileName: file.name,
      fileSize: file.size,
      success: true
    });

  } catch (error: any) {
    console.error('IMAGE OCR - Error processing image:', error);
    return NextResponse.json({ 
      error: 'Failed to process image. Please try again.' 
    }, { status: 500 });
  }
}
