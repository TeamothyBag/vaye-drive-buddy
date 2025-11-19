import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { Button } from "@/components/ui/button";
import { Navigation, Target, MapPin, Car, Package, ArrowLeft, Loader2, Crosshair } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import SwipeableBottomSheet from './SwipeableBottomSheet';
import NavigationInstructions from './NavigationInstructions';

// KeepAwake fallback for when plugin is not available
const KeepAwakeFallback = {
  keepAwake: async () => {
    // Fallback implementation - prevent screen sleep via video element
    if (typeof document !== 'undefined') {
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.style.position = 'fixed';
      video.style.top = '-1000px';
      video.style.left = '-1000px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      
      // Create minimal video data
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const stream = canvas.captureStream();
      video.srcObject = stream;
      
      document.body.appendChild(video);
      await video.play().catch(() => {});
    }
  },
  allowSleep: async () => {
    // Remove any keep-awake video elements
    if (typeof document !== 'undefined') {
      const videos = document.querySelectorAll('video[muted][loop]');
      videos.forEach(video => {
        const videoElement = video as HTMLVideoElement;
        if (videoElement.style.top === '-1000px') {
          videoElement.remove();
        }
      });
    }
  }
};
import config from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTrip } from '@/contexts/TripContext';
import { cn } from '@/lib/utils';
import { useDriverStatus } from '@/contexts/DriverStatusContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toast } from 'sonner';
import { updateDriverLocation as updateDriverLocationAPI } from '@/services/requestService';

// Types
interface LocationCoords {
  lat: number;
  lng: number;
}

interface UnifiedRequest {
  _id: string;
  type: 'ride' | 'delivery';
  status: string;
  pickup?: {
    address: string;
    coordinates: LocationCoords;
  };
  dropoff?: {
    address: string;
    coordinates: LocationCoords;
  };
  rider?: {
    fullName: string;
  };
  customer?: {
    name: string;
  };
}

interface TripMapProps {
  activeTrip: UnifiedRequest;
  onTripUpdate?: (trip: UnifiedRequest) => void;
  onBack?: () => void;
  onStatusUpdate?: (status: string) => void;
  onRequestCompletion?: () => void; // Custom handler for completion request
}

// Utility function to calculate distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Custom marker creators for Vaye branding
const createDriverMarker = () => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: '#1e2761', // vaye-navy
  fillOpacity: 1,
  strokeColor: '#ffd93d', // vaye-yellow border
  strokeWeight: 3,
  scale: 12,
});

const createPickupMarker = () => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: '#ffd93d', // vaye-yellow
  fillOpacity: 1,
  strokeColor: '#1e2761', // vaye-navy border
  strokeWeight: 3,
  scale: 14,
});

const createDropoffMarker = () => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: '#ef4444', // Red for destination
  fillOpacity: 1,
  strokeColor: '#1e2761', // vaye-navy border
  strokeWeight: 3,
  scale: 14,
});

// Enhanced custom marker with icon overlay
const createCustomMarker = (color: string, strokeColor: string, icon?: string) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    // Draw outer circle (border)
    ctx.beginPath();
    ctx.arc(30, 30, 28, 0, 2 * Math.PI);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    
    // Draw inner circle
    ctx.beginPath();
    ctx.arc(30, 30, 22, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Add icon if provided
    if (icon) {
      ctx.fillStyle = strokeColor === '#1e2761' ? '#ffd93d' : '#1e2761';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 30, 30);
    }
    
    return canvas.toDataURL();
  } catch (error) {
    console.error('Error creating custom marker:', error);
    return null;
  }
};

  // Constants
const LIBRARIES: ("geometry" | "drawing" | "places" | "visualization" | "marker")[] = ["marker"];
const DEFAULT_CENTER = { lat: -25.7479, lng: 28.2293 }; // Johannesburg
const ARRIVAL_THRESHOLD = 30; // meters - main arrival detection
const CLOSE_THRESHOLD = 50; // meters - close proximity warning
const VERY_CLOSE_THRESHOLD = 15; // meters - very close, prepare for automation
const LOCATION_UPDATE_THRESHOLD = 8; // meters - minimum distance to update
const LOCATION_UPDATE_INTERVAL = 3000; // 3 seconds - minimum time between updates
const ROUTE_RECALC_THRESHOLD = 50; // meters - distance threshold for route recalculation
const ROUTE_RECALC_INTERVAL = 15000; // 15 seconds - minimum time between route calculations

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
};

// Memoized map options for performance
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  streetViewControl: false,
  gestureHandling: 'greedy' as const,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit",
      elementType: "labels", 
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#e8e8e8" }]
    }
  ]
};

