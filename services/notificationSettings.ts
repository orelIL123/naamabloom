import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../app/config/firebase';

// Notification types
export type NotificationType = 
  | 'new_user_registration'      // לקוח חדש נרשם
  | 'appointment_booked_self'    // תור נקבע לעצמו (אדמין)
  | 'appointment_booked_barber'  // תור נקבע לספר
  | 'appointment_cancelled_self' // תור בוטל לעצמו (אדמין)
  | 'appointment_cancelled_barber' // תור בוטל לספר
  | 'appointment_reminder_10min' // תזכורת 10 דקות לפני תור
  | 'appointment_reminder_15min' // תזכורת 15 דקות לפני תור
  | 'appointment_reminder_30min' // תזכורת 30 דקות לפני תור
  | 'appointment_reminder_1hour' // תזכורת שעה לפני תור
  | 'push_notifications'        // התראות Push
  | 'sms_notifications'         // התראות SMS
  | 'local_reminders';           // תזכורות מקומיות

// User roles
export type UserRole = 'admin' | 'barber' | 'customer';

// Notification settings interface
export interface NotificationSettings {
  userId: string;
  role: UserRole;
  enabled: boolean; // האם התראות מופעלות בכלל
  notifications: {
    [key in NotificationType]: boolean;
  };
  reminderTimes: {
    enabled: boolean;
    times: number[]; // דקות לפני התור (10, 15, 30, 60)
  };
  lastUpdated: number;
}

// Default settings for each role
export const getDefaultSettings = (role: UserRole): Partial<NotificationSettings> => {
  const baseSettings = {
    enabled: true,
    reminderTimes: {
      enabled: true,
      times: [10, 30] // 10 דקות ושעה לפני
    },
    lastUpdated: Date.now()
  };

  if (role === 'admin') {
    return {
      ...baseSettings,
      notifications: {
        new_user_registration: true,
        appointment_booked_self: true,
        appointment_booked_barber: true,
        appointment_cancelled_self: true,
        appointment_cancelled_barber: true,
        appointment_reminder_10min: true,
        appointment_reminder_15min: false,
        appointment_reminder_30min: true,
        appointment_reminder_1hour: true,
        push_notifications: true,
        sms_notifications: false,
        local_reminders: true
      }
    };
  } else if (role === 'barber') {
    return {
      ...baseSettings,
      notifications: {
        new_user_registration: false, // ספרים לא מקבלים התראות על רישום לקוחות
        appointment_booked_self: false,
        appointment_booked_barber: true,
        appointment_cancelled_self: false,
        appointment_cancelled_barber: true,
        appointment_reminder_10min: true,
        appointment_reminder_15min: true,
        appointment_reminder_30min: false,
        appointment_reminder_1hour: false,
        push_notifications: true,
        sms_notifications: false,
        local_reminders: true
      }
    };
  } else {
    // Customer settings (if needed in the future)
    return {
      ...baseSettings,
      notifications: {
        new_user_registration: false,
        appointment_booked_self: false,
        appointment_booked_barber: false,
        appointment_cancelled_self: false,
        appointment_cancelled_barber: false,
        appointment_reminder_10min: true,
        appointment_reminder_15min: false,
        appointment_reminder_30min: true,
        appointment_reminder_1hour: false,
        push_notifications: true,
        sms_notifications: false,
        local_reminders: true
      }
    };
  }
};

