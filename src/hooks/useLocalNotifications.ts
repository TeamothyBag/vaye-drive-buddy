import { useEffect, useCallback } from 'react';
import {
  LocalNotifications,
  ActionPerformed,
  LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { toast } from 'sonner';

export const useLocalNotifications = (
  onNotificationAction?: (notification: ActionPerformed) => void
) => {
  useEffect(() => {
    const requestPermissions = async () => {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    };

    requestPermissions();

    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Local notification action:', notification);
        if (onNotificationAction) {
          onNotificationAction(notification);
        }
      }
    );

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [onNotificationAction]);

  const scheduleNotification = useCallback(
    async (notification: LocalNotificationSchema) => {
      try {
        await LocalNotifications.schedule({
          notifications: [notification],
        });
        console.log('Notification scheduled:', notification);
      } catch (err) {
        console.error('Failed to schedule notification:', err);
        toast.error('Failed to schedule notification');
      }
    },
    []
  );

  const cancelNotification = useCallback(async (id: number) => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (err) {
      console.error('Failed to cancel notification:', err);
    }
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (err) {
      console.error('Failed to cancel all notifications:', err);
    }
  }, []);

  return {
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };
};
