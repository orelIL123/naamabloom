#!/usr/bin/env node

// Fix admin permissions for orel895@gmail.com
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase config - you'll need to replace with actual values
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id", 
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAndFixAdminPermissions() {
  try {
    console.log('🔍 Checking admin permissions...');
    
    // Check if user with email orel895@gmail.com exists
    const usersQuery = query(collection(db, 'users'), where('email', '==', 'orel895@gmail.com'));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found with email orel895@gmail.com');
      console.log('📝 You need to:');
      console.log('1. Sign up with orel895@gmail.com in the app first');
      console.log('2. Then run this script again');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log('👤 Found user:', { 
      id: userId, 
      email: userData.email, 
      isAdmin: userData.isAdmin || false,
      isBarber: userData.isBarber || false 
    });
    
    // Update user to be admin
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      isAdmin: true,
      isBarber: true, // Make them a barber too for full access
      updatedAt: new Date()
    });
    
    console.log('✅ User updated to admin successfully!');
    console.log('🎯 Now the admin bubble should appear on HomeScreen');
    
    // Also check for any appointments to test the bubble
    const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
    console.log(`📅 Found ${appointmentsSnapshot.size} appointments in database`);
    
    if (appointmentsSnapshot.size === 0) {
      console.log('⚠️ No appointments found. Create some test appointments to see the admin bubble.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Also export a function to create test appointment
async function createTestAppointment() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const testAppointment = {
      clientName: "בן הרוש",
      clientPhone: "0501234567",
      date: tomorrow.toISOString().split('T')[0], // YYYY-MM-DD format
      time: "10:00",
      barberId: "test-barber-id",
      userId: "test-user-id",
      status: "confirmed",
      createdAt: new Date(),
      treatmentId: "haircut"
    };
    
    await setDoc(doc(collection(db, 'appointments')), testAppointment);
    console.log('✅ Test appointment created for tomorrow at 10:00');
    
  } catch (error) {
    console.error('❌ Error creating test appointment:', error);
  }
}

console.log('🚀 Firebase Admin Permission Fixer');
console.log('This will set orel895@gmail.com as admin');

// Run the main function
checkAndFixAdminPermissions().then(() => {
  console.log('✨ Done! Check the app now.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed:', error);
  process.exit(1);
});