// Script to check user data in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      projectId: 'test-buddy-prod',
    });
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkUserData() {
  try {
    const userId = 'E4ZQajKTspffEMHAwmHEVv3tAwE3';
    
    console.log(`Checking data for user: ${userId}`);
    console.log('='.repeat(50));
    
    // Check user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log('✅ User document exists:');
      console.log(userDoc.data());
    } else {
      console.log('❌ User document does not exist');
    }
    
    // Check test history (legacy)
    const testHistorySnapshot = await db.collection('testHistory')
      .where('userId', '==', userId)
      .get();
    
    console.log(`\n📊 Test History (legacy): ${testHistorySnapshot.size} tests`);
    testHistorySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.testName || 'Unnamed'} (${data.quizType}) - ${data.createdAt?.toDate()}`);
    });
    
    // Check nested tests
    const nestedTestsSnapshot = await db.collection(`users/${userId}/tests`).get();
    console.log(`\n📊 Nested Tests: ${nestedTestsSnapshot.size} tests`);
    nestedTestsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.testName || 'Unnamed'} (${data.quizType}) - ${data.createdAt?.toDate()}`);
    });
    
    // Check folders (legacy)
    const foldersSnapshot = await db.collection('folders')
      .where('userId', '==', userId)
      .get();
    
    console.log(`\n📁 Folders (legacy): ${foldersSnapshot.size} folders`);
    foldersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} - ${data.createdAt?.toDate()}`);
    });
    
    // Check nested folders
    const nestedFoldersSnapshot = await db.collection(`users/${userId}/folders`).get();
    console.log(`\n📁 Nested Folders: ${nestedFoldersSnapshot.size} folders`);
    nestedFoldersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} - ${data.createdAt?.toDate()}`);
    });
    
    // Check usage (legacy)
    const usageSnapshot = await db.collection('usage')
      .where('userId', '==', userId)
      .get();
    
    console.log(`\n📈 Usage (legacy): ${usageSnapshot.size} records`);
    usageSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.testsGenerated} tests generated`);
    });
    
    // Check nested usage
    const nestedUsageSnapshot = await db.collection(`users/${userId}/usage`).get();
    console.log(`\n📈 Nested Usage: ${nestedUsageSnapshot.size} records`);
    nestedUsageSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.testsGenerated} tests generated`);
    });
    
  } catch (error) {
    console.error('Error checking user data:', error);
  }
}

checkUserData().then(() => {
  console.log('\n✅ Data check complete');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
