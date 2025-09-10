// Script to view logs from Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');
require('dotenv').config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function viewLogs() {
  try {
    console.log('📊 Fetching recent logs from Firebase...\n');
    
    const logsRef = collection(db, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No logs found in Firebase.');
      return;
    }
    
    console.log(`Found ${snapshot.size} recent logs:\n`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      
      console.log(`[${timestamp.toISOString()}] ${data.level.toUpperCase()} - ${data.service}`);
      console.log(`  Message: ${data.message}`);
      if (data.metadata) {
        console.log(`  Metadata:`, JSON.stringify(data.metadata, null, 2));
      }
      if (data.userId) {
        console.log(`  User ID: ${data.userId}`);
      }
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

// Run the script
viewLogs();
