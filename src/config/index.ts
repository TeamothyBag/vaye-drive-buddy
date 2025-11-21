// VayeBack API Configuration
export interface ApiConfig {
  apiBaseUrl: string;
  socketUrl: string;
  GoogleMapsApiKey: string;
  GoogleMapsId: string;
  isProduction: boolean;
}

const config: ApiConfig = {
  // VayeBack API base URL - matches Driver-FrontEnd configuration
  // Use your computer's actual IP address for Android emulator access
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.18:5000',
  
  // Socket.io URL - same as VayeBack server  
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://192.168.100.18:5000',
  
  // Google Maps configuration - shared across Vaye platform
  GoogleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDPmgYmKhagLqDqopG1ve9pry2mz8sIF8k',
  GoogleMapsId: import.meta.env.VITE_GOOGLE_MAPS_ID || '89419a0a0fdf71f9c3be2b26',
  
  // Environment detection
  isProduction: import.meta.env.PROD,
};

export default config;

// Environment variables interface for type safety
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_SOCKET_URL: string;
    readonly VITE_GOOGLE_MAPS_API_KEY: string;
    readonly VITE_GOOGLE_MAPS_ID: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}