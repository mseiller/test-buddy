const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testProOcr() {
  console.log('🔍 Testing PRO user OCR models...');
  
  // Test with a simple base64 image (1x1 pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('❌ NEXT_PUBLIC_OPENROUTER_API_KEY not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ OpenRouter API key found');

  // Test PRO models exactly as they're configured in the API
  const proModels = [
    'openai/gpt-4o-mini',  // Best for OCR, fast and accurate
    'openai/gpt-4o',       // Most accurate but slower
    'openai/gpt-4-vision-preview',  // Specialized vision model
  ];

  for (const model of proModels) {
    console.log(`\n🧪 Testing PRO model: ${model}`);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Test Buddy - OCR Test'
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

      console.log(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content;
        console.log(`✅ Model ${model} responded successfully`);
        console.log(`📝 Extracted text: "${extractedText}"`);
        
        if (extractedText && extractedText.trim().length > 0 && !extractedText.includes('NO_TEXT_FOUND')) {
          console.log(`🎉 Success with ${model}!`);
          break;
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ Model ${model} failed: ${response.status}`);
        console.log(`📄 Error details:`, JSON.stringify(errorData, null, 2));
      }
    } catch (error) {
      console.log(`💥 Error with model ${model}:`, error.message);
    }
  }
}

testProOcr().then(() => {
  console.log('\n🏁 PRO OCR test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
