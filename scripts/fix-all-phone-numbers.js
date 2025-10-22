/**
 * Script to normalize all phone numbers in the database
 * This ensures all users can be found regardless of input format
 * 
 * RUN FROM FIREBASE CONSOLE:
 * 1. Go to Firestore Database
 * 2. Select 'users' collection
 * 3. For each user, check the 'phone' field format
 * 4. Update to +972XXXXXXXXX format if needed
 * 
 * OR: Import this into a Cloud Function
 */

// This is a manual guide - run the normalization through Firebase Console
// or create a Cloud Function

console.log('═══════════════════════════════════════');
console.log('📋 PHONE NORMALIZATION GUIDE');
console.log('═══════════════════════════════════════');
console.log('');
console.log('To fix all phone numbers in your database:');
console.log('');
console.log('METHOD 1: Firebase Console (Manual)');
console.log('1. Go to https://console.firebase.google.com');
console.log('2. Select your project: barbers-bar-ae31f');
console.log('3. Go to Firestore Database');
console.log('4. Open "users" collection');
console.log('5. For each user:');
console.log('   - Click on the document');
console.log('   - Find the "phone" field');
console.log('   - Update to format: +972XXXXXXXXX');
console.log('   Example: 0523985505 → +972523985505');
console.log('');
console.log('METHOD 2: Cloud Function (Automatic)');
console.log('Create a Cloud Function with the code below');
console.log('');
console.log('═══════════════════════════════════════');

process.exit(0);

/*
// CLOUD FUNCTION CODE (copy to firebase_functions/src/index.ts):

const admin = require('firebase-admin');

// Phone normalization function (same as in phoneNormalizer.ts)
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  cleaned = cleaned.replace(/^00972/, '+972');
  
  if (cleaned.startsWith('+972')) {
    cleaned = cleaned.substring(4);
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  if (cleaned.startsWith('972')) {
    cleaned = cleaned.substring(3);
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return `+972${cleaned}`;
  }
  
  if (/^[5][0-9]{8}$/.test(cleaned)) {
    return `+972${cleaned}`;
  }
  
  return `+972${cleaned}`;
}

async function fixAllPhoneNumbers() {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();
  
  console.log(`Found ${usersSnapshot.size} users`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const currentPhone = userData.phone;
    
    if (currentPhone) {
      const normalizedPhone = normalizePhoneNumber(currentPhone);
      
      if (currentPhone !== normalizedPhone) {
        console.log(`Updating ${userDoc.id}: ${currentPhone} → ${normalizedPhone}`);
        batch.update(userDoc.ref, { phone: normalizedPhone });
        count++;
      }
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Updated ${count} phone numbers`);
  } else {
    console.log('✅ All phone numbers already normalized');
  }
}

// To use: Create HTTP function
exports.normalizePhoneNumbers = functions.https.onRequest(async (req, res) => {
  try {
    await fixAllPhoneNumbers();
    res.send('Phone numbers normalized successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error normalizing phone numbers');
  }
});

// Or use as scheduled function
exports.scheduledNormalizePhones = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    await fixAllPhoneNumbers();
  });
*/

// Phone normalization function (same as in phoneNormalizer.ts)
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all whitespace, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading zeros from international format
  cleaned = cleaned.replace(/^00972/, '+972');
  
  // If starts with +972, ensure it's properly formatted
  if (cleaned.startsWith('+972')) {
    cleaned = cleaned.substring(4);
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  // If starts with 972 (without +), add the +
  if (cleaned.startsWith('972')) {
    cleaned = cleaned.substring(3);
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  // If starts with 0 (Israeli format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return `+972${cleaned}`;
  }
  
  // If it's just the number without any prefix
  if (/^[5][0-9]{8}$/.test(cleaned)) {
    return `+972${cleaned}`;
  }
  
  // Return cleaned number with +972 prefix
  return `+972${cleaned}`;
}

async function fixAllPhoneNumbers() {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🔧 Starting phone number normalization...');
    console.log('═══════════════════════════════════════');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 Found ${usersSnapshot.size} users to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const currentPhone = userData.phone;
      
      if (!currentPhone) {
        console.log(`⚠️ User ${userDoc.id} has no phone number - skipping`);
        skippedCount++;
        continue;
      }
      
      const normalizedPhone = normalizePhoneNumber(currentPhone);
      
      if (currentPhone !== normalizedPhone) {
        console.log(`📝 Updating user ${userDoc.id}:`);
        console.log(`   OLD: "${currentPhone}"`);
        console.log(`   NEW: "${normalizedPhone}"`);
        
        batch.update(userDoc.ref, { phone: normalizedPhone });
        batchCount++;
        updatedCount++;
        
        // Commit batch if it reaches max size
        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`💾 Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batchCount = 0;
        }
      } else {
        console.log(`✅ User ${userDoc.id} phone already normalized: ${currentPhone}`);
        skippedCount++;
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      console.log(`💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅✅✅ NORMALIZATION COMPLETE! ✅✅✅');
    console.log(`📊 Updated: ${updatedCount} users`);
    console.log(`📊 Already normalized: ${skippedCount} users`);
    console.log(`📊 Errors: ${errorCount} users`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing phone numbers:', error);
    process.exit(1);
  }
}

// Run the script
fixAllPhoneNumbers();

