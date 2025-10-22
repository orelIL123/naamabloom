import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../app/config/firebase';
import { barberNotificationService } from './barberNotificationService';
import { smartNotificationService } from './smartNotificationService';

interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  adminId: string;
  clientName: string;
  barberName: string;
  date: string;
  time: string;
  treatment: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: Timestamp;
}

export class ReminderService {
  private static instance: ReminderService;
  private reminderIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  private constructor() {}

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  // Start the reminder service
  public start(): void {
    if (this.isRunning) {
      console.log('🔄 Reminder service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting reminder service...');
    
    // Check for reminders every minute
    const interval = setInterval(() => {
      this.checkReminders();
    }, 60000); // 1 minute

    this.reminderIntervals.set('main', interval);
  }

  // Stop the reminder service
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 Stopping reminder service...');
    
    this.reminderIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.reminderIntervals.clear();
  }

  // Check for appointments that need reminders
  private async checkReminders(): Promise<void> {
    try {
      console.log('🔍 Checking for appointment reminders...');
      
      const now = new Date();
      const appointments = await this.getUpcomingAppointments();
      
      for (const appointment of appointments) {
        await this.checkAppointmentReminders(appointment, now);
      }
    } catch (error) {
      console.error('❌ Error checking reminders:', error);
    }
  }

