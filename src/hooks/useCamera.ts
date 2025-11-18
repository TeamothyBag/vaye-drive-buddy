import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';

export const useCamera = () => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    try {
      const permission = await Camera.checkPermissions();
      if (permission.camera !== 'granted' || permission.photos !== 'granted') {
        const request = await Camera.requestPermissions();
        if (request.camera !== 'granted' || request.photos !== 'granted') {
          throw new Error('Camera permission denied');
        }
      }
      return true;
    } catch (err) {
      toast.error('Camera permission required');
      return false;
    }
  };

  const takePhoto = useCallback(async (): Promise<Photo | null> => {
    try {
      setIsLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: true,
        saveToGallery: false,
      });

      toast.success('Photo captured');
      return photo;
    } catch (err) {
      if (err instanceof Error && err.message !== 'User cancelled photos app') {
        toast.error('Failed to take photo');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickPhoto = useCallback(async (): Promise<Photo | null> => {
    try {
      setIsLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 90,
        allowEditing: true,
      });

      toast.success('Photo selected');
      return photo;
    } catch (err) {
      if (err instanceof Error && err.message !== 'User cancelled photos app') {
        toast.error('Failed to select photo');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const choosePhotoSource = useCallback(async (): Promise<Photo | null> => {
    try {
      setIsLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 90,
        allowEditing: true,
        saveToGallery: false,
      });

      toast.success('Photo ready');
      return photo;
    } catch (err) {
      if (err instanceof Error && err.message !== 'User cancelled photos app') {
        toast.error('Failed to get photo');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    takePhoto,
    pickPhoto,
    choosePhotoSource,
    requestPermissions,
  };
};
