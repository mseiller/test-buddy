// Test environment variables
console.log('Testing environment variables...');

// Test the health endpoint to see what env vars are available
fetch('https://test-buddy.com/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('Health check response:', JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Health check error:', error);
  });
