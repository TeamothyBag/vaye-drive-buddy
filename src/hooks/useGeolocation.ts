import { useState, useEffect, useCallback } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { toast } from 'sonner';

export const useGeolocation = () => {
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  const requestPermissions = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }
      return true;
    } catch (err) {
      setError('Failed to get location permissions');
      toast.error('Location permission required');
      return false;
    }
  };

  const getCurrentPosition = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      setCurrentPosition(position);
      setError(null);
      return position;
    } catch (err) {
      const errorMsg = 'Failed to get current position';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            setError('Location tracking error');
            return;
          }
          if (position) {
            setCurrentPosition(position);
            setError(null);
          }
        }
      );

      setWatchId(id);
      setIsTracking(true);
      toast.success('GPS tracking started');
    } catch (err) {
      setError('Failed to start tracking');
      toast.error('Failed to start GPS tracking');
    }
  }, []);

  const stopTracking = useCallback(async () => {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      setWatchId(null);
      setIsTracking(false);
      toast.info('GPS tracking stopped');
    }
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [watchId]);

  return {
    currentPosition,
    isTracking,
    error,
    getCurrentPosition,
    startTracking,
    stopTracking,
    requestPermissions,
  };
};
