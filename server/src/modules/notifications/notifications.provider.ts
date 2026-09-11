import axios from 'axios';
import { INotificationProvider, SendNotificationInput } from './notifications.types';

/**
 * Mock Notification Provider for local testing & demos without network calls
 */
export class MockNotificationProvider implements INotificationProvider {
  public sentNotifications: Array<SendNotificationInput & { sentAt: string }> = [];

  async send(input: SendNotificationInput, pushToken?: string): Promise<{ success: boolean; messageId?: string }> {
    const record = {
      ...input,
      pushToken,
      sentAt: new Date().toISOString(),
    };
    this.sentNotifications.push(record);
    console.log(`[MockNotificationProvider] Notification sent to user ${input.userId}: "${input.title}" - ${input.body}`);
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}

/**
 * Expo Push Notification Provider for mobile push notifications
 */
export class ExpoPushNotificationProvider implements INotificationProvider {
  private expoApiUrl = 'https://exp.host/--/api/v2/push/send';

  async send(input: SendNotificationInput, pushToken?: string): Promise<{ success: boolean; messageId?: string }> {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
      console.warn(`[ExpoPushProvider] Invalid or missing Expo push token for user ${input.userId}. Fallback to log.`);
      return { success: false };
    }

    try {
      const response = await axios.post(
        this.expoApiUrl,
        {
          to: pushToken,
          title: input.title,
          body: input.body,
          data: input.data || {},
          sound: 'default',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        }
      );

      const ticket = response.data?.data;
      return {
        success: ticket?.status === 'ok',
        messageId: ticket?.id,
      };
    } catch (err: any) {
      console.error(`[ExpoPushProvider] Push error: ${err.message}`);
      return { success: false };
    }
  }
}
