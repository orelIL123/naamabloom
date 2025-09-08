/*
  Seeding script: creates admin user and sets up base collections
  Usage: npm run seed
*/

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const serviceAccountPathCandidates = [
  path.resolve(process.cwd(), 'naama-bloom-88733-firebase-adminsdk-fbsvc-58872cc10a.json'),
  path.resolve(process.cwd(), 'naama-bloom-88733-firebase-adminsdk-fbsvc.json')
];

function findServiceAccountPath(): string {
  for (const p of serviceAccountPathCandidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Service account JSON not found. Place it at project root.');
}

async function bootstrap() {
  const serviceAccountPath = findServiceAccountPath();
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: 'naama-bloom-88733.firebasestorage.app'
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  const adminEmail = 'naama1@bloom.com';
  const adminPassword = '1234567';

  // Create or get admin user
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await auth.getUserByEmail(adminEmail);
    console.log('Admin user already exists:', userRecord.uid);
  } catch (e) {
    userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
      displayName: 'Naama Admin'
    });
    console.log('Created admin user:', userRecord.uid);
  }

  // Set custom claims for admin
  await auth.setCustomUserClaims(userRecord.uid, { admin: true });
  console.log('Set admin custom claim.');

  // Seed base collections/documents
  const batch = db.batch();

  const usersRef = db.collection('users').doc(userRecord.uid);
  batch.set(usersRef, {
    uid: userRecord.uid,
    email: adminEmail,
    displayName: 'Naama Admin',
    firstName: 'Naama',
    isAdmin: true,
    isBarber: false,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const settingsWelcomeRef = db.collection('settings').doc('homeMessages');
  batch.set(settingsWelcomeRef, {
    title: 'ברוכים הבאים',
    subtitle: 'קבעו תור במהירות ובקלות',
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const settingsAboutRef = db.collection('settings').doc('aboutUsText');
  batch.set(settingsAboutRef, {
    text: 'מספרת נאמה בלום - מקצועיות, דיוק ואווירה נעימה.',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Additional settings docs
  const settingsImagesRef = db.collection('settings').doc('images');
  batch.set(settingsImagesRef, {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true
  }, { merge: true });

  const settingsPopupRef = db.collection('settings').doc('popupMessage');
  batch.set(settingsPopupRef, {
    isActive: false,
    title: 'ברוכים הבאים',
    message: 'הודעה כללית ללקוחות',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const settingsAboutLegacyRef = db.collection('settings').doc('aboutus');
  batch.set(settingsAboutLegacyRef, {
    text: 'אודות המספרה - טקסט לדוגמה',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Ensure other collections exist by creating placeholder docs if empty
  const ensureCollections: Array<{ col: string; data: Record<string, any> }> = [
    { col: 'barbers', data: { name: 'Main Barber', isMainBarber: true, isActive: true } },
    { col: 'treatments', data: { title: 'תספורת', price: 100, duration: 30, isActive: true } },
    { col: 'gallery', data: { url: '', isActive: false } },
    { col: 'appointments', data: { status: 'seed-placeholder', createdAt: admin.firestore.FieldValue.serverTimestamp() } },
    { col: 'waitlist', data: { status: 'seed-placeholder', createdAt: admin.firestore.FieldValue.serverTimestamp() } },
    { col: 'barberTreatments', data: { isActive: true } },
    { col: 'barberAvailability', data: { isActive: true } },
    { col: 'shopItems', data: { isActive: false } },
    { col: 'adminNotifications', data: { message: 'Seed notification', isRead: false, createdAt: admin.firestore.FieldValue.serverTimestamp() } },
  ];

  for (const item of ensureCollections) {
    const snapshot = await db.collection(item.col).limit(1).get();
    if (snapshot.empty) {
      const docRef = db.collection(item.col).doc();
      batch.set(docRef, item.data);
    }
  }

  await batch.commit();
  console.log('Seeding complete.');

  // ---- Create concrete initial data across collections ----
  // Treatments
  const treatments = [
    { id: 'haircut', title: 'תספורת', price: 100, duration: 30, isActive: true },
    { id: 'beard', title: 'עיצוב זקן', price: 60, duration: 20, isActive: true },
    { id: 'combo', title: 'תספורת + זקן', price: 140, duration: 50, isActive: true },
    { id: 'kids', title: 'תספורת ילדים', price: 80, duration: 30, isActive: true },
  ];
  for (const t of treatments) {
    await db.collection('treatments').doc(t.id).set({ ...t }, { merge: true });
  }

  // Artist (brow designer) linked to admin user
  const artistId = 'naama';
  const artistDoc = {
    name: 'Naama Bloom',
    userId: userRecord.uid,
    phone: '+972000000000',
    whatsapp: '+972000000000',
    isMainArtist: true,
    experience: 'Brow Artist',
    specialties: ['Eyebrow Design', 'Tint', 'Shaping'],
    available: true,
    isActive: true
  };
  await db.collection('artists').doc(artistId).set(artistDoc, { merge: true });
  // Backward compatibility: also write to barbers if exists in app until fully migrated
  await db.collection('barbers').doc(artistId).set(artistDoc as any, { merge: true });

  // Barber treatments relations
  for (const t of treatments) {
    const relId = `${artistId}_${t.id}`;
    const relDoc = {
      artistId,
      treatmentId: t.id,
      price: t.price,
      duration: t.duration,
      isActive: true
    };
    await db.collection('artistTreatments').doc(relId).set(relDoc, { merge: true });
    // Backward compatibility
    await db.collection('barberTreatments').doc(relId).set(relDoc as any, { merge: true });
  }

  // Barber availability (simple weekly schedule)
  await db.collection('artistAvailability').doc(artistId).set({
    artistId,
    isActive: true,
    week: {
      sun: ['10:00-18:00'],
      mon: ['10:00-18:00'],
      tue: ['10:00-18:00'],
      wed: ['10:00-18:00'],
      thu: ['10:00-18:00'],
      fri: ['09:00-14:00'],
      sat: []
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  // Backward compatibility
  await db.collection('barberAvailability').doc(artistId).set({
    barberId: artistId,
    isActive: true
  }, { merge: true });

  // Business config used by the app
  await db.collection('businessConfigs').doc('Test Salon').set({
    businessId: 'Test Salon',
    businessName: 'Naama Bloom',
    ownerPhone: '+972000000000',
    cancelPolicy: {
      hoursBeforeAppointment: 2,
      message: 'אי אפשר לבטל - תתקשר למספרה'
    }
  }, { merge: true });
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });


