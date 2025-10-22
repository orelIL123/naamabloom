/**
 * Update existing barber users to add role field
 * Run: node scripts/update-barber-roles-en.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAKEPu7-naLTdeBGAu5dVyvDuGKsFz2E4c",
  authDomain: "barbers-bar-ae31f.firebaseapp.com",
  projectId: "barbers-bar-ae31f",
  storageBucket: "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: "53851377123",
  appId: "1:53851377123:android:38a791e8e929e5e66a24d6",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateBarberRoles() {
  console.log('\n🚀 Updating existing barbers...\n');

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));

    console.log(`📋 Found ${usersSnapshot.size} users\n`);

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if user is a barber (has isBarber: true or has barberId)
      if (userData.isBarber === true || userData.barberId) {

        // Check if already has role field
        if (userData.role === 'barber') {
          console.log(`✅ ${userData.displayName || userData.email} - Already set as barber`);
          alreadySetCount++;
          continue;
        }

        // Update user with role
        try {
          await updateDoc(doc(db, 'users', userId), {
            role: 'barber'
          });

          updatedCount++;
          console.log(`✨ ${userData.displayName || userData.email} - Updated to barber!`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   BarberId: ${userData.barberId}`);
          console.log('');

        } catch (error) {
          console.log(`❌ Error updating ${userData.displayName || userData.email}:`, error.message);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✅ Successfully updated ${updatedCount} barbers!`);
    console.log(`ℹ️  ${alreadySetCount} barbers were already set`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n💡 Barbers need to logout and login again');
    console.log('   Then they will see the "Management" button in side menu\n');

  } catch (error) {
    console.error('\n❌ General error:', error.message);
    console.error('Full error:', error);
  } finally {
    // Give it time to complete
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
}

updateBarberRoles();
