import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { toast } from "sonner";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { useHaptics } from "@/hooks/useHaptics";
import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useAuth } from "./AuthContext";
import { useDriverStatus } from "./DriverStatusContext";
import { 
  getNearbyRequests, 
  acceptRideRequest, 
  declineRideRequest, 
  updateRideStatus,
  cancelTrip as cancelTripAPI,
  getActiveRides,
  getDriverStats,
  RideRequest as ApiRideRequest,
  DriverStats 
} from "../services/requestService";
import { 
  getAvailableDeliveryJobs, 
  acceptDeliveryJob, 
  updateDeliveryStatus,
  getMyDeliveryRoute,
  confirmDelivery,
  DeliveryOrder,
  DeliveryRoute 
} from "../services/deliveryService";
import driverSocketService from "../services/DriverSocketService";

// Unified request interface for both rides and deliveries
interface UnifiedRequest {
  _id: string;
  type: 'ride' | 'delivery';
  
  // Common fields
  status: string;
  createdAt: string;
  estimatedPrice?: number;
  estimatedTotalDistance?: string;
  estimatedTotalDuration?: string;
  
  // Ride-specific fields
  rider?: {
    _id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    averageRating?: number;
    phoneNumber?: string;
    profilePicture?: string;
  };
  pickup?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  dropoff?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  
  // Delivery-specific fields
  orderId?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  deliveryFee?: number;
  totalAmount?: number;
  deliveryPin?: string;
}

interface TripContextType {
  // Current state
  activeTrip: UnifiedRequest | null;
  currentRequest: UnifiedRequest | null;
  deliveryRoute: DeliveryRoute | null;
  
  // Driver stats
  driverStats: DriverStats | null;
  
  // Available requests
  nearbyRequests: UnifiedRequest[];
  availableJobs: DeliveryOrder[];
  
