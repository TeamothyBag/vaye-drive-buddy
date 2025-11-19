import { useState, useEffect } from "react";
import { Menu, Bell, MapPin, Car, Package, Loader2, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import RideRequestModal from "@/components/dashboard/RideRequestModal";
import OnlineToggle from "@/components/dashboard/OnlineToggle";
import BottomNav from "@/components/dashboard/BottomNav";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import EarningsModal from "@/components/dashboard/EarningsModal";
import DashboardMap from "@/components/map/DashboardMap";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/contexts/DriverStatusContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNetwork } from "@/hooks/useNetwork";
import NotificationBadge from "@/components/ui/notification-badge";
import { useNotifications } from "@/contexts/NotificationContext";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const {
    isOnline,
    isAvailable,
    setOnlineStatus,
    setAvailabilityStatus,
    startLocationSharing,
    stopLocationSharing,
    isLocationSharing,
    currentLocation,
    isLoading: driverStatusLoading,
    error: driverStatusError,
  } = useDriverStatus();
  
  const { 
    currentRequest,
    activeTrip,
    nearbyRequests,
    driverStats,
    acceptRequest,
    declineRequest,
    refreshDriverStats,
    refreshActiveData,
    refreshNearbyRequests,
    isLoading: tripLoading,
    error: tripError,
  } = useTrip();
  
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [currentTripStatus, setCurrentTripStatus] = useState<string | null>(null);
  
  // Notifications
  const { unreadCount, highPriorityCount } = useNotifications();
  
  // Native hooks
  const { currentPosition, isTracking, startTracking, stopTracking, getCurrentPosition } = useGeolocation();
  const { isRegistered: pushEnabled } = usePushNotifications((data) => {
    console.log("Push notification received:", data);
  });
  const { isOnline: networkOnline } = useNetwork();

  // Initialize data on mount
  useEffect(() => {
    if (user && isOnline && isAvailable) {
      refreshDriverStats();
      refreshActiveData();
    }
  }, [user, isOnline, isAvailable, refreshDriverStats, refreshActiveData]);

  const handleGoOnline = async () => {
    if (!networkOnline) {
      toast.error("No internet connection");
      return;
    }
    
    try {
      await startTracking();
      await setOnlineStatus(true);
      startLocationSharing();
      toast.success("You're now online and will receive requests");
    } catch (error: any) {
      toast.error(error.message || "Failed to go online");
    }
  };

  const handleGoOffline = async () => {
    try {
      await stopTracking();
      stopLocationSharing();
      await setOnlineStatus(false);
      toast.info("You're now offline");
    } catch (error: any) {
      toast.error(error.message || "Failed to go offline");
    }
  };

  const handleToggleAvailability = async () => {
    try {
      await setAvailabilityStatus(!isAvailable);
    } catch (error: any) {
      toast.error(error.message || "Failed to update availability");
    }
  };

  const handleAcceptRequest = async () => {
    console.log("🎯 Dashboard: handleAcceptRequest called", { currentRequest });
    if (!currentRequest) {
      console.log("❌ Dashboard: No currentRequest available");
      return;
    }
    
    try {
      console.log("🚀 Dashboard: About to call acceptRequest for:", currentRequest._id);
      await acceptRequest(currentRequest._id);
      console.log("✅ Dashboard: acceptRequest completed, activeTrip should be set now - useEffect will handle navigation");
      // Navigation is now handled by the useEffect when activeTrip is set
    } catch (error: any) {
      console.error("❌ Dashboard: Accept request failed:", error);
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async () => {
    if (!currentRequest) return;
    
    try {
      await declineRequest(currentRequest._id, "Driver declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request");
    }
  };

  const handleGetLocation = async () => {
    const position = await getCurrentPosition();
    if (position) {
      toast.success("Location updated");
    }
  };

  const handleTripUpdate = (updatedTrip: any) => {
    // Handle trip updates from the map component
    console.log("Trip updated from map:", updatedTrip);
    refreshActiveData(); // Refresh trip data
  };

  // Test function to manually check for nearby requests (development only)
  const testNearbyRequests = () => {
    console.log("🧪 Manual test: Checking for nearby requests...");
    refreshNearbyRequests();
  };

  const handleTripStatusChange = (status: string) => {
    setCurrentTripStatus(status);
    console.log("Trip status changed:", status);
  };

  // Convert UnifiedRequest to Trip format for map component
  const convertToTripFormat = (request: any) => {
    if (!request) return null;
    
    return {
      _id: request._id,
      status: request.status,
      type: request.type,
      isDelivery: request.type === 'delivery',
      pickup: {
        address: request.pickup?.address || '',
        location: {
          coordinates: request.pickup?.coordinates 
            ? [request.pickup.coordinates.lng, request.pickup.coordinates.lat] as [number, number]
            : [0, 0] as [number, number]
        }
      },
      dropoff: {
        address: request.dropoff?.address || '',
        location: {
          coordinates: request.dropoff?.coordinates
            ? [request.dropoff.coordinates.lng, request.dropoff.coordinates.lat] as [number, number]
            : [0, 0] as [number, number]
        }
      },
      customer: request.customer || undefined,
      rider: request.rider || undefined,
      deliveryPin: request.deliveryPin || undefined,
      orderId: request.orderId || undefined,
      notes: request.notes || undefined,
    };
  };

  // Navigate to ActiveTrip when activeTrip is set
  useEffect(() => {
    console.log("🔄 Dashboard useEffect triggered - activeTrip:", activeTrip);
    console.log("🔄 Dashboard useEffect - activeTrip._id:", activeTrip?._id);
    console.log("🔄 Dashboard useEffect - user:", !!user);
    
    if (activeTrip && activeTrip._id) {
      console.log("🚗 ActiveTrip detected, navigating to ActiveTrip page:", activeTrip);
      console.log("📍 Current location:", window.location.pathname);
      console.log("🔐 User authenticated:", !!user);
      console.log("🎯 ActiveTrip ID:", activeTrip._id);
      
      try {
        // Use replace instead of navigate to avoid back button issues
        navigate("/active-trip", { replace: true });
        console.log("✅ Navigation to /active-trip initiated with replace=true");
        
        // Check if navigation actually happened
        setTimeout(() => {
          console.log("📍 Location after navigation attempt:", window.location.pathname);
          if (window.location.pathname !== "/active-trip") {
            console.warn("⚠️  Navigation to /active-trip failed - still on:", window.location.pathname);
          }
        }, 200);
      } catch (error) {
        console.error("❌ Navigation failed:", error);
      }
    } else {
      console.log("⏸️  Dashboard useEffect - No activeTrip to navigate to");
    }
  }, [activeTrip, navigate, user]);

  // Show network status changes
  useEffect(() => {
    if (!networkOnline && isOnline) {
      toast.error("Connection lost. Please check your internet.");
    }
  }, [networkOnline, isOnline]);

  return (
    <div className="dashboard-layout">
      {/* Header - Fixed over map with safe area */}
      <header className="dashboard-overlay dashboard-overlay-top z-50 bg-gradient-yellow glass shadow-md px-4 py-4 flex items-center justify-between rounded-lg">
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
          <NotificationBadge 
            count={unreadCount}
            variant={highPriorityCount > 0 ? "red" : "red"}
            size="md"
            animate={true}
            className="animate-in"
          />
        </Button>
      </header>

      {/* Dynamic Island */}
      <DynamicIsland 
        stats={driverStats} 
        isVisible={isOnline && !activeTrip && driverStats !== null} 
      />

      {/* Loading Indicator */}
      {(driverStatusLoading || tripLoading) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 glass rounded-full px-4 py-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(driverStatusError || tripError) && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-destructive/90 backdrop-blur rounded-lg p-3">
          <p className="text-destructive-foreground text-sm">
            {driverStatusError || tripError}
          </p>
        </div>
      )}

      {/* Full Screen Map Container */}
      <div className="absolute inset-0 z-0">
        <DashboardMap
          activeTrip={convertToTripFormat(activeTrip)}
          isOnline={isOnline && isLocationSharing}
          onTripUpdate={handleTripUpdate}
          onTripStatusChange={handleTripStatusChange}
          center={currentLocation ? {
            lat: currentLocation.lat,
            lng: currentLocation.lng
          } : undefined}
        />
      </div>

      {/* Searching Banner - Shows when online and available without current request */}
      {isOnline && isAvailable && !currentRequest && !activeTrip && (
        <div className="absolute top-20 left-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-500">
          <div 
            className={`glass rounded-xl px-4 py-3 shadow-lg backdrop-blur-md border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${
              nearbyRequests?.length > 0 ? 'cursor-pointer hover:border-primary/40 transition-all duration-200' : ''
            }`}
            onClick={() => {
              if (nearbyRequests?.length > 0) {
                console.log("🎯 Manual trigger: Showing first nearby request");
                // This will trigger the TripContext to show the first request
                refreshNearbyRequests();
              }
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Search className="w-5 h-5 text-primary" />
                  <div className="absolute inset-0 animate-ping">
                    <Search className="w-5 h-5 text-primary/50" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {nearbyRequests?.length > 0 
                      ? `Found ${nearbyRequests.length} nearby request${nearbyRequests.length === 1 ? '' : 's'}`
                      : 'Searching for requests...'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {nearbyRequests?.length > 0 
                      ? 'Tap to see available rides' 
                      : 'Stay in this area for best results'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {nearbyRequests?.length > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {nearbyRequests.length}
                  </Badge>
                )}
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Role Indicator - Fixed over map with safe area */}
      <div className="dashboard-overlay dashboard-role-indicator z-40 glass rounded-full px-3 py-2">
        <div className="flex items-center gap-2">
          {user?.role === 'delivery' || user?.userType === 'delivery' ? (
            <Package className="w-4 h-4 text-orange-500" />
          ) : (
            <Car className="w-4 h-4 text-blue-500" />
          )}
          <span className="text-sm font-medium">
            {user?.role === 'delivery' || user?.userType === 'delivery' ? 'Delivery' : 'Ride'} Driver
          </span>
        </div>
      </div>

      {/* Status Controls - Overlay over map with safe area */}
      {!isOnline ? (
        <div className="dashboard-overlay dashboard-online-toggle">
          <OnlineToggle onGoOnline={handleGoOnline} />
        </div>
      ) : (
        <div className="dashboard-overlay dashboard-status-controls">
          <div className="glass rounded-full px-6 py-3 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="font-semibold text-success text-sm">Online</span>
              </div>
              
              <div className="h-4 w-px bg-border" />
              
              <Button
                variant={isAvailable ? "default" : "secondary"}
                size="sm"
                onClick={handleToggleAvailability}
                className="text-xs h-8 px-3"
                disabled={driverStatusLoading}
              >
                {driverStatusLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  isAvailable ? "Available" : "Busy"
                )}
              </Button>
              
              <div className="h-4 w-px bg-border" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoOffline}
                className="text-xs h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={driverStatusLoading}
              >
                {driverStatusLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Go Offline"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal (Rides & Deliveries) */}
      {currentRequest && (
        <RideRequestModal
          request={currentRequest}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
        />
      )}

      {/* Earnings Modal */}
      {showEarningsModal && driverStats && (
        <EarningsModal
          onClose={() => setShowEarningsModal(false)}
          todayEarnings={driverStats.todayEarnings || 0}
          todayRides={driverStats.todayTrips || 0}
        />
      )}

      {/* Menu Sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">Menu</SheetTitle>
          </SheetHeader>
          
          {/* User Profile Section */}
          {user && (
            <div className="mt-6 p-4 glass rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-vaye-gold via-amber-400 to-yellow-500 flex items-center justify-center">
                  <span className="text-vaye-navy font-semibold text-lg">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{user.name || 'Driver'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-yellow-600">★</span>
                      <span className="text-xs text-muted-foreground">
                        {user.rating ? user.rating.toFixed(1) : '0.0'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {user.totalTrips || 0} trips
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
            
            {/* Separator */}
            <div className="my-4 border-t border-border" />
            
            {/* Logout Button */}
            <Button
              variant="ghost"
              className="w-full justify-start text-base text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setShowMenu(false);
                setShowLogoutDialog(true);
              }}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to continue using the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutDialog(false);
                logout();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation - Fixed over map with safe area */}
      <div className="dashboard-overlay dashboard-overlay-bottom z-40">
        <BottomNav />
      </div>
    </div>
  );
};

export default Dashboard;
