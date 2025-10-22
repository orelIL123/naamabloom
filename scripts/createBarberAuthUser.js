const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

console.log('🔧 Creating proper Firebase Auth user for Ben Harosh...');

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
const auth = getAuth(app);
const db = getFirestore(app);

const createBenHaroshUser = async () => {
  try {
    console.log('👤 Creating Firebase Auth user for Ben Harosh...');
    
    const email = 'ben.harosh@barbersbar.com';
    const password = 'BenHarosh123!'; // You can change this
    const displayName = 'בן הרוש';
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`✅ Created Firebase Auth user with UID: ${user.uid}`);
    
    // Update profile
    await updateProfile(user, {
      displayName: displayName
    });
    
    console.log('✅ Updated user profile');
    
    // Create Firestore user document with matching UID
    const userProfile = {
      uid: user.uid,
      email: email,
      displayName: displayName,
      phone: '+972501234572',
      isAdmin: false,
      isBarber: true,
      barberId: 'TiLfp6ZvEPkvLvZHYKrf', // Keep same barber ID
      hasPassword: true,
      role: 'barber',
      permissions: {
        canManageOwnAvailability: true,
        canViewOwnAppointments: true,
        canManageOwnAppointments: true,
        canViewStatistics: true,
        canManageAllBarbers: false,
        canManageSettings: false,
        canManageUsers: false
      },
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('✅ Created matching Firestore user document');
    
    console.log('\n🎉 Ben Harosh setup complete!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 UID: ${user.uid}`);
    console.log('\nBen can now log in with these credentials and access his dashboard!');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Email already exists in Firebase Auth');
      console.log('The existing user needs to be linked to the Firestore data');
      console.log('Please provide the existing users UID so we can update the Firestore record');
    } else {
      console.error('❌ Error:', error);
    }
  }
};

createBenHaroshUser();