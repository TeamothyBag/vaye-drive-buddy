import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { setDriverAvailability, setDriverOnlineStatus, updateDriverLocation, LocationUpdate } from "../services/requestService";
import { setDeliveryAvailability } from "../services/deliveryService";
import driverSocketService from "../services/DriverSocketService";
import { useGeolocation } from "../hooks/useGeolocation";

interface DriverStatusContextType {
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation: LocationUpdate | null;
  isLocationSharing: boolean;
  setOnlineStatus: (status: boolean) => Promise<void>;
  setAvailabilityStatus: (status: boolean) => Promise<void>;
  startLocationSharing: () => void;
  stopLocationSharing: () => void;
  updateLocation: (location: LocationUpdate) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const DriverStatusContext = createContext<DriverStatusContextType | undefined>(undefined);

export const DriverStatusProvider = ({ children }: { children: ReactNode }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use geolocation hook for location updates
  const { currentPosition, error: locationError } = useGeolocation();

  // Update current location when geolocation changes
  useEffect(() => {
    if (currentPosition) {
      const locationUpdate: LocationUpdate = {
        lat: currentPosition.coords.latitude,
        lng: currentPosition.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: currentPosition.coords.accuracy,
        speed: currentPosition.coords.speed || undefined,
        heading: currentPosition.coords.heading || undefined,
      };
      setCurrentLocation(locationUpdate);

      // Broadcast location via socket if sharing is enabled
      if (isLocationSharing && isAuthenticated) {
        driverSocketService.broadcastLocation(locationUpdate);
      }
    }
  }, [currentPosition, isLocationSharing, isAuthenticated]);

  // Handle location errors
  useEffect(() => {
    if (locationError) {
      console.error("Location error:", locationError);
      setError(`Location error: ${locationError}`);
    }
  }, [locationError]);

  // Initialize driver status when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      // Set initial status based on user data
      setIsAvailable(user.isAvailable || false);
      
      if (user.location) {
        setCurrentLocation({
          lat: user.location.lat,
          lng: user.location.lng,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Clear status when not authenticated
      setIsOnline(false);
      setIsAvailable(false);
      setCurrentLocation(null);
      setIsLocationSharing(false);
    }
  }, [isAuthenticated, user]);

  // Set online/offline status
  const setOnlineStatus = useCallback(async (status: boolean) => {
    if (!isAuthenticated || !token) {
      throw new Error("Not authenticated");
    }

    try {
      setIsLoading(true);
      setError(null);

      // Update backend availability status (VayeBack uses availability for online/offline)
      const response = await setDriverAvailability(token, status);
      console.log(`✅ Backend availability update: ${status ? 'Online' : 'Offline'}`, response);

      if (status) {
        // Going online - update socket status
        driverSocketService.updateDriverStatus('online');
        
        // Start location sharing if available
        if (currentLocation) {
          await updateDriverLocation(token, currentLocation);
        }
        
        setIsOnline(true);
        console.log("✅ Driver is now online");
      } else {
        // Going offline - update socket status
        driverSocketService.updateDriverStatus('offline');
        
        // Stop location sharing
        driverSocketService.stopLocationBroadcast();
        setIsLocationSharing(false);
        
        setIsOnline(false);
        setIsAvailable(false); // Auto-set unavailable when offline
        console.log("✅ Driver is now offline");
      }

      // Broadcast availability via socket
      if (driverSocketService.isSocketConnected()) {
        const userType = user?.role === 'delivery' || user?.userType === 'delivery' ? 'delivery' : 'driver';
        driverSocketService.broadcastDriverAvailability(status, userType);
      }
    } catch (err: any) {
      console.error("❌ Failed to update online status:", err.message);
      setError(err.message || "Failed to update online status");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, currentLocation, user]);

  // Set availability status
  const setAvailabilityStatus = useCallback(async (status: boolean) => {
    if (!isAuthenticated || !token || !user) {
      throw new Error("Not authenticated");
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use appropriate API based on user role
      if (user.role === 'delivery' || user.userType === 'delivery') {
        await setDeliveryAvailability(token, status);
      } else {
        await setDriverAvailability(token, status);
      }

      // Update socket status
      driverSocketService.updateDriverStatus(status ? 'available' : 'busy');
      
      setIsAvailable(status);
      
      if (status && !isOnline) {
        // Auto-go online when becoming available
        await setOnlineStatus(true);
      }
      
      console.log(`✅ Driver availability updated: ${status ? 'Available' : 'Unavailable'}`);
    } catch (err: any) {
      console.error("❌ Failed to update availability:", err.message);
      setError(err.message || "Failed to update availability");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, user, isOnline, setOnlineStatus]);

  // Start location sharing
  const startLocationSharing = useCallback(() => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return;
    }

    setIsLocationSharing(true);
    driverSocketService.startLocationBroadcast();
    console.log("📍 Location sharing started");
  }, [isAuthenticated]);

  // Stop location sharing
  const stopLocationSharing = useCallback(() => {
    setIsLocationSharing(false);
    driverSocketService.stopLocationBroadcast();
    console.log("📍 Location sharing stopped");
  }, []);

  // Manually update location
  const updateLocation = useCallback(async (location: LocationUpdate) => {
    if (!isAuthenticated || !token) {
      throw new Error("Not authenticated");
    }

    try {
      await updateDriverLocation(token, location);
      setCurrentLocation(location);
      
      // Broadcast via socket if sharing is enabled
      if (isLocationSharing) {
        driverSocketService.broadcastLocation(location);
      }
      
      console.log("📍 Location updated:", location);
    } catch (err: any) {
      console.error("❌ Failed to update location:", err.message);
      setError(err.message || "Failed to update location");
      throw err;
    }
  }, [isAuthenticated, token, isLocationSharing]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleSocketConnected = () => {
      console.log("🔌 Socket connected - updating driver status");
      if (isOnline) {
        driverSocketService.updateDriverStatus('online');
      }
      if (isAvailable) {
        driverSocketService.updateDriverStatus('available');
      }
    };

    const handleSocketDisconnected = () => {
      console.log("🔌 Socket disconnected");
    };

    driverSocketService.addEventListener('socketConnected', handleSocketConnected);
    driverSocketService.addEventListener('socketDisconnected', handleSocketDisconnected);

    return () => {
      driverSocketService.removeEventListener('socketConnected', handleSocketConnected);
      driverSocketService.removeEventListener('socketDisconnected', handleSocketDisconnected);
    };
  }, [isAuthenticated, isOnline, isAvailable]);

  return (
    <DriverStatusContext.Provider
      value={{
        isOnline,
        isAvailable,
        currentLocation,
        isLocationSharing,
        setOnlineStatus,
        setAvailabilityStatus,
        startLocationSharing,
        stopLocationSharing,
        updateLocation,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </DriverStatusContext.Provider>
  );
};

export const useDriverStatus = () => {
  const context = useContext(DriverStatusContext);
  if (context === undefined) {
    throw new Error("useDriverStatus must be used within a DriverStatusProvider");
  }
  return context;
};