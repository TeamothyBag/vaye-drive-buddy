import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import driverSocketService from "@/services/DriverSocketService";
import { storageService } from "@/services/storageService";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "ride" | "delivery" | "earnings" | "system" | "promotion" | "request" | "cancellation";
  title: string;
  message: string;
  time: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high";
  actionable?: boolean;
  metadata?: {
    rideId?: string;
    earnings?: number;
    riderId?: string;
    tripType?: string;
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  highPriorityCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'time'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getNotificationById: (id: string) => Notification | undefined;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize FCM token using centralized function
  const initializeFCMToken = useCallback(async () => {
    if (!user?._id && !user?.userId) return;

    try {
      // Use the centralized initializePushNotifications function
      const { initializePushNotifications } = await import("../firebase");
      await initializePushNotifications();
      console.log('📱 [NOTIFICATION_CONTEXT] FCM token registered');
    } catch (error) {
      console.error('❌ [NOTIFICATION_CONTEXT] Error initializing FCM token:', error);
    }
  }, [user?._id, user?.userId]);

  // Initialize notifications from local storage
  const initializeNotifications = useCallback(async () => {
    if (!user?._id && !user?.userId) return;
    
    try {
      const userId = user._id || user.userId;
      const storedNotifications = await storageService.get(`vaye_notifications_${userId}`);
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications).map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }));
        setNotifications(parsed);
      }
      
      console.log('📱 [NOTIFICATION_CONTEXT] Notifications initialized from storage');
    } catch (error) {
      console.error('❌ [NOTIFICATION_CONTEXT] Error initializing notifications:', error);
      setNotifications([]);
    }
  }, [user?._id, user?.userId]);

  // Save notifications to local storage
  useEffect(() => {
    const saveNotifications = async () => {
      if (notifications.length > 0 && (user?._id || user?.userId)) {
        try {
          const userId = user._id || user.userId;
          const notificationsToStore = notifications.slice(0, 50);
          await storageService.setJSON(`vaye_notifications_${userId}`, notificationsToStore);
        } catch (error) {
          console.error('❌ [NOTIFICATION_CONTEXT] Error saving notifications:', error);
        }
      }
    };
    
    saveNotifications();
  }, [notifications, user?._id, user?.userId]);

  // Add notification function
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'time'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      time: 'Just now',
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      console.log('📱 [NOTIFICATION_CONTEXT] Added notification, total count:', updated.length);
      return updated;
    });
    
    // Show toast for high priority notifications
    if (notification.priority === 'high') {
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    }
  }, []);

  // Socket event handlers
  const handleDriverNotification = useCallback((data: any) => {
    console.log('🔔 [NOTIFICATION_CONTEXT] Received driver notification:', data);
    
    addNotification({
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      read: false,
      priority: data.priority || 'medium',
      actionable: data.actionable || false,
      metadata: data.metadata || {}
    });
  }, [addNotification]);

  const handleRideRequest = useCallback((data: any) => {
    console.log('🚗 [NOTIFICATION_CONTEXT] Received ride request:', data);
    
    addNotification({
      type: 'request',
      title: `New ${data.type === 'delivery' ? 'Delivery' : 'Ride'} Request`,
      message: `Pickup from ${data.pickup?.address || 'Unknown location'}${data.estimatedEarnings ? ` - Est. R${data.estimatedEarnings.toFixed(2)}` : ''}`,
      read: false,
      priority: 'high',
      actionable: true,
      metadata: {
        rideId: data._id || data.rideId,
        tripType: data.type || 'ride',
        pickup: data.pickup,
        dropoff: data.dropoff,
        estimatedEarnings: data.estimatedEarnings
      },
    });
  }, [addNotification]);

  const handleTripUpdate = useCallback((data: any) => {
    const statusMessages = {
      accepted: 'Trip accepted - Navigate to pickup',
      started: 'Trip started - En route to destination',
      completed: `Trip completed! Earned R${data.earnings?.toFixed(2) || '0.00'}`,
      cancelled: 'Trip was cancelled',
    };
    
    const message = statusMessages[data.status as keyof typeof statusMessages] || `Trip status: ${data.status}`;
    
    addNotification({
      type: data.type || 'ride',
      title: 'Trip Update',
      message,
      read: false,
      priority: data.status === 'completed' ? 'medium' : 'low',
      actionable: false,
      metadata: {
        rideId: data._id,
        earnings: data.earnings,
        tripType: data.type,
      },
    });
  }, [addNotification]);

  const handleDeliveryAssigned = useCallback((data: any) => {
    addNotification({
      type: 'delivery',
      title: 'New Delivery Assigned',
      message: `Pickup from ${data.merchant?.name || 'Unknown merchant'}`,
      read: false,
      priority: 'high',
      actionable: true,
      metadata: {
        rideId: data._id,
        tripType: 'delivery',
      },
    });
  }, [addNotification]);

  // Initialize socket listeners
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔌 [NOTIFICATION_CONTEXT] Setting up socket listeners');
      
      initializeNotifications();
      initializeFCMToken();
      
      // Register socket event listeners
      driverSocketService.addEventListener('driverNotification', handleDriverNotification);
      driverSocketService.addEventListener('nearbyRequest', handleRideRequest);
      driverSocketService.addEventListener('tripStatusUpdate', handleTripUpdate);
      driverSocketService.addEventListener('deliveryAssigned', handleDeliveryAssigned);
      
      return () => {
        // Cleanup socket listeners
        driverSocketService.removeEventListener('driverNotification', handleDriverNotification);
        driverSocketService.removeEventListener('nearbyRequest', handleRideRequest);
        driverSocketService.removeEventListener('tripStatusUpdate', handleTripUpdate);
        driverSocketService.removeEventListener('deliveryAssigned', handleDeliveryAssigned);
        
        console.log('🔌 [NOTIFICATION_CONTEXT] Socket listeners cleaned up');
      };
    }
  }, [isAuthenticated, initializeNotifications, initializeFCMToken, handleDriverNotification, handleRideRequest, handleTripUpdate, handleDeliveryAssigned]);

  // Utility functions
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(async () => {
    setNotifications([]);
    if (user?._id || user?.userId) {
      const userId = user._id || user.userId;
      await storageService.remove(`vaye_notifications_${userId}`);
    }
  }, [user?._id, user?.userId]);

  const getNotificationById = useCallback((id: string) => {
    return notifications.find(notif => notif.id === id);
  }, [notifications]);

  // Calculate counts
  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => !n.read && n.priority === 'high').length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    highPriorityCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationById
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;