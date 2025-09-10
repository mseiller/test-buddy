// Script to check what collections exist in production Firebase
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      // Handle multi-line JSON string from .env.local
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.replace(/'/g, '"');
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
        projectId: 'test-buddy-prod', // Production project ID
      });
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
      process.exit(1);
    }
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkCollections() {
  try {
    const userId = 'NzABmyVoMDWu1UWv2SRd1Ep0sRy1'; // The user from the console logs
    
    console.log(`Checking collections for user: ${userId}`);
    console.log('='.repeat(50));
    
    // Check if user document exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log('✅ User document exists:');
      console.log(userDoc.data());
    } else {
      console.log('❌ User document does not exist');
    }
    
    // Check legacy folders collection
    console.log('\n📁 Checking legacy folders collection...');
    try {
      const foldersSnapshot = await db.collection('folders')
        .where('userId', '==', userId)
        .get();
      console.log(`Found ${foldersSnapshot.size} folders in legacy collection`);
      foldersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (${doc.id})`);
      });
    } catch (error) {
      console.log('❌ Error accessing legacy folders:', error.message);
    }
    
    // Check nested folders collection
    console.log('\n📁 Checking nested folders collection...');
    try {
      const nestedFoldersSnapshot = await db.collection(`users/${userId}/folders`).get();
      console.log(`Found ${nestedFoldersSnapshot.size} folders in nested collection`);
      nestedFoldersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (${doc.id})`);
      });
    } catch (error) {
      console.log('❌ Error accessing nested folders:', error.message);
    }
    
    // Check legacy testHistory collection
    console.log('\n📊 Checking legacy testHistory collection...');
    try {
      const testHistorySnapshot = await db.collection('testHistory')
        .where('userId', '==', userId)
        .get();
      console.log(`Found ${testHistorySnapshot.size} tests in legacy collection`);
      testHistorySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.testName || 'Unnamed'} (${data.quizType})`);
      });
    } catch (error) {
      console.log('❌ Error accessing legacy testHistory:', error.message);
    }
    
    // Check nested tests collection
    console.log('\n📊 Checking nested tests collection...');
    try {
      const nestedTestsSnapshot = await db.collection(`users/${userId}/tests`).get();
      console.log(`Found ${nestedTestsSnapshot.size} tests in nested collection`);
      nestedTestsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.testName || 'Unnamed'} (${data.quizType})`);
      });
    } catch (error) {
      console.log('❌ Error accessing nested tests:', error.message);
    }
    
    // List all top-level collections
    console.log('\n📋 All top-level collections:');
    const collections = await db.listCollections();
    collections.forEach(collection => {
      console.log(`- ${collection.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCollections().then(() => {
  console.log('\n✅ Collection check complete');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