  // Get upcoming appointments for the next 2 hours
  private async getUpcomingAppointments(): Promise<Appointment[]> {
    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('status', '==', 'scheduled'),
        where('date', '>=', now.toISOString().split('T')[0]),
        where('date', '<=', twoHoursFromNow.toISOString().split('T')[0])
      );
      
      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data
        } as Appointment);
      });
      
      return appointments;
    } catch (error) {
      console.error('❌ Error getting upcoming appointments:', error);
      return [];
    }
  }

  // Check if an appointment needs reminders
  private async checkAppointmentReminders(appointment: Appointment, now: Date): Promise<void> {
    try {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeDiff / (1000 * 60));
      
      // Check if appointment is within reminder timeframes
      const reminderTimes = [10, 15, 30, 60]; // minutes before appointment
      
      for (const reminderMinutes of reminderTimes) {
        if (minutesUntil <= reminderMinutes && minutesUntil > reminderMinutes - 1) {
          await this.sendReminder(appointment, reminderMinutes);
        }
      }
    } catch (error) {
      console.error('❌ Error checking appointment reminders:', error);
    }
  }

  // Send reminder for a specific appointment
  private async sendReminder(appointment: Appointment, minutesUntil: number): Promise<void> {
    try {
      console.log(`⏰ Sending ${minutesUntil}-minute reminder for appointment ${appointment.id}`);
      
      const appointmentData = {
        clientName: appointment.clientName,
        barberName: appointment.barberName,
        barberId: appointment.barberId,
        adminId: appointment.adminId,
        date: appointment.date,
        time: appointment.time,
        treatment: appointment.treatment,
        minutesUntil
      };
      
      // Send reminder to both admin and barber via SMS
      await smartNotificationService.sendAppointmentReminderToAll(appointmentData);
      
      // Also send push notifications to all relevant users
      try {
        // Use the new barber notification service
        await barberNotificationService.notifyAppointmentReminder({
          id: appointment.id,
          clientId: appointment.clientId,
          barberId: appointment.barberId,
          adminId: appointment.adminId,
          clientName: appointment.clientName,
          barberName: appointment.barberName,
          date: appointment.date,
          time: appointment.time,
          treatment: appointment.treatment,
          status: 'scheduled'
        }, minutesUntil);
      } catch (error) {
        console.error('Error sending push notification reminder:', error);
      }
      
    } catch (error) {
      console.error('❌ Error sending reminder:', error);
    }
  }

  // Get all users from Firebase
  private async getAllUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      return usersSnap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Schedule a specific reminder for an appointment
  public scheduleReminder(appointment: Appointment, minutesBefore: number): void {
    try {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const reminderTime = new Date(appointmentDateTime.getTime() - minutesBefore * 60 * 1000);
      const now = new Date();
      
      if (reminderTime <= now) {
        console.log(`⏰ Reminder time has passed for appointment ${appointment.id}`);
        return;
      }
      
      const delay = reminderTime.getTime() - now.getTime();
      const timeoutId = setTimeout(async () => {
        await this.sendReminder(appointment, minutesBefore);
        this.reminderIntervals.delete(`${appointment.id}-${minutesBefore}`);
      }, delay);
      
      this.reminderIntervals.set(`${appointment.id}-${minutesBefore}`, timeoutId);
      console.log(`⏰ Scheduled ${minutesBefore}-minute reminder for appointment ${appointment.id}`);
      
      // Also schedule local notification for the device
      this.scheduleLocalNotification(appointment, minutesBefore);
      
    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
    }
  }

  // Schedule local notification for the device
  private async scheduleLocalNotification(appointment: Appointment, minutesBefore: number): Promise<void> {
    try {
      const Notifications = await import('expo-notifications');
      
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const reminderTime = new Date(appointmentDateTime.getTime() - minutesBefore * 60 * 1000);
      const now = new Date();
      
      if (reminderTime <= now) {
        return;
      }
      
      const delay = reminderTime.getTime() - now.getTime();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'תזכורת תור! 💈',
          body: `תור עם ${appointment.clientName} ל${appointment.treatment} יתחיל בעוד ${minutesBefore} דקות`,
          sound: true,
          priority: 1, // High priority
          data: {
            appointmentId: appointment.id,
            type: 'reminder',
            minutesUntil: minutesBefore
          }
        },
        trigger: { seconds: delay },
      });
      
      console.log(`📱 Local notification scheduled for appointment ${appointment.id}`);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  // Cancel all reminders for an appointment
  public cancelAppointmentReminders(appointmentId: string): void {
    const keysToDelete: string[] = [];
    
    this.reminderIntervals.forEach((timeout, key) => {
      if (key.startsWith(`${appointmentId}-`)) {
        clearTimeout(timeout);
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.reminderIntervals.delete(key);
    });
    
    // Also cancel local notifications
    this.cancelLocalNotifications(appointmentId);
    
    console.log(`🗑️ Cancelled all reminders for appointment ${appointmentId}`);
  }

  // Cancel local notifications for an appointment
  private async cancelLocalNotifications(appointmentId: string): Promise<void> {
    try {
      const Notifications = await import('expo-notifications');
      
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getScheduledNotificationsAsync();
      
      // Find and cancel notifications related to this appointment
      const appointmentNotifications = scheduledNotifications.filter(notification => 
        notification.content.data?.appointmentId === appointmentId
      );
      
      // Cancel each notification
      for (const notification of appointmentNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`📱 Cancelled local notification for appointment ${appointmentId}`);
      }
    } catch (error) {
      console.error('Error cancelling local notifications:', error);
    }
  }

  // Get status of the reminder service
  public getStatus(): { isRunning: boolean; activeReminders: number } {
    return {
      isRunning: this.isRunning,
      activeReminders: this.reminderIntervals.size
    };
  }

  // Get detailed status including local notifications
  public async getDetailedStatus(): Promise<{ 
    isRunning: boolean; 
    activeReminders: number; 
    localNotifications: number;
    appointmentNotifications: number;
  }> {
    try {
      const Notifications = await import('expo-notifications');
      const localNotifications = await Notifications.getScheduledNotificationsAsync();
      
      // Count notifications related to appointments
      const appointmentNotifications = localNotifications.filter(notification => 
        notification.content.data?.type === 'reminder'
      ).length;
      
      return {
        isRunning: this.isRunning,
        activeReminders: this.reminderIntervals.size,
        localNotifications: localNotifications.length,
        appointmentNotifications
      };
    } catch (error) {
      console.error('Error getting detailed status:', error);
      return {
        isRunning: this.isRunning,
        activeReminders: this.reminderIntervals.size,
        localNotifications: 0,
        appointmentNotifications: 0
      };
    }
  }
}

// Export singleton instance
export const reminderService = ReminderService.getInstance();

// Auto-start the service when this module is imported
reminderService.start();
