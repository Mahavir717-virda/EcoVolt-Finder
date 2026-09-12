import { randomUUID } from 'crypto';
import { prisma } from '../../db/client';
import { INotificationProvider, NotificationPayload, SendNotificationInput } from './notifications.types';
import { MockNotificationProvider, ExpoPushNotificationProvider } from './notifications.provider';
import { NotFoundError } from '../../middleware/error-handler';

export class NotificationsService {
  private static provider: INotificationProvider = new MockNotificationProvider();
  
  // In-memory store for user push tokens & notification records
  private static userPushTokens: Map<string, string> = new Map();
  private static notificationHistory: Map<string, NotificationPayload[]> = new Map();

  /**
   * Set custom provider (e.g. switch to ExpoPushNotificationProvider in production)
   */
  public static setProvider(newProvider: INotificationProvider) {
    this.provider = newProvider;
  }

  /**
   * Register or update Expo push token for a user
   */
  public static registerPushToken(userId: string, token: string): void {
    this.userPushTokens.set(userId, token);
  }

  /**
   * Send a notification and record in history
   */
  public static async send(input: SendNotificationInput): Promise<NotificationPayload> {
    const pushToken = this.userPushTokens.get(input.userId);
    await this.provider.send(input, pushToken);

    const record: NotificationPayload = {
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const userHistory = this.notificationHistory.get(input.userId) || [];
    userHistory.unshift(record);
    this.notificationHistory.set(input.userId, userHistory);

    return record;
  }

  /**
   * Get notification history for a user
   */
  public static getHistory(userId: string): NotificationPayload[] {
    return this.notificationHistory.get(userId) || [];
  }

  /**
   * Mark a notification as read
   */
  public static markAsRead(userId: string, notificationId: string): NotificationPayload {
    const userHistory = this.notificationHistory.get(userId) || [];
    const notif = userHistory.find((n) => n.id === notificationId);
    if (!notif) {
      throw new NotFoundError('Notification not found');
    }
    notif.isRead = true;
    return notif;
  }

  // ─── Event Hooks & Nudges ───────────────────────────────────────

  /**
   * Booking Confirmed Notification (Instant Nudge upon slot reservation)
   */
  public static async notifyBookingConfirmed(
    userId: string,
    bookingId: string,
    stationName: string,
    vehicleModel: string,
    windowStart: Date | string,
    windowEnd: Date | string,
    connectorType?: string,
    finalPrice?: number
  ) {
    const startDate = new Date(windowStart);
    const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return this.send({
      userId,
      type: 'booking_confirmed',
      title: `⚡ Booking Confirmed: ${stationName}`,
      body: `Your charging slot at ${stationName} is locked for ${dateStr} at ${timeStr} (${vehicleModel}). Tap to view your confirmed pass & directions!`,
      data: {
        bookingId,
        stationName,
        vehicleModel,
        windowStart: startDate.toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
        connectorType,
        finalPrice,
      },
    });
  }

  /**
   * Booking Time Remaining Reminder Nudge
   */
  public static async notifyBookingReminder(
    userId: string,
    stationName: string,
    windowStart: Date | string,
    minutesRemaining: number = 15,
    bookingId?: string
  ) {
    const startDate = new Date(windowStart);
    const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const title =
      minutesRemaining <= 5
        ? `⏰ Hurry! Only ${minutesRemaining} mins remaining!`
        : `⏰ Slot Reminder: ${minutesRemaining} mins remaining!`;

    const body =
      minutesRemaining <= 5
        ? `Your reserved slot at ${stationName} starts at ${timeStr}! Please head over quickly to plug in on time.`
        : `Your charging session at ${stationName} begins in ${minutesRemaining} minutes (${timeStr}). Head over now to secure your spot!`;

    return this.send({
      userId,
      type: 'booking_reminder',
      title,
      body,
      data: {
        bookingId,
        stationName,
        windowStart: startDate.toISOString(),
        minutesRemaining,
      },
    });
  }

  /**
   * Edge Case #7: Smart Green Window Starting Nudge
   */
  public static async notifyGreenWindow(userId: string, stationName: string, renewablePct: number, savingsInr: number) {
    return this.send({
      userId,
      type: 'green_window_start',
      title: '🌿 Solar Peak Charging Window Starting!',
      body: `Green window at ${stationName} is now live with ${renewablePct}% renewable energy. Charge now to save ₹${savingsInr.toFixed(0)}!`,
      data: { stationName, renewablePct, savingsInr },
    });
  }

  /**
   * Edge Case #18: Connector Outage / Offline Alert
   */
  public static async notifyConnectorOffline(connectorId: string, stationName: string) {
    // Find all active or reserved bookings affected by this connector
    const affectedBookings = await prisma.booking.findMany({
      where: {
        connectorId,
        status: { in: ['reserved', 'scheduled'] },
      },
      include: {
        user: true,
      },
    });

    const notifications: NotificationPayload[] = [];
    for (const booking of affectedBookings) {
      const notif = await this.send({
        userId: booking.userId,
        type: 'connector_offline',
        title: '⚠️ Connector Maintenance Alert',
        body: `Connector at ${stationName} is temporarily offline. We have recommended alternative nearby chargers.`,
        data: { bookingId: booking.id, stationName, connectorId },
      });
      notifications.push(notif);
    }

    return notifications;
  }

  /**
   * Session Completed Impact Summary & Sweet Driver Message
   */
  public static async notifySessionComplete(
    userId: string,
    energyKwh: number,
    cost: number,
    co2AvoidedKg: number,
    stationName: string = 'EcoVolt Supercharger',
    pointsEarned: number = Math.round(co2AvoidedKg * 10) || 50
  ) {
    return this.send({
      userId,
      type: 'session_completed',
      title: '🎉 Charging Complete! Sweet Green Energy 🌿⚡',
      body: `Awesome charge! You powered up ${energyKwh.toFixed(1)} kWh at ${stationName} for ₹${cost.toFixed(2)}. You avoided ${co2AvoidedKg.toFixed(2)} kg of CO₂ and earned +${pointsEarned} EcoPoints! 💚 Thank you for driving green!`,
      data: {
        energyKwh,
        cost,
        co2AvoidedKg,
        stationName,
        pointsEarned,
      },
    });
  }
}
