// Test script for OCR functionality
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testOCR() {
  console.log('🧪 Testing OCR functionality...\n');
  
  // Test with a sample image if available
  const testImagePath = path.join(__dirname, '..', 'public', 'test-image.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ No test image found. Please add a test image at public/test-image.jpg');
    console.log('   Or create a simple image with some text to test OCR functionality.');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath));
    
    console.log('📤 Sending test image to OCR API...');
    
    const response = await fetch('http://localhost:3000/api/extract-image', {
      method: 'POST',
      body: formData,
      headers: {
        'X-User-Plan': 'pro' // Test with pro plan
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ OCR Test Successful!');
      console.log(`📄 Extracted text (${result.text.length} characters):`);
      console.log('─'.repeat(50));
      console.log(result.text);
      console.log('─'.repeat(50));
      console.log(`📊 File: ${result.fileName}`);
      console.log(`📏 Size: ${result.fileSize} bytes`);
    } else {
      console.log('❌ OCR Test Failed!');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Check if running directly
if (require.main === module) {
  testOCR();
}

module.exports = { testOCR };
