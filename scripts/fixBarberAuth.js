const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

console.log('🔧 Fixing barber authentication setup...');

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

const fixBarberAuth = async () => {
  try {
    console.log('🔍 Looking for existing barber users...');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const barberUsers = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isBarber) {
        barberUsers.push({
          id: doc.id,
          data: data
        });
      }
    });
    
    console.log(`📋 Found ${barberUsers.length} barber users:`);
    
    for (const barberUser of barberUsers) {
      console.log(`\n👤 Processing: ${barberUser.data.displayName} (${barberUser.data.email})`);
      console.log(`   Current UID: ${barberUser.id}`);
      
      // For now, let's just ensure the data is correct
      // If Ben Harosh is logged in with a different UID in Firebase Auth,
      // we need to know what that UID is
      
      // Let's create a simplified UID based on email
      const emailUID = barberUser.data.email.split('@')[0].replace('.', '-');
      console.log(`   Suggested UID: ${emailUID}`);
      
      // Update the user record to ensure all fields are correct
      await setDoc(doc(db, 'users', barberUser.id), {
        ...barberUser.data,
        isBarber: true,
        role: 'barber',
        permissions: {
          canManageOwnAvailability: true,
          canViewOwnAppointments: true,
          canManageOwnAppointments: true,
          canViewStatistics: true,
          canManageAllBarbers: false,
          canManageSettings: false,
          canManageUsers: false
        }
      }, { merge: true });
      
      console.log(`   ✅ Updated user record for ${barberUser.data.displayName}`);
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Ask the user what UID Ben Harosh is logged in with');
    console.log('2. We can then create/update the correct user record');
    console.log('3. Or we can create a new Firebase Auth user with the correct email');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fixBarberAuth();