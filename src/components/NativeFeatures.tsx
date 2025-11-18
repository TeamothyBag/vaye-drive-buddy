import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { useAppState } from '@/hooks/useAppState';

const NativeFeatures = () => {
  useAppState(
    () => {
      console.log('App became active');
    },
    () => {
      console.log('App went to background');
    },
    () => {
      console.log('App in background');
    }
  );

  useEffect(() => {
    const initNativeFeatures = async () => {
      try {
        // Configure status bar
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFC107' }); // Vaye yellow
        
        // Handle back button on Android
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });

        console.log('Native features initialized');
      } catch (error) {
        console.log('Native features not available (probably web):', error);
      }
    };

    initNativeFeatures();

    return () => {
      App.removeAllListeners();
    };
  }, []);

  return null;
};

export default NativeFeatures;
