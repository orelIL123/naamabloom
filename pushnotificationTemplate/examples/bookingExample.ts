// Example: How to use notifications when booking appointments
import { sendSms } from '../services/messaging/instance';
import { scheduleAppointmentReminders, sendNotificationToUser } from '../services/notificationService';

export interface AppointmentData {
  userId: string;
  userProfile: any; // Your user profile type
  appointmentDate: Date;
  treatmentName: string;
  barberName: string;
  phoneNumber?: string;
}

// When creating a new appointment
export const createAppointmentWithNotifications = async (appointmentData: AppointmentData) => {
  try {
    // 1. Create appointment in your database
    // const appointment = await createAppointment(appointmentData);
    
    // 2. Send push notification
    const dateStr = appointmentData.appointmentDate.toLocaleDateString('he-IL');
    await sendNotificationToUser(
      appointmentData.userProfile,
      'תור חדש נוצר! 📅',
      `התור שלך נוצר בהצלחה. תאריך: ${dateStr}`,
      { 
        type: 'appointment',
        appointmentId: 'your-appointment-id' // Replace with actual appointment ID
      }
    );

    // 3. Send SMS if phone number provided
    if (appointmentData.phoneNumber) {
      const smsMessage = `שלום! התור שלך נוצר בהצלחה ל-${appointmentData.treatmentName} ב-${dateStr}. תודה!`;
      await sendSms(appointmentData.phoneNumber, smsMessage);
    }

    // 4. Schedule local reminders
    await scheduleAppointmentReminders(
      appointmentData.appointmentDate,
      appointmentData.treatmentName,
      appointmentData.userId
    );

    console.log('✅ Appointment created with all notifications');
  } catch (error) {
    console.error('Error creating appointment with notifications:', error);
    throw error;
  }
};

// When cancelling an appointment
export const cancelAppointmentWithNotifications = async (
  userProfile: any,
  appointmentDate: Date,
  phoneNumber?: string
) => {
  try {
    // 1. Cancel appointment in your database
    // await cancelAppointment(appointmentId);

    // 2. Send push notification
    await sendNotificationToUser(
      userProfile,
      'התור בוטל! ❌',
      'התור שלך בוטל בהצלחה.',
      { type: 'appointment' }
    );

    // 3. Send SMS if phone number provided
    if (phoneNumber) {
      const smsMessage = `שלום! התור שלך בוטל בהצלחה. תודה!`;
      await sendSms(phoneNumber, smsMessage);
    }

    console.log('✅ Appointment cancelled with notifications');
  } catch (error) {
    console.error('Error cancelling appointment with notifications:', error);
    throw error;
  }
};

// When confirming an appointment
export const confirmAppointmentWithNotifications = async (
  userProfile: any,
  appointmentDate: Date,
  treatmentName: string,
  phoneNumber?: string
) => {
  try {
    // 1. Confirm appointment in your database
    // await confirmAppointment(appointmentId);

    // 2. Send push notification
    const dateStr = appointmentDate.toLocaleDateString('he-IL');
    await sendNotificationToUser(
      userProfile,
      'התור אושר! ✅',
      `התור שלך ל-${treatmentName} ב-${dateStr} אושר בהצלחה!`,
      { type: 'appointment' }
    );

    // 3. Send SMS if phone number provided
    if (phoneNumber) {
      const smsMessage = `שלום! התור שלך ל-${treatmentName} ב-${dateStr} אושר בהצלחה!`;
      await sendSms(phoneNumber, smsMessage);
    }

    console.log('✅ Appointment confirmed with notifications');
  } catch (error) {
    console.error('Error confirming appointment with notifications:', error);
    throw error;
  }
};
