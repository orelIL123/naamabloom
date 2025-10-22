const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, Timestamp } = require('firebase/firestore');

console.log('🔧 Creating Firebase Auth users for all 4 barbers...');

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

const createAllBarbers = async () => {
  try {
    console.log('🗑️ First, cleaning up old Firestore barber users...');
    
    // Get all users and delete old barber users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.isBarber) {
        console.log(`🗑️ Deleting old barber user: ${userData.displayName}`);
        await deleteDoc(doc(db, 'users', userDoc.id));
      }
    }
    
    console.log('✅ Old barber users cleaned up');
    
    // Get barber IDs from the barbers collection
    const barbersSnapshot = await getDocs(collection(db, 'barbers'));
    const barberData = [];
    
    barbersSnapshot.forEach((doc) => {
      const data = doc.data();
      barberData.push({
        id: doc.id,
        name: data.name,
        hourlyRate: data.hourlyRate
      });
    });
    
    console.log(`📋 Found ${barberData.length} barbers in database`);
    
    // Create new Auth users for each barber
    const barberCredentials = [
      {
        email: 'ofek.algarisi@barbersbar.com',
        password: '123456',
        displayName: 'אופק אלגריסי',
        phone: '+972501234570',
        barberId: barberData.find(b => b.name === 'אופק אלגריסי')?.id
      },
      {
        email: 'lidor.peleka@barbersbar.com', 
        password: '234567',
        displayName: 'לידור פלקה',
        phone: '+972501234571',
        barberId: barberData.find(b => b.name === 'לידור פלקה')?.id
      },
      {
        email: 'ben.harosh@barbersbar.com',
        password: '345678', 
        displayName: 'בן הרוש',
        phone: '+972501234572',
        barberId: barberData.find(b => b.name === 'בן הרוש')?.id
      },
      {
        email: 'ariel.golan@barbersbar.com',
        password: '456789',
        displayName: 'אריאל גולן', 
        phone: '+972501234573',
        barberId: barberData.find(b => b.name === 'אריאל גולן')?.id
      }
    ];
    
    console.log('\n👤 Creating Firebase Auth users...\n');
    
    for (const credentials of barberCredentials) {
      try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          credentials.email, 
          credentials.password
        );
        const user = userCredential.user;
        
        console.log(`✅ Created Auth user: ${credentials.displayName}`);
        console.log(`   📧 Email: ${credentials.email}`);
        console.log(`   🔑 Password: ${credentials.password}`);
        console.log(`   🆔 UID: ${user.uid}`);
        
        // Update profile
        await updateProfile(user, {
          displayName: credentials.displayName
        });
        
        // Create matching Firestore user document
        const userProfile = {
          uid: user.uid,
          email: credentials.email,
          displayName: credentials.displayName,
          phone: credentials.phone,
          isAdmin: false,
          isBarber: true,
          barberId: credentials.barberId,
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
        console.log(`   ✅ Created Firestore user document`);
        console.log(`   💼 Linked to barber ID: ${credentials.barberId}\n`);
        
      } catch (error) {
        console.error(`❌ Error creating ${credentials.displayName}:`, error.message);
      }
    }
    
    console.log('🎉 All barbers created successfully!\n');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════');
    
    barberCredentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.displayName}`);
      console.log(`   📧 Email: ${cred.email}`);
      console.log(`   🔑 Password: ${cred.password}`);
      console.log('');
    });
    
    console.log('🎯 Now each barber can:');
    console.log('1. Log in with their email and password');
    console.log('2. Go to Settings tab');
    console.log('3. See "🏢 Business Management" section');
    console.log('4. Tap "My Dashboard" to access their panel');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

createAllBarbers();