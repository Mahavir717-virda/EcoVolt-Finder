/**
 * Background Reminder Worker
 * Automatically monitors active bookings in PostgreSQL and dispatches dynamic "time remaining / come fast" notifications without any manual user buttons.
 */

import { prisma } from '../db/client';
import { notificationsService } from '../modules/notifications/notifications.service';

// Set of booking IDs for which reminder has already been sent to prevent duplicates
const remindedBookings = new Set<string>();

/**
 * Check active bookings and send automated dynamic reminders
 */
export async function processBookingReminders(): Promise<void> {
  try {
    const now = new Date();
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    // Find all upcoming reservations within the next 35 minutes
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'reserved',
        windowStart: {
          gte: new Date(now.getTime() - 5 * 60 * 1000), // Up to 5 minutes past start
          lte: thirtyFiveMinutesFromNow,
        },
      },
      include: {
        station: true,
        vehicle: true,
      },
    });

    for (const booking of upcomingBookings) {
      const diffMs = new Date(booking.windowStart).getTime() - now.getTime();
      const minutesRemaining = Math.max(0, Math.round(diffMs / 60000));

      const reminderKey = `${booking.id}_${minutesRemaining <= 5 ? 'urgent' : 'upcoming'}`;

      if (!remindedBookings.has(reminderKey)) {
        remindedBookings.add(reminderKey);

        await notificationsService.notifyBookingReminder(
          booking.userId,
          booking.station.name,
          booking.windowStart,
          minutesRemaining,
          booking.id
        );

        console.log(
          `[ReminderWorker] ⏰ Auto-dispatched reminder for booking ${booking.id} (${booking.station.name}) — ${minutesRemaining} mins remaining.`
        );
      }
    }
  } catch (error) {
    console.error('[ReminderWorker] Error evaluating booking reminders:', error);
  }
}

/**
 * Start the recurring background reminder worker (runs every 30 seconds)
 */
export function startReminderWorker(): void {
  // Run on startup
  setTimeout(() => {
    processBookingReminders();
  }, 2000);

  // Run every 30 seconds
  setInterval(() => {
    processBookingReminders();
  }, 30 * 1000);

  console.log('⚡ Background Booking Reminder Worker started (interval: 30s)');
}
