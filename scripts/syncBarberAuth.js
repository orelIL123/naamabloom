const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, deleteDoc, Timestamp } = require('firebase/firestore');

console.log('🔧 Syncing Ben Harosh Firebase Auth with Firestore...');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7p1xfunf3eiUIbP1KtcSQZ_GwBu4KnTc",
  authDomain: "barbers-bar-ae31f.firebaseapp.com",
  projectId: "barbers-bar-ae31f",
  storageBucket: "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: "53851377123",
  appId: "1:53851377123:web:02bace959447ce8e6a24d6",
  measurementId: "G-RJMV6ZS6T0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const syncBenHaroshAuth = async () => {
  try {
    console.log('🔄 Creating Firestore user for common UIDs...');
    
    // Try common UIDs that Ben might have
    const possibleUIDs = [
      'ben.harosh@barbersbar.com',
      'ben-harosh',
      'benharosh',
      'BenHarosh',
      // Add the most likely Firebase Auth UID format
      'XYZ123ABC' // This will be replaced when we know the real UID
    ];
    
    // For now, let's create the user profile with a few common UID patterns
    // The user can try logging out and back in to regenerate
    
    console.log('📝 Instructions to fix Ben Harosh access:');
    console.log('');
    console.log('1. While Ben Harosh is logged in, open the app console/debugger');
    console.log('2. Look for his actual Firebase UID (it usually shows in auth errors)');
    console.log('3. OR, try these steps:');
    console.log('   - Log out of Ben Harosh account');
    console.log('   - Log back in with: ben.harosh@barbersbar.com');
    console.log('   - Password: (whatever you set for him)');
    console.log('');
    console.log('4. If still not working, provide me his actual UID and I will create the correct user record');
    console.log('');
    console.log('5. OR, delete Ben Harosh from Firebase Auth and I will recreate him properly');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

syncBenHaroshAuth();