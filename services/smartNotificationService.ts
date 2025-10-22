import { messagingService } from './messaging';
import {
    NotificationType,
    shouldSendNotification,
    UserRole
} from './notificationSettings';
import {
    sendNotificationToUser as sendPushNotification
} from './pushNotificationService';

// Smart notification service that respects user settings
export class SmartNotificationService {
  private static instance: SmartNotificationService;
  private notificationQueue: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }> = [];

  private constructor() {}

  public static getInstance(): SmartNotificationService {
    if (!SmartNotificationService.instance) {
      SmartNotificationService.instance = new SmartNotificationService();
    }
    return SmartNotificationService.instance;
  }

  // Send notification only if user has it enabled
  public async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Check if user has this notification type enabled
      const shouldSend = await shouldSendNotification(userId, type);
      
      if (!shouldSend) {
        console.log(`🔕 Notification ${type} disabled for user ${userId}`);
        return false;
      }

      // Send both SMS and Push notification
      const [smsResult, pushResult] = await Promise.allSettled([
        // Send SMS
        messagingService.sendMessage({
          to: userId,
          message: `${title}\n${body}`,
          type: 'sms'
        }),
        // Send Push notification (if user has push token)
        this.sendPushNotificationToUser(userId, title, body, data)
      ]);

      const smsSuccess = smsResult.status === 'fulfilled' && smsResult.value.success;
      const pushSuccess = pushResult.status === 'fulfilled' && pushResult.value;

      if (smsSuccess || pushSuccess) {
        console.log(`✅ Notification ${type} sent to user ${userId} (SMS: ${smsSuccess}, Push: ${pushSuccess})`);
        return true;
      } else {
        console.log(`❌ Failed to send notification ${type} to user ${userId}`);
        return false;
      }
    } catch (error) {
      console.error('Error sending smart notification:', error);
      return false;
    }
  }

  // Send push notification to user
  private async sendPushNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Get user profile from Firebase
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || !userProfile.pushToken) {
        return false;
      }

      return await sendPushNotification(userProfile, title, body, data);
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Get user profile from Firebase
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../app/config/firebase');
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid: userId, ...userSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Send notification to multiple users (e.g., all barbers)
  public async sendNotificationToRole(
    role: UserRole,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ): Promise<{ sent: number; failed: number }> {
    try {
      console.log(`📢 Sending ${type} notification to all ${role}s`);
      
      // Get all users by role
      const users = await this.getUsersByRole(role);
      if (users.length === 0) {
        console.log(`No ${role}s found`);
        return { sent: 0, failed: 0 };
      }

      // Send notifications to all users of the role
      const results = await Promise.allSettled(
        users.map(user => this.sendNotification(user.uid, type, title, body, data))
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.length - successful;

      console.log(`✅ Sent to ${successful}/${users.length} ${role}s`);
      return { sent: successful, failed };
    } catch (error) {
      console.error('Error sending notification to role:', error);
      return { sent: 0, failed: 1 };
    }
  }

  // Get users by role from Firebase
  private async getUsersByRole(role: UserRole): Promise<any[]> {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../app/config/firebase');
      
      const usersRef = collection(db, 'users');
      let q;
      
      if (role === 'admin') {
        q = query(usersRef, where('isAdmin', '==', true));
      } else if (role === 'barber') {
        q = query(usersRef, where('isBarber', '==', true));
      } else {
        // For clients, get users who are not admin or barber
        q = query(usersRef, where('isAdmin', '==', false), where('isBarber', '==', false));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  // Queue notification for later processing
  public queueNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ): void {
    this.notificationQueue.push({
      userId,
      type,
      title,
      body,
      data
    });
  }

  // Process all queued notifications
  public async processQueue(): Promise<void> {
    const queue = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of queue) {
      await this.sendNotification(
        notification.userId,
        notification.type,
        notification.title,
        notification.body,
        notification.data
      );
    }
  }

  // Specific notification methods for different events
  public async notifyNewUserRegistration(adminUserId: string, userName: string): Promise<boolean> {
    return this.sendNotification(
      adminUserId,
      'new_user_registration',
      'משתמש חדש נרשם',
      `${userName} נרשם לאפליקציה`,
      { userName, timestamp: Date.now() }
    );
  }

  public async notifyAppointmentBooked(
    userId: string,
    appointmentData: {
      clientName: string;
      barberName: string;
      date: string;
      time: string;
      treatment: string;
    },
    isForAdmin: boolean = false
  ): Promise<boolean> {
    const type = isForAdmin ? 'appointment_booked_self' : 'appointment_booked_barber';
    const title = isForAdmin ? 'תור נקבע עבורך' : 'תור נקבע עבור הספר';
    
    // Send to the specific user
    const result = await this.sendNotification(
      userId,
      type,
      title,
      `${appointmentData.clientName} קבע תור ל${appointmentData.treatment} ב${appointmentData.date} בשעה ${appointmentData.time}`,
      { ...appointmentData, timestamp: Date.now() }
    );

    return result;
  }

  public async notifyAppointmentCancelled(
    userId: string,
    appointmentData: {
      clientName: string;
      barberName: string;
      date: string;
      time: string;
      treatment: string;
    },
    isForAdmin: boolean = false
  ): Promise<boolean> {
    const type = isForAdmin ? 'appointment_cancelled_self' : 'appointment_cancelled_barber';
    const title = isForAdmin ? 'תור בוטל עבורך' : 'תור בוטל עבור הספר';
    
    // Send to the specific user
    const result = await this.sendNotification(
      userId,
      type,
      title,
      `${appointmentData.clientName} ביטל תור ל${appointmentData.treatment} ב${appointmentData.date} בשעה ${appointmentData.time}`,
      { ...appointmentData, timestamp: Date.now() }
    );

    return result;
  }

  public async notifyAppointmentReminder(
    userId: string,
    appointmentData: {
      clientName: string;
      barberName: string;
      date: string;
      time: string;
      treatment: string;
      minutesUntil: number;
    }
  ): Promise<boolean> {
    const { minutesUntil } = appointmentData;
    const type = minutesUntil === 10 ? 'appointment_reminder_10min' :
                 minutesUntil === 15 ? 'appointment_reminder_15min' :
                 minutesUntil === 30 ? 'appointment_reminder_30min' :
                 minutesUntil === 60 ? 'appointment_reminder_1hour' :
                 'appointment_reminder_10min';
    
    // Send to the specific user
    const result = await this.sendNotification(
      userId,
      type,
      'תזכורת תור',
      `תור עם ${appointmentData.clientName} ל${appointmentData.treatment} יתחיל בעוד ${minutesUntil} דקות`,
      { ...appointmentData, minutesUntil, timestamp: Date.now() }
    );

    return result;
  }

  // Send reminder to all relevant users (admin + barber)
  public async sendAppointmentReminderToAll(
    appointmentData: {
      clientName: string;
      barberName: string;
      barberId: string;
      adminId: string;
      date: string;
      time: string;
      treatment: string;
      minutesUntil: number;
    }
  ): Promise<{ adminSent: boolean; barberSent: boolean }> {
    const [adminSent, barberSent] = await Promise.all([
      this.notifyAppointmentReminder(appointmentData.adminId, appointmentData),
      this.notifyAppointmentReminder(appointmentData.barberId, appointmentData)
    ]);

    return { adminSent, barberSent };
  }
}

// Export singleton instance
export const smartNotificationService = SmartNotificationService.getInstance();

// Convenience functions
export const notifyNewUserRegistration = (adminUserId: string, userName: string) =>
  smartNotificationService.notifyNewUserRegistration(adminUserId, userName);

export const notifyAppointmentBooked = (userId: string, appointmentData: any, isForAdmin: boolean = false) =>
  smartNotificationService.notifyAppointmentBooked(userId, appointmentData, isForAdmin);

export const notifyAppointmentCancelled = (userId: string, appointmentData: any, isForAdmin: boolean = false) =>
  smartNotificationService.notifyAppointmentCancelled(userId, appointmentData, isForAdmin);

export const notifyAppointmentReminder = (userId: string, appointmentData: any) =>
  smartNotificationService.notifyAppointmentReminder(userId, appointmentData);

export const sendAppointmentReminderToAll = (appointmentData: any) =>
  smartNotificationService.sendAppointmentReminderToAll(appointmentData);
