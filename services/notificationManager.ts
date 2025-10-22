/**
 * Notification Manager - Robust notification utilities for the app
 *
 * Handles:
 * - Permission requests (iOS and Android)
 * - Android notification channels
 * - Push token registration and revocation
 * - Local notification scheduling with absolute times
 * - Auth-aware notification handling
 */

import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../app/config/firebase';

// ===== TYPES =====

export type ReminderKind = 'T_MINUS_24H' | 'T_MINUS_1H' | 'AT_TIME';

export interface ReminderSpec {
  id: string;                 // deterministic ID for cancel/update
  when: Date;                 // absolute time
  title: string;
  body: string;
  data?: Record<string, any>; // include appointmentId, barberId, etc.
}

export interface AdminReminderSettings {
  enabled: boolean;
  t24hEnabled: boolean;
  t1hEnabled: boolean;
  t0Enabled: boolean;
}

// ===== CONSTANTS =====

const ANDROID_CHANNEL_ID = 'default';
const ANDROID_CHANNEL_NAME = 'Default Notifications';
const EXPO_PROJECT_ID = '3db35a0e-d2db-4dbd-9138-7647c42f9fae';

// ===== NOTIFICATION HANDLER CONFIGURATION =====

/**
 * Configure how notifications are displayed when app is foregrounded
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  console.log('📱 Notification handler configured');
}

// ===== PERMISSIONS =====

/**
 * Request notification permissions from the user
 * Handles both iOS and Android (API 33+)
 *
 * @returns true if granted, false otherwise
 */
export async function ensurePermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.log('📱 Not a physical device, skipping permissions');
      return false;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not already granted
    if (existingStatus !== 'granted') {
      console.log('📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permissions denied');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting permissions:', error);
    return false;
  }
}

/**
 * Check if notification permissions are granted without requesting
 */
export async function checkPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    return false;
  }
}

// ===== ANDROID CHANNEL =====

/**
 * Create Android notification channel with HIGH importance
 * This ensures notifications are visible and audible
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: ANDROID_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✅ Android notification channel created');
    } catch (error) {
      console.error('❌ Error creating Android channel:', error);
    }
  }
}

// ===== SCHEDULING =====

/**
 * Schedule a single notification at an absolute time
 *
 * @param spec - Notification specification with absolute date
 * @returns Notification identifier for cancellation
 */
export async function scheduleAbsolute(spec: ReminderSpec): Promise<string> {
  try {
    // Ensure Android channel exists
    await ensureAndroidChannel();

    // Validate that the time is in the future
    const now = new Date();
    if (spec.when <= now) {
      console.warn(`⏰ Cannot schedule notification in the past: ${spec.id}`);
      throw new Error('Notification time must be in the future');
    }

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: spec.title,
        body: spec.body,
        data: spec.data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: spec.when, // absolute Date
    });

    console.log(`✅ Scheduled notification: ${spec.id} at ${spec.when.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error(`❌ Error scheduling notification ${spec.id}:`, error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification by ID
 */
export async function cancelById(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
    console.log(`✅ Cancelled notification: ${id}`);
  } catch (error) {
    console.error(`❌ Error cancelling notification ${id}:`, error);
    // Don't throw - cancelling non-existent notification is OK
  }
}

/**
 * Cancel all scheduled local notifications
 * Called on logout to prevent notifications after sign-out
 */
export async function cancelAllLocal(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Cancelled all local notifications');
  } catch (error) {
    console.error('❌ Error cancelling all notifications:', error);
  }
}

/**
 * Get all currently scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}

// ===== PUSH TOKEN MANAGEMENT =====

/**
 * Get device identifier for multi-device token management
 */
async function getDeviceIdentifier(): Promise<string> {
  try {
    // Try to get a stable device ID
    const installationId = Application.applicationId || '';
    const deviceId = Device.modelId || Device.modelName || 'unknown';
    return `${installationId}-${deviceId}`;
  } catch (error) {
    console.error('❌ Error getting device identifier:', error);
    return 'unknown-device';
  }
}

/**
 * Register device for push notifications and save token to Firestore
 *
 * @param uid - User ID
 * @returns Expo push token or null if failed
 */
export async function registerPushTokenForUser(uid: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('📱 Not a physical device, skipping push token registration');
      return null;
    }

    // Ensure permissions are granted
    const hasPermission = await ensurePermissions();
    if (!hasPermission) {
      console.log('❌ Cannot register push token without permissions');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    const token = tokenData.data;
    console.log('📱 Expo push token obtained:', token);

    // Get device identifier for multi-device support
    const deviceId = await getDeviceIdentifier();

    // Save to Firestore - using simple single-token approach for now
    // Can be upgraded to array-based multi-device later
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      pushToken: token,
      pushTokenDeviceId: deviceId,
      pushTokenUpdatedAt: new Date().toISOString(),
    });

    console.log('✅ Push token registered for user:', uid);
    return token;
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    return null;
  }
}

/**
 * Revoke push token on logout
 * Removes the token from Firestore so server stops sending notifications
 *
 * @param uid - User ID
 */
export async function revokePushTokenForUser(uid: string): Promise<void> {
  try {
    console.log('🗑️ Revoking push token for user:', uid);

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      pushToken: null,
      pushTokenDeviceId: null,
      pushTokenRevokedAt: new Date().toISOString(),
    });

    console.log('✅ Push token revoked successfully');
  } catch (error) {
    console.error('❌ Error revoking push token:', error);
    // Don't throw - allow logout to continue even if token revocation fails
  }
}

// ===== ADMIN SETTINGS =====

/**
 * Get admin reminder settings from Firestore
 * Controls which reminders are enabled globally
 */
export async function getAdminReminderSettings(): Promise<AdminReminderSettings> {
  try {
    const settingsRef = doc(db, 'adminSettings', 'notifications');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      const settings = data.customerReminderSettings || {};

      return {
        enabled: settings.enabled !== false, // default true
        t24hEnabled: settings.t24hEnabled !== false,
        t1hEnabled: settings.t1hEnabled !== false,
        t0Enabled: settings.t0Enabled !== false,
      };
    }

    // Default settings if document doesn't exist
    return {
      enabled: true,
      t24hEnabled: true,
      t1hEnabled: true,
      t0Enabled: true,
    };
  } catch (error) {
    console.error('❌ Error getting admin reminder settings:', error);
    // Return safe defaults on error
    return {
      enabled: true,
      t24hEnabled: true,
      t1hEnabled: true,
      t0Enabled: true,
    };
  }
}

/**
 * Initialize admin reminder settings in Firestore (one-time setup)
 */
export async function initializeAdminReminderSettings(): Promise<void> {
  try {
    const settingsRef = doc(db, 'adminSettings', 'notifications');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        customerReminderSettings: {
          enabled: true,
          t24hEnabled: true,
          t1hEnabled: true,
          t0Enabled: true,
        },
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Admin reminder settings initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing admin reminder settings:', error);
  }
}

// ===== INITIALIZATION =====

/**
 * Initialize notification manager
 * Call this once at app startup
 */
export async function initializeNotificationManager(): Promise<void> {
  try {
    console.log('🚀 Initializing notification manager...');

    // Configure notification handler
    configureNotificationHandler();

    // Ensure Android channel exists
    await ensureAndroidChannel();

    // Initialize admin settings if needed
    await initializeAdminReminderSettings();

    console.log('✅ Notification manager initialized');
  } catch (error) {
    console.error('❌ Error initializing notification manager:', error);
  }
}
