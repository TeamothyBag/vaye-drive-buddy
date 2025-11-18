import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const useHaptics = () => {
  const impact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  const notification = useCallback(async (type: NotificationType = NotificationType.Success) => {
    try {
      await Haptics.notification({ type });
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    try {
      await Haptics.vibrate({ duration });
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  const selectionStart = useCallback(async () => {
    try {
      await Haptics.selectionStart();
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  const selectionChanged = useCallback(async () => {
    try {
      await Haptics.selectionChanged();
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  const selectionEnd = useCallback(async () => {
    try {
      await Haptics.selectionEnd();
    } catch (err) {
      console.log('Haptics not available');
    }
  }, []);

  return {
    impact,
    notification,
    vibrate,
    selectionStart,
    selectionChanged,
    selectionEnd,
  };
};