const TripMap: React.FC<TripMapProps> = ({
  activeTrip,
  onTripUpdate,
  onBack,
  onStatusUpdate,
  onRequestCompletion,
}) => {
  const { user, token } = useAuth();
  const { cancelTrip } = useTrip();
  const { currentLocation } = useDriverStatus();
  const { 
    currentPosition, 
    isTracking, 
    startTracking, 
    stopTracking, 
    getCurrentPosition 
  } = useGeolocation();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: config.GoogleMapsApiKey,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverLocation, setDriverLocation] = useState<LocationCoords>(currentLocation || DEFAULT_CENTER);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isMapCentered, setIsMapCentered] = useState(false);
  const [isTrackingStarted, setIsTrackingStarted] = useState(false);
  const [showNavigation, setShowNavigation] = useState(true);
  
  // Refs for performance optimization
  const lastLocationUpdateRef = useRef<number>(Date.now());
  const lastRouteCalculationRef = useRef<number>(0);
  const locationHistoryRef = useRef<LocationCoords[]>([]);
  const trackingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const routeCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);
  
  // API update optimization refs
  const lastApiUpdateRef = useRef<number>(0);
  const pendingApiUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const latestLocationRef = useRef<LocationCoords>(currentLocation || DEFAULT_CENTER);
  
  // Arrival tracking refs to prevent repeated notifications and status updates
  const hasArrivedAtPickupRef = useRef<boolean>(false);
  const hasArrivedAtDropoffRef = useRef<boolean>(false);
  const lastArrivalCheckRef = useRef<number>(0);
  const arrivalStatusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // User interaction tracking for map centering
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false);
  const lastUserInteractionRef = useRef<number>(Date.now());
  const mapInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate custom marker icons - MOVED TO TOP TO ENSURE CONSISTENT HOOK ORDER
  const driverMarkerIcon = useMemo(() => createCustomMarker('#1e2761', '#ffd93d', '🚗'), []);
  const pickupMarkerIcon = useMemo(() => createCustomMarker('#ffd93d', '#1e2761', activeTrip.type === 'delivery' ? '📦' : '👤'), [activeTrip.type]);
  const dropoffMarkerIcon = useMemo(() => createCustomMarker('#ef4444', '#1e2761', '📍'), []);

  const isEnRoute = activeTrip.status === "accepted" || activeTrip.status === "arrived";
  const isInProgress = activeTrip.status === "started" || activeTrip.status === "in_progress";

  // Monitor trip status changes
  useEffect(() => {
    console.log('🔄 TripMap: activeTrip object changed:', activeTrip);
    console.log('🔄 TripMap: activeTrip.status changed to:', activeTrip.status);
    console.log('🎯 TripMap: isEnRoute:', isEnRoute, 'isInProgress:', isInProgress);
  }, [activeTrip, activeTrip.status, isEnRoute, isInProgress]);
  
  // Determine current destination
  const currentDestination = useMemo(() => {
    console.log('🎯 TripMap: Determining destination - isEnRoute:', isEnRoute, 'isInProgress:', isInProgress);
    console.log('📍 TripMap: Trip status:', activeTrip.status);
    console.log('🏃 TripMap: Pickup coords:', activeTrip.pickup?.coordinates);
    console.log('🎁 TripMap: Dropoff coords:', activeTrip.dropoff?.coordinates);
    
    if (isEnRoute && activeTrip.pickup?.coordinates) {
      console.log('✅ TripMap: Setting destination to PICKUP');
      return activeTrip.pickup.coordinates;
    }
    if (isInProgress && activeTrip.dropoff?.coordinates) {
      console.log('✅ TripMap: Setting destination to DROPOFF');
      return activeTrip.dropoff.coordinates;
    }
    console.log('❌ TripMap: No destination set');
    return null;
  }, [isEnRoute, isInProgress, activeTrip.pickup?.coordinates, activeTrip.dropoff?.coordinates, activeTrip.status]);
  
  // Calculate distance to current destination
  const distanceToDestination = useMemo(() => {
    if (!currentDestination || !driverLocation) return undefined;
    return calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      currentDestination.lat,
      currentDestination.lng
    );
  }, [driverLocation, currentDestination]);
  
  // Automated trip start mechanism (failsafe for when driver is at pickup too long)
  const autoStartTripRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Auto-start trip if driver has been marked as arrived for too long
    if (activeTrip.status === 'arrived' && hasArrivedAtPickupRef.current) {
      console.log('🕰️ TripMap: Driver marked as arrived, starting auto-start timer');
      
      if (autoStartTripRef.current) {
        clearTimeout(autoStartTripRef.current);
      }
      
      autoStartTripRef.current = setTimeout(() => {
        if (componentMountedRef.current && activeTrip.status === 'arrived' && onStatusUpdate) {
          console.log('🤖 TripMap: Auto-starting trip (driver at pickup too long)');
          
          toast.info('Auto-starting trip', {
            description: 'You\'ve been at pickup for a while. Starting automatically...',
            duration: 4000,
          });
          
          onStatusUpdate('started');
        }
      }, 30000); // 30 seconds after arrival
    } else {
      // Clear timeout if status changes
      if (autoStartTripRef.current) {
        clearTimeout(autoStartTripRef.current);
        autoStartTripRef.current = null;
      }
    }
    
    return () => {
      if (autoStartTripRef.current) {
        clearTimeout(autoStartTripRef.current);
      }
    };
  }, [activeTrip.status, hasArrivedAtPickupRef.current, onStatusUpdate]);

  // Trip action handlers for the swipeable bottom sheet
  const handleStartTrip = useCallback(() => {
    console.log('🚀 TripMap: handleStartTrip called');
    console.log('📊 Current trip status:', activeTrip.status);
    console.log('📍 Current destination before:', currentDestination);
    console.log('🎯 isEnRoute:', isEnRoute, 'isInProgress:', isInProgress);
    
    // Clear auto-start timer since user manually started
    if (autoStartTripRef.current) {
      clearTimeout(autoStartTripRef.current);
      autoStartTripRef.current = null;
    }
    
    if (onStatusUpdate) {
      console.log('✅ TripMap: Calling onStatusUpdate with "started"');
      onStatusUpdate('started');
      
      // Add a timeout to log what happens after status update
      setTimeout(() => {
        console.log('⏰ TripMap: Status should now be updated. Checking state...');
        console.log('📊 New trip status should be "started":', activeTrip.status);
        console.log('🎯 New isEnRoute:', activeTrip.status === "accepted" || activeTrip.status === "arrived");
        console.log('🎯 New isInProgress:', activeTrip.status === "started" || activeTrip.status === "in_progress");
      }, 1000);
      
      toast.success('Trip started!', {
        description: 'Navigate to destination'
      });
    } else {
      console.warn('⚠️ TripMap: onStatusUpdate not available');
    }
  }, [onStatusUpdate, activeTrip.status, currentDestination, isEnRoute, isInProgress]);

  // Automated completion mechanism (failsafe for when driver is at destination too long)
  const autoCompleteTripRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Auto-complete trip if driver has been at destination for too long
    if (activeTrip.status === 'arrived_at_destination' && hasArrivedAtDropoffRef.current) {
      console.log('🏁 TripMap: Driver at destination, starting auto-complete timer');
      
      if (autoCompleteTripRef.current) {
        clearTimeout(autoCompleteTripRef.current);
      }
      
      autoCompleteTripRef.current = setTimeout(() => {
        if (componentMountedRef.current && activeTrip.status === 'arrived_at_destination' && onRequestCompletion) {
          console.log('🤖 TripMap: Auto-completing trip (driver at destination too long)');
          
          toast.info('Auto-completing trip', {
            description: 'You\'ve been at destination for a while. Completing automatically...',
            duration: 4000,
          });
          
          onRequestCompletion();
        }
      }, 45000); // 45 seconds after arrival at destination
    } else {
      // Clear timeout if status changes
      if (autoCompleteTripRef.current) {
        clearTimeout(autoCompleteTripRef.current);
        autoCompleteTripRef.current = null;
      }
    }
    
    return () => {
      if (autoCompleteTripRef.current) {
        clearTimeout(autoCompleteTripRef.current);
      }
    };
  }, [activeTrip.status, hasArrivedAtDropoffRef.current, onRequestCompletion]);

  const handleCompleteTrip = useCallback(() => {
    // Clear auto-complete timer since user manually completed
    if (autoCompleteTripRef.current) {
      clearTimeout(autoCompleteTripRef.current);
      autoCompleteTripRef.current = null;
    }
    
    // Use custom completion handler if provided, otherwise use default behavior
    if (onRequestCompletion) {
      onRequestCompletion();
    } else if (onStatusUpdate) {
      onStatusUpdate('completed');
      toast.success('Trip completed!', {
        description: 'Great job!'
      });
    }
  }, [onStatusUpdate, onRequestCompletion]);

  const handleNavigateExternal = useCallback(() => {
    if (!currentDestination) {
      toast.error('No destination set');
      return;
    }

    const { lat, lng } = currentDestination;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
    
    toast.success('Opening in Google Maps');
  }, [currentDestination]);

  const handleCancelTrip = useCallback(async (reason?: string) => {
    try {
      console.log('🚫 TripMap: handleCancelTrip called with reason:', reason);
      await cancelTrip(reason);
      
      // Navigate back to dashboard after successful cancellation
      setTimeout(() => {
        if (onBack) {
          onBack();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ TripMap: Failed to cancel trip:', error);
      
      // If cancellation fails, still navigate back but show error
      toast.error('Failed to cancel trip', {
        description: 'Please try again or contact support'
      });
      
      // Still navigate back even if cancellation fails
      setTimeout(() => {
        if (onBack) {
          onBack();
        }
      }, 1500);
    }
  }, [cancelTrip, onBack]);
  
  // Reset arrival state when trip status changes to prevent stale notifications
  useEffect(() => {
    console.log('🔄 TripMap: Trip status changed to:', activeTrip.status);
    if (activeTrip.status === 'accepted') {
      console.log('📍 TripMap: Reset - En route to pickup');
      hasArrivedAtPickupRef.current = false;
      hasArrivedAtDropoffRef.current = false;
    } else if (activeTrip.status === 'arrived') {
      console.log('🎯 TripMap: Arrived at pickup');
      hasArrivedAtPickupRef.current = true;
      hasArrivedAtDropoffRef.current = false;
    } else if (activeTrip.status === 'started' || activeTrip.status === 'in_progress') {
      console.log('🚀 TripMap: Trip started - now en route to dropoff, resetting dropoff arrival flag');
      hasArrivedAtPickupRef.current = true;
      hasArrivedAtDropoffRef.current = false; // Reset this so we can detect dropoff arrival
    }
  }, [activeTrip.status]);

  // Optimized route calculation with error handling
  const calculateRoute = useCallback(async () => {
    const destination = currentDestination;
    const location = driverLocation;
    
    if (!destination || !location || !window.google || !componentMountedRef.current) return;
    
    // Check if already calculating using functional state update
    let shouldCalculate = false;
    setIsCalculatingRoute(prev => {
      if (prev) return prev; // Already calculating
      shouldCalculate = true;
      return true;
    });
    
    if (!shouldCalculate) return;
    try {
      const directionsService = new google.maps.DirectionsService();
      
      const result = await directionsService.route({
        origin: location,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
        avoidHighways: false,
        avoidTolls: false,
      });

      if (componentMountedRef.current) {
        setDirections(result);
        lastRouteCalculationRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      if (componentMountedRef.current) {
        toast.error('Route calculation failed', {
          description: 'Using GPS navigation instead'
        });
      }
    } finally {
      if (componentMountedRef.current) {
        setIsCalculatingRoute(false);
      }
    }
  }, []); // Empty deps - function uses current values via closure


  // Optimized arrival detection with automatic status updates
  const checkArrival = useCallback((location: LocationCoords, destination: LocationCoords) => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastArrivalCheckRef.current;
    
    // Throttle arrival checks to prevent spam (minimum 5 seconds between checks)
    if (timeSinceLastCheck < 5000) return;
    
    const distance = calculateDistance(
      location.lat,
      location.lng,
      destination.lat,
      destination.lng
    );

    if (distance <= ARRIVAL_THRESHOLD) {
      lastArrivalCheckRef.current = now;
      
      if (isEnRoute && !hasArrivedAtPickupRef.current) {
        hasArrivedAtPickupRef.current = true;
        
        // Show arrival notification
        toast.success("Arrived at pickup location!", {
          description: "Updating trip status...",
          duration: 3000,
        });
        
        // Auto-update status after a brief delay to prevent UI conflicts
        if (arrivalStatusUpdateTimeoutRef.current) {
          clearTimeout(arrivalStatusUpdateTimeoutRef.current);
        }
        
        arrivalStatusUpdateTimeoutRef.current = setTimeout(() => {
          if (componentMountedRef.current && onStatusUpdate) {
            onStatusUpdate('arrived');
          }
        }, 2000);
        
      } else if (isInProgress && !hasArrivedAtDropoffRef.current) {
        hasArrivedAtDropoffRef.current = true;
        
        // Show arrival notification
        toast.success("Arrived at destination!", {
          description: "Ready to complete trip",
          duration: 3000,
        });
        
        // Auto-update status for destination arrival
        if (arrivalStatusUpdateTimeoutRef.current) {
          clearTimeout(arrivalStatusUpdateTimeoutRef.current);
        }
        
        arrivalStatusUpdateTimeoutRef.current = setTimeout(() => {
          if (componentMountedRef.current && onStatusUpdate) {
            onStatusUpdate('arrived_at_destination');
          }
        }, 2000);
      }
    }
  }, [calculateDistance, isEnRoute, isInProgress, onStatusUpdate]);

  // Proximity monitoring system
  const [proximityStatus, setProximityStatus] = useState<'far' | 'close' | 'very-close' | 'arrived'>('far');
  
  // Enhanced proximity and arrival checking
  useEffect(() => {
    if (!currentDestination || !driverLocation || !componentMountedRef.current) return;
    
    const distance = distanceToDestination;
    if (distance === undefined) return;
    
    // Update proximity status
    let newStatus: 'far' | 'close' | 'very-close' | 'arrived' = 'far';
    if (distance <= ARRIVAL_THRESHOLD) {
      newStatus = 'arrived';
    } else if (distance <= VERY_CLOSE_THRESHOLD) {
      newStatus = 'very-close';
    } else if (distance <= CLOSE_THRESHOLD) {
      newStatus = 'close';
    }
    
    // Only update if status changed
    if (newStatus !== proximityStatus) {
      setProximityStatus(newStatus);
      
      // Provide proximity feedback
      if (newStatus === 'close' && proximityStatus === 'far') {
        toast.info(`Approaching ${isEnRoute ? 'pickup' : 'destination'}`, {
          description: `${Math.round(distance)}m away`,
          duration: 2000,
        });
      } else if (newStatus === 'very-close' && proximityStatus === 'close') {
        toast.info(`Very close to ${isEnRoute ? 'pickup' : 'destination'}`, {
          description: `${Math.round(distance)}m away - Get ready!`,
          duration: 3000,
        });
      }
    }
    
    // Run arrival check
    checkArrival(driverLocation, currentDestination);
  }, [driverLocation, currentDestination, distanceToDestination, checkArrival, proximityStatus, isEnRoute]);

  // Mobile platform optimizations
  useEffect(() => {
    const initMobileFeatures = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Set status bar style for better visibility
          await StatusBar.setStyle({ style: Style.Light });
        }
        
        // Keep screen awake during navigation (works on web and mobile)
        await KeepAwakeFallback.keepAwake();
      } catch (error) {
        console.warn('Mobile feature initialization failed:', error);
      }
    };
    
    initMobileFeatures();
    
    return () => {
      componentMountedRef.current = false;
      // Clean up mobile features
      KeepAwakeFallback.allowSleep().catch(console.warn);
      // Clean up arrival timeout
      if (arrivalStatusUpdateTimeoutRef.current) {
        clearTimeout(arrivalStatusUpdateTimeoutRef.current);
      }
      // Clean up auto-start timeout
      if (autoStartTripRef.current) {
        clearTimeout(autoStartTripRef.current);
      }
      // Clean up auto-complete timeout
      if (autoCompleteTripRef.current) {
        clearTimeout(autoCompleteTripRef.current);
      }
      // Clean up pending API update timeout
      if (pendingApiUpdateRef.current) {
        clearTimeout(pendingApiUpdateRef.current);
      }
      // Clean up map interaction timeout
      if (mapInteractionTimeoutRef.current) {
        clearTimeout(mapInteractionTimeoutRef.current);
      }
    };
  }, []);

  // Start GPS tracking with proper lifecycle management - keep tracking during active trips
  useEffect(() => {
    let mounted = true;
    
    const initTracking = async () => {
      if (!isTrackingStarted && !isTracking && mounted) {
        try {
          console.log('🚀 Initializing GPS tracking...');
          await startTracking();
          if (mounted) {
            setIsTrackingStarted(true);
            console.log('✅ GPS tracking started successfully');
          }
        } catch (error) {
          console.error('❌ Failed to start GPS tracking:', error);
          toast.error('Failed to start GPS tracking');
        }
      }
    };
    
    // Start tracking immediately for active trips, otherwise delay slightly
    const delay = (isEnRoute || isInProgress) ? 100 : 1000;
    trackingTimeoutRef.current = setTimeout(initTracking, delay);
    
    return () => {
      mounted = false;
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current);
      }
    };
  }, [startTracking, isTracking, isTrackingStarted, isEnRoute, isInProgress]);

  // Cleanup on unmount - but keep GPS tracking during active trips
  useEffect(() => {
    return () => {
      // Only stop tracking if not in an active trip
      const hasActiveTrip = isEnRoute || isInProgress;
      if (isTracking && !hasActiveTrip) {
        console.log('🛑 Stopping GPS tracking on unmount (no active trip)');
        stopTracking();
      } else if (hasActiveTrip) {
        console.log('⚠️ Keeping GPS tracking active during trip');
      }
      
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current);
      }
      if (routeCalculationTimeoutRef.current) {
        clearTimeout(routeCalculationTimeoutRef.current);
      }
      if (arrivalStatusUpdateTimeoutRef.current) {
        clearTimeout(arrivalStatusUpdateTimeoutRef.current);
      }
    };
  }, [stopTracking, isTracking, isEnRoute, isInProgress]);

  // Debounced API update function (separate from UI updates)
  const debouncedApiUpdate = useCallback(async (location: LocationCoords) => {
    if (!token || (!isEnRoute && !isInProgress) || !componentMountedRef.current) return;
    
    const now = Date.now();
    const timeSinceLastApi = now - lastApiUpdateRef.current;
    
    // Throttle API calls to every 5 seconds minimum
    if (timeSinceLastApi < 5000) {
      // Clear existing timeout and set new one
      if (pendingApiUpdateRef.current) {
        clearTimeout(pendingApiUpdateRef.current);
      }
      
      pendingApiUpdateRef.current = setTimeout(() => {
        if (componentMountedRef.current) {
          debouncedApiUpdate(latestLocationRef.current);
        }
      }, 5000 - timeSinceLastApi);
      
      return;
    }
    
    try {
      console.log('📍 Sending debounced location update to backend:', location);
      await updateDriverLocationAPI(token, {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString(),
        accuracy: currentPosition?.coords?.accuracy,
        speed: currentPosition?.coords?.speed ?? undefined,
        heading: currentPosition?.coords?.heading ?? undefined,
      });
      
      lastApiUpdateRef.current = now;
      console.log('✅ Location update sent successfully');
    } catch (error) {
      console.error('❌ Failed to send location update:', error);
      // Don't show toast error for location updates to avoid spam
    }
  }, [token, isEnRoute, isInProgress, currentPosition]);

  // Optimized location updates with proper throttling (UI-focused)
  const updateDriverLocation = useCallback(async (newLocation: LocationCoords) => {
    if (!componentMountedRef.current) return;
    
    const now = Date.now();
    const timeSinceUpdate = now - lastLocationUpdateRef.current;
    
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      newLocation.lat,
      newLocation.lng
    );

    // Update latest location ref for API calls
    latestLocationRef.current = newLocation;
    
    // Only update UI if significant movement or enough time has passed
    const shouldUpdateUI = distance >= LOCATION_UPDATE_THRESHOLD || timeSinceUpdate >= LOCATION_UPDATE_INTERVAL;
    
    if (shouldUpdateUI) {
      setDriverLocation(newLocation);
      lastLocationUpdateRef.current = now;
    }
    
    // Always attempt API update (it has its own throttling)
    if (token && (isEnRoute || isInProgress)) {
      debouncedApiUpdate(newLocation);
    }
    
    // Only process UI updates if location actually changed for UI
    if (shouldUpdateUI) {
      // Maintain location history for smooth paths (limited size)
      locationHistoryRef.current.push(newLocation);
      if (locationHistoryRef.current.length > 10) {
        locationHistoryRef.current.shift();
      }

      // Smart map centering - respect user interaction
      const timeSinceUserInteraction = now - lastUserInteractionRef.current;
      const shouldAutoCenter = !isMapCentered || 
        (!userInteractedWithMap && distance > 500) || 
        (timeSinceUserInteraction > 60000 && distance > 500); // Increased thresholds
      
      if (map && shouldAutoCenter && !userInteractedWithMap) {
        map.panTo(newLocation);
        if (!isMapCentered) {
          setIsMapCentered(true);
        }
      }
      
      // Trigger route recalculation if moved significantly
      if (distance >= ROUTE_RECALC_THRESHOLD && currentDestination) {
        const timeSinceRoute = now - lastRouteCalculationRef.current;
        if (timeSinceRoute >= ROUTE_RECALC_INTERVAL) {
          if (routeCalculationTimeoutRef.current) {
            clearTimeout(routeCalculationTimeoutRef.current);
          }
          routeCalculationTimeoutRef.current = setTimeout(() => {
            if (componentMountedRef.current && currentDestination && driverLocation) {
              // Call calculateRoute directly to avoid dependency issues
              const routeCalc = async () => {
                const destination = currentDestination;
                const location = driverLocation;
                
                if (!destination || !location || !window.google || !componentMountedRef.current) return;
                
                let shouldCalculate = false;
                setIsCalculatingRoute(prev => {
                  if (prev) return prev;
                  shouldCalculate = true;
                  return true;
                });
                
                if (!shouldCalculate) return;
                
                try {
                  const directionsService = new google.maps.DirectionsService();
                  const result = await directionsService.route({
                    origin: location,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: true,
                    avoidHighways: false,
                    avoidTolls: false,
                  });
                  
                  if (componentMountedRef.current) {
                    setDirections(result);
                    lastRouteCalculationRef.current = Date.now();
                  }
                } catch (error) {
                  console.error('Error calculating route:', error);
                } finally {
                  if (componentMountedRef.current) {
                    setIsCalculatingRoute(false);
                  }
                }
              };
              routeCalc();
            }
          }, 2000);
        }
      }
    }
  }, [driverLocation, calculateDistance, map, isMapCentered, currentDestination, debouncedApiUpdate, token, isEnRoute, isInProgress]);

  // Process location updates from multiple sources
  useEffect(() => {
    let newLocation: LocationCoords | null = null;

    // Priority: Live GPS position > DriverStatus currentLocation
    if (currentPosition?.coords) {
      newLocation = {
        lat: currentPosition.coords.latitude,
        lng: currentPosition.coords.longitude,
      };
    } else if (currentLocation && !currentPosition) {
      newLocation = currentLocation;
    }

    if (newLocation && componentMountedRef.current) {
      updateDriverLocation(newLocation);
    }
  }, [currentPosition, currentLocation, updateDriverLocation]);

  // Ensure GPS tracking stays active during trips
  useEffect(() => {
    if ((isEnRoute || isInProgress) && !isTracking && componentMountedRef.current) {
      console.log('🔄 Trip active but GPS not tracking - restarting GPS...');
      const restartGPS = async () => {
        try {
          await startTracking();
          setIsTrackingStarted(true);
          console.log('✅ GPS tracking restarted for active trip');
        } catch (error) {
          console.error('❌ Failed to restart GPS for active trip:', error);
        }
      };
      
      setTimeout(restartGPS, 1000);
    }
  }, [isEnRoute, isInProgress, isTracking, startTracking]);

  // Periodic location updates for active trips (every 30 seconds) - using debounced API
  useEffect(() => {
    if (!token || (!isEnRoute && !isInProgress) || !componentMountedRef.current) return;
    
    const periodicUpdate = setInterval(() => {
      if (componentMountedRef.current && currentPosition?.coords) {
        const location = {
          lat: currentPosition.coords.latitude,
          lng: currentPosition.coords.longitude,
        };
        
        console.log('⏰ Triggering periodic location update');
        // Update the latest location ref and force API update
        latestLocationRef.current = location;
        lastApiUpdateRef.current = 0; // Reset to force immediate update
        debouncedApiUpdate(location);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(periodicUpdate);
  }, [token, isEnRoute, isInProgress, currentPosition, debouncedApiUpdate]);

  // Initial route calculation (only when destination changes)
  useEffect(() => {
    if (currentDestination && driverLocation && componentMountedRef.current) {
      // Only calculate route when destination changes, not on every location update
      const timeoutId = setTimeout(() => {
        if (componentMountedRef.current && currentDestination && driverLocation) {
          // Inline route calculation to avoid dependency issues
          const destination = currentDestination;
          const location = driverLocation;
          
          if (!destination || !location || !window.google) return;
          
          setIsCalculatingRoute(prev => {
            if (prev) return prev;
            
            // Start calculation
            const directionsService = new google.maps.DirectionsService();
            directionsService.route({
              origin: location,
              destination: destination,
              travelMode: google.maps.TravelMode.DRIVING,
              optimizeWaypoints: true,
              avoidHighways: false,
              avoidTolls: false,
            }).then(result => {
              if (componentMountedRef.current) {
                setDirections(result);
                lastRouteCalculationRef.current = Date.now();
                setIsCalculatingRoute(false);
              }
            }).catch(error => {
              console.error('Error calculating route:', error);
              if (componentMountedRef.current) {
                setIsCalculatingRoute(false);
              }
            });
            
            return true;
          });
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentDestination]); // Removed calculateRoute to prevent infinite loop

  // Optimized external navigation with platform detection
  const openExternalNavigation = useCallback(() => {
    if (!currentDestination) return;
    
    const { lat, lng } = currentDestination;
    
    if (Capacitor.isNativePlatform()) {
      // Mobile platform - use platform-specific navigation
      const platform = Capacitor.getPlatform();
      let url: string;
      
      if (platform === 'ios') {
        // iOS - try Apple Maps first, fallback to Google Maps
        url = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
      } else {
        // Android - use Google Maps
        url = `google.navigation:q=${lat},${lng}&mode=d`;
      }
      
      window.open(url, '_system');
    } else {
      // Web platform
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
    
    toast.success("Opening navigation app...");
  }, [currentDestination]);

  // Center map on driver's current location
  const centerOnDriver = useCallback(() => {
    if (map && driverLocation) {
      map.panTo(driverLocation);
      map.setZoom(16);
      setIsMapCentered(true);
      setUserInteractedWithMap(false);
      lastUserInteractionRef.current = Date.now() - 120000; // Reset interaction timer
      
      // Clear any pending interaction timeout
      if (mapInteractionTimeoutRef.current) {
        clearTimeout(mapInteractionTimeoutRef.current);
        mapInteractionTimeoutRef.current = null;
      }
      
      toast.success("Centered on your location");
    }
  }, [map, driverLocation]);

  // Optimized manual location update
  const forceLocationUpdate = useCallback(async () => {
    if (!componentMountedRef.current) return;
    
    try {
      const position = await getCurrentPosition();
      if (position && componentMountedRef.current) {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        updateDriverLocation(newLocation);
        
        if (map) {
          map.panTo(newLocation);
          map.setZoom(16);
        }
        
        toast.success("Location updated", {
          description: `Accuracy: ±${Math.round(position.coords.accuracy)}m`
        });
      }
    } catch (error) {
      console.error('Manual location update failed:', error);
      toast.error('Failed to update location');
    }
  }, [getCurrentPosition, map, updateDriverLocation]);

  // Handle map user interactions
  const handleMapInteraction = useCallback(() => {
    const now = Date.now();
    lastUserInteractionRef.current = now;
    
    if (!userInteractedWithMap) {
      setUserInteractedWithMap(true);
    }
    
    // Reset user interaction flag after 2 minutes of no interaction
    if (mapInteractionTimeoutRef.current) {
      clearTimeout(mapInteractionTimeoutRef.current);
    }
    
    mapInteractionTimeoutRef.current = setTimeout(() => {
      if (componentMountedRef.current) {
        console.log('🗺️ Resetting user interaction flag after timeout');
        setUserInteractedWithMap(false);
      }
    }, 120000); // 2 minutes
  }, [userInteractedWithMap]);

  // Map initialization
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Add event listeners for user interactions
    const listeners = [
      map.addListener('dragstart', handleMapInteraction),
      map.addListener('zoom_changed', handleMapInteraction),
      map.addListener('click', handleMapInteraction),
    ];
    
    // Store listeners for cleanup
    (map as any)._vayeListeners = listeners;
  }, [handleMapInteraction]);

  const onUnmount = useCallback(() => {
    // Clean up map event listeners
    if (map && (map as any)._vayeListeners) {
      (map as any)._vayeListeners.forEach((listener: google.maps.MapsEventListener) => {
        google.maps.event.removeListener(listener);
      });
    }
    
    // Clear interaction timeout
    if (mapInteractionTimeoutRef.current) {
      clearTimeout(mapInteractionTimeoutRef.current);
    }
    
    setMap(null);
  }, [map]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const mapCenter = currentDestination || driverLocation;

  return (
    <div className="dashboard-layout">
      {/* Header - Similar to Dashboard */}
      <header className="dashboard-overlay dashboard-overlay-top z-50 bg-gradient-yellow glass shadow-md px-4 py-4 flex items-center justify-between rounded-lg">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-vaye-navy"
          onClick={onBack}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-vaye-navy rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl text-vaye-navy">Active Trip</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={centerOnDriver}
            className="text-vaye-navy"
            title="Center on my location"
          >
            <Crosshair className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={calculateRoute}
            disabled={isCalculatingRoute || !currentDestination}
            className="text-vaye-navy"
            title="Recalculate route"
          >
            {isCalculatingRoute ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={openExternalNavigation}
            disabled={!currentDestination}
            className="text-vaye-navy"
            title="Open in navigation app"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Trip Type & Tracking Status Indicator */}
      <div className="dashboard-overlay dashboard-role-indicator z-40 glass rounded-full px-3 py-2">
        <div className="flex items-center gap-2">
          {activeTrip.type === 'delivery' ? (
            <Package className="w-4 h-4 text-orange-500" />
          ) : (
            <Car className="w-4 h-4 text-blue-500" />
          )}
          <span className="text-sm font-medium">
            {activeTrip.type === 'delivery' ? 'Delivery' : 'Ride'} Trip
          </span>
          
          {/* Proximity Status */}
          {distanceToDestination !== undefined && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-300",
                  proximityStatus === 'arrived' ? 'bg-green-500 animate-pulse' :
                  proximityStatus === 'very-close' ? 'bg-yellow-500 animate-pulse' :
                  proximityStatus === 'close' ? 'bg-orange-500' : 'bg-blue-500'
                )} />
                <span className="text-xs">
                  {Math.round(distanceToDestination)}m to {isEnRoute ? 'pickup' : 'destination'}
                </span>
              </div>
            </>
          )}
          
          {isTracking && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Live GPS</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full Screen Map Container */}
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={16}
          center={driverLocation}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* Driver location marker with accuracy circle */}
          {currentPosition?.coords?.accuracy && (
            <Marker
              position={driverLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#1e2761',
                fillOpacity: 0.1,
                strokeColor: '#ffd93d',
                strokeWeight: 2,
                strokeOpacity: 0.3,
                scale: Math.min(currentPosition.coords.accuracy / 2, 50),
              }}
              title={`Location accuracy: ${Math.round(currentPosition.coords.accuracy)}m`}
              zIndex={999}
            />
          )}
          
          {/* Driver location marker */}
          <Marker
            position={driverLocation}
            icon={driverMarkerIcon ? {
              url: driverMarkerIcon,
              scaledSize: new google.maps.Size(60, 60),
              anchor: new google.maps.Point(30, 30),
            } : {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#1e2761',
              fillOpacity: 1,
              strokeColor: '#ffd93d',
              strokeWeight: 3,
              scale: 12,
            }}
            title={`Your Location${currentPosition?.coords?.accuracy ? ` (±${Math.round(currentPosition.coords.accuracy)}m)` : ''}`}
            zIndex={1000}
          />

          {/* Pickup marker */}
          {activeTrip.pickup?.coordinates && (
            <Marker
              position={activeTrip.pickup.coordinates}
              icon={pickupMarkerIcon ? {
                url: pickupMarkerIcon,
                scaledSize: new google.maps.Size(60, 60),
                anchor: new google.maps.Point(30, 30),
              } : {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#ffd93d',
                fillOpacity: 1,
                strokeColor: '#1e2761',
                strokeWeight: 3,
                scale: 14,
              }}
              title={`Pickup Location${activeTrip.pickup.address ? ` - ${activeTrip.pickup.address}` : ''}`}
              zIndex={999}
            />
          )}

          {/* Dropoff marker */}
          {activeTrip.dropoff?.coordinates && (
            <Marker
              position={activeTrip.dropoff.coordinates}
              icon={dropoffMarkerIcon ? {
                url: dropoffMarkerIcon,
                scaledSize: new google.maps.Size(60, 60),
                anchor: new google.maps.Point(30, 30),
              } : {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#1e2761',
                strokeWeight: 3,
                scale: 14,
              }}
              title={`Destination${activeTrip.dropoff.address ? ` - ${activeTrip.dropoff.address}` : ''}`}
              zIndex={998}
            />
          )}

          {/* Directions */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#ffd93d', // Use vaye-yellow for route
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                },
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Navigation Instructions Overlay */}
      <NavigationInstructions
        directions={directions}
        driverLocation={driverLocation}
        isVisible={showNavigation && (isEnRoute || isInProgress)}
        onToggle={() => setShowNavigation(!showNavigation)}
      />

      {/* Live Tracking Controls - Floating Action Buttons */}
      <div className="absolute top-1/2 right-4 z-50 flex flex-col gap-3 transform -translate-y-1/2">
        <Button
          size="icon"
          variant="secondary"
          onClick={centerOnDriver}
          className="bg-black/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/20 hover:border-white/30 active:scale-95 active:shadow-md transition-all duration-200 text-white/80 hover:text-white transform hover:scale-105 active:bg-black/30"
          title="Center on my location"
        >
          <Crosshair className="w-5 h-5 transition-transform duration-200 hover:rotate-90" />
        </Button>
        
        {/* Navigation instructions toggle */}
        {(isEnRoute || isInProgress) && (
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setShowNavigation(!showNavigation)}
            className={cn(
              "backdrop-blur-md border shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 active:shadow-md",
              showNavigation 
                ? "bg-vaye-yellow/90 border-vaye-yellow/50 hover:bg-vaye-yellow text-vaye-navy animate-pulse hover:animate-none active:bg-vaye-yellow/80" 
                : "bg-black/10 border-white/20 hover:bg-black/20 hover:border-white/30 text-white/80 hover:text-white active:bg-black/30"
            )}
            title={showNavigation ? "Hide navigation instructions" : "Show navigation instructions"}
          >
            <Navigation className={cn(
              "w-5 h-5 transition-all duration-300",
              showNavigation 
                ? "rotate-0 scale-110" 
                : "rotate-45 hover:rotate-0 scale-100 hover:scale-110"
            )} />
          </Button>
        )}
        
        {!isTracking && (
          <Button
            size="icon"
            variant="secondary"
            onClick={async () => {
              console.log('🔄 Restarting GPS tracking...');
              try {
                if (isTracking) {
                  await stopTracking();
                }
                setIsTrackingStarted(false);
                setTimeout(async () => {
                  if (componentMountedRef.current) {
                    console.log('▶️ Starting GPS tracking...');
                    await startTracking();
                    setIsTrackingStarted(true);
                    toast.success('GPS tracking restarted');
                  }
                }, 500);
              } catch (error) {
                console.error('❌ Failed to restart GPS tracking:', error);
                toast.error('Failed to restart GPS tracking');
              }
            }}
            className="bg-black/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/20 hover:border-white/30 active:scale-95 active:shadow-md transition-all duration-200 text-white/80 hover:text-white transform hover:scale-105 active:bg-black/30 relative overflow-hidden"
            title="Restart GPS tracking"
          >
            <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping"></div>
            <div className="absolute inset-1 rounded-full border border-green-400/50 animate-pulse"></div>
            <Target className="w-5 h-5 text-green-400 hover:text-green-300 transition-all duration-200 hover:rotate-180 relative z-10" />
          </Button>
        )}
      </div>

      {/* Swipeable Bottom Sheet with Turn-by-Turn Navigation */}
      <SwipeableBottomSheet
        activeTrip={activeTrip}
        directions={directions}
        currentDestination={currentDestination}
        distanceToDestination={distanceToDestination}
        hasArrivedAtPickup={hasArrivedAtPickupRef.current}
        hasArrivedAtDestination={hasArrivedAtDropoffRef.current}
        onStartTrip={handleStartTrip}
        onCompleteTrip={handleCompleteTrip}
        onNavigateExternal={handleNavigateExternal}
        onCancelTrip={handleCancelTrip}
      />


    </div>
  );
};

export default TripMap;