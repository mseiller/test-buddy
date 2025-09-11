// Test if the OCR route can be imported without errors
try {
  console.log('Testing import...');
  
  // Try to import the route file
  const { POST } = require('./src/app/api/extract-image/route.ts');
  console.log('✅ Import successful');
  console.log('POST function:', typeof POST);
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
}
