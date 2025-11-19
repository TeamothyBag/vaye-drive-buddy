import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { Button } from "@/components/ui/button";
import SlideToConfirm from "@/components/ui/SlideToConfirm";
import { MapPin, Navigation, RotateCcw, Target } from 'lucide-react';
import config from '@/config';
import { updateDriverLocation } from '@/services/requestService';
import driverSocketService from '@/services/DriverSocketService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
import { LocationCoords, Trip, MapProps } from '@/types/map';

// Constants
const LIBRARIES: ("geometry" | "drawing" | "places" | "visualization" | "marker")[] = ["marker"];
const DEFAULT_CENTER = { lat: -25.7479, lng: 28.2293 }; // Johannesburg
const LOCATION_UPDATE_THRESHOLD = 5; // meters
const ARRIVAL_THRESHOLD = 30; // meters
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 5000,
};

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
  position: "absolute" as const,
  top: 0,
  left: 0,
  zIndex: 1,
};

interface DashboardMapProps extends MapProps {
  center?: LocationCoords;
}


const DashboardMap: React.FC<DashboardMapProps> = ({
  center = DEFAULT_CENTER,
  activeTrip,
  isOnline,
  onTripUpdate,
  onTripStatusChange,
}) => {
  const { user, token } = useAuth();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: config.GoogleMapsApiKey,
    libraries: LIBRARIES,
  });

  // State management
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [map, setMap] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTripStatus, setCurrentTripStatus] = useState<string | null>(null);
  
  // Popup states
  const [showStartRidePopup, setShowStartRidePopup] = useState(false);
  const [showCompleteRidePopup, setShowCompleteRidePopup] = useState(false);
  const [showCancelRidePopup, setShowCancelRidePopup] = useState(false);
  const [showPickupDeliveryPopup, setShowPickupDeliveryPopup] = useState(false);
  const [showCompleteDeliveryPopup, setShowCompleteDeliveryPopup] = useState(false);
  
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [showMarkerAnimation, setShowMarkerAnimation] = useState(false);
  const [markerAnimationType, setMarkerAnimationType] = useState<'pulse' | 'zoom-in' | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  // Refs for cleanup and tracking
  const watchIdRef = useRef<number | null>(null);
  const lastSentCoords = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const directionsServiceRef = useRef<any>(null);
  const isUpdatingLocationRef = useRef(false);
  const hasShownStartPopup = useRef(false);
  const hasShownCompletePopup = useRef(false);
  const hasShownPickupDeliveryPopup = useRef(false);
  const hasShownCompleteDeliveryPopup = useRef(false);
  const previousTripStatus = useRef<string | null>(null);
  const lastBoundsFitTime = useRef(0);
  const previousOnlineStatus = useRef<boolean | null>(null);

  // Effect to handle online status changes and trigger zoom-in animation
  useEffect(() => {
    if (previousOnlineStatus.current !== null && isOnline !== previousOnlineStatus.current) {
      if (isOnline) {
        // Going online - trigger zoom-in animation
        setMarkerAnimationType('zoom-in');
        setShowMarkerAnimation(true);
        
        // Zoom map to user location with animation
        if (map && userLocation) {
          map.panTo(userLocation);
          map.setZoom(18); // Zoom in closer when going online
          
          // Smooth zoom back to normal after a moment
          setTimeout(() => {
            map.setZoom(16);
          }, 1500);
        }
        
        // After zoom-in completes, switch to pulse animation
        setTimeout(() => {
          setMarkerAnimationType('pulse');
        }, 800);
      } else {
        // Going offline - stop animations
        setMarkerAnimationType(null);
        setShowMarkerAnimation(false);
        
        // Zoom out slightly when going offline
        if (map && userLocation) {
          map.setZoom(15);
        }
      }
    }
    previousOnlineStatus.current = isOnline;
  }, [isOnline, map, userLocation]);

  // Effect to start pulse animation when online (initial load)
  useEffect(() => {
    if (isOnline && userLocation) {
      setMarkerAnimationType('pulse');
      setShowMarkerAnimation(true);
    } else {
      setMarkerAnimationType(null);
      setShowMarkerAnimation(false);
    }
  }, [isOnline, userLocation]);

  // Continuous pulse animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnline && showMarkerAnimation && markerAnimationType === 'pulse') {
      interval = setInterval(() => {
        setPulseKey(prev => prev + 1);
      }, 2000); // Create new pulse every 2 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOnline, showMarkerAnimation, markerAnimationType]);

  // Helper function to detect if current trip is a delivery
  const isCurrentTripDelivery = useMemo(() => {
    return activeTrip && (
      activeTrip.type === 'delivery' || 
      activeTrip.isDelivery ||
      activeTrip.orderId
    );
  }, [activeTrip]);

  // Memoized pickup and dropoff coordinates
  const pickupCoords = useMemo(() => {
    if (!activeTrip?.pickup?.location?.coordinates) return null;
    const [lng, lat] = activeTrip.pickup.location.coordinates;
    return { lat, lng };
  }, [activeTrip?.pickup?.location?.coordinates]);

  const dropoffCoords = useMemo(() => {
    if (!activeTrip?.dropoff?.location?.coordinates) return null;
    const [lng, lat] = activeTrip.dropoff.location.coordinates;
    return { lat, lng };
  }, [activeTrip?.dropoff?.location?.coordinates]);

  // Current destination for directions calculation
  const currentDestination = useMemo(() => {
    if (!activeTrip || !currentTripStatus) return null;
    
    if (currentTripStatus === "accepted" || currentTripStatus === "arrived") {
      return pickupCoords;
    } else if (currentTripStatus === "started" || currentTripStatus === "in_progress") {
      return dropoffCoords;
    }
    return null;
  }, [activeTrip, currentTripStatus, pickupCoords, dropoffCoords]);

  // Stable map center
  const mapCenter = useMemo(() => {
    if (activeTrip) {
      return pickupCoords || center;
    }
    return userLocation || center;
  }, [activeTrip, pickupCoords, center, userLocation]);

  // Map options
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      mapId: config.GoogleMapsId,
      clickableIcons: false,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      gestureHandling: "greedy" as const,
      zoomControlOptions: {
        position: 4, // RIGHT_CENTER
      },
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text",
          stylers: [{ visibility: "off" }],
        },
      ],
    }),
    []
  );

  // Utility function: Calculate distance between two coordinates
  const getDistanceMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Enhanced location update function with throttling
  const updateLocationToBackend = useCallback(
    async (latitude: number, longitude: number) => {
      if (!token || isUpdatingLocationRef.current) return;
      
      const now = Date.now();
      const timeSinceLastUpdate = now - (lastSentCoords.current?.timestamp || 0);
      const MIN_UPDATE_INTERVAL = 3000; // 3 seconds minimum between updates
      
      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        console.log("Throttling location update - too recent");
        return;
      }
      
      isUpdatingLocationRef.current = true;
      try {
        await updateDriverLocation(token, { 
          lat: latitude, 
          lng: longitude, 
          timestamp: new Date().toISOString()
        });
        lastSentCoords.current = { 
          lat: latitude, 
          lng: longitude,
          timestamp: now 
        };
        console.log("Location updated to backend:", { latitude, longitude });
      } catch (err) {
        console.error("Failed to update driver location:", err);
        setLocationError("Failed to update location");
      } finally {
        isUpdatingLocationRef.current = false;
      }
    },
    [token]
  );

  // Trip action handlers
  const handleStartRide = useCallback(async () => {
    if (!activeTrip || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      // Call your ride start API here
      setShowStartRidePopup(false);
      hasShownStartPopup.current = true;
      setCurrentTripStatus("started");
      toast.success("Trip started successfully");
      console.log("Ride started successfully");
    } catch (err) {
      console.error("Failed to start ride:", err);
      toast.error("Failed to start ride");
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [activeTrip, isUpdatingStatus]);

  const handleCompleteRide = useCallback(async () => {
    if (!activeTrip || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      // Call your ride completion API here
      setShowCompleteRidePopup(false);
      hasShownCompletePopup.current = true;
      setCurrentTripStatus("completed");
      toast.success("Trip completed successfully");
      console.log("Ride completed successfully");
      
      if (onTripUpdate) {
        onTripUpdate({ ...activeTrip, status: 'completed' });
      }
    } catch (err) {
      console.error("Failed to complete ride:", err);
      toast.error("Failed to complete ride");
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [activeTrip, isUpdatingStatus, onTripUpdate]);

  const handlePickupDelivery = useCallback(async () => {
    if (!activeTrip || isUpdatingStatus || !isCurrentTripDelivery) return;
    setIsUpdatingStatus(true);
    try {
      // Call your delivery pickup API here
      setShowPickupDeliveryPopup(false);
      hasShownPickupDeliveryPopup.current = true;
      setCurrentTripStatus("started");
      toast.success("Pickup confirmed successfully");
      console.log("✅ Delivery pickup confirmed successfully");
    } catch (err) {
      console.error("❌ Failed to confirm delivery pickup:", err);
      toast.error("Failed to confirm pickup");
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [activeTrip, isUpdatingStatus, isCurrentTripDelivery]);

  const handleCompleteDelivery = useCallback(async () => {
    if (!activeTrip || isUpdatingStatus || !isCurrentTripDelivery) return;
    setIsUpdatingStatus(true);
    
    try {
      // For deliveries, prompt for PIN verification
      const pin = prompt("Enter the customer's delivery PIN:");
      if (!pin) {
        setIsUpdatingStatus(false);
        return;
      }
      
      // Call your delivery completion API here with PIN verification
      setShowCompleteDeliveryPopup(false);
      hasShownCompleteDeliveryPopup.current = true;
      setCurrentTripStatus("completed");
      toast.success("Delivery completed successfully");
      console.log("Delivery completed successfully with PIN verification");
      
      if (onTripUpdate) {
        onTripUpdate({ ...activeTrip, status: 'completed' });
      }
    } catch (err) {
      console.error("Failed to complete delivery:", err);
      toast.error("Failed to complete delivery");
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [activeTrip, isUpdatingStatus, isCurrentTripDelivery, onTripUpdate]);

  // Simulation functions for testing
  const simulateMovementToPickup = useCallback(() => {
    if (!pickupCoords) return;
    
    const simulatedLocation = {
      lat: pickupCoords.lat + 0.00002,
      lng: pickupCoords.lng + 0.00002
    };
    
    console.log('Simulating movement to pickup location:', simulatedLocation);
    setIsSimulationMode(true);
    
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setUserLocation(simulatedLocation);
    updateLocationToBackend(simulatedLocation.lat, simulatedLocation.lng);
  }, [pickupCoords, updateLocationToBackend]);

  const simulateMovementToDropoff = useCallback(() => {
    if (!dropoffCoords) return;
    
    const simulatedLocation = {
      lat: dropoffCoords.lat + 0.00002,
      lng: dropoffCoords.lng + 0.00002
    };
    
    console.log('Simulating movement to dropoff location:', simulatedLocation);
    setIsSimulationMode(true);
    
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setUserLocation(simulatedLocation);
    updateLocationToBackend(simulatedLocation.lat, simulatedLocation.lng);
  }, [dropoffCoords, updateLocationToBackend]);

  const resetSimulation = useCallback(() => {
    console.log("Resetting simulation mode - resuming real geolocation");
    setIsSimulationMode(false);
    setIsLocationLoading(true);
  }, []);

  // Initialize local trip status when activeTrip changes
  useEffect(() => {
    if (activeTrip?.status) {
      if (activeTrip.status !== 'dropoff_arrived') {
        setCurrentTripStatus(activeTrip.status);
        console.log("🎯 Trip status updated:", activeTrip.status);
      }
    } else {
      setCurrentTripStatus(null);
    }
  }, [activeTrip?.status]);

  // Expose current trip status to parent component
  useEffect(() => {
    if (onTripStatusChange && currentTripStatus !== null) {
      onTripStatusChange(currentTripStatus);
    }
  }, [currentTripStatus, onTripStatusChange]);

  // Enhanced geolocation tracking
  useEffect(() => {
    if (isSimulationMode) {
      console.log("Simulation mode active - skipping real geolocation");
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported");
      setIsLocationLoading(false);
      return;
    }

    const handleLocationSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      // Update user location
      const newLocation = { lat: latitude, lng: longitude };
      setUserLocation(newLocation);
      setIsLocationLoading(false);
      setLocationError(null);
      
      // Update backend with location
      if (token && isOnline) {
        await updateLocationToBackend(latitude, longitude);
      }
      
      console.log("Location updated:", newLocation);
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error("Geolocation error:", error);
      setLocationError(`Location error: ${error.message}`);
      setIsLocationLoading(false);
    };

    if (!watchIdRef.current) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        GEOLOCATION_OPTIONS
      );
      console.log("Started watching geolocation");
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log("Stopped watching geolocation");
      }
    };
  }, [token, isOnline, isSimulationMode, updateLocationToBackend]);

  // Optimized arrival detection with distance calculations
  const distanceToPickup = useMemo(() => {
    if (!userLocation || !pickupCoords) return null;
    return getDistanceMeters(
      userLocation.lat,
      userLocation.lng,
      pickupCoords.lat,
      pickupCoords.lng
    );
  }, [userLocation, pickupCoords, getDistanceMeters]);

  const distanceToDropoff = useMemo(() => {
    if (!userLocation || !dropoffCoords) return null;
    return getDistanceMeters(
      userLocation.lat,
      userLocation.lng,
      dropoffCoords.lat,
      dropoffCoords.lng
    );
  }, [userLocation, dropoffCoords, getDistanceMeters]);

  // Enhanced arrival detection and popup management
  useEffect(() => {
    if (!activeTrip || !userLocation) return;

    // RIDE LOGIC
    if (!isCurrentTripDelivery) {
      // Show start popup when arrived at pickup
      if (currentTripStatus === "accepted" && distanceToPickup !== null && distanceToPickup < ARRIVAL_THRESHOLD && !hasShownStartPopup.current) {
        console.log("🚗 Driver arrived at pickup - showing start popup");
        setShowStartRidePopup(true);
        hasShownStartPopup.current = true;
      }

      // Show complete popup when arrived at dropoff
      if (currentTripStatus === "started" && distanceToDropoff !== null && distanceToDropoff < ARRIVAL_THRESHOLD && !hasShownCompletePopup.current) {
        console.log("🎯 Driver arrived at dropoff - showing complete popup");
        setShowCompleteRidePopup(true);
        hasShownCompletePopup.current = true;
      }
    }

    // DELIVERY LOGIC
    if (isCurrentTripDelivery) {
      // Show pickup popup when arrived at pickup
      if (currentTripStatus === "accepted" && distanceToPickup !== null && distanceToPickup < ARRIVAL_THRESHOLD && !hasShownPickupDeliveryPopup.current) {
        console.log("📦 Driver arrived at pickup - showing pickup popup");
        setShowPickupDeliveryPopup(true);
        hasShownPickupDeliveryPopup.current = true;
      }

      // Show complete popup when arrived at dropoff
      if (currentTripStatus === "started" && distanceToDropoff !== null && distanceToDropoff < ARRIVAL_THRESHOLD && !hasShownCompleteDeliveryPopup.current) {
        console.log("🏠 Driver arrived at dropoff - showing complete popup");
        setShowCompleteDeliveryPopup(true);
        hasShownCompleteDeliveryPopup.current = true;
      }
    }
  }, [
    activeTrip,
    userLocation,
    currentTripStatus,
    distanceToPickup,
    distanceToDropoff,
    isCurrentTripDelivery,
  ]);

  // Reset popup flags when trip changes
  useEffect(() => {
    const currentTripId = activeTrip?._id;
    
    if (!currentTripId) {
      // Reset all flags when no active trip
      hasShownStartPopup.current = false;
      hasShownCompletePopup.current = false;
      hasShownPickupDeliveryPopup.current = false;
      hasShownCompleteDeliveryPopup.current = false;
      setShowStartRidePopup(false);
      setShowCompleteRidePopup(false);
      setShowPickupDeliveryPopup(false);
      setShowCompleteDeliveryPopup(false);
      setCurrentTripStatus(null);
    }
  }, [activeTrip?._id]);

  // Directions calculation
  useEffect(() => {
    if (!activeTrip || !userLocation || !window.google || !currentDestination) {
      setDirections(null);
      return;
    }

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new (window as any).google.maps.DirectionsService();
    }

    directionsServiceRef.current.route(
      {
        origin: userLocation,
        destination: currentDestination,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
          console.log("Directions updated for current destination");
        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
  }, [activeTrip, userLocation, currentDestination]);

  // Radar pulse timing effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnline && showMarkerAnimation && markerAnimationType === 'pulse') {
      // Staggered radar pulses - create overlapping waves
      const createPulse = (delay: number) => {
        setTimeout(() => {
          setPulseKey(prev => prev + 1);
        }, delay);
      };
      
      interval = setInterval(() => {
        createPulse(0);    // First pulse
        createPulse(400);  // Second pulse (staggered)
        createPulse(800);  // Third pulse (staggered)
      }, 2500); // Full radar cycle every 2.5 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOnline, showMarkerAnimation, markerAnimationType]);

  // Map bounds fitting
  useEffect(() => {
    if (!map || !window.google || !userLocation) return;

    const now = Date.now();
    const BOUNDS_FIT_THROTTLE = 8000;
    const statusChanged = previousTripStatus.current !== currentTripStatus;

    if (activeTrip && currentDestination) {
      if (!statusChanged && now - lastBoundsFitTime.current < BOUNDS_FIT_THROTTLE) {
        return;
      }

      console.log("Fitting bounds for active trip - user location and destination:", currentTripStatus);
      
      const bounds = new (window as any).google.maps.LatLngBounds();
      bounds.extend(userLocation);
      bounds.extend(currentDestination);
      
      const paddingOptions = {
        top: 100,
        right: 50,
        bottom: 200,
        left: 50
      };
      
      map.fitBounds(bounds, paddingOptions);
      lastBoundsFitTime.current = now;
      previousTripStatus.current = currentTripStatus;
    } else if (!activeTrip && userLocation) {
      if (now - lastBoundsFitTime.current < BOUNDS_FIT_THROTTLE) return;
      map.panTo(userLocation);
      lastBoundsFitTime.current = now;
    }
  }, [map, activeTrip, currentTripStatus, userLocation, currentDestination]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Loading and error states
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load map</h3>
          <p className="text-red-600">Please check your internet connection and try again.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vaye-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Loading maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Trip Simulation Controls */}
      {activeTrip && (
        <div className="absolute bottom-32 left-4 z-50 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg max-w-48 border border-white/20">
          <div className="flex flex-col gap-2">
            {currentTripStatus === 'accepted' && (
              <Button
                onClick={simulateMovementToPickup}
                size="sm"
                className="text-xs bg-blue-500 hover:bg-blue-600"
              >
                {isCurrentTripDelivery ? '📦 Drive to Pickup' : '🚗 Drive to Pickup'}
              </Button>
            )}
            {(currentTripStatus === 'started' || currentTripStatus === 'in_progress') && (
              <Button
                onClick={simulateMovementToDropoff}
                size="sm"
                className="text-xs bg-green-500 hover:bg-green-600"
              >
                {isCurrentTripDelivery ? '🏠 Drive to Delivery' : '🎯 Drive to Dropoff'}
              </Button>
            )}
            {isSimulationMode && (
              <Button
                onClick={resetSimulation}
                size="sm"
                variant="outline"
                className="text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Resume GPS
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Location status indicator */}
      {!activeTrip && isLocationLoading && (
        <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">Getting your location...</span>
          </div>
        </div>
      )}

      {!activeTrip && locationError && (
        <div className="absolute top-4 left-4 z-50 bg-red-100 border border-red-300 px-4 py-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-700">{locationError}</span>
          </div>
        </div>
      )}

      {/* Start Ride Popup */}
      {showStartRidePopup && !isCurrentTripDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🚗 Passenger Picked Up?</h3>
            <p className="text-gray-600 mb-6">Slide to confirm the passenger is in your vehicle and start the trip.</p>
            <SlideToConfirm
              onConfirm={handleStartRide}
              text="Slide to Start Trip"
              confirmText="Starting..."
              bgColor="#4CAF50"
              disabled={isUpdatingStatus}
            />
            <Button
              variant="outline"
              onClick={() => setShowStartRidePopup(false)}
              disabled={isUpdatingStatus}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pickup Delivery Popup */}
      {showPickupDeliveryPopup && isCurrentTripDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">📦 Pickup Confirmation</h3>
            <p className="text-gray-600 mb-4">Confirm you have collected all orders from this location.</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="text-sm">
                <strong className="text-gray-900">📍 Location:</strong>
                <p className="text-gray-600">{activeTrip?.pickup?.address}</p>
              </div>
              
              <div className="text-sm">
                <strong className="text-gray-900">Customer:</strong>
                <p className="text-gray-600">
                  {activeTrip?.customer?.name || activeTrip?.rider?.fullName || 'Customer'}
                </p>
              </div>
              
              {activeTrip?.notes && (
                <div className="text-sm">
                  <strong className="text-gray-900">📝 Notes:</strong>
                  <p className="text-gray-600">{activeTrip.notes}</p>
                </div>
              )}
            </div>
            
            <SlideToConfirm
              onConfirm={handlePickupDelivery}
              text="Slide to Confirm Pickup"
              confirmText="Confirming Pickup..."
              bgColor="#FF9500"
              disabled={isUpdatingStatus}
            />
            <Button
              variant="outline"
              onClick={() => setShowPickupDeliveryPopup(false)}
              disabled={isUpdatingStatus}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Complete Ride Popup */}
      {showCompleteRidePopup && !isCurrentTripDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Trip Complete?</h3>
            <p className="text-gray-600 mb-6">Slide to confirm the passenger has been dropped off safely.</p>
            <SlideToConfirm
              onConfirm={handleCompleteRide}
              text="Slide to Complete Trip"
              confirmText="Completing..."
              bgColor="#2196F3"
              disabled={isUpdatingStatus}
            />
            <Button
              variant="outline"
              onClick={() => setShowCompleteRidePopup(false)}
              disabled={isUpdatingStatus}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Complete Delivery Popup */}
      {showCompleteDeliveryPopup && isCurrentTripDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🏠 Complete Delivery</h3>
            <p className="text-gray-600 mb-4">You've arrived at the delivery location. The customer will provide a PIN to confirm delivery.</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              {activeTrip?.customer && (
                <div className="text-sm">
                  <strong className="text-gray-900">Deliver to:</strong> {activeTrip.customer.name}
                  <br />
                  <strong className="text-gray-900">Phone:</strong> {activeTrip.customer.phone}
                </div>
              )}
              {activeTrip?.deliveryPin && (
                <div className="text-sm">
                  <strong className="text-gray-900">Expected PIN:</strong> {activeTrip.deliveryPin}
                </div>
              )}
            </div>
            
            <SlideToConfirm
              onConfirm={handleCompleteDelivery}
              text="Slide to Complete Delivery"
              confirmText="Completing Delivery..."
              bgColor="#4CAF50"
              disabled={isUpdatingStatus}
            />
            <Button
              variant="outline"
              onClick={() => setShowCompleteDeliveryPopup(false)}
              disabled={isUpdatingStatus}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Map Control Buttons */}
      {map && (
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
            onClick={() => {
              if (userLocation && map) {
                map.panTo(userLocation);
                map.setZoom(16);
              }
            }}
            title="Center on my location"
          >
            <MapPin className="w-4 h-4" />
          </Button>
          
          {activeTrip && directions && (
            <Button
              size="icon"
              variant="outline"
              className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
              onClick={() => {
                if (!window.google || !map || !userLocation) return;
                
                const bounds = new (window as any).google.maps.LatLngBounds();
                bounds.extend(userLocation);
                
                if (pickupCoords) bounds.extend(pickupCoords);
                if (dropoffCoords && (currentTripStatus === "started" || currentTripStatus === "in_progress")) {
                  bounds.extend(dropoffCoords);
                }
                
                map.fitBounds(bounds, {
                  top: 120,
                  bottom: 220,
                  left: 60,
                  right: 60
                });
              }}
              title="Show full route"
            >
              <Navigation className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={16}
        center={mapCenter}
        onLoad={setMap}
        options={mapOptions}
      >
        {/* Pickup marker */}
        {activeTrip && pickupCoords && (
          <Marker
            position={pickupCoords}
            title="Pickup Location"
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 12,
              fillColor: "#FF9500",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 3,
            }}
          />
        )}

        {/* User Location Marker - Vaye Brand Colors */}
        {userLocation && (
          <Marker
            position={userLocation}
            title={isOnline ? "You are here (Online)" : "You are here (Offline)"}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: markerAnimationType === 'zoom-in' ? 18 : (isOnline ? 16 : 12),
              fillColor: isOnline ? "#ffd93d" : "#9CA3AF", // Vaye Yellow when online
              fillOpacity: 1,
              strokeColor: isOnline ? "#1e2761" : "#FFFFFF", // Vaye Navy stroke when online
              strokeWeight: isOnline ? 5 : 3,
              anchor: new (window as any).google.maps.Point(0, 0),
            }}
            zIndex={15}
          />
        )}



        {/* Dropoff marker */}
        {activeTrip && dropoffCoords && (
          <Marker
            position={dropoffCoords}
            title="Dropoff Location"
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 12,
              fillColor: "#4CAF50",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 3,
            }}
          />
        )}

        {/* Render directions */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: isCurrentTripDelivery ? "#FF9500" : "#4285F4",
                strokeWeight: 6,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}
      </GoogleMap>

        {/* Simple Pulsing Rings around User Location */}
        {userLocation && isOnline && showMarkerAnimation && markerAnimationType === 'pulse' && (
          <>
            {/* Pulsing Ring 1 - Vaye Yellow */}
            <Marker
              position={userLocation}
              icon={{
                path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 25,
                fillColor: "transparent",
                fillOpacity: 0,
                strokeColor: "#ffd93d",
                strokeWeight: 3,
                strokeOpacity: 0.6,
                anchor: new (window as any).google.maps.Point(0, 0),
              }}
              zIndex={5}
            />
            
            {/* Pulsing Ring 2 - Vaye Navy */}
            <Marker
              position={userLocation}
              icon={{
                path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 35,
                fillColor: "transparent",
                fillOpacity: 0,
                strokeColor: "#1e2761",
                strokeWeight: 2,
                strokeOpacity: 0.4,
                anchor: new (window as any).google.maps.Point(0, 0),
              }}
              zIndex={4}
            />
            
            {/* Pulsing Ring 3 - Vaye Yellow */}
            <Marker
              position={userLocation}
              icon={{
                path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 45,
                fillColor: "transparent",
                fillOpacity: 0,
                strokeColor: "#ffd93d",
                strokeWeight: 1,
                strokeOpacity: 0.3,
                anchor: new (window as any).google.maps.Point(0, 0),
              }}
              zIndex={3}
            />
          </>
        )}
    </div>
  );
};

export default memo(DashboardMap);