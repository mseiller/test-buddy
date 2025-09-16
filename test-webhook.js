const fetch = require('node-fetch');

async function testWebhook() {
  try {
    console.log('Testing webhook endpoint...');
    
    const response = await fetch('https://test-buddy-working.vercel.app/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'test-session',
            subscription: 'sub_test123',
            metadata: {
              userId: 'test-user-123',
              plan: 'pro',
              isTrial: 'false'
            }
          }
        }
      })
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook();
