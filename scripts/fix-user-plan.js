// Script to manually fix user plan after successful Stripe payment
// This is a temporary fix until webhooks are properly configured

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config (using your production project)
const firebaseConfig = {
  apiKey: "AIzaSyAY7TlhRLIZHb-YMgXsSCkzbYzuFJDNO-8",
  authDomain: "test-buddy-prod.firebaseapp.com",
  projectId: "test-buddy-prod",
  storageBucket: "test-buddy-prod.firebasestorage.app",
  messagingSenderId: "812407354688",
  appId: "1:812407354688:web:324058009991f126ec76a5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserPlan() {
  try {
    // You'll need to replace this with your actual user ID
    // You can find it in the browser console or Firebase Auth
    const userId = process.argv[2];
    
    if (!userId) {
      console.log('Usage: node scripts/fix-user-plan.js <USER_ID>');
      console.log('You can find your user ID in the browser console or Firebase Auth');
      process.exit(1);
    }

    console.log(`Updating user ${userId} to Pro plan...`);

    // Update the user's plan to 'pro' with subscription details
    await updateDoc(doc(db, 'users', userId), {
      plan: 'pro',
      isTrial: false,
      trialEnd: null,
      subscriptionId: 'sub_1S5DPBLwUHHNwhFubW9brrwM', // From your successful payment
      updatedAt: serverTimestamp(),
    });

    console.log('✅ User plan updated successfully!');
    console.log('The user should now have Pro plan access.');
    
  } catch (error) {
    console.error('❌ Error updating user plan:', error);
  }
}

fixUserPlan();
