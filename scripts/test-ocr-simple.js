const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testOcrSimple() {
  console.log('🔍 Testing OCR with simple text extraction...');
  
  // Test with a simple base64 image (1x1 pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('❌ NEXT_PUBLIC_OPENROUTER_API_KEY not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ OpenRouter API key found');
  console.log('🔑 API Key starts with:', openRouterApiKey.substring(0, 10) + '...');

  // Test with GPT-4o-mini first (most reliable for OCR)
  const models = [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'qwen/qwen-vl-plus'
  ];

  for (const model of models) {
    console.log(`\n🧪 Testing model: ${model}`);
    
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
              content: 'You are an expert OCR system. Extract ALL visible text from images. Return ONLY the extracted text without any commentary. If no text is found, return "NO_TEXT_FOUND".'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this image.'
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
          max_tokens: 1000,
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

testOcrSimple().then(() => {
  console.log('\n🏁 OCR test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
