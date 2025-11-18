import { useState, useEffect, useCallback } from 'react';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';
import { toast } from 'sonner';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation'
);

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  speed: number;
  bearing: number;
  time: number;
}

export const useBackgroundGeolocation = (
  onLocationUpdate?: (location: LocationUpdate) => void
) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationUpdate | null>(null);

  const startBackgroundTracking = useCallback(async () => {
    try {
      const watcher = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Tracking your location for active trip',
          backgroundTitle: 'Vaye Driver Active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // Update every 10 meters
        },
        (location, error) => {
          if (error) {
            console.error('Background location error:', error);
            if (error.code === 'NOT_AUTHORIZED') {
              toast.error('Location permission required for background tracking');
            }
            return;
          }

          if (location) {
            const update: LocationUpdate = {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              altitude: location.altitude || 0,
              speed: location.speed || 0,
              bearing: location.bearing || 0,
              time: location.time || Date.now(),
            };

            setLastLocation(update);
            
            if (onLocationUpdate) {
              onLocationUpdate(update);
            }

            console.log('Background location update:', update);
          }
        }
      );

      setIsTracking(true);
      toast.success('Background GPS tracking started');
      
      return watcher;
    } catch (err) {
      console.error('Failed to start background tracking:', err);
      toast.error('Failed to start background tracking');
      return null;
    }
  }, [onLocationUpdate]);

  const stopBackgroundTracking = useCallback(async (watcherId?: string) => {
    try {
      if (watcherId) {
        await BackgroundGeolocation.removeWatcher({ id: watcherId });
      }
      setIsTracking(false);
      toast.info('Background GPS tracking stopped');
    } catch (err) {
      console.error('Failed to stop background tracking:', err);
    }
  }, []);

  return {
    isTracking,
    lastLocation,
    startBackgroundTracking,
    stopBackgroundTracking,
  };
};
