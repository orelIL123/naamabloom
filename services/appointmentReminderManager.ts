/**
 * Appointment Reminder Manager
 *
 * Handles deterministic scheduling of appointment reminders:
 * - T-24h (day before)
 * - T-1h (one hour before)
 * - T-0 (at appointment time)
 *
 * Features:
 * - Respects admin reminder settings
 * - Filters out past triggers
 * - Provides stable, idempotent scheduling
 * - Cancels reminders on appointment changes/cancellations
 */

import {
  cancelById,
  getAdminReminderSettings,
  ReminderSpec,
  scheduleAbsolute,
} from './notificationManager';

// ===== TYPES =====

export interface Appointment {
  id: string;
  startsAt: string; // ISO string
  clientName?: string;
  barberName?: string;
  shopName?: string;
  treatment?: string;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create deterministic notification ID for appointment reminder
 */
function createReminderId(appointmentId: string, kind: string): string {
  return `appointment:${appointmentId}:${kind}`;
}

/**
 * Format time for display in Hebrew
 */
function formatTimeHebrew(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date for display in Hebrew
 */
function formatDateHebrew(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ===== MAIN FUNCTIONS =====

/**
 * Schedule all reminders for an appointment
 *
 * Creates up to 3 reminders based on admin settings:
 * - 24 hours before
 * - 1 hour before
 * - At appointment time
 *
 * Only schedules reminders that are:
 * 1. Enabled by admin settings
 * 2. In the future (not past)
 *
 * @param appointment - Appointment data with ISO startsAt time
 */
export async function scheduleAppointmentReminders(
  appointment: Appointment
): Promise<void> {
  try {
    console.log(`⏰ Scheduling reminders for appointment ${appointment.id}...`);

    // Get admin settings
    const adminSettings = await getAdminReminderSettings();

    if (!adminSettings.enabled) {
      console.log('⏰ Customer reminders disabled by admin settings');
      return;
    }

    // Parse appointment time
    const appointmentTime = new Date(appointment.startsAt);
    const now = new Date();

    // Validate appointment time
    if (isNaN(appointmentTime.getTime())) {
      console.error('❌ Invalid appointment time:', appointment.startsAt);
      return;
    }

    if (appointmentTime <= now) {
      console.log('⏰ Appointment is in the past, skipping reminders');
      return;
    }

    // Calculate reminder times
    const t24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    const t1h = new Date(appointmentTime.getTime() - 1 * 60 * 60 * 1000);
    const t0 = new Date(appointmentTime.getTime());

    // Get treatment name or default
    const treatmentName = appointment.treatment || 'תספורת';
    const barberName = appointment.barberName || 'הספר';
    const clientName = appointment.clientName || 'לקוח יקר';

    // Build reminder specs
    const specs: ReminderSpec[] = [];

    // 24-hour reminder
    if (adminSettings.t24hEnabled && t24h > now) {
      specs.push({
        id: createReminderId(appointment.id, 'T_MINUS_24H'),
        when: t24h,
        title: '💈 תזכורת לתור מחר',
        body: `${clientName}, יש לך תור ל${treatmentName} עם ${barberName} מחר בשעה ${formatTimeHebrew(appointmentTime)}`,
        data: {
          appointmentId: appointment.id,
          kind: 'T_MINUS_24H',
          type: 'appointment_reminder',
        },
      });
    } else if (adminSettings.t24hEnabled) {
      console.log('⏰ 24h reminder is in the past, skipping');
    } else {
      console.log('⏰ 24h reminder disabled by admin');
    }

    // 1-hour reminder
    if (adminSettings.t1hEnabled && t1h > now) {
      specs.push({
        id: createReminderId(appointment.id, 'T_MINUS_1H'),
        when: t1h,
        title: '💈 תזכורת לתור בעוד שעה',
        body: `${clientName}, יש לך תור ל${treatmentName} עם ${barberName} בעוד שעה (${formatTimeHebrew(appointmentTime)})`,
        data: {
          appointmentId: appointment.id,
          kind: 'T_MINUS_1H',
          type: 'appointment_reminder',
        },
      });
    } else if (adminSettings.t1hEnabled) {
      console.log('⏰ 1h reminder is in the past, skipping');
    } else {
      console.log('⏰ 1h reminder disabled by admin');
    }

    // At-time reminder
    if (adminSettings.t0Enabled && t0 > now) {
      specs.push({
        id: createReminderId(appointment.id, 'AT_TIME'),
        when: t0,
        title: '💈 התור שלך מתחיל עכשיו!',
        body: `${clientName}, התור שלך ל${treatmentName} עם ${barberName} מתחיל כעת`,
        data: {
          appointmentId: appointment.id,
          kind: 'AT_TIME',
          type: 'appointment_reminder',
        },
      });
    } else if (adminSettings.t0Enabled) {
      console.log('⏰ At-time reminder is in the past, skipping');
    } else {
      console.log('⏰ At-time reminder disabled by admin');
    }

    // Schedule all valid reminders
    if (specs.length === 0) {
      console.log('⏰ No reminders to schedule (all disabled or in past)');
      return;
    }

    console.log(`⏰ Scheduling ${specs.length} reminders...`);
    for (const spec of specs) {
      try {
        await scheduleAbsolute(spec);
      } catch (error) {
        console.error(`❌ Failed to schedule ${spec.id}:`, error);
        // Continue scheduling other reminders even if one fails
      }
    }

    console.log(`✅ Scheduled ${specs.length} reminders for appointment ${appointment.id}`);
  } catch (error) {
    console.error('❌ Error scheduling appointment reminders:', error);
  }
}

/**
 * Cancel all reminders for an appointment
 *
 * Call this when:
 * - Appointment is cancelled
 * - Appointment time is changed (before rescheduling)
 * - User logs out
 *
 * @param appointmentId - Appointment ID
 */
export async function cancelAppointmentReminders(
  appointmentId: string
): Promise<void> {
  try {
    console.log(`🗑️ Cancelling reminders for appointment ${appointmentId}...`);

    const reminderKinds = ['T_MINUS_24H', 'T_MINUS_1H', 'AT_TIME'];

    for (const kind of reminderKinds) {
      const id = createReminderId(appointmentId, kind);
      await cancelById(id);
    }

    console.log(`✅ Cancelled reminders for appointment ${appointmentId}`);
  } catch (error) {
    console.error('❌ Error cancelling appointment reminders:', error);
  }
}

/**
 * Reschedule reminders for an appointment
 *
 * Cancels old reminders and schedules new ones
 * Call this when appointment time changes
 *
 * @param appointment - Updated appointment data
 */
export async function rescheduleAppointmentReminders(
  appointment: Appointment
): Promise<void> {
  try {
    console.log(`🔄 Rescheduling reminders for appointment ${appointment.id}...`);

    // Cancel existing reminders
    await cancelAppointmentReminders(appointment.id);

    // Schedule new reminders
    await scheduleAppointmentReminders(appointment);

    console.log(`✅ Rescheduled reminders for appointment ${appointment.id}`);
  } catch (error) {
    console.error('❌ Error rescheduling appointment reminders:', error);
  }
}

/**
 * Get status of scheduled reminders for an appointment
 *
 * Useful for debugging and admin panels
 *
 * @param appointmentId - Appointment ID
 * @returns Array of reminder IDs and their scheduled times
 */
export async function getAppointmentReminderStatus(
  appointmentId: string
): Promise<{ id: string; kind: string; scheduledFor: Date | null }[]> {
  try {
    const { getAllScheduledNotifications } = await import('./notificationManager');
    const scheduled = await getAllScheduledNotifications();

    const reminderKinds = ['T_MINUS_24H', 'T_MINUS_1H', 'AT_TIME'];
    const status = [];

    for (const kind of reminderKinds) {
      const reminderId = createReminderId(appointmentId, kind);
      const found = scheduled.find(n => {
        const data = n.content.data as any;
        return data?.appointmentId === appointmentId && data?.kind === kind;
      });

      status.push({
        id: reminderId,
        kind,
        scheduledFor: found?.trigger && 'date' in found.trigger
          ? new Date((found.trigger as any).date)
          : null,
      });
    }

    return status;
  } catch (error) {
    console.error('❌ Error getting appointment reminder status:', error);
    return [];
  }
}
