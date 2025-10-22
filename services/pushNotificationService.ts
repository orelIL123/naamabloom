import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../app/config/firebase';

// Types for push notifications
export interface PushNotificationData {
  appointmentId?: string;
  barberId?: string;
  type?: 'appointment' | 'maintenance' | 'system_update' | 'promotion' | 'general' | 'reminder';
  [key: string]: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  phone: string;
  pushToken?: string;
  isAdmin?: boolean;
  isBarber?: boolean;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Push Notification Registration
export const registerForPushNotifications = async (userId: string): Promise<string | null> => {
  try {
    // Check if device supports notifications
    if (!Device.isDevice) {
      console.log('📱 Not a physical device, skipping push notification registration');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Failed to get push notification permissions');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('📱 Push token:', token);

    // Save token to user profile in Firebase
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { pushToken: token });
      console.log('✅ Push token saved to user profile');
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

// Send Push Notification
export const sendPushNotification = async (
  pushToken: string, 
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<void> => {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('✅ Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Send notification to specific user
export const sendNotificationToUser = async (
  userProfile: UserProfile, 
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<boolean> => {
  try {
    if (!userProfile || !userProfile.pushToken) {
      console.log('❌ User not found or no push token');
      return false;
    }

    await sendPushNotification(userProfile.pushToken, title, body, data);
    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
};

// Send notification to multiple users
export const sendNotificationToUsers = async (
  users: UserProfile[], 
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<number> => {
  try {
    const usersWithTokens = users.filter(user => user.pushToken);
    
    console.log(`📱 Sending notification to ${usersWithTokens.length} users`);
    
    const results = await Promise.allSettled(
      usersWithTokens.map(user => 
        sendPushNotification(user.pushToken!, title, body, data)
      )
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    console.log(`✅ Successfully sent to ${successful}/${usersWithTokens.length} users`);
    
    return successful;
  } catch (error) {
    console.error('Error sending notification to users:', error);
    return 0;
  }
};

// Send notification to all users (excluding admins)
export const sendNotificationToAllUsers = async (
  users: UserProfile[],
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<number> => {
  try {
    // Filter out admin users to avoid sending to admins
    const nonAdminUsers = users.filter(user => !user.isAdmin && user.pushToken);
    
    return await sendNotificationToUsers(nonAdminUsers, title, body, data);
  } catch (error) {
    console.error('Error sending notification to all users:', error);
    return 0;
  }
};

// Send notification to admin users only
export const sendNotificationToAdmins = async (
  users: UserProfile[],
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<number> => {
  try {
    const adminUsers = users.filter(user => user.isAdmin && user.pushToken);
    
    return await sendNotificationToUsers(adminUsers, title, body, data);
  } catch (error) {
    console.error('Error sending notification to admins:', error);
    return 0;
  }
};

// Send notification to barbers only
export const sendNotificationToBarbers = async (
  users: UserProfile[],
  title: string, 
  body: string, 
  data?: PushNotificationData
): Promise<number> => {
  try {
    const barberUsers = users.filter(user => user.isBarber && user.pushToken);
    
    return await sendNotificationToUsers(barberUsers, title, body, data);
  } catch (error) {
    console.error('Error sending notification to barbers:', error);
    return 0;
  }
};

// Local scheduled notifications
export const scheduleAppointmentReminders = async (
  appointmentDate: Date,
  treatmentName: string,
  userId: string,
  barberName?: string
): Promise<void> => {
  try {
    const now = new Date();
    const timeUntilAppointment = appointmentDate.getTime() - now.getTime();
    const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);

    // Schedule 1-hour reminder
    const secondsUntilHour = timeUntilAppointment / 1000 - 3600; // 1 hour before
    if (secondsUntilHour > 0 && hoursUntilAppointment >= 1) {
      console.log('✅ Scheduling hour reminder for', new Date(now.getTime() + secondsUntilHour * 1000).toLocaleString());
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'תזכורת לתור! 💈',
          body: `יש לך תור ל-${treatmentName}${barberName ? ` עם ${barberName}` : ''} בעוד שעה!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: secondsUntilHour, repeats: false, channelId: 'default' },
      });
    }

    // Schedule 15-minute reminder
    const secondsUntilQuarter = timeUntilAppointment / 1000 - 900; // 15 minutes before
    if (secondsUntilQuarter > 0 && hoursUntilAppointment >= 0.25) {
      console.log('✅ Scheduling quarter reminder for', new Date(now.getTime() + secondsUntilQuarter * 1000).toLocaleString());
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'תזכורת לתור! 💈',
          body: `יש לך תור ל-${treatmentName}${barberName ? ` עם ${barberName}` : ''} בעוד רבע שעה!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: secondsUntilQuarter, repeats: false, channelId: 'default' },
      });
    }
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
};

// Welcome notification
export const sendWelcomeNotification = async (userProfile: UserProfile): Promise<void> => {
  try {
    await sendNotificationToUser(
      userProfile,
      'ברוכים הבאים! 🎉',
      'תודה שנרשמת לאפליקציה שלנו! אנחנו שמחים לראות אותך.',
      { type: 'general' }
    );
  } catch (error) {
    console.error('Error sending welcome notification:', error);
  }
};

// Maintenance notification
export const sendMaintenanceNotification = async (
  users: UserProfile[],
  message: string
): Promise<void> => {
  try {
    await sendNotificationToAllUsers(
      users,
      'תחזוקה מתוכננת! 🔧',
      message,
      { type: 'maintenance' }
    );
  } catch (error) {
    console.error('Error sending maintenance notification:', error);
  }
};

// System update notification
export const sendSystemUpdateNotification = async (
  users: UserProfile[],
  updateDetails: string
): Promise<void> => {
  try {
    await sendNotificationToAllUsers(
      users,
      'עדכון מערכת! 📱',
      updateDetails,
      { type: 'system_update' }
    );
  } catch (error) {
    console.error('Error sending system update notification:', error);
  }
};

// Promotional notification
export const sendPromotionalNotification = async (
  users: UserProfile[],
  title: string,
  body: string,
  data?: PushNotificationData
): Promise<void> => {
  try {
    const usersWithTokens = users.filter(user => user.pushToken && !user.isAdmin); // Don't send to admins
    
    console.log(`📱 Sending promotional notification to ${usersWithTokens.length} users`);
    
    await sendNotificationToUsers(usersWithTokens, title, body, { ...data, type: 'promotion' });
  } catch (error) {
    console.error('Error sending promotional notification:', error);
  }
};

// Appointment specific notifications
export const sendAppointmentBookedNotification = async (
  userProfile: UserProfile,
  appointmentData: {
    barberName: string;
    treatmentName: string;
    date: string;
    time: string;
  }
): Promise<void> => {
  try {
    await sendNotificationToUser(
      userProfile,
      'תור חדש נוצר! 📅',
      `התור שלך ל-${appointmentData.treatmentName} עם ${appointmentData.barberName} נוצר בהצלחה!`,
      { 
        type: 'appointment',
        appointmentId: appointmentData.date + '_' + appointmentData.time
      }
    );
  } catch (error) {
    console.error('Error sending appointment booked notification:', error);
  }
};

export const sendAppointmentCancelledNotification = async (
  userProfile: UserProfile,
  appointmentData: {
    barberName: string;
    treatmentName: string;
    date: string;
    time: string;
  }
): Promise<void> => {
  try {
    await sendNotificationToUser(
      userProfile,
      'התור בוטל! ❌',
      `התור שלך ל-${appointmentData.treatmentName} עם ${appointmentData.barberName} בוטל.`,
      { 
        type: 'appointment',
        appointmentId: appointmentData.date + '_' + appointmentData.time
      }
    );
  } catch (error) {
    console.error('Error sending appointment cancelled notification:', error);
  }
};

// Setup notification handlers
export const setupNotificationHandlers = () => {
  // Handle notification received while app is running
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification);
  });

  // Handle notification tapped
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('📱 Notification tapped:', response);
    // Handle navigation based on notification data
    const data = response.notification.request.content.data;
    if (data?.type === 'appointment') {
      // Navigate to appointments screen
      console.log('Navigate to appointment:', data.appointmentId);
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};

