const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testOcrApi() {
  // Test the exact API call format used in the app
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  console.log('Testing OCR API call...');
  
  // Create a simple test image with text (base64 encoded)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://test-buddy.com',
        'X-Title': 'Test Buddy - Image OCR'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
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
                  url: `data:image/png;base64,${testImageBase64}`,
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

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      const text = data.choices?.[0]?.message?.content;
      console.log('Extracted text:', text);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testOcrApi();
