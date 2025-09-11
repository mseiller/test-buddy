const fs = require('fs');
const FormData = require('form-data');

async function testOCR() {
  try {
    // Test with a simple image that has text
    const imagePath = './public/test-image.png'; // You can use any image with text
    
    if (!fs.existsSync(imagePath)) {
      console.log('Creating a simple test image...');
      // Create a simple test image with text
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(400, 200);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 200);
      
      ctx.fillStyle = 'black';
      ctx.font = '24px Arial';
      ctx.fillText('This is test text for OCR', 50, 100);
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(imagePath, buffer);
      console.log('Test image created at:', imagePath);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    console.log('Testing OCR API...');
    
    const response = await fetch('https://test-buddy.com/api/extract-image', {
      method: 'POST',
      headers: {
        'X-User-Plan': 'pro'
      },
      body: formData
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('Response body:', result);
    
    if (response.ok) {
      const data = JSON.parse(result);
      console.log('Extracted text:', data.text);
    } else {
      console.log('Error response:', result);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testOCR();
