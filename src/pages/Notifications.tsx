import { useState, useEffect, useCallback } from "react";
import { Bell, DollarSign, Navigation, AlertCircle, Trash2, MoreVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTrip } from "@/contexts/TripContext";
import { useNotifications } from "@/contexts/NotificationContext";
import driverSocketService from "@/services/DriverSocketService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { activeTrip, driverStats } = useTrip();
  const { 
    notifications, 
    unreadCount, 
    highPriorityCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();
  
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Update notification timestamps every minute (handled by context now)
  useEffect(() => {
    // This is now handled by the NotificationContext
    console.log('🔌 [NOTIFICATIONS] Using NotificationContext for all notification handling');
    setIsLoading(false);
  }, []);
  
  // Helper function to format relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case "ride":
      case "request":
        return Navigation;
      case "delivery":
        return Bell;
      case "earnings":
        return DollarSign;
      case "promotion":
        return Bell;
      case "cancellation":
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "ride":
      case "request":
        return "text-primary";
      case "delivery":
        return "text-orange-500";
      case "earnings":
        return "text-green-600";
      case "promotion":
        return "text-yellow-600";
      case "cancellation":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-400";
      case "medium":
        return "border-orange-400";
      default:
        return "border-blue-400";
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setShowClearAllDialog(false);
    toast.success("All notifications cleared");
    console.log('🗑️ Cleared all notifications');
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    toast.success("Notification deleted");
    console.log(`🗑️ Deleted notification ${id}`);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    toast.success("All notifications marked as read");
    console.log('📖 Marked all notifications as read');
  };
  
  const handleNotificationAction = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (!notification.actionable) {
      return;
    }
    
    console.log('🎯 Handling actionable notification:', notification.type, notification.metadata);
    
    // Handle actionable notifications
    if (notification.type === 'request') {
      // Navigate to dashboard where ride requests are handled
      navigate('/dashboard', { 
        state: { 
          highlightRequest: notification.metadata?.rideId,
          fromNotification: true 
        }
      });
      toast.info('Navigating to ride requests');
    } else if (notification.type === 'delivery') {
      // Navigate to dashboard for delivery requests
      navigate('/dashboard', { 
        state: { 
          highlightDelivery: notification.metadata?.rideId,
          fromNotification: true 
        }
      });
      toast.info('Navigating to delivery requests');
    } else if (notification.type === 'earnings') {
      // Navigate to earnings/statistics page
      navigate('/statistics');
      toast.info('Viewing your earnings');
    }
  };



  const headerAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {unreadCount > 0 && (
          <DropdownMenuItem onClick={handleMarkAllRead}>
            Mark all as read
          </DropdownMenuItem>
        )}
        {notifications.length > 0 && (
          <DropdownMenuItem 
            onClick={() => setShowClearAllDialog(true)}
            className="text-destructive"
          >
            Clear all notifications
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Notification Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <MobileLayout
        title="Notifications"
        showBackButton
        headerAction={headerAction}
      >

        {/* Connection Status */}
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${driverSocketService.isSocketConnected() ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <p className="text-sm font-medium text-green-700">
                  {driverSocketService.isSocketConnected() ? 'Connected to notification service' : 'Disconnected from notification service'}
                </p>
              </div>
              <div className="text-xs text-gray-600">
                Socket ID: {driverSocketService.getSocketId() || 'Not connected'}
                {user && (
                  <span className="ml-2">
                    | User ID: {user._id || user.userId}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔧 [DEBUG] Testing notification system...');
                console.log('🔧 [DEBUG] Socket connected:', driverSocketService.isSocketConnected());
                console.log('🔧 [DEBUG] User ID:', user?._id || user?.userId);
                
                // Test adding a notification manually
                addNotification({
                  type: 'system',
                  title: 'Test Notification',
                  message: 'This is a test notification to verify the system works',
                  read: false,
                  priority: 'medium',
                  actionable: false,
                });
                
                toast.success('Test notification added');
              }}
              className="text-xs mr-2"
            >
              Test Local
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔧 [DEBUG] Testing socket event emission...');
                
                // Test if we can emit to backend
                if (driverSocketService.isSocketConnected()) {
                  // Emit a test event to see if socket communication works
                  driverSocketService.emitSocketEvent('test-notification-request', {
                    userId: user?._id || user?.userId,
                    message: 'Test notification request from frontend'
                  });
                  
                  console.log('🔧 [DEBUG] Test event emitted to backend');
                  toast.info('Test event sent to backend');
                } else {
                  toast.error('Socket not connected');
                }
              }}
              className="text-xs mr-2"
            >
              Test Socket
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔧 [DEBUG] Requesting manual notification from backend...');
                
                if (driverSocketService.isSocketConnected()) {
                  // Request the backend to send a manual notification
                  driverSocketService.emitSocketEvent('manual-notification-request', {
                    userId: user?._id || user?.userId,
                    socketId: driverSocketService.getSocketId(),
                    message: 'Manual notification test',
                    timestamp: new Date()
                  });
                  
                  toast.info('Manual notification requested from backend');
                } else {
                  toast.error('Socket not connected');
                }
              }}
              className="text-xs"
            >
              Request Backend
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        {unreadCount > 0 && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium">
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              {highPriorityCount > 0 && (
                <span className="text-red-600 ml-2">
                  ({highPriorityCount} high priority)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                You're all caught up! Notifications for ride requests, earnings updates, and system messages will appear here.
              </p>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-sm mx-auto">
                <p className="font-medium mb-1">You'll receive notifications for:</p>
                <ul className="text-left space-y-1">
                  <li>• New ride and delivery requests</li>
                  <li>• Daily and weekly earnings updates</li>
                  <li>• Trip completion confirmations</li>
                  <li>• System updates and promotions</li>
                </ul>
              </div>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`glass rounded-2xl p-4 shadow-md transition-all cursor-pointer hover:shadow-lg ${
                    !notification.read 
                      ? `border-l-4 ${getPriorityColor(notification.priority)}` 
                      : ""
                  } ${notification.actionable ? 'hover:bg-primary/5' : ''}`}
                  onClick={() => handleNotificationAction(notification)}
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        !notification.read 
                          ? notification.priority === 'high' 
                            ? "bg-red-100 border border-red-200" 
                            : "bg-primary/10" 
                          : "bg-muted"
                      } flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${getColor(notification.type)}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={`font-semibold ${
                            !notification.read ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Badge 
                              className={`text-xs px-2 py-0 ${
                                notification.priority === 'high'
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {notification.priority === 'high' ? 'Urgent' : 'New'}
                            </Badge>
                          )}
                          {notification.actionable && (
                            <Badge variant="outline" className="text-xs">
                              Action
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {notification.time}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="h-8 px-2 text-destructive hover:text-destructive opacity-60 hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </MobileLayout>
      
      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-white">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Notifications;
