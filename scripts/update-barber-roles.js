/**
 * Update existing barber users to add role field
 * Run: node scripts/update-barber-roles.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPq2P6rbO3_qBQVIkC00c2Z9Cg_VWZrPg",
  authDomain: "barbersbar-487c0.firebaseapp.com",
  projectId: "barbersbar-487c0",
  storageBucket: "barbersbar-487c0.firebasestorage.app",
  messagingSenderId: "524458104391",
  appId: "1:524458104391:web:cf6fdaed5f7c66e464c95a",
  measurementId: "G-LJDYV8EHSV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateBarberRoles() {
  console.log('\n🚀 מעדכן ספרים קיימים...\n');

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));

    console.log(`📋 נמצאו ${usersSnapshot.size} משתמשים\n`);

    let updatedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if user is a barber (has isBarber: true or has barberId)
      if (userData.isBarber === true || userData.barberId) {

        // Check if already has role field
        if (userData.role === 'barber') {
          console.log(`✅ ${userData.displayName || userData.email} - כבר מוגדר כספר`);
          continue;
        }

        // Update user with role
        try {
          await updateDoc(doc(db, 'users', userId), {
            role: 'barber'
          });

          updatedCount++;
          console.log(`✨ ${userData.displayName || userData.email} - עודכן לספר!`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   BarberId: ${userData.barberId}`);
          console.log('');

        } catch (error) {
          console.log(`❌ שגיאה בעדכון ${userData.displayName || userData.email}:`, error.message);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✅ עודכנו ${updatedCount} ספרים בהצלחה!`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n💡 הספרים צריכים להתנתק ולהתחבר מחדש');
    console.log('   אז הם יראו את כפתור "ניהול" בתפריט הצד\n');

  } catch (error) {
    console.error('\n❌ שגיאה כללית:', error);
  } finally {
    // Give it time to complete
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
}

updateBarberRoles();
