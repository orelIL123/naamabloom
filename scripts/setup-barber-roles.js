/**
 * Setup all barbers with proper role and barberId
 * Run this from the project root: node scripts/setup-barber-roles.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc, query, where } = require('firebase/firestore');

// Firebase config from your app
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
const auth = getAuth(app);
const db = getFirestore(app);

// Barber credentials from the message
const barbers = [
  {
    name: 'לידור פלקה',
    email: 'lidor.peleka@barbersbar.com',
    password: '234567'
  },
  {
    name: 'אופק אלגריסי',
    email: 'ofek.algarisi@barbersbar.com',
    password: '123456'
  },
  {
    name: 'בן הרוש',
    email: 'ben.harosh@barbersbar.com',
    password: '345678'
  },
  {
    name: 'אריאל גולן',
    email: 'ariel.golan@barbersbar.com',
    password: '456789'
  }
];

async function setupBarberRoles() {
  console.log('\n🚀 מתחיל להגדיר ספרים...\n');

  try {
    // 1. Get all barbers from barbers collection
    console.log('📋 טוען את רשימת הספרים...');
    const barbersSnapshot = await getDocs(collection(db, 'barbers'));
    const barbersList = {};

    barbersSnapshot.forEach(doc => {
      const data = doc.data();
      barbersList[data.name] = doc.id;
      console.log(`   ✂️  ${data.name} (ID: ${doc.id})`);
    });

    console.log('\n👤 מעדכן משתמשים...\n');

    // 2. For each barber, find their user and update role
    for (const barber of barbers) {
      try {
        console.log(`\n🔍 מחפש: ${barber.name} (${barber.email})`);

        // Find user by email
        const usersQuery = query(collection(db, 'users'), where('email', '==', barber.email));
        const userSnapshot = await getDocs(usersQuery);

        if (userSnapshot.empty) {
          console.log(`   ❌ לא נמצא משתמש עם אימייל ${barber.email}`);
          console.log(`   💡 אולי המשתמש עדיין לא נרשם? נסה שהספר יתחבר לפחות פעם אחת`);
          continue;
        }

        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Find matching barber ID by name
        let barberId = null;
        for (const [name, id] of Object.entries(barbersList)) {
          if (name.includes(barber.name.split(' ')[0]) || barber.name.includes(name.split(' ')[0])) {
            barberId = id;
            break;
          }
        }

        if (!barberId) {
          console.log(`   ⚠️  לא נמצא barber ID מתאים ל-${barber.name}`);
          console.log(`   💡 נא להוסיף ידנית את ה-barberId`);
          continue;
        }

        // Update user document
        await updateDoc(doc(db, 'users', userId), {
          role: 'barber',
          barberId: barberId,
          isBarber: true
        });

        console.log(`   ✅ ${barber.name} עודכן בהצלחה!`);
        console.log(`      Role: barber`);
        console.log(`      BarberId: ${barberId}`);

      } catch (error) {
        console.log(`   ❌ שגיאה בעדכון ${barber.name}:`, error.message);
      }
    }

    console.log('\n✨ סיימתי!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('הספרים צריכים להתנתק ולהתחבר מחדש לאפליקציה');
    console.log('אחרי זה הם יראו את כפתור "ניהול" בתפריט הצד');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ שגיאה כללית:', error);
  } finally {
    process.exit(0);
  }
}

setupBarberRoles();
