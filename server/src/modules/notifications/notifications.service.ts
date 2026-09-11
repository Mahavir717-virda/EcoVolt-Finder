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
   * Booking Reminder Nudge (15 mins before window)
   */
  public static async notifyBookingReminder(userId: string, stationName: string, windowStart: string) {
    return this.send({
      userId,
      type: 'booking_reminder',
      title: '⚡ Upcoming EV Charging Reservation',
      body: `Your charging session at ${stationName} begins in 15 minutes (${new Date(windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
      data: { stationName, windowStart },
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
   * Session Completed Impact Summary Nudge
   */
  public static async notifySessionComplete(userId: string, energyKwh: number, cost: number, co2AvoidedKg: number) {
    return this.send({
      userId,
      type: 'session_completed',
      title: '✅ Charging Complete!',
      body: `Delivered ${energyKwh.toFixed(1)} kWh for ₹${cost.toFixed(2)}. You avoided ${co2AvoidedKg.toFixed(2)} kg of CO₂!`,
      data: { energyKwh, cost, co2AvoidedKg },
    });
  }
}
