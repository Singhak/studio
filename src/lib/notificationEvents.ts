import { type AppNotification } from './types';

// The payload for the in-app notification event. We don't need all fields.
type InAppNotificationPayload = Pick<AppNotification, 'title' | 'body' | 'href'>;

const eventName = 'in-app-notification';

/**
 * A simple event bus for handling in-app notifications.
 * This allows the Firebase message handler to communicate with a UI component
 * without a direct dependency or complex state management through props.
 */
export const notificationEvents = {
  /**
   * Dispatches a new notification event to be displayed in-app.
   * @param detail - The content of the notification.
   */
  dispatch: (detail: InAppNotificationPayload) => {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  },
  /**
   * Adds an event listener for in-app notifications.
   * @param callback - The function to call when a notification event is received.
   */
  listen: (callback: (event: CustomEvent<InAppNotificationPayload>) => void) => {
    if (typeof document !== 'undefined') {
      document.addEventListener(eventName, callback as EventListener);
    }
  },
  /**
   * Removes an event listener for in-app notifications.
   * @param callback - The callback function to remove.
   */
  unlisten: (callback: (event: CustomEvent<InAppNotificationPayload>) => void) => {
    if (typeof document !== 'undefined') {
      document.removeEventListener(eventName, callback as EventListener);
    }
  },
};
