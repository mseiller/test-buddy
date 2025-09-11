const fs = require('fs');
const FormData = require('form-data');

async function testWithRealFile() {
  console.log('🔍 Testing with real image file...');
  
  try {
    // Use the existing favicon.png file
    const imagePath = 'public/favicon.png';
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file not found:', imagePath);
      return;
    }
    
    console.log('✅ Using image file:', imagePath);
    console.log('📏 File size:', fs.statSync(imagePath).size, 'bytes');
    
    // Test the actual API endpoint
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath), {
      filename: 'favicon.png',
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
      console.log('📁 File name:', data.fileName);
    } else {
      console.log('❌ API call failed');
      console.log('📄 Error response:', responseText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithRealFile().then(() => {
  console.log('\n🏁 Real file test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
