/**
 * Data Cleanup Service
 * Automatically cleans up old/expired data to prevent database bloat
 * Should be called periodically (e.g., daily via cron job or on app startup)
 * 
 * Note: All queries here use Firebase automatic single-field indexes
 * No manual composite indexes required for cleanup operations
 */

import { collection, deleteDoc, doc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../app/config/firebase';

/**
 * Clean up old completed/cancelled appointments (older than 90 days)
 */
export const cleanupOldAppointments = async (): Promise<number> => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    console.log('🧹 Cleaning up appointments older than:', ninetyDaysAgo.toISOString());
    
    const q = query(
      collection(db, 'appointments'),
      where('date', '<', Timestamp.fromDate(ninetyDaysAgo)),
      where('status', 'in', ['completed', 'cancelled'])
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ No old appointments to clean');
      return 0;
    }
    
    console.log(`📋 Found ${snapshot.size} old appointments to delete`);
    
    const deletePromises = snapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'appointments', docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} old appointments`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up old appointments:', error);
    throw error;
  }
};

/**
 * Clean up expired waitlist entries (older than 7 days or past date)
 */
export const cleanupExpiredWaitlist = async (): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('🧹 Cleaning up waitlist entries before:', todayStr);
    
    const q = query(
      collection(db, 'waitlist'),
      where('requestedDate', '<', todayStr)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ No expired waitlist entries to clean');
      return 0;
    }
    
    console.log(`📋 Found ${snapshot.size} expired waitlist entries`);
    
    const deletePromises = snapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'waitlist', docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} expired waitlist entries`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up waitlist:', error);
    throw error;
  }
};

/**
 * Clean up old notifications (older than 30 days)
 */
export const cleanupOldNotifications = async (): Promise<number> => {
  try {
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    console.log('🧹 Cleaning up notifications older than 30 days');
    
    const q = query(
      collection(db, 'adminNotifications'),
      where('createdAt', '<', thirtyDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ No old notifications to clean');
      return 0;
    }
    
    console.log(`📋 Found ${snapshot.size} old notifications`);
    
    const deletePromises = snapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'adminNotifications', docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${snapshot.size} old notifications`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    throw error;
  }
};

/**
 * Run all cleanup tasks
 * Should be called on app startup (admin only) or via scheduled job
 */
export const runAllCleanupTasks = async (): Promise<{
  appointments: number;
  waitlist: number;
  notifications: number;
  total: number;
}> => {
  console.log('🧹🧹🧹 Starting comprehensive data cleanup...');
  
  try {
    const [appointments, waitlist, notifications] = await Promise.all([
      cleanupOldAppointments(),
      cleanupExpiredWaitlist(),
      cleanupOldNotifications()
    ]);
    
    const total = appointments + waitlist + notifications;
    
    console.log('✅✅✅ Cleanup completed!', {
      appointments,
      waitlist,
      notifications,
      total
    });
    
    return { appointments, waitlist, notifications, total };
  } catch (error) {
    console.error('❌ Error during cleanup tasks:', error);
    throw error;
  }
};

/**
 * Schedule cleanup to run daily
 * Call this on app initialization (for admin users only)
 */
export const schedulePeriodicCleanup = (isAdmin: boolean) => {
  if (!isAdmin) {
    return; // Only admins should run cleanup
  }
  
  // Run cleanup immediately on app start
  runAllCleanupTasks().catch(error => {
    console.error('Failed initial cleanup:', error);
  });
  
  // Schedule to run every 24 hours
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  setInterval(() => {
    console.log('⏰ Running scheduled cleanup...');
    runAllCleanupTasks().catch(error => {
      console.error('Failed scheduled cleanup:', error);
    });
  }, CLEANUP_INTERVAL);
  
  console.log('✅ Periodic cleanup scheduled (every 24 hours)');
};

