/**
 * Script to set Lidor Peleka as a barber
 *
 * This will:
 * 1. Find Lidor's user by phone
 * 2. Set role: 'barber'
 * 3. Set barberId to his barber ID
 */

console.log(`
════════════════════════════════════════
  הגדרת לידור פלקה כספר
════════════════════════════════════════

צעדים להרצה ידנית ב-Firebase Console:

1. לך ל-Firestore Database
2. מצא את המשתמש של לידור פלקה (חפש לפי טלפון: +972525308049)
3. ערוך את המסמך והוסף/עדכן:

   role: "barber"
   barberId: "lidor-barber-id"  (או ה-ID של לידור מתוך הספרים)

4. שמור

לאחר מכן, לידור יראה את פאנל הניהול של הספרים!

════════════════════════════════════════

אלטרנטיבה: אם אתה רוצה שאני אעשה זאת דרך קוד,
תצטרך להתקין firebase-admin:

npm install firebase-admin

ואז להריץ:
node scripts/set-lidor-as-barber.js --run

════════════════════════════════════════
`);

// Check if --run flag is provided
if (process.argv.includes('--run')) {
  try {
    const admin = require('firebase-admin');
    const serviceAccount = require('../barbersbar-487c0-firebase-adminsdk-zi3u4-948d60f2bb.json');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();

    async function setLidorAsBarber() {
      try {
        // Find Lidor by phone
        const usersSnapshot = await db.collection('users')
          .where('phone', '==', '+972525308049')
          .get();

        if (usersSnapshot.empty) {
          console.log('❌ לא נמצא משתמש עם הטלפון +972525308049');
          console.log('\nכל המשתמשים:');

          const allUsers = await db.collection('users').get();
          allUsers.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.displayName || data.firstName} (${data.phone})`);
          });
          return;
        }

        // Get all barbers to find Lidor's barber ID
        const barbersSnapshot = await db.collection('barbers').get();
        let lidorBarberId = null;

        barbersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.name && data.name.includes('לידור')) {
            lidorBarberId = doc.id;
          }
        });

        if (!lidorBarberId) {
          console.log('⚠️  לא נמצא ספר בשם לידור. אנא הזן את ה-barber ID ידנית');
          return;
        }

        // Update user
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          role: 'barber',
          barberId: lidorBarberId,
          isBarber: true
        });

        console.log('✅ לידור פלקה הוגדר כספר בהצלחה!');
        console.log(`   Role: barber`);
        console.log(`   BarberId: ${lidorBarberId}`);

      } catch (error) {
        console.error('❌ שגיאה:', error);
      } finally {
        process.exit(0);
      }
    }

    setLidorAsBarber();
  } catch (error) {
    console.error('\n❌ שגיאה: firebase-admin לא מותקן');
    console.log('הרץ: npm install firebase-admin');
  }
}
