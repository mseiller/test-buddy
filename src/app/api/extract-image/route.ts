import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Get user plan from header
    const userPlan = request.headers.get('X-User-Plan') as 'free' | 'student' | 'pro' || 'free';

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
      // For HEIC files, we'll try to process them but warn the user
      if (fileType === 'image/heic') {
        console.warn('IMAGE OCR - HEIC format detected, attempting to process...');
      } else {
        return NextResponse.json({ 
          error: 'Unsupported image format. Please use JPG or PNG files. HEIC files may not work reliably.' 
        }, { status: 400 });
      }
    }

    // Check file size (max 25MB for images)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Image file too large. Please use images smaller than 25MB.' 
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Use OpenRouter's vision model to extract text
    const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      console.error('NEXT_PUBLIC_OPENROUTER_API_KEY not configured');
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    console.log('IMAGE OCR - Starting text extraction for image:', file.name, 'Size:', file.size);

    // Try models with retry pattern based on user plan
    let models: string[];
    
    if (userPlan === 'pro') {
      // Pro users: GPT-4.1-nano -> GPT-5-nano -> GPT-4.1-nano -> GPT-5-nano
      models = [
        'openai/gpt-4.1-nano',
        'openai/gpt-5-nano',
        'openai/gpt-4.1-nano',
        'openai/gpt-5-nano'
      ];
    } else {
      // Free/Student users: Qwen -> Mistral -> Llama -> Qwen (NO OpenAI)
      models = [
        'qwen/qwen3-235b-a22b:free',
        'mistralai/mistral-small-3.2-24b-instruct:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'qwen/qwen3-235b-a22b:free'
      ];
    }

    let lastError: any = null;
    let extractedText: string | null = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        console.log(`IMAGE OCR - Attempt ${i + 1}/4: Trying model ${model}`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Test Buddy - Image OCR'
          },
          body: JSON.stringify({
            model: model,
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

        if (response.ok) {
          const data = await response.json();
          extractedText = data.choices?.[0]?.message?.content;
          
          if (extractedText && extractedText.trim().length > 0) {
            console.log(`IMAGE OCR - Success with model ${model} on attempt ${i + 1}. Text length:`, extractedText.length);
            break;
          } else {
            console.warn(`IMAGE OCR - Model ${model} returned empty text on attempt ${i + 1}`);
            lastError = { error: 'Empty response from model' };
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`IMAGE OCR - Model ${model} failed on attempt ${i + 1}:`, response.status, errorData);
          lastError = errorData;
        }
      } catch (error) {
        console.warn(`IMAGE OCR - Model ${model} error on attempt ${i + 1}:`, error);
        lastError = error;
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.error('IMAGE OCR - All models failed. Last error:', lastError);
      return NextResponse.json({ 
        error: 'OCR service is currently experiencing issues. Please try uploading a PDF or text file instead, or try again later.' 
      }, { status: 503 });
    }

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
