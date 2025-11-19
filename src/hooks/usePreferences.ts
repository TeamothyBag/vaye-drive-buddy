import { usePreferences } from '../contexts/PreferencesContext';

// Convenience hooks for specific preferences
export const useNotificationPreference = () => {
  const { preferences, updatePreference } = usePreferences();
  
  return {
    enabled: preferences.notifications,
    toggle: (value: boolean) => updatePreference('notifications', value)
  };
};

export const useLocationSharingPreference = () => {
  const { preferences, updatePreference } = usePreferences();
  
  return {
    enabled: preferences.locationSharing,
    toggle: (value: boolean) => updatePreference('locationSharing', value)
  };
};

export const useSoundPreference = () => {
  const { preferences, updatePreference } = usePreferences();
  
  return {
    enabled: preferences.sounds,
    toggle: (value: boolean) => updatePreference('sounds', value)
  };
};

export const useThemePreference = () => {
  const { preferences, updatePreference } = usePreferences();
  
  return {
    theme: preferences.theme,
    setTheme: (theme: string) => updatePreference('theme', theme)
  };
};

// Main export for all preferences
export { usePreferences } from '../contexts/PreferencesContext';