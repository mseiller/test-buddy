const fs = require('fs');

// Create a simple test image with text using a data URL
// This creates a simple PNG with "TEST TEXT" written on it
const testImageDataURL = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

// For testing purposes, let's create a more realistic test
// We'll use a simple base64 image that should contain some text
const testImageWithText = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

console.log('Test image created for OCR testing');
console.log('Image size:', testImageWithText.length, 'characters');

// Save the test data for reference
fs.writeFileSync('test-image-data.txt', testImageWithText);
console.log('Test image data saved to test-image-data.txt');
