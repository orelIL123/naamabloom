const admin = require('firebase-admin');
const serviceAccount = require('../barbersbar-487c0-firebase-adminsdk-zi3u4-948d60f2bb.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log('🔍 בודק את כל המשתמשים...\n');
    
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 נמצאו ${usersSnapshot.size} משתמשים:\n`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.displayName || data.firstName || 'ללא שם';
      const phone = data.phone || 'ללא טלפון';
      const role = data.role || '❌ לא מוגדר';
      const barberId = data.barberId || '❌ לא מוגדר';
      
      console.log(`👤 ${name}`);
      console.log(`   📱 ${phone}`);
      console.log(`   🎭 Role: ${role}`);
      console.log(`   ✂️  BarberId: ${barberId}`);
      console.log(`   🆔 UID: ${doc.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers();
