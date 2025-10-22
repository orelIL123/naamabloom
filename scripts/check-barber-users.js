const admin = require('firebase-admin');
const serviceAccount = require('../barbersbar-487c0-firebase-adminsdk-zi3u4-948d60f2bb.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBarberUsers() {
  try {
    console.log('\n🔍 בודק את כל המשתמשים...\n');

    const usersSnapshot = await db.collection('users').get();
    const barbersSnapshot = await db.collection('barbers').get();

    console.log('📋 הספרים במערכת:');
    console.log('══════════════════════════════════════\n');

    barbersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`✂️  ${data.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Email: ${data.email || 'לא מוגדר'}`);
      console.log('');
    });

    console.log('\n👥 המשתמשים במערכת:');
    console.log('══════════════════════════════════════\n');

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.displayName || data.firstName || 'ללא שם';
      const email = data.email || 'ללא אימייל';
      const role = data.role || '❌ לא מוגדר';
      const barberId = data.barberId || '❌ לא מוגדר';

      console.log(`👤 ${name}`);
      console.log(`   📧 ${email}`);
      console.log(`   🎭 Role: ${role}`);
      console.log(`   ✂️  BarberId: ${barberId}`);
      console.log(`   🆔 UID: ${doc.id}`);
      console.log('');
    });

    // Check specifically for barber emails
    console.log('\n🔎 חיפוש ספרים לפי אימייל:');
    console.log('══════════════════════════════════════\n');

    const barberEmails = [
      'lidor.peleka@barbersbar.com',
      'ofek.algarisi@barbersbar.com',
      'ben.harosh@barbersbar.com',
      'ariel.golan@barbersbar.com'
    ];

    for (const email of barberEmails) {
      const userSnapshot = await db.collection('users').where('email', '==', email).get();
      if (!userSnapshot.empty) {
        const data = userSnapshot.docs[0].data();
        console.log(`✅ ${email} - Role: ${data.role || 'לא מוגדר'}, BarberId: ${data.barberId || 'לא מוגדר'}`);
      } else {
        console.log(`❌ ${email} - לא קיים במערכת`);
      }
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    process.exit(0);
  }
}

checkBarberUsers();
