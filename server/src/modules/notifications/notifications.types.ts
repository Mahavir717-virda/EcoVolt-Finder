export type NotificationType =
  | 'green_window_start'
  | 'booking_reminder'
  | 'connector_offline'
  | 'session_completed'
  | 'general_alert';

export interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface INotificationProvider {
  send(input: SendNotificationInput, pushToken?: string): Promise<{ success: boolean; messageId?: string }>;
}
