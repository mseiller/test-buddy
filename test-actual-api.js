const fs = require('fs');
const FormData = require('form-data');

async function testActualApi() {
  console.log('🔍 Testing actual API endpoint...');
  
  // Create a simple test image file
  // For now, let's create a minimal PNG file
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
  ]);
  
  // Write test image file
  fs.writeFileSync('test-image.png', pngHeader);
  console.log('✅ Test image file created');
  
  try {
    // Test the actual API endpoint
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-image.png'), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    console.log('📤 Sending request to API endpoint...');
    
    const response = await fetch('https://test-buddy.com/api/extract-image', {
      method: 'POST',
      headers: {
        'X-User-Plan': 'pro',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('📡 Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📄 Response:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ API call successful');
      console.log('📝 Extracted text:', data.text || 'No text field');
      console.log('🎯 Success:', data.success);
    } else {
      console.log('❌ API call failed');
      console.log('📄 Error response:', responseText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    // Clean up test file
    if (fs.existsSync('test-image.png')) {
      fs.unlinkSync('test-image.png');
    }
  }
}

testActualApi().then(() => {
  console.log('\n🏁 API test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
