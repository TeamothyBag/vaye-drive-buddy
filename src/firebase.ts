import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Firebase configuration for Vaye Driver app
const firebaseConfig = {
  apiKey: "AIzaSyAwyDMlYefuoHgCsUP00vVG2jW-2p9jO7E",
  authDomain: "tribaal-2bca5.firebaseapp.com", 
  projectId: "tribaal-2bca5",
  storageBucket: "tribaal-2bca5.firebasestorage.app",
  messagingSenderId: "590811694761",
  appId: "1:590811694761:web:57cb8bfa5a104006fd4bb8",
  measurementId: "G-E91HMMPKH9",
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services conditionally
let analytics: any = null;
let messaging: any = null;
let auth: any = null;

try {
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    analytics = getAnalytics(app);
    messaging = getMessaging(app);
  }
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase service initialization warning:', error);
}

// Track if push notifications are already initialized
let isNotificationsInitialized = false;

// Push notification service for native platforms
export const initializePushNotifications = async () => {
  if (isNotificationsInitialized) {
    console.log('📱 Push notifications already initialized, skipping...');
    return;
  }
  
  if (Capacitor.isNativePlatform()) {
    try {
      // Request permissions
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register with FCM
        await PushNotifications.register();
        console.log('✅ Push notifications registered successfully');
        isNotificationsInitialized = true;
        
        // Listen for registration token
        PushNotifications.addListener('registration', async (token) => {
          console.log('✅ Push registration success, token:', token.value);
          // Register token with backend
          await registerFCMToken(token.value);
          return token.value;
        });
        
        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Push registration error:', error.error);
        });
        
        // Listen for push notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Push notification received:', notification);
        });
        
        // Listen for push notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('🔔 Push notification action performed:', notification.actionId);
        });
      } else {
        console.warn('⚠️ Push notification permissions not granted');
      }
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  } else {
    console.log('🌐 Running in web mode - using web push notifications');
  }
};

// Web-based push notifications
export const getMessagingToken = async () => {
  if (messaging) {
    try {
      const token = await getToken(messaging, {
        vapidKey: 'BOZZgmLJF3SZXgxOKhv8RcEtl0Ol_E6p1ej7EtsyA3xmIw_-FHsIbp0RPG0IGs8N0DzYMx6dFucJxd7oqeFFLL8' // TODO: Replace with your actual VAPID key from Firebase Console
      });
      console.log('✅ Web messaging token:', token);
      return token;
    } catch (error) {
      console.error('❌ Error getting messaging token:', error);
      return null;
    }
  }
  return null;
};

// Register FCM token with backend
export const registerFCMToken = async (token: string) => {
  try {
    console.log('🔄 Starting FCM token registration with backend...');
    const { authStorage } = await import('./services/storageService');
    const authToken = await authStorage.getToken();
    
    if (!authToken) {
      console.warn('⚠️ No auth token available for FCM registration');
      return false;
    }
    
    console.log('✅ Auth token found, proceeding with FCM registration...');

    const configModule = await import('./config');
    const config = configModule.default;
    console.log('🔧 Config loaded:', config);
    console.log('🔧 API Base URL:', config?.apiBaseUrl);
    const response = await fetch(`${config.apiBaseUrl}/api/fcm/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token,
        deviceInfo: {
          platform: Capacitor.getPlatform(),
          model: Capacitor.isNativePlatform() ? 'Mobile Device' : 'Web Browser',
          version: '1.0'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ FCM token registered with backend:', result.message);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to register FCM token with backend:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registering FCM token:', error);
    return false;
  }
};

export { analytics, messaging, auth, app, getToken, onMessage };
export default app;