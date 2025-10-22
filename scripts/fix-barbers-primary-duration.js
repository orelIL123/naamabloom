#!/usr/bin/env node

/**
 * Script to add primaryTreatmentDuration to all barbers that don't have it
 * Run with: node scripts/fix-barbers-primary-duration.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixBarbersPrimaryDuration() {
  console.log('🔧 Starting barber primary duration fix...\n');

  try {
    const barbersSnapshot = await db.collection('barbers').get();

    console.log(`📊 Found ${barbersSnapshot.size} barbers\n`);

    let updated = 0;
    let skipped = 0;

    for (const doc of barbersSnapshot.docs) {
      const barberData = doc.data();
      const barberId = doc.id;
      const barberName = barberData.name || 'Unknown';

      if (barberData.primaryTreatmentDuration === undefined || barberData.primaryTreatmentDuration === null) {
        console.log(`✏️  Updating ${barberName} (${barberId})`);
        console.log(`   Setting primaryTreatmentDuration: 30 minutes (default)`);

        await doc.ref.update({
          primaryTreatmentDuration: 30
        });

        updated++;
      } else {
        console.log(`✅ ${barberName} already has primaryTreatmentDuration: ${barberData.primaryTreatmentDuration} minutes`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migration complete!`);
    console.log(`   Updated: ${updated} barbers`);
    console.log(`   Skipped: ${skipped} barbers (already had the field)`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the migration
fixBarbersPrimaryDuration();