// Get notification settings for a user
export const getNotificationSettings = async (userId: string, role: UserRole): Promise<NotificationSettings> => {
  try {
    const docRef = doc(db, 'notificationSettings', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as NotificationSettings;
      return data;
    } else {
      // Create default settings if none exist
      const defaultSettings = getDefaultSettings(role);
      const newSettings: NotificationSettings = {
        userId,
        role,
        ...defaultSettings
      } as NotificationSettings;
      
      await setDoc(docRef, newSettings);
      return newSettings;
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
    // Return default settings on error
    return {
      userId,
      role,
      ...getDefaultSettings(role)
    } as NotificationSettings;
  }
};

// Update notification settings
export const updateNotificationSettings = async (
  userId: string, 
  settings: Partial<NotificationSettings>
): Promise<void> => {
  try {
    const docRef = doc(db, 'notificationSettings', userId);
    const updateData = {
      ...settings,
      lastUpdated: Date.now()
    };
    
    await updateDoc(docRef, updateData);
    console.log('✅ Notification settings updated successfully');
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

// Toggle a specific notification type
export const toggleNotification = async (
  userId: string,
  notificationType: NotificationType,
  enabled: boolean
): Promise<void> => {
  try {
    const docRef = doc(db, 'notificationSettings', userId);
    await updateDoc(docRef, {
      [`notifications.${notificationType}`]: enabled,
      lastUpdated: Date.now()
    });
    console.log(`✅ Notification ${notificationType} ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error toggling notification:', error);
    throw error;
  }
};

// Toggle all notifications
export const toggleAllNotifications = async (
  userId: string,
  enabled: boolean
): Promise<void> => {
  try {
    const docRef = doc(db, 'notificationSettings', userId);
    await updateDoc(docRef, {
      enabled,
      lastUpdated: Date.now()
    });
    console.log(`✅ All notifications ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error toggling all notifications:', error);
    throw error;
  }
};

// Update reminder times
export const updateReminderTimes = async (
  userId: string,
  times: number[]
): Promise<void> => {
  try {
    const docRef = doc(db, 'notificationSettings', userId);
    await updateDoc(docRef, {
      'reminderTimes.times': times,
      lastUpdated: Date.now()
    });
    console.log('✅ Reminder times updated:', times);
  } catch (error) {
    console.error('Error updating reminder times:', error);
    throw error;
  }
};

// Check if a notification should be sent
export const shouldSendNotification = async (
  userId: string,
  notificationType: NotificationType
): Promise<boolean> => {
  try {
    const settings = await getNotificationSettings(userId, 'admin'); // We'll get the role from the settings
    return settings.enabled && settings.notifications[notificationType];
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false; // Default to not sending if there's an error
  }
};

// Get notification display names
export const getNotificationDisplayName = (type: NotificationType): string => {
  const names: Record<NotificationType, string> = {
    new_user_registration: 'לקוח חדש נרשם',
    appointment_booked_self: 'תור נקבע לעצמי',
    appointment_booked_barber: 'תור נקבע לספר',
    appointment_cancelled_self: 'תור בוטל לעצמי',
    appointment_cancelled_barber: 'תור בוטל לספר',
    appointment_reminder_10min: 'תזכורת 10 דקות לפני',
    appointment_reminder_15min: 'תזכורת 15 דקות לפני',
    appointment_reminder_30min: 'תזכורת 30 דקות לפני',
    appointment_reminder_1hour: 'תזכורת שעה לפני',
    push_notifications: 'התראות Push',
    sms_notifications: 'התראות SMS',
    local_reminders: 'תזכורות מקומיות'
  };
  return names[type];
};

// Get notification descriptions
export const getNotificationDescription = (type: NotificationType): string => {
  const descriptions: Record<NotificationType, string> = {
    new_user_registration: 'קבל התראה כשמשתמש חדש נרשם לאפליקציה',
    appointment_booked_self: 'קבל התראה כשנקבע תור עבורך',
    appointment_booked_barber: 'קבל התראה כשנקבע תור עבור אחד הספרים',
    appointment_cancelled_self: 'קבל התראה כשמבוטל תור עבורך',
    appointment_cancelled_barber: 'קבל התראה כשמבוטל תור עבור אחד הספרים',
    appointment_reminder_10min: 'קבל תזכורת 10 דקות לפני תחילת התור',
    appointment_reminder_15min: 'קבל תזכורת 15 דקות לפני תחילת התור',
    appointment_reminder_30min: 'קבל תזכורת 30 דקות לפני תחילת התור',
    appointment_reminder_1hour: 'קבל תזכורת שעה לפני תחילת התור',
    push_notifications: 'קבל התראות Push במכשיר',
    sms_notifications: 'קבל התראות SMS בטלפון (זמין בגרסה עתידית)',
    local_reminders: 'קבל תזכורות מקומיות במכשיר'
  };
  return descriptions[type];
};

// Get available notification types for a role
export const getAvailableNotificationTypes = (role: UserRole): NotificationType[] => {
  if (role === 'admin') {
    return [
      'new_user_registration',
      'appointment_booked_self',
      'appointment_booked_barber',
      'appointment_cancelled_self',
      'appointment_cancelled_barber',
      'appointment_reminder_10min',
      'appointment_reminder_15min',
      'appointment_reminder_30min',
      'appointment_reminder_1hour',
      'push_notifications',
      'sms_notifications',
      'local_reminders'
    ];
  } else if (role === 'barber') {
    return [
      'appointment_booked_barber',
      'appointment_cancelled_barber',
      'appointment_reminder_10min',
      'appointment_reminder_15min',
      'appointment_reminder_30min',
      'appointment_reminder_1hour',
      'push_notifications',
      'sms_notifications',
      'local_reminders'
    ];
  } else {
    return [
      'appointment_reminder_10min',
      'appointment_reminder_15min',
      'appointment_reminder_30min',
      'appointment_reminder_1hour',
      'push_notifications',
      'sms_notifications',
      'local_reminders'
    ];
  }
};
