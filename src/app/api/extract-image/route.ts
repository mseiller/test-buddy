import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/services/logger';

export async function POST(request: NextRequest) {
  console.log('🔍 OCR API called');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('📁 File received:', file?.name, file?.type, file?.size);
    
    // Get user plan from header
    const userPlan = request.headers.get('X-User-Plan') as 'free' | 'student' | 'pro' || 'free';
    console.log('👤 User plan:', userPlan);

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
        await logger.warn('HEIC format detected, attempting to process', 'general', { fileName: file.name, fileType });
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
    console.log('🔑 OpenRouter API key present:', !!openRouterApiKey);
    if (!openRouterApiKey) {
      console.log('❌ No OpenRouter API key found');
      await logger.error('OpenRouter API key not configured', 'general', { fileName: file.name });
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    await logger.info('Starting image text extraction', 'openrouter', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType,
      userPlan 
    });

    // Try models with retry pattern based on user plan
    // Using vision-capable models that are better for OCR
    let models: string[];
    
    if (userPlan === 'pro') {
      // Pro users: GPT-4 Vision models (best for OCR)
      models = [
        'openai/gpt-4o-mini',  // Best for OCR, fast and accurate
        'openai/gpt-4o',       // Most accurate but slower
        'openai/gpt-4o-mini'   // Fallback
      ];
    } else {
      // Free/Student users: Vision-capable free models
      models = [
        'qwen/qwen-vl-plus',           // Qwen vision model
        'qwen/qwen-vl-max',            // Better Qwen vision
        'qwen/qwen3-235b-a22b:free',   // Fallback to text-only
        'mistralai/mistral-large-2407:free'  // Alternative
      ];
    }

    let lastError: any = null;
    let extractedText: string | null = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        await logger.info(`OCR attempt ${i + 1}/${models.length}`, 'openrouter', { 
          model, 
          fileName: file.name,
          userPlan 
        });
        
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
                content: 'You are an expert OCR (Optical Character Recognition) system. Your task is to extract ALL visible text from the provided image with maximum accuracy. Return ONLY the extracted text without any additional commentary, explanations, or formatting. If the image contains tables, lists, or structured data, preserve that structure. If there is no readable text in the image, return "NO_TEXT_FOUND". Be thorough and extract every character you can see, including numbers, symbols, and punctuation.'
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text from this image. Return only the raw text content without any additional formatting or commentary.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${fileType};base64,${base64Image}`,
                      detail: 'high'  // Request high detail for better OCR
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
          
          // Check if model explicitly found no text
          if (extractedText && extractedText.trim().toUpperCase().includes('NO_TEXT_FOUND')) {
            await logger.warn('Model found no text in image', 'openrouter', { 
              model, 
              attempt: i + 1,
              fileName: file.name 
            });
            lastError = { error: 'No text found in image' };
            continue; // Try next model
          }
          
          if (extractedText && extractedText.trim().length > 0) {
            await logger.info('OCR extraction successful', 'openrouter', { 
              model, 
              attempt: i + 1, 
              textLength: extractedText.length,
              fileName: file.name 
            });
            break;
          } else {
            await logger.warn('Model returned empty text', 'openrouter', { 
              model, 
              attempt: i + 1,
              fileName: file.name 
            });
            lastError = { error: 'Empty response from model' };
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          await logger.warn('OCR model failed', 'openrouter', { 
            model, 
            attempt: i + 1, 
            status: response.status,
            error: errorData,
            fileName: file.name 
          });
          lastError = errorData;
        }
      } catch (error) {
        await logger.error('OCR model error', 'openrouter', { 
          model, 
          attempt: i + 1, 
          error: error instanceof Error ? error.message : String(error),
          fileName: file.name 
        });
        lastError = error;
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      await logger.error('All OCR models failed', 'openrouter', { 
        fileName: file.name, 
        userPlan,
        lastError: lastError instanceof Error ? lastError.message : lastError,
        modelsAttempted: models.length 
      });
      return NextResponse.json({ 
        error: 'Failed to extract text from image. Try uploading a PDF or text file instead, or ensure the image contains clear, readable text.' 
      }, { status: 503 });
    }

    return NextResponse.json({
      text: extractedText.trim(),
      fileName: file.name,
      fileSize: file.size,
      success: true
    });

  } catch (error: any) {
    console.log('💥 OCR API Error:', error);
    console.log('💥 Error message:', error instanceof Error ? error.message : String(error));
    console.log('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    await logger.error('Image processing error', 'general', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ 
      error: 'Failed to process image. Please try again.' 
    }, { status: 500 });
  }
}