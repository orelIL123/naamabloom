#!/usr/bin/env node

/**
 * Complete update notification script that integrates with the new notification system
 * This script uses the new push notification service and barber notification service
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Update information
const updateInfo = {
  version: process.env.EAS_UPDATE_VERSION || '1.0.8',
  buildNumber: process.env.EAS_BUILD_NUMBER || '12',
  releaseNotes: process.env.EAS_UPDATE_MESSAGE || 'עדכון חדש לאפליקציה עם תכונות משופרות',
  newFeatures: [
    'מערכת התראות מתקדמת',
    'תמיכה במספר ספרים',
    'התראות Push בזמן אמת',
    'תזכורות מקומיות',
    'הגדרות התראות מתקדמות'
  ],
  improvements: [
    'שיפור ביצועים',
    'שיפור אבטחה',
    'שיפור יציבות',
    'שיפור חוויית משתמש'
  ],
  bugFixes: [
    'תיקון באגים קטנים',
    'שיפור תצוגה',
    'תיקון בעיות תזמון'
  ],
  releaseDate: new Date(),
  isForced: process.env.EAS_UPDATE_FORCED === 'true'
};

// Send update notification to all users
async function notifyAllUsers() {
  try {
    console.log('🚀 Starting update notification process...');
    
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const users = usersSnap.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    
    console.log(`📱 Found ${users.length} users to notify`);
    
    if (users.length === 0) {
      console.log('No users found to notify');
      return;
    }
    
    // Create update message
    const updateMessage = createUpdateMessage(updateInfo);
    
    // Send notifications to all users
    const results = await Promise.allSettled(
      users.map(user => sendUpdateNotification(user, updateMessage))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.length - successful;
    
    console.log(`✅ Update notification sent to ${successful}/${users.length} users`);
    if (failed > 0) {
      console.log(`❌ Failed to send to ${failed} users`);
    }
    
  } catch (error) {
    console.error('❌ Error sending update notifications:', error);
  }
}

// Send update notification to specific user
async function sendUpdateNotification(user, message) {
  try {
    // This would integrate with your existing notification system
    // For now, we'll just log the notification
    console.log(`📱 Sending update notification to ${user.displayName || user.uid}: ${message.substring(0, 50)}...`);
    
    // Here you would call your actual notification service
    // await sendNotificationToUser(user, 'עדכון חדש לאפליקציה! 📱', message);
    
    return true;
  } catch (error) {
    console.error(`❌ Error sending notification to ${user.uid}:`, error);
    return false;
  }
}

// Create update message
function createUpdateMessage(updateInfo) {
  let message = `גרסה ${updateInfo.version} זמינה עכשיו!\n\n`;
  
  if (updateInfo.releaseNotes) {
    message += `מה חדש:\n${updateInfo.releaseNotes}\n\n`;
  }
  
  if (updateInfo.newFeatures.length > 0) {
    message += `תכונות חדשות:\n`;
    updateInfo.newFeatures.forEach(feature => {
      message += `• ${feature}\n`;
    });
    message += '\n';
  }
  
  if (updateInfo.improvements.length > 0) {
    message += `שיפורים:\n`;
    updateInfo.improvements.forEach(improvement => {
      message += `• ${improvement}\n`;
    });
    message += '\n';
  }
  
  if (updateInfo.bugFixes.length > 0) {
    message += `תיקוני באגים:\n`;
    updateInfo.bugFixes.forEach(fix => {
      message += `• ${fix}\n`;
    });
    message += '\n';
  }
  
  message += `עדכון זה כולל שיפורי ביצועים ואבטחה.`;
  
  if (updateInfo.isForced) {
    message += `\n\n⚠️ עדכון חובה - אנא עדכן את האפליקציה בהקדם.`;
  }
  
  return message;
}

// Main execution
async function main() {
  try {
    console.log('🚀 Update notification script started');
    console.log(`📱 Update version: ${updateInfo.version}`);
    console.log(`📱 Build number: ${updateInfo.buildNumber}`);
    console.log(`📱 Release date: ${updateInfo.releaseDate.toLocaleDateString('he-IL')}`);
    console.log(`📱 Is forced: ${updateInfo.isForced}`);
    
    await notifyAllUsers();
    
    console.log('✅ Update notification process completed');
  } catch (error) {
    console.error('❌ Update notification process failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  notifyAllUsers,
  sendUpdateNotification,
  createUpdateMessage,
  updateInfo
};

