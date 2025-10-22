const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

console.log('🧹 Clearing Firebase collections...');

// Firebase configuration for Barbers Bar
const firebaseConfig = {
  apiKey: "AIzaSyD7p1xfunf3eiUIbP1KtcSQZ_GwBu4KnTc",
  authDomain: "barbers-bar-ae31f.firebaseapp.com",
  projectId: "barbers-bar-ae31f",
  storageBucket: "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: "53851377123",
  appId: "1:53851377123:web:02bace959447ce8e6a24d6",
  measurementId: "G-RJMV6ZS6T0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const clearCollections = async () => {
  try {
    const collections = [
      'barbers',
      'treatments', 
      'gallery',
      'settings',
      'shopItems',
      'barberAvailability',
      'users',
      'appointments'
    ];

    for (const collectionName of collections) {
      console.log(`🗑️ Clearing ${collectionName} collection...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`✅ Deleted ${querySnapshot.docs.length} documents from ${collectionName}`);
    }

    console.log('\n🎉 All collections cleared successfully!');
    console.log('📊 Ready to add fresh data.');

  } catch (error) {
    console.error('❌ Error clearing collections:', error);
  }
};

// Run the clear function
clearCollections(); 