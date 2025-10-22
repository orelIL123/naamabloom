// Example: How to use notifications for admin features
import {
    sendMaintenanceNotification,
    sendNotificationToAdmins,
    sendNotificationToAllUsers,
    sendNotificationToUser,
    sendPromotionalNotification,
    sendSystemUpdateNotification
} from '../services/notificationService';

export interface AdminUser {
  uid: string;
  displayName: string;
  phone: string;
  pushToken?: string;
  isAdmin?: boolean;
}

// Send broadcast message to all users
export const sendBroadcastMessage = async (
  allUsers: AdminUser[],
  title: string,
  message: string
) => {
  try {
    const sentCount = await sendNotificationToAllUsers(allUsers, title, message);
    console.log(`✅ Broadcast sent to ${sentCount} users`);
    return sentCount;
  } catch (error) {
    console.error('Error sending broadcast:', error);
    throw error;
  }
};

// Send message to specific customer
export const sendMessageToCustomer = async (
  customer: AdminUser,
  message: string
) => {
  try {
    const success = await sendNotificationToUser(
      customer,
      'הודעה מהמספרה',
      message
    );
    
    if (success) {
      console.log(`✅ Message sent to ${customer.displayName}`);
    } else {
      console.log(`❌ Failed to send message to ${customer.displayName}`);
    }
    
    return success;
  } catch (error) {
    console.error('Error sending message to customer:', error);
    throw error;
  }
};

// Send promotional offer
export const sendPromotionalOffer = async (
  allUsers: AdminUser[],
  offerTitle: string,
  offerDescription: string,
  validUntil?: Date
) => {
  try {
    let message = offerDescription;
    if (validUntil) {
      const validDate = validUntil.toLocaleDateString('he-IL');
      message += `\n\nההצעה תקפה עד: ${validDate}`;
    }

    await sendPromotionalNotification(allUsers, offerTitle, message, {
      type: 'promotion',
      validUntil: validUntil?.toISOString()
    });

    console.log('✅ Promotional offer sent to all users');
  } catch (error) {
    console.error('Error sending promotional offer:', error);
    throw error;
  }
};

// Send maintenance notification
export const notifyMaintenance = async (
  allUsers: AdminUser[],
  maintenanceMessage: string,
  scheduledTime?: Date
) => {
  try {
    let message = maintenanceMessage;
    if (scheduledTime) {
      const timeStr = scheduledTime.toLocaleString('he-IL');
      message += `\n\nזמן התחזוקה: ${timeStr}`;
    }

    await sendMaintenanceNotification(allUsers, message);
    console.log('✅ Maintenance notification sent');
  } catch (error) {
    console.error('Error sending maintenance notification:', error);
    throw error;
  }
};

// Send system update notification
export const notifySystemUpdate = async (
  allUsers: AdminUser[],
  updateDetails: string,
  newFeatures?: string[]
) => {
  try {
    let message = updateDetails;
    if (newFeatures && newFeatures.length > 0) {
      message += '\n\nתכונות חדשות:';
      newFeatures.forEach(feature => {
        message += `\n• ${feature}`;
      });
    }

    await sendSystemUpdateNotification(allUsers, message);
    console.log('✅ System update notification sent');
  } catch (error) {
    console.error('Error sending system update notification:', error);
    throw error;
  }
};

// Notify admins about new appointment
export const notifyAdminsAboutNewAppointment = async (
  adminUsers: AdminUser[],
  customerName: string,
  appointmentDate: Date,
  treatmentName: string
) => {
  try {
    const dateStr = appointmentDate.toLocaleDateString('he-IL');
    const timeStr = appointmentDate.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    await sendNotificationToAdmins(
      adminUsers,
      'תור חדש נוצר! 📅',
      `לקוח: ${customerName}\nתאריך: ${dateStr}\nשעה: ${timeStr}\nטיפול: ${treatmentName}`,
      { type: 'appointment' }
    );

    console.log('✅ Admin notification sent for new appointment');
  } catch (error) {
    console.error('Error notifying admins about appointment:', error);
    throw error;
  }
};

// Notify admins about appointment cancellation
export const notifyAdminsAboutCancellation = async (
  adminUsers: AdminUser[],
  customerName: string,
  appointmentDate: Date,
  treatmentName: string
) => {
  try {
    const dateStr = appointmentDate.toLocaleDateString('he-IL');

    await sendNotificationToAdmins(
      adminUsers,
      'תור בוטל! ❌',
      `לקוח: ${customerName}\nתאריך: ${dateStr}\nטיפול: ${treatmentName}`,
      { type: 'appointment' }
    );

    console.log('✅ Admin notification sent for appointment cancellation');
  } catch (error) {
    console.error('Error notifying admins about cancellation:', error);
    throw error;
  }
};
