import { useState, useEffect } from "react";
import { Phone, MessageCircle, Navigation as NavigationIcon, MapPin, Car, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverStatus } from "@/contexts/DriverStatusContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { useBackgroundGeolocation } from "@/hooks/useBackgroundGeolocation";
import { useHaptics } from "@/hooks/useHaptics";
import { ImpactStyle } from "@capacitor/haptics";
import TripMap from "@/components/map/TripMap";

const ActiveTrip = () => {
  const { user } = useAuth();
  const { currentLocation } = useDriverStatus();
  const { 
    activeTrip, 
    updateTripStatus, 
    confirmDeliveryWithPin,
    cancelTrip,
    clearActiveTrip,
    isLoading,
    error,
    clearError 
  } = useTrip();
  
  // Debug logging for ActiveTrip component
  useEffect(() => {
    console.log("🚗 ActiveTrip component mounted");
    console.log("📋 ActiveTrip data:", activeTrip);
    console.log("⏳ Loading state:", isLoading);
  }, []);
  
  useEffect(() => {
    console.log("🔄 ActiveTrip data changed:", activeTrip);
  }, [activeTrip]);
  
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeliveryPinDialog, setShowDeliveryPinDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [deliveryPin, setDeliveryPin] = useState("");
  const [watcherId, setWatcherId] = useState<string | null>(null);
  
  const { startBackgroundTracking, stopBackgroundTracking, lastLocation } = useBackgroundGeolocation(
    (location) => {
      console.log("Background location update:", location);
      // Location updates are handled by DriverSocketService via TripContext
    }
  );
  const { impact } = useHaptics();

  const isRide = activeTrip?.type === 'ride';
  const isDelivery = activeTrip?.type === 'delivery';

  // Start background tracking when trip starts
  useEffect(() => {
    if (activeTrip?.status === "in_progress" && !watcherId) {
      startBackgroundTracking().then((id) => {
        if (id) {
          setWatcherId(id);
        }
      });
    }

    return () => {
      if (watcherId) {
        stopBackgroundTracking(watcherId);
      }
    };
  }, [activeTrip?.status, watcherId, startBackgroundTracking, stopBackgroundTracking]);

  // Initialize trip status when activeTrip is first loaded
  useEffect(() => {
    if (activeTrip && activeTrip._id && activeTrip.status === 'accepted') {
      console.log("🚀 Initializing trip workflow for accepted ride:", activeTrip._id);
      // Trip is already in 'accepted' status, no need to update
      // updateTripStatus('accepted');
      toast.success("Navigate to pickup location");
    }
  }, [activeTrip?._id, activeTrip?.status, updateTripStatus]);

  // Clear error on mount
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Navigate to dashboard if no active trip (with delay to avoid race condition)
  useEffect(() => {
    if (!activeTrip && !isLoading) {
      console.log("⚠️  ActiveTrip: No activeTrip found, navigating back to dashboard");
      // Add a small delay to avoid race condition on initial mount
      const timer = setTimeout(() => {
        if (!activeTrip) {
          navigate("/dashboard");
        }
      }, 500); // 500ms delay to allow context to populate
      
      return () => clearTimeout(timer);
    }
  }, [activeTrip, navigate, isLoading]);

  if (!activeTrip) {
    return null;
  }

  const handleNavigate = () => {
    impact(ImpactStyle.Light);
    const isEnRoute = activeTrip.status === "accepted" || activeTrip.status === "arrived";
    const destination = isEnRoute ? activeTrip.pickup : activeTrip.dropoff;
    
    if (destination?.coordinates) {
      const { lat, lng } = destination.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, "_blank");
      toast.success("Opening navigation...");
    } else {
      toast.error("Navigation coordinates not available");
    }
  };

  const handleCall = () => {
    const phone = isRide 
      ? activeTrip.rider?.phoneNumber 
      : activeTrip.customer?.phone;
      
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error("Phone number not available");
    }
  };

  const handleMessage = () => {
    toast.info("Chat feature coming soon");
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateTripStatus(newStatus);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };





  const handleCancel = async () => {
    try {
      console.log('🛑 ActiveTrip: handleCancel called');
      
      // Use the new cancelTrip function from TripContext
      await cancelTrip();
      
      setShowCancelDialog(false);
      
      // Navigate back to dashboard
      navigate("/dashboard", { replace: true });
      
    } catch (error: any) {
      console.error('❌ ActiveTrip: Failed to cancel trip:', error);
      
      // If backend cancellation fails, still clear local state and navigate
      clearActiveTrip();
      setShowCancelDialog(false);
      navigate("/dashboard", { replace: true });
      
      toast.error(error.message || 'Failed to cancel trip on server', {
        description: 'Trip cleared locally. You can accept new requests.'
      });
    }
  };

  const getStatusText = () => {
    switch (activeTrip.status) {
      case "accepted":
        return isDelivery ? "On the way to pickup" : "On the way to pickup";
      case "arrived":
        return isDelivery ? "Arrived at pickup location" : "Arrived at pickup";
      case "pickup_confirmed":
        return "Order picked up - heading to delivery";
      case "in_progress":
      case "in_transit":
        return isDelivery ? "Delivering order" : "Trip in progress";
      case "arrived_at_destination":
        return isDelivery ? "Arrived at delivery location" : "Arrived at destination";
      case "delivered":
      case "completed":
        return isDelivery ? "Order delivered" : "Trip completed";
      default:
        return isDelivery ? "Active Delivery" : "Active Trip";
    }
  };

  const getProgressPercentage = () => {
    switch (activeTrip.status) {
      case "accepted":
        return 25;
      case "arrived":
        return 50;
      case "pickup_confirmed":
        return 65;
      case "in_progress":
      case "in_transit":
        return 75;
      case "arrived_at_destination":
        return 90;
      case "delivered":
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  const getCustomerName = () => {
    if (isRide && activeTrip.rider) {
      return activeTrip.rider.fullName || `${activeTrip.rider.firstName} ${activeTrip.rider.lastName}`;
    }
    if (isDelivery && activeTrip.customer) {
      return activeTrip.customer.name;
    }
    return "Customer";
  };

  const getCustomerRating = () => {
    return isRide && activeTrip.rider?.averageRating ? activeTrip.rider.averageRating : 4.5;
  };

  const getCustomerPhone = () => {
    if (isRide && activeTrip.rider?.phoneNumber) {
      return activeTrip.rider.phoneNumber;
    }
    if (isDelivery && activeTrip.customer?.phone) {
      return activeTrip.customer.phone;
    }
    return null;
  };

  const getEarnings = () => {
    if (isRide) {
      return activeTrip.estimatedPrice || 0;
    }
    if (isDelivery) {
      return activeTrip.deliveryFee || activeTrip.totalAmount || 0;
    }
    return 0;
  };

  const getDistanceAndDuration = () => {
    return {
      distance: activeTrip.estimatedTotalDistance || "Unknown",
      duration: activeTrip.estimatedTotalDuration || "Unknown"
    };
  };

  // Complete ride handler
  const handleCompleteRide = async () => {
    if (!activeTrip) return;
    
    try {
      await updateTripStatus('completed', rating);
      setShowCompleteDialog(false);
      navigate('/dashboard'); // Return to dashboard after completion
    } catch (error) {
      console.error('Error completing ride:', error);
    }
  };

  // Confirm delivery with PIN handler
  const handleConfirmDelivery = async () => {
    if (!activeTrip || !deliveryPin.trim()) return;
    
    try {
      await confirmDeliveryWithPin(deliveryPin);
      setShowDeliveryPinDialog(false);
      setDeliveryPin('');
      navigate('/dashboard'); // Return to dashboard after delivery
    } catch (error) {
      console.error('Error confirming delivery:', error);
    }
  };

  const { distance, duration } = getDistanceAndDuration();

  // Handler for completion request from TripMap/SwipeableBottomSheet
  const handleCompletionRequest = () => {
    if (activeTrip?.type === 'ride') {
      setShowCompleteDialog(true);
    } else {
      setShowDeliveryPinDialog(true);
    }
  };

  return (
    <div className="dashboard-layout">)
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Updating...</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-destructive/90 backdrop-blur rounded-lg p-3">
          <p className="text-destructive-foreground text-sm">{error}</p>
        </div>
      )}

      {/* Trip Map - Now handles its own layout similar to Dashboard */}
      <TripMap 
        activeTrip={activeTrip}
        onTripUpdate={(updatedTrip) => {
          console.log('Trip updated from map:', updatedTrip);
          // Handle trip updates if needed
        }}
        onBack={() => navigate('/dashboard')}
        onStatusUpdate={(status) => {
          console.log('🎯 Auto-updating trip status from map:', status);
          updateTripStatus(status);
        }}
        onRequestCompletion={handleCompletionRequest}
      />

      {/* SwipeableBottomSheet is now handled inside TripMap component */}

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this trip? This may affect your completion rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continue Trip</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-white">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Ride Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Rate your passenger</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">You earned</p>
                  <p className="text-2xl font-bold text-success">R{getEarnings().toFixed(2)}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompleteRide} 
              className="bg-success text-white"
              disabled={isLoading}
            >
              {isLoading ? "Completing..." : "Complete & Rate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery PIN Dialog */}
      <AlertDialog open={showDeliveryPinDialog} onOpenChange={setShowDeliveryPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the delivery PIN provided by the customer to confirm successful delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delivery-pin">Delivery PIN</Label>
            <Input
              id="delivery-pin"
              type="text"
              placeholder="Enter PIN"
              value={deliveryPin}
              onChange={(e) => setDeliveryPin(e.target.value)}
              maxLength={6}
              className="mt-2"
            />
            <div className="bg-muted rounded-lg p-4 text-center mt-4">
              <p className="text-sm text-muted-foreground mb-1">You earned</p>
              <p className="text-2xl font-bold text-success">R{getEarnings().toFixed(2)}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelivery} 
              className="bg-success text-white"
              disabled={isLoading || !deliveryPin.trim()}
            >
              {isLoading ? "Confirming..." : "Confirm Delivery"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveTrip;
