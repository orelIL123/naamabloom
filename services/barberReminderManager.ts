/**
 * Barber Reminder Manager
 *
 * Handles local notification reminders for BARBERS (workers) about their appointments.
 * This is separate from customer reminders - barbers need to know when clients are coming.
 *
 * Barbers get reminders:
 * - T-30min: Client arriving in 30 minutes
 * - T-10min: Client arriving in 10 minutes
 * - T-0: Client appointment starts now
 */

import {
  cancelById,
  ReminderSpec,
  scheduleAbsolute,
} from './notificationManager';

// ===== TYPES =====

export interface BarberAppointment {
  id: string;
  startsAt: string; // ISO string
  barberId: string; // The barber who will perform the service
  clientName?: string;
  treatment?: string;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create deterministic notification ID for barber reminder
 */
function createBarberReminderId(appointmentId: string, kind: string): string {
  return `barber:${appointmentId}:${kind}`;
}

/**
 * Format time for display in Hebrew
 */
function formatTimeHebrew(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ===== MAIN FUNCTIONS =====

/**
 * Schedule reminders for a barber about their upcoming appointment
 *
 * Creates up to 3 reminders:
 * - 30 minutes before
 * - 10 minutes before
 * - At appointment time
 *
 * These are LOCAL notifications on the barber's device
 *
 * @param appointment - Appointment data with ISO startsAt time
 */
export async function scheduleBarberReminders(
  appointment: BarberAppointment
): Promise<void> {
  try {
    console.log(`⏰ [Barber] Scheduling reminders for appointment ${appointment.id}...`);

    // Parse appointment time
    const appointmentTime = new Date(appointment.startsAt);
    const now = new Date();

    // Validate appointment time
    if (isNaN(appointmentTime.getTime())) {
      console.error('❌ [Barber] Invalid appointment time:', appointment.startsAt);
      return;
    }

    if (appointmentTime <= now) {
      console.log('⏰ [Barber] Appointment is in the past, skipping reminders');
      return;
    }

    // Calculate reminder times
    const t30min = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
    const t10min = new Date(appointmentTime.getTime() - 10 * 60 * 1000);
    const t0 = new Date(appointmentTime.getTime());

    // Get client and treatment names
    const clientName = appointment.clientName || 'לקוח';
    const treatmentName = appointment.treatment || 'תספורת';

    // Build reminder specs
    const specs: ReminderSpec[] = [];

    // 30-minute reminder
    if (t30min > now) {
      specs.push({
        id: createBarberReminderId(appointment.id, 'T_MINUS_30MIN'),
        when: t30min,
        title: '💈 לקוח מגיע בעוד 30 דקות',
        body: `${clientName} מגיע/ה ל${treatmentName} בשעה ${formatTimeHebrew(appointmentTime)}`,
        data: {
          appointmentId: appointment.id,
          barberId: appointment.barberId,
          kind: 'T_MINUS_30MIN',
          type: 'barber_reminder',
        },
      });
    }

    // 10-minute reminder
    if (t10min > now) {
      specs.push({
        id: createBarberReminderId(appointment.id, 'T_MINUS_10MIN'),
        when: t10min,
        title: '💈 לקוח מגיע בעוד 10 דקות',
        body: `${clientName} מגיע/ה ל${treatmentName} בעוד 10 דקות!`,
        data: {
          appointmentId: appointment.id,
          barberId: appointment.barberId,
          kind: 'T_MINUS_10MIN',
          type: 'barber_reminder',
        },
      });
    }

    // At-time reminder
    if (t0 > now) {
      specs.push({
        id: createBarberReminderId(appointment.id, 'AT_TIME'),
        when: t0,
        title: '💈 לקוח הגיע!',
        body: `התור של ${clientName} ל${treatmentName} מתחיל עכשיו`,
        data: {
          appointmentId: appointment.id,
          barberId: appointment.barberId,
          kind: 'AT_TIME',
          type: 'barber_reminder',
        },
      });
    }

    // Schedule all valid reminders
    if (specs.length === 0) {
      console.log('⏰ [Barber] No reminders to schedule (all in past)');
      return;
    }

    console.log(`⏰ [Barber] Scheduling ${specs.length} reminders...`);
    for (const spec of specs) {
      try {
        await scheduleAbsolute(spec);
      } catch (error) {
        console.error(`❌ [Barber] Failed to schedule ${spec.id}:`, error);
        // Continue scheduling other reminders even if one fails
      }
    }

    console.log(`✅ [Barber] Scheduled ${specs.length} reminders for appointment ${appointment.id}`);
  } catch (error) {
    console.error('❌ [Barber] Error scheduling reminders:', error);
  }
}

/**
 * Cancel all barber reminders for an appointment
 *
 * Call this when:
 * - Appointment is cancelled
 * - Appointment time is changed (before rescheduling)
 * - Barber is changed to a different person
 *
 * @param appointmentId - Appointment ID
 */
export async function cancelBarberReminders(
  appointmentId: string
): Promise<void> {
  try {
    console.log(`🗑️ [Barber] Cancelling reminders for appointment ${appointmentId}...`);

    const reminderKinds = ['T_MINUS_30MIN', 'T_MINUS_10MIN', 'AT_TIME'];

    for (const kind of reminderKinds) {
      const id = createBarberReminderId(appointmentId, kind);
      await cancelById(id);
    }

    console.log(`✅ [Barber] Cancelled reminders for appointment ${appointmentId}`);
  } catch (error) {
    console.error('❌ [Barber] Error cancelling reminders:', error);
  }
}

/**
 * Reschedule barber reminders for an appointment
 *
 * Cancels old reminders and schedules new ones
 * Call this when appointment time changes
 *
 * @param appointment - Updated appointment data
 */
export async function rescheduleBarberReminders(
  appointment: BarberAppointment
): Promise<void> {
  try {
    console.log(`🔄 [Barber] Rescheduling reminders for appointment ${appointment.id}...`);

    // Cancel existing reminders
    await cancelBarberReminders(appointment.id);

    // Schedule new reminders
    await scheduleBarberReminders(appointment);

    console.log(`✅ [Barber] Rescheduled reminders for appointment ${appointment.id}`);
  } catch (error) {
    console.error('❌ [Barber] Error rescheduling reminders:', error);
  }
}

/**
 * Schedule reminders on the BARBER'S device (not the customer's)
 *
 * IMPORTANT: This should be called on the barber's device when they log in,
 * or when appointments are synced to their device.
 *
 * This is different from push notifications - these are local device notifications.
 *
 * @param barberId - The barber's user ID
 * @param appointments - Array of upcoming appointments for this barber
 */
export async function syncBarberReminders(
  barberId: string,
  appointments: BarberAppointment[]
): Promise<void> {
  try {
    console.log(`🔄 [Barber] Syncing ${appointments.length} appointments for barber ${barberId}...`);

    // Filter appointments for this barber only
    const barberAppointments = appointments.filter(a => a.barberId === barberId);

    console.log(`⏰ [Barber] Scheduling reminders for ${barberAppointments.length} appointments...`);

    // Schedule reminders for each appointment
    for (const appointment of barberAppointments) {
      await scheduleBarberReminders(appointment);
    }

    console.log(`✅ [Barber] Synced reminders for ${barberAppointments.length} appointments`);
  } catch (error) {
    console.error('❌ [Barber] Error syncing reminders:', error);
  }
}
