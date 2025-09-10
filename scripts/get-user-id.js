// Script to help find the current user ID
// Run this in the browser console while logged in

console.log('To find your user ID:');
console.log('1. Open your browser console (F12)');
console.log('2. Go to your Test Buddy app');
console.log('3. Run this command in the console:');
console.log('');
console.log('firebase.auth().currentUser?.uid');
console.log('');
console.log('Or if you\'re using the new Firebase v9+ syntax:');
console.log('import { getAuth } from "firebase/auth";');
console.log('console.log(getAuth().currentUser?.uid);');
console.log('');
console.log('Copy the user ID and run:');
console.log('node scripts/fix-user-plan.js <USER_ID>');
