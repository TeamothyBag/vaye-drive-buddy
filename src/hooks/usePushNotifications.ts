import { useEffect, useState } from 'react';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { toast } from 'sonner';

export const usePushNotifications = (onNotificationReceived?: (data: any) => void) => {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        // Request permission
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          toast.error('Push notification permission denied');
          return;
        }

        // Register with Apple / Google
        console.log('🔔 Registering for push notifications...');
        await PushNotifications.register();

        // Listen for registration
        await PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token: ' + token.value);
          setToken(token.value);
          setIsRegistered(true);
          toast.success('Push notifications enabled');
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Push registration error: ', error);
          toast.error('Failed to register for push notifications');
        });

        // Listen for notifications received
        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('Push notification received: ', notification);
            toast('New Notification', {
              description: notification.body,
            });
            if (onNotificationReceived) {
              onNotificationReceived(notification.data);
            }
          }
        );

        // Listen for notification actions
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification: ActionPerformed) => {
            console.log('Push notification action performed', notification);
            if (onNotificationReceived) {
              onNotificationReceived(notification.notification.data);
            }
          }
        );
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [onNotificationReceived]);

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    // This would typically trigger a local notification
    toast(title, { description: body });
  };

  return {
    token,
    isRegistered,
    sendLocalNotification,
  };
};