  // Actions
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string, reason?: string) => Promise<void>;
  updateTripStatus: (status: string, rating?: number) => Promise<void>;
  cancelTrip: (reason?: string) => Promise<void>;
  confirmDeliveryWithPin: (pin: string) => Promise<void>;
  
  // Data fetching
  refreshNearbyRequests: () => Promise<void>;
  refreshAvailableJobs: () => Promise<void>;
  refreshDriverStats: () => Promise<void>;
  refreshActiveData: () => Promise<void>;
  
  // State management
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  clearActiveTrip: () => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const { user, token, isAuthenticated } = useAuth();
  const { isOnline, isAvailable } = useDriverStatus();
  
  // State management
  const [activeTrip, setActiveTrip] = useState<UnifiedRequest | null>(null);
  const [currentRequest, setCurrentRequest] = useState<UnifiedRequest | null>(null);
  const [deliveryRoute, setDeliveryRoute] = useState<DeliveryRoute | null>(null);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [nearbyRequests, setNearbyRequests] = useState<UnifiedRequest[]>([]);
  const [availableJobs, setAvailableJobs] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { scheduleNotification } = useLocalNotifications();
  const { impact, notification: hapticNotification } = useHaptics();

  // Convert API ride request to unified format
  const convertRideToUnified = (ride: any): UnifiedRequest => {
    // Handle new API format with passengers and stops
    if (ride.passengers && ride.stops && ride.requestType === 'ride') {
      const passenger = ride.passengers[0]; // Use first passenger
      const pickup = ride.stops[0];
      const dropoff = ride.stops[1] || ride.stops[0]; // Use second stop or fallback to first

      return {
        _id: ride._id,
        type: 'ride',
        status: ride.status || 'pending',
        createdAt: ride.createdAt || new Date().toISOString(),
        estimatedPrice: parseFloat(ride.estimatedPrice) || 0,
        estimatedTotalDistance: ride.estimatedTotalDistance,
        estimatedTotalDuration: ride.estimatedTotalDuration,
        rider: {
          _id: passenger.id,
          fullName: passenger.name,
          firstName: passenger.name.split(' ')[0] || passenger.name,
          lastName: passenger.name.split(' ').slice(1).join(' ') || '',
          averageRating: passenger.rating || 4.5,
          phoneNumber: passenger.phoneNumber,
        },
        pickup: {
          address: pickup.location,
          coordinates: { lat: 0, lng: 0 }, // API doesn't provide coordinates
        },
        dropoff: {
          address: dropoff.location,
          coordinates: { lat: 0, lng: 0 }, // API doesn't provide coordinates
        },
      };
    }

    // Handle accepted ride response format (after acceptance)
    if (ride.pickup && ride.dropoff && ride.pickup.location && ride.dropoff.location) {
      console.log('🔄 Converting accepted ride format, incoming status:', ride.status);
      const finalStatus = ride.status || 'accepted';
      console.log('📋 Final status being set:', finalStatus);
      return {
        _id: ride._id,
        type: 'ride',
        status: finalStatus, // Use the actual status from API
        createdAt: ride.createdAt || new Date().toISOString(),
        estimatedPrice: ride.price || ride.estimatedPrice || 0,
        estimatedTotalDistance: ride.distance ? `${ride.distance} km` : undefined,
        estimatedTotalDuration: ride.duration ? `${ride.duration} min` : undefined,
        rider: typeof ride.rider === 'string' ? {
          _id: ride.rider,
          fullName: 'Rider', // We don't have full rider data in accepted response
          firstName: 'Rider',
          lastName: '',
          averageRating: 4.5,
        } : ride.rider,
        pickup: {
          address: ride.pickup.address,
          coordinates: ride.pickup.location.coordinates ? {
            lat: ride.pickup.location.coordinates[1], // MongoDB GeoJSON format [lng, lat]
            lng: ride.pickup.location.coordinates[0],
          } : { lat: 0, lng: 0 },
        },
        dropoff: {
          address: ride.dropoff.address,
          coordinates: ride.dropoff.location.coordinates ? {
            lat: ride.dropoff.location.coordinates[1], // MongoDB GeoJSON format [lng, lat]
            lng: ride.dropoff.location.coordinates[0],
          } : { lat: 0, lng: 0 },
        },
      };
    }

    // Handle original API format
    return {
      _id: ride._id,
      type: 'ride',
      status: ride.status,
      createdAt: ride.createdAt,
      estimatedPrice: ride.estimatedPrice,
      estimatedTotalDistance: ride.estimatedTotalDistance,
      estimatedTotalDuration: ride.estimatedTotalDuration,
      rider: ride.rider,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
    };
  };

  // Convert API delivery to unified format
  const convertDeliveryToUnified = (delivery: DeliveryOrder): UnifiedRequest => ({
    _id: delivery._id,
    type: 'delivery',
    status: delivery.status,
    createdAt: delivery.createdAt,
    orderId: delivery.orderId,
    customer: delivery.customer,
    pickup: delivery.pickup,
    dropoff: delivery.dropoff,
    items: delivery.items,
    deliveryFee: delivery.deliveryFee,
    totalAmount: delivery.totalAmount,
    deliveryPin: delivery.deliveryPin,
    estimatedPrice: delivery.deliveryFee,
    estimatedTotalDistance: delivery.estimatedDistance,
    estimatedTotalDuration: delivery.estimatedDuration,
  });

  // Refresh nearby requests
  const refreshNearbyRequests = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    if (activeTrip) {
      console.log("🚫 Skipping nearby requests refresh - active trip in progress:", activeTrip._id);
      return; // Don't fetch nearby requests when there's an active trip
    }

    try {
      setIsLoading(true);
      const requests = await getNearbyRequests(token);
      console.log("🔍 Raw API requests received:", requests);
      
      const unifiedRequests = requests.map(convertRideToUnified);
      console.log("🔄 Converted unified requests:", unifiedRequests);
      
      setNearbyRequests(unifiedRequests);
      
      // If we have requests and no current request is being shown, show the first one
      if (unifiedRequests.length > 0 && !currentRequest) {
        console.log("🎯 Setting first nearby request as current:", unifiedRequests[0]);
        setCurrentRequest(unifiedRequests[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch nearby requests:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, currentRequest, activeTrip]);

  // Refresh available delivery jobs
  const refreshAvailableJobs = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      setIsLoading(true);
      const jobs = await getAvailableDeliveryJobs(token);
      setAvailableJobs(jobs);
    } catch (err: any) {
      console.error("Failed to fetch available jobs:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  // Refresh driver stats
  const refreshDriverStats = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      const stats = await getDriverStats(token);
      setDriverStats(stats);
    } catch (err: any) {
      console.error("Failed to fetch driver stats:", err.message);
    }
  }, [isAuthenticated, token]);

  // Refresh active trip/delivery data
  const refreshActiveData = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      // Only try to fetch active rides if we don't already have an active trip
      if (!activeTrip) {
        const activeRides = await getActiveRides(token);
        if (activeRides.length > 0) {
          setActiveTrip(convertRideToUnified(activeRides[0]));
        }
      }

      // Check for active delivery route
      const route = await getMyDeliveryRoute(token);
      if (route) {
        setDeliveryRoute(route);
        // Set first active delivery as current trip
        const activeDelivery = route.deliveries.find(d => 
          d.status === 'accepted' || d.status === 'pickup_confirmed' || d.status === 'in_transit'
        );
        if (activeDelivery) {
          setActiveTrip(convertDeliveryToUnified(activeDelivery));
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch active data:", err.message);
    }
  }, [isAuthenticated, token, activeTrip]);

  // Accept a request (ride or delivery)
  const acceptRequest = useCallback(async (requestId: string) => {
    console.log("🚀 TripContext: acceptRequest called for:", requestId);
    if (!isAuthenticated || !token) {
      console.log("❌ TripContext: Not authenticated or no token");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🎯 TripContext: Starting accept process...");
      hapticNotification(NotificationType.Success);

      // Find the request to determine type
      const request = nearbyRequests.find(r => r._id === requestId) ||
                    availableJobs.find(j => j._id === requestId);

      console.log("🔍 TripContext: Found request:", request);
      if (!request) {
        throw new Error("Request not found");
      }

      if (request.type === 'ride') {
        console.log("🚗 TripContext: Accepting ride request...");
        const response = await acceptRideRequest(requestId, token);
        console.log("📡 TripContext: Ride accept response:", response);
        console.log("🔍 TripContext: response.success:", response.success);
        console.log("🔍 TripContext: response.ride exists:", !!response.ride);
        console.log("🔍 TripContext: response.message:", response.message);
        
        // Check both success flag and message for successful acceptance
        if ((response.success && response.ride) || (response.message && response.ride)) {
          const unifiedTrip = convertRideToUnified(response.ride);
          console.log("✅ TripContext: Setting activeTrip:", unifiedTrip);
          setActiveTrip(unifiedTrip);
          toast.success("Ride accepted! Navigate to pickup location");
        } else {
          console.error("❌ TripContext: Failed condition check. Response:", JSON.stringify(response, null, 2));
          throw new Error("Invalid response format from accept API");
        }
      } else {
        const response = await acceptDeliveryJob(requestId, token);
        if (response.success && response.delivery) {
          setActiveTrip(convertDeliveryToUnified(response.delivery));
          toast.success("Delivery accepted! Navigate to pickup location");
        }
      }

      // Remove from current request list  
      console.log("🧹 TripContext: Clearing currentRequest...");
      setCurrentRequest(null);
      
      // Show next available request if any
      const remainingRequests = nearbyRequests.filter(r => r._id !== requestId);
      if (remainingRequests.length > 0) {
        console.log("🎯 TripContext: Showing next available request:", remainingRequests[0]);
        setCurrentRequest(remainingRequests[0]);
      } else {
        console.log("📭 TripContext: No more requests available");
      }
      
    } catch (err: any) {
      console.error("❌ TripContext: Failed to accept request:", err.message, err);
      setError(err.message);
      toast.error(err.message || "Failed to accept request");
    } finally {
      console.log("🏁 TripContext: Accept request process completed");
      setIsLoading(false);
    }
  }, [isAuthenticated, token, nearbyRequests, availableJobs, refreshActiveData, hapticNotification]);

  // Decline a request
  const declineRequest = useCallback(async (requestId: string, reason?: string) => {
    if (!isAuthenticated || !token) return;

    try {
      impact(ImpactStyle.Light);

      const request = nearbyRequests.find(r => r._id === requestId);
      if (request && request.type === 'ride') {
        await declineRideRequest(requestId, token, reason);
      }

      setCurrentRequest(null);
      toast.info("Request declined");
      
      // Show next available request if any
      const remainingRequests = nearbyRequests.filter(r => r._id !== requestId);
      if (remainingRequests.length > 0) {
        console.log("🎯 Showing next available request after decline:", remainingRequests[0]);
        setCurrentRequest(remainingRequests[0]);
      }
    } catch (err: any) {
      console.error("Failed to decline request:", err.message);
      setError(err.message);
    }
  }, [isAuthenticated, token, nearbyRequests, impact]);

  // Update trip status
  const updateTripStatus = useCallback(async (status: string, rating?: number) => {
    console.log('🔄 TripContext: updateTripStatus called with:', status);
    console.log('📋 Current activeTrip:', activeTrip);
    console.log('🔐 Auth state:', { isAuthenticated, hasToken: !!token });
    
    if (!isAuthenticated || !token || !activeTrip) {
      console.warn('⚠️ TripContext: Cannot update status - missing auth or activeTrip');
      return;
    }

    try {
      setIsLoading(true);
      hapticNotification(NotificationType.Success);

      if (activeTrip.type === 'ride') {
        console.log('🚗 TripContext: Updating ride status to:', status);
        const response = await updateRideStatus(activeTrip._id, status, token, undefined, rating);
        console.log('📡 TripContext: Ride status update response:', response);
        console.log('🔍 TripContext: Response success:', response.success);
        console.log('🔍 TripContext: Response has ride:', !!response.ride);
        console.log('🔍 TripContext: Response structure:', Object.keys(response));
        // Check for both success field OR message + ride (API returns message + ride, not success + ride)
        if ((response.success && response.ride) || (response.message && response.ride)) {
          console.log('✅ TripContext: Setting updated trip data:', response.ride);
          console.log('🔍 TripContext: Raw ride status from API:', response.ride.status);
          const convertedTrip = convertRideToUnified(response.ride);
          console.log('🔄 TripContext: Converted trip data:', convertedTrip);
          console.log('🔍 TripContext: Converted trip status:', convertedTrip.status);
          
          // Force a state update with a new object reference
          setActiveTrip(prev => {
            console.log('🔄 TripContext: Previous activeTrip:', prev);
            console.log('🆕 TripContext: New activeTrip:', convertedTrip);
            console.log('🔀 TripContext: Status change:', prev?.status, '->', convertedTrip.status);
            return { ...convertedTrip }; // Create new object to ensure React detects change
          });
          
          // Verify the state update worked
          setTimeout(() => {
            console.log('⏰ TripContext: Checking activeTrip after state update...');
          }, 100);
        }
      } else {
        console.log('📦 TripContext: Updating delivery status to:', status);
        const response = await updateDeliveryStatus(activeTrip._id, status, token);
        console.log('📡 TripContext: Delivery status update response:', response);
        if (response.success && response.delivery) {
          console.log('✅ TripContext: Setting updated delivery data:', response.delivery);
          setActiveTrip(convertDeliveryToUnified(response.delivery));
        }
      }

      // Handle status-specific actions
      console.log('🎯 TripContext: Processing status action for:', status);
      switch (status) {
        case 'arrived':
          console.log('📍 TripContext: Handling arrived status');
          toast.success("Marked as arrived. Waiting for customer");
          break;
        case 'started':
        case 'in_progress':
        case 'pickup_confirmed':
          console.log('🚀 TripContext: Handling started/in_progress status');
          toast.success("Trip/delivery started! Navigate to destination");
          break;
        case 'completed':
        case 'delivered':
          console.log('🏁 TripContext: Handling completed status');
          const earnings = activeTrip.estimatedPrice || activeTrip.deliveryFee || 0;
          toast.success(`Trip completed! You earned R${earnings.toFixed(2)}`);
          setActiveTrip(null);
          await refreshDriverStats();
          break;
        case 'cancelled':
          console.log('❌ TripContext: Handling cancelled status');
          toast.info('Trip has been cancelled');
          setActiveTrip(null);
          await refreshDriverStats();
          await refreshActiveData();
          break;
        default:
          console.warn('❓ TripContext: Unknown status:', status);
      }

    } catch (err: any) {
      console.error("Failed to update status:", err.message);
      setError(err.message);
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, activeTrip, hapticNotification, refreshDriverStats]);

  // Confirm delivery with PIN
  const confirmDeliveryWithPin = useCallback(async (pin: string) => {
    if (!isAuthenticated || !token || !activeTrip || activeTrip.type !== 'delivery') return;

    try {
      setIsLoading(true);
      const response = await confirmDelivery(activeTrip._id, pin, token);
      
      if (response.success) {
        hapticNotification(NotificationType.Success);
        const earnings = activeTrip.deliveryFee || activeTrip.totalAmount || 0;
        toast.success(`Delivery confirmed! You earned R${earnings.toFixed(2)}`);
        setActiveTrip(null);
        await refreshDriverStats();
        await refreshActiveData();
      }
    } catch (err: any) {
      console.error("Failed to confirm delivery:", err.message);
      setError(err.message);
      toast.error(err.message || "Invalid delivery PIN");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, activeTrip, hapticNotification, refreshDriverStats, refreshActiveData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cancel active trip
  const cancelTrip = useCallback(async (reason?: string) => {
    console.log('🚫 TripContext: cancelTrip called with reason:', reason);
    if (!isAuthenticated || !token || !activeTrip) {
      console.log('❌ TripContext: Cannot cancel - missing auth, token, or active trip');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📡 TripContext: Calling API to cancel trip:', activeTrip._id);
      
      const response = await cancelTripAPI(activeTrip._id, token, reason);
      console.log('✅ TripContext: Trip cancelled successfully:', response);
      
      hapticNotification(NotificationType.Success);
      toast.success(response.message || 'Trip cancelled successfully');
      
      // Clear the active trip
      setActiveTrip(null);
      
      // Refresh data
      await refreshDriverStats();
      await refreshActiveData();
      
    } catch (err: any) {
      console.error('❌ TripContext: Failed to cancel trip:', err.message);
      setError(err.message);
      toast.error(err.message || 'Failed to cancel trip');
      throw err; // Re-throw so the UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, activeTrip, hapticNotification, refreshDriverStats, refreshActiveData]);

  // Clear active trip (for cancellations or resets)
  const clearActiveTrip = useCallback(() => {
    console.log('🗑️ TripContext: Clearing active trip');
    setActiveTrip(null);
  }, []);

  // Initialize data when user comes online
  useEffect(() => {
    if (isAuthenticated && isOnline && isAvailable) {
      refreshDriverStats();
      refreshActiveData();
      
      if (user?.role === 'delivery' || user?.userType === 'delivery') {
        refreshAvailableJobs();
      } else {
        refreshNearbyRequests();
      }
    }
  }, [isAuthenticated, isOnline, isAvailable, user?.role, user?.userType, refreshDriverStats, refreshActiveData, refreshAvailableJobs, refreshNearbyRequests]);

  // Set up polling for nearby requests when driver is online and available (but not on an active trip)
  useEffect(() => {
    if (!isAuthenticated || !isOnline || !isAvailable || !token) return;
    if (user?.role === 'delivery' || user?.userType === 'delivery') return; // Only for ride drivers
    if (activeTrip) {
      console.log("🚫 Not polling for nearby requests - active trip in progress:", activeTrip._id);
      return; // Stop polling when there's an active trip
    }

    console.log("🔄 Starting nearby requests polling");
    
    // Poll every 10 seconds for new requests
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling for nearby requests...");
      refreshNearbyRequests();
    }, 10000);

    return () => {
      console.log("🛑 Stopping nearby requests polling");
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, isOnline, isAvailable, token, user?.role, user?.userType, activeTrip, refreshNearbyRequests]);

  // Set up Socket.io event listeners for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    const handleNearbyRequest = (data: any) => {
      console.log("🚗 New nearby request received:", data);
      
      let unifiedRequest: UnifiedRequest;
      if (data.type === 'delivery') {
        unifiedRequest = convertDeliveryToUnified(data);
      } else {
        unifiedRequest = convertRideToUnified(data);
      }
      
      setCurrentRequest(unifiedRequest);
      
      // Haptic feedback and notification
      impact(ImpactStyle.Heavy);
      scheduleNotification({
        title: data.type === 'delivery' ? "New Delivery Request!" : "New Ride Request!",
        body: "You have 20 seconds to accept",
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'default',
        actionTypeId: data.type === 'delivery' ? 'DELIVERY_REQUEST' : 'RIDE_REQUEST',
        extra: {
          requestId: data._id,
          type: data.type,
        },
      });
      
      toast(data.type === 'delivery' ? "New Delivery Request!" : "New Ride Request!", {
        description: "You have 20 seconds to accept",
      });
    };

    const handleRequestCancelled = (data: any) => {
      console.log("❌ Request cancelled:", data);
      if (currentRequest && currentRequest._id === data.requestId) {
        setCurrentRequest(null);
        toast.error("Request was cancelled");
      }
    };

    const handleTripStatusUpdate = (data: any) => {
      console.log("📍 Trip status update:", data);
      if (activeTrip && activeTrip._id === data.tripId) {
        refreshActiveData();
      }
    };

    const handleDeliveryAssigned = (data: any) => {
      console.log("📦 Delivery assigned:", data);
      refreshActiveData();
      toast.success("New delivery assigned to your route!");
    };

    // Register event listeners
    driverSocketService.addEventListener('nearbyRequest', handleNearbyRequest);
    driverSocketService.addEventListener('requestCancelled', handleRequestCancelled);
    driverSocketService.addEventListener('tripStatusUpdate', handleTripStatusUpdate);
    driverSocketService.addEventListener('deliveryAssigned', handleDeliveryAssigned);

    return () => {
      driverSocketService.removeEventListener('nearbyRequest', handleNearbyRequest);
      driverSocketService.removeEventListener('requestCancelled', handleRequestCancelled);
      driverSocketService.removeEventListener('tripStatusUpdate', handleTripStatusUpdate);
      driverSocketService.removeEventListener('deliveryAssigned', handleDeliveryAssigned);
    };
  }, [isAuthenticated, isOnline, currentRequest, activeTrip, impact, scheduleNotification, refreshActiveData]);

  // Auto-decline current request after 20 seconds
  useEffect(() => {
    if (currentRequest) {
      const timeout = setTimeout(() => {
        setCurrentRequest(null);
        toast.error("Request expired");
      }, 20000);

      return () => clearTimeout(timeout);
    }
  }, [currentRequest]);

  return (
    <TripContext.Provider
      value={{
        activeTrip,
        currentRequest,
        deliveryRoute,
        driverStats,
        nearbyRequests,
        availableJobs,
        acceptRequest,
        declineRequest,
        updateTripStatus,
        cancelTrip,
        confirmDeliveryWithPin,
        clearActiveTrip,
        refreshNearbyRequests,
        refreshAvailableJobs,
        refreshDriverStats,
        refreshActiveData,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error("useTrip must be used within a TripProvider");
  }
  return context;
};
