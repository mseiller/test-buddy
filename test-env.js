// Test if environment variables are available
require('dotenv').config({ path: '.env.local' });

console.log('Testing environment variables...');
console.log('NEXT_PUBLIC_OPENROUTER_API_KEY:', process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
  console.log('API Key starts with:', process.env.NEXT_PUBLIC_OPENROUTER_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ API Key is not set - this would cause the OCR API to fail');
}
