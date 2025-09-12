const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
  try {
    console.log('🔍 Checking Firebase collections...');
    
    // List all collections
    const collections = await db.listCollections();
    console.log(`📊 Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`   - ${collection.id}`);
      
      // Get a sample of documents from each collection
      const snapshot = await collection.limit(3).get();
      console.log(`     Sample documents: ${snapshot.size}`);
      
      if (snapshot.size > 0) {
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`       ${doc.id}: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
        });
      }
    }
    
    // Specifically check tests collection
    console.log('\n🔍 Checking tests collection specifically...');
    const testsSnapshot = await db.collection('tests').get();
    console.log(`Tests collection has ${testsSnapshot.size} documents`);
    
    // Check testHistory collection
    console.log('\n🔍 Checking testHistory collection...');
    const testHistorySnapshot = await db.collection('testHistory').get();
    console.log(`testHistory collection has ${testHistorySnapshot.size} documents`);
    
    if (testHistorySnapshot.size > 0) {
      console.log('Sample testHistory documents:');
      testHistorySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ${doc.id}: ${data.title || 'No title'} - ${data.folderId || 'No folderId'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    process.exit(0);
  }
}

checkCollections();
