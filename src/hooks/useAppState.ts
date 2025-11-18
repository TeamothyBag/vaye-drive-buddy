import { useEffect, useState } from 'react';
import { App, AppState } from '@capacitor/app';

export const useAppState = (
  onActive?: () => void,
  onInactive?: () => void,
  onBackground?: () => void
) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const listener = App.addListener('appStateChange', (state: AppState) => {
      setIsActive(state.isActive);

      if (state.isActive) {
        console.log('App became active');
        onActive?.();
      } else {
        console.log('App went to background');
        onBackground?.();
        onInactive?.();
      }
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [onActive, onInactive, onBackground]);

  return { isActive };
};
