import { useState, useEffect } from "react";
import { Menu, Bell, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RideRequestModal from "@/components/dashboard/RideRequestModal";
import OnlineToggle from "@/components/dashboard/OnlineToggle";
import BottomNav from "@/components/dashboard/BottomNav";
import DynamicIsland from "@/components/dashboard/DynamicIsland";
import EarningsModal from "@/components/dashboard/EarningsModal";
import { useTrip } from "@/contexts/TripContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNetwork } from "@/hooks/useNetwork";

const Dashboard = () => {
  const { 
    isOnline, 
    setIsOnline, 
    rideRequest, 
    acceptRide, 
    declineRide, 
    activeTrip,
    todayEarnings,
    todayRides,
  } = useTrip();
  
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [notificationCount] = useState(3);
  
  // Native hooks
  const { currentPosition, isTracking, startTracking, stopTracking, getCurrentPosition } = useGeolocation();
  const { isRegistered: pushEnabled } = usePushNotifications((data) => {
    console.log("Push notification received:", data);
  });
  const { isOnline: networkOnline } = useNetwork();

  const handleGoOnline = async () => {
    if (!networkOnline) {
      toast.error("No internet connection");
      return;
    }
    
    await startTracking();
    setIsOnline(true);
    toast.success("You're now online and will receive ride requests");
  };

  const handleGoOffline = async () => {
    await stopTracking();
    setIsOnline(false);
    toast.info("You're now offline");
  };

  const handleAcceptRide = () => {
    acceptRide();
    navigate("/active-trip");
  };

  const handleDeclineRide = () => {
    declineRide();
  };

  const handleGetLocation = async () => {
    const position = await getCurrentPosition();
    if (position) {
      toast.success("Location updated");
    }
  };

  // Show network status changes
  useEffect(() => {
    if (!networkOnline && isOnline) {
      toast.error("Connection lost. Please check your internet.");
    }
  }, [networkOnline, isOnline]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-vaye-navy"
          onClick={() => setShowMenu(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-vaye-navy rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl text-vaye-navy">Vaye</span>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-vaye-navy relative"
          onClick={() => navigate("/notifications")}
        >
          <Bell className="w-6 h-6" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-destructive text-xs">
              {notificationCount}
            </Badge>
          )}
        </Button>
      </header>

      {/* Dynamic Island */}
      {isOnline && (
        <div onClick={() => setShowEarningsModal(true)}>
          <DynamicIsland earnings={todayEarnings} />
        </div>
      )}

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
          onClick={handleGetLocation}
          className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-card shadow-lg hover:bg-card"
        >
          <MapPin className={`w-6 h-6 ${currentPosition ? "text-primary" : ""}`} />
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
      {rideRequest && (
        <RideRequestModal
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
        />
      )}

      {/* Earnings Modal */}
      {showEarningsModal && (
        <EarningsModal
          onClose={() => setShowEarningsModal(false)}
          todayEarnings={todayEarnings}
          todayRides={todayRides}
        />
      )}

      {/* Menu Sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/dashboard");
              }}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/trips");
              }}
            >
              Trip History
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/earnings");
              }}
            >
              Earnings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/profile");
              }}
            >
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/settings");
              }}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setShowMenu(false);
                navigate("/notifications");
              }}
            >
              Notifications
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
