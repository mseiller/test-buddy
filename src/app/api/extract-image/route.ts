import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/services/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Get user plan from header
    const userPlan = request.headers.get('X-User-Plan') as 'free' | 'student' | 'pro' || 'free';
    
    // Debug log for user plan
    await logger.info('OCR request received', 'general', { 
      userPlan,
      headerValue: request.headers.get('X-User-Plan'),
      fileName: file?.name || 'unknown'
    });

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
    if (!openRouterApiKey) {
      await logger.error('OpenRouter API key not configured', 'general', { fileName: file.name });
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    await logger.info('Starting image text extraction', 'openrouter', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType,
      userPlan,
      base64Length: base64Image.length 
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
      // Free/Student users: Vision-capable free models with better fallbacks
      models = [
        'qwen/qwen-vl-plus',           // Qwen vision model
        'qwen/qwen-vl-max',            // Better Qwen vision
        'qwen/qwen-vl-7b',             // Smaller Qwen vision model
        'qwen/qwen-vl-2',              // Alternative Qwen vision
        'llava-v1.6-mistral-7b',       // LLaVA vision model
        'llava-v1.6-vicuna-7b',        // Another LLaVA model
        'qwen/qwen3-235b-a22b:free'    // Last resort text-only
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
            await logger.info('Model found no text in image', 'openrouter', { 
              model, 
              attempt: i + 1,
              fileName: file.name 
            });
            // Treat NO_TEXT_FOUND as successful - the image was processed but contains no text
            extractedText = 'NO_TEXT_FOUND';
            break; // Stop trying other models
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

    // Handle NO_TEXT_FOUND case
    if (extractedText === 'NO_TEXT_FOUND') {
      return NextResponse.json({ 
        error: 'No readable text found in the image. Please ensure the image contains clear, readable text.' 
      }, { status: 400 });
    }

    return NextResponse.json({
      text: extractedText.trim(),
      fileName: file.name,
      fileSize: file.size,
      success: true
    });

  } catch (error: any) {
    await logger.error('Image processing error', 'general', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ 
      error: 'Failed to process image. Please try again.' 
    }, { status: 500 });
  }
}
