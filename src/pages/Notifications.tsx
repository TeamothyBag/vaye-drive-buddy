import { useState } from "react";
import { Bell, DollarSign, Navigation, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/dashboard/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "ride" | "earnings" | "system" | "promotion";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "ride",
      title: "Trip Completed",
      message: "You earned R45.00 from your ride to Rosebank",
      time: "5 min ago",
      read: false,
    },
    {
      id: "2",
      type: "earnings",
      title: "Daily Earnings Summary",
      message: "You've earned R847.50 today with 12 completed rides",
      time: "1 hour ago",
      read: false,
    },
    {
      id: "3",
      type: "promotion",
      title: "Weekend Bonus!",
      message: "Earn 20% more on all rides this weekend",
      time: "3 hours ago",
      read: false,
    },
    {
      id: "4",
      type: "system",
      title: "Document Expiring Soon",
      message: "Your driver's license expires in 30 days",
      time: "Yesterday",
      read: true,
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case "ride":
        return Navigation;
      case "earnings":
        return DollarSign;
      case "promotion":
        return Bell;
      default:
        return AlertCircle;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "ride":
        return "text-primary";
      case "earnings":
        return "text-success";
      case "promotion":
        return "text-warning";
      default:
        return "text-info";
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    toast.success("Notification deleted");
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-vaye-navy"
          >
            ← Back
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-vaye-navy text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-vaye-navy">Notifications</h1>
            <p className="text-sm text-vaye-navy/70 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
        </div>
      </header>

      {/* Notifications List */}
      <div className="flex-1 p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No notifications</p>
            <p className="text-sm text-muted-foreground mt-2">
              You're all caught up!
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <div
                key={notification.id}
                className={`glass rounded-2xl p-4 shadow-md transition-all ${
                  !notification.read ? "border-l-4 border-primary" : ""
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      !notification.read ? "bg-primary/10" : "bg-muted"
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
                      {!notification.read && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0">
                          New
                        </Badge>
                      )}
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
                          deleteNotification(notification.id);
                        }}
                        className="h-8 px-2 text-destructive hover:text-destructive"
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

      <BottomNav />
    </div>
  );
};

export default Notifications;
