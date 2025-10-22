import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../app/config/firebase';
import {
    sendNotificationToUser,
    sendNotificationToUsers
} from './pushNotificationService';

export interface Barber {
  uid: string;
  displayName: string;
  phone: string;
  pushToken?: string;
  isBarber: boolean;
  isActive: boolean;
  specialties?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface AppointmentData {
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
}

export class BarberNotificationService {
  private static instance: BarberNotificationService;

  private constructor() {}

  public static getInstance(): BarberNotificationService {
    if (!BarberNotificationService.instance) {
      BarberNotificationService.instance = new BarberNotificationService();
    }
    return BarberNotificationService.instance;
  }

  // Get all barbers from Firebase
  public async getAllBarbers(): Promise<Barber[]> {
    try {
      const barbersRef = collection(db, 'users');
      const q = query(barbersRef, where('isBarber', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Barber[];
    } catch (error) {
      console.error('Error getting all barbers:', error);
      return [];
    }
  }

  // Get active barbers only
  public async getActiveBarbers(): Promise<Barber[]> {
    try {
      const barbers = await this.getAllBarbers();
      return barbers.filter(barber => barber.isActive !== false);
    } catch (error) {
      console.error('Error getting active barbers:', error);
      return [];
    }
  }

  // Get barber by ID
  public async getBarberById(barberId: string): Promise<Barber | null> {
    try {
      const barberRef = doc(db, 'users', barberId);
      const barberSnap = await getDoc(barberRef);
      
      if (barberSnap.exists()) {
        return { uid: barberId, ...barberSnap.data() } as Barber;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting barber by ID:', error);
      return null;
    }
  }

  // Get barbers by specialty
  public async getBarbersBySpecialty(specialty: string): Promise<Barber[]> {
    try {
      const barbers = await this.getAllBarbers();
      return barbers.filter(barber => 
        barber.specialties?.includes(specialty) || 
        barber.specialties?.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    } catch (error) {
      console.error('Error getting barbers by specialty:', error);
      return [];
    }
  }

  // Send notification to specific barber
  public async notifyBarber(
    barberId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    try {
      const barber = await this.getBarberById(barberId);
      if (!barber) {
        console.log(`Barber ${barberId} not found`);
        return false;
      }

      // Send Push notification
      const pushSuccess = await sendNotificationToUser(barber, title, message, data);

      if (pushSuccess) {
        console.log(`✅ Push notification sent to barber ${barber.displayName}`);
        return true;
      } else {
        console.log(`❌ Failed to send push notification to barber ${barber.displayName}`);
        return false;
      }
    } catch (error) {
      console.error('Error notifying barber:', error);
      return false;
    }
  }

  // Send notification to all barbers
  public async notifyAllBarbers(
    title: string,
    message: string,
    data?: any
  ): Promise<{ sent: number; failed: number }> {
    try {
      const barbers = await this.getActiveBarbers();
      if (barbers.length === 0) {
        console.log('No active barbers found');
        return { sent: 0, failed: 0 };
      }

      // Send to all barbers
      const results = await Promise.allSettled(
        barbers.map(barber => this.notifyBarber(barber.uid, title, message, data))
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.length - successful;

      console.log(`✅ Sent to ${successful}/${barbers.length} barbers`);
      return { sent: successful, failed };
    } catch (error) {
      console.error('Error notifying all barbers:', error);
      return { sent: 0, failed: 1 };
    }
  }

  // Send notification to barbers by specialty
  public async notifyBarbersBySpecialty(
    specialty: string,
    title: string,
    message: string,
    data?: any
  ): Promise<{ sent: number; failed: number }> {
    try {
      const barbers = await this.getBarbersBySpecialty(specialty);
      if (barbers.length === 0) {
        console.log(`No barbers found for specialty: ${specialty}`);
        return { sent: 0, failed: 0 };
      }

      // Send to barbers with this specialty
      const results = await Promise.allSettled(
        barbers.map(barber => this.notifyBarber(barber.uid, title, message, data))
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.length - successful;

      console.log(`✅ Sent to ${successful}/${barbers.length} barbers with specialty ${specialty}`);
      return { sent: successful, failed };
    } catch (error) {
      console.error('Error notifying barbers by specialty:', error);
      return { sent: 0, failed: 1 };
    }
  }

  // Notify about new appointment
  public async notifyNewAppointment(appointmentData: AppointmentData): Promise<void> {
    try {
      const { barberId, barberName, clientName, treatment, date, time } = appointmentData;
      
      // Notify the specific barber
      await this.notifyBarber(
        barberId,
        'תור חדש נוצר! 📅',
        `${clientName} קבע תור ל${treatment} ב${date} בשעה ${time}`,
        { 
          type: 'appointment',
          appointmentId: appointmentData.id,
          clientName,
          treatment,
          date,
          time
        }
      );

      // Also notify all other barbers about the new appointment
      const allBarbers = await this.getActiveBarbers();
      const otherBarbers = allBarbers.filter(barber => barber.uid !== barberId);
      
      if (otherBarbers.length > 0) {
        await sendNotificationToUsers(
          otherBarbers,
          'תור חדש במספרה! 📅',
          `${clientName} קבע תור ל${treatment} עם ${barberName} ב${date} בשעה ${time}`,
          { 
            type: 'appointment',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time
          }
        );
      }

      // Notify admin
      const adminUsers = await this.getAdminUsers();
      if (adminUsers.length > 0) {
        await sendNotificationToUsers(
          adminUsers,
          'תור חדש נוצר! 📅',
          `${clientName} קבע תור ל${treatment} עם ${barberName} ב${date} בשעה ${time}`,
          { 
            type: 'appointment',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time
          }
        );
      }

    } catch (error) {
      console.error('Error notifying about new appointment:', error);
    }
  }

  // Notify about appointment cancellation
  public async notifyAppointmentCancellation(appointmentData: AppointmentData): Promise<void> {
    try {
      const { barberId, barberName, clientName, treatment, date, time } = appointmentData;
      
      // Notify the specific barber
      await this.notifyBarber(
        barberId,
        'תור בוטל! ❌',
        `${clientName} ביטל תור ל${treatment} ב${date} בשעה ${time}`,
        { 
          type: 'appointment',
          appointmentId: appointmentData.id,
          clientName,
          treatment,
          date,
          time
        }
      );

      // Also notify all other barbers about the cancellation
      const allBarbers = await this.getActiveBarbers();
      const otherBarbers = allBarbers.filter(barber => barber.uid !== barberId);
      
      if (otherBarbers.length > 0) {
        await sendNotificationToUsers(
          otherBarbers,
          'תור בוטל במספרה! ❌',
          `${clientName} ביטל תור ל${treatment} עם ${barberName} ב${date} בשעה ${time}`,
          { 
            type: 'appointment',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time
          }
        );
      }

      // Notify admin
      const adminUsers = await this.getAdminUsers();
      if (adminUsers.length > 0) {
        await sendNotificationToUsers(
          adminUsers,
          'תור בוטל! ❌',
          `${clientName} ביטל תור ל${treatment} עם ${barberName} ב${date} בשעה ${time}`,
          { 
            type: 'appointment',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time
          }
        );
      }

    } catch (error) {
      console.error('Error notifying about appointment cancellation:', error);
    }
  }

  // Notify about appointment reminder
  public async notifyAppointmentReminder(
    appointmentData: AppointmentData,
    minutesUntil: number
  ): Promise<void> {
    try {
      const { barberId, barberName, clientName, treatment, date, time } = appointmentData;
      
      // Notify the specific barber
      await this.notifyBarber(
        barberId,
        'תזכורת תור! ⏰',
        `תור עם ${clientName} ל${treatment} יתחיל בעוד ${minutesUntil} דקות`,
        { 
          type: 'reminder',
          appointmentId: appointmentData.id,
          clientName,
          treatment,
          date,
          time,
          minutesUntil
        }
      );

      // Also notify all other barbers about the reminder
      const allBarbers = await this.getActiveBarbers();
      const otherBarbers = allBarbers.filter(barber => barber.uid !== barberId);
      
      if (otherBarbers.length > 0) {
        await sendNotificationToUsers(
          otherBarbers,
          'תזכורת תור! ⏰',
          `תור עם ${clientName} ל${treatment} עם ${barberName} יתחיל בעוד ${minutesUntil} דקות`,
          { 
            type: 'reminder',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time,
            minutesUntil
          }
        );
      }

      // Notify admin
      const adminUsers = await this.getAdminUsers();
      if (adminUsers.length > 0) {
        await sendNotificationToUsers(
          adminUsers,
          'תזכורת תור! ⏰',
          `תור עם ${clientName} ל${treatment} עם ${barberName} יתחיל בעוד ${minutesUntil} דקות`,
          { 
            type: 'reminder',
            appointmentId: appointmentData.id,
            clientName,
            treatment,
            barberName,
            date,
            time,
            minutesUntil
          }
        );
      }

    } catch (error) {
      console.error('Error notifying about appointment reminder:', error);
    }
  }

  // Get admin users
  private async getAdminUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isAdmin', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  // Send maintenance notification to all barbers
  public async notifyMaintenance(
    message: string,
    scheduledTime?: Date
  ): Promise<void> {
    try {
      let fullMessage = message;
      if (scheduledTime) {
        const timeStr = scheduledTime.toLocaleString('he-IL');
        fullMessage += `\n\nזמן התחזוקה: ${timeStr}`;
      }

      await this.notifyAllBarbers(
        'תחזוקה מתוכננת! 🔧',
        fullMessage,
        { type: 'maintenance' }
      );
    } catch (error) {
      console.error('Error notifying maintenance:', error);
    }
  }

  // Send system update notification to all barbers
  public async notifySystemUpdate(
    updateDetails: string,
    newFeatures?: string[]
  ): Promise<void> {
    try {
      let message = updateDetails;
      if (newFeatures && newFeatures.length > 0) {
        message += '\n\nתכונות חדשות:';
        newFeatures.forEach(feature => {
          message += `\n• ${feature}`;
        });
      }

      await this.notifyAllBarbers(
        'עדכון מערכת! 📱',
        message,
        { type: 'system_update' }
      );
    } catch (error) {
      console.error('Error notifying system update:', error);
    }
  }

  // Send promotional notification to all barbers
  public async notifyPromotionalOffer(
    offerTitle: string,
    offerDescription: string,
    validUntil?: Date
  ): Promise<void> {
    try {
      let message = offerDescription;
      if (validUntil) {
        const validDate = validUntil.toLocaleDateString('he-IL');
        message += `\n\nההצעה תקפה עד: ${validDate}`;
      }

      await this.notifyAllBarbers(
        offerTitle,
        message,
        { type: 'promotion' }
      );
    } catch (error) {
      console.error('Error notifying promotional offer:', error);
    }
  }
}

// Export singleton instance
export const barberNotificationService = BarberNotificationService.getInstance();

