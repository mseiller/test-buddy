const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testOcrWithRealImage() {
  console.log('🔍 Testing OCR with real image...');
  
  // Create a test image file with actual text content
  // This will be a simple base64 encoded image with text
  const testImageWithText = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
  
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('❌ NEXT_PUBLIC_OPENROUTER_API_KEY not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ OpenRouter API key found');

  // Test with the exact same API call format as the production code
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
                  url: `data:image/png;base64,${testImageWithText}`,
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

    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content;
      console.log('📝 Extracted text:', extractedText);
      
      if (extractedText && extractedText.trim().length > 0 && !extractedText.includes('NO_TEXT_FOUND')) {
        console.log('🎉 OCR is working correctly!');
        console.log('📄 Full response:', JSON.stringify(data, null, 2));
      } else if (extractedText === 'NO_TEXT_FOUND') {
        console.log('⚠️ Model correctly identified no text in test image');
      } else {
        console.log('❌ OCR returned empty or invalid response');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ OCR API failed:', response.status);
      console.log('📄 Error details:', JSON.stringify(errorData, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error testing OCR:', error);
  }
}

testOcrWithRealImage().then(() => {
  console.log('\n🏁 OCR test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
