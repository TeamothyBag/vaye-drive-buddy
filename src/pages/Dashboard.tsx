import { useState, useEffect } from "react";
import { Menu, Bell, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RideRequestModal from "@/components/dashboard/RideRequestModal";
import OnlineToggle from "@/components/dashboard/OnlineToggle";
import BottomNav from "@/components/dashboard/BottomNav";
import DynamicIsland from "@/components/dashboard/DynamicIsland";

const Dashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [earnings, setEarnings] = useState(2847.50);
  const [notificationCount, setNotificationCount] = useState(3);

  // Simulate polling for ride requests when online
  useEffect(() => {
    if (isOnline && !showRideRequest) {
      const pollInterval = setInterval(() => {
        // Simulate 30% chance of getting a request
        if (Math.random() > 0.7) {
          setShowRideRequest(true);
        }
      }, 4000);

      return () => clearInterval(pollInterval);
    }
  }, [isOnline, showRideRequest]);

  const handleGoOnline = () => {
    setIsOnline(true);
  };

  const handleGoOffline = () => {
    setIsOnline(false);
  };

  const handleAcceptRide = () => {
    setShowRideRequest(false);
    // Navigate to active trip view
  };

  const handleDeclineRide = () => {
    setShowRideRequest(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-vaye-navy">
          <Menu className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-vaye-navy rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl text-vaye-navy">Vaye</span>
        </div>

        <Button variant="ghost" size="icon" className="text-vaye-navy relative">
          <Bell className="w-6 h-6" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-destructive text-xs">
              {notificationCount}
            </Badge>
          )}
        </Button>
      </header>

      {/* Dynamic Island */}
      {isOnline && <DynamicIsland earnings={earnings} />}

      {/* Map View */}
      <div className="flex-1 relative bg-muted">
        {/* Placeholder map */}
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Map View</p>
              <p className="text-sm text-muted-foreground">Google Maps integration will appear here</p>
            </div>
          </div>
        </div>

        {/* Current Location Button */}
        <Button
          size="icon"
          className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-card shadow-lg"
        >
          <MapPin className="w-6 h-6" />
        </Button>

        {/* Online/Offline Toggle */}
        {!isOnline ? (
          <OnlineToggle onGoOnline={handleGoOnline} />
        ) : (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              <span className="font-semibold text-success">Online</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoOffline}
                className="text-xs"
              >
                Go Offline
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ride Request Modal */}
      {showRideRequest && (
        <RideRequestModal
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
