import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserPreferences } from "../services/preferencesService";
import preferencesService from "../services/preferencesService";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  updatePreference: (key: keyof UserPreferences, value: any) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  clearError: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(
    preferencesService.getDefaultPreferences()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from API
  const loadPreferences = async () => {
    if (!isAuthenticated || !user) {
      console.log("🔧 No authenticated user, using default preferences");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const userPreferences = await preferencesService.getPreferences();
      setPreferences(userPreferences);

    } catch (err: any) {
      console.error("❌ Failed to load preferences:", err);
      setError(err.message || "Failed to load preferences");
      
      // Use default preferences on error
      setPreferences(preferencesService.getDefaultPreferences());
    } finally {
      setIsLoading(false);
    }
  };

  // Update a single preference
  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to save preferences");
      return;
    }

    // Optimistic update
    const previousPreferences = { ...preferences };
    setPreferences(prev => ({ ...prev, [key]: value }));

    try {
      setError(null);
      
      const updatedPreferences = await preferencesService.updatePreferences({ [key]: value });
      setPreferences(updatedPreferences);

      // Show specific feedback for important settings
      if (key === 'notifications') {
        toast.success(value ? 'Notifications enabled' : 'Notifications disabled');
      } else if (key === 'locationSharing') {
        toast.success(value ? 'Location sharing enabled' : 'Location sharing disabled');
      } else if (key === 'twoFactorAuth') {
        toast.success(value ? '2FA enabled for added security' : '2FA disabled');
      } else {
        toast.success('Settings updated successfully');
      }

    } catch (err: any) {
      console.error("❌ Failed to update preference:", err);
      
      // Revert optimistic update
      setPreferences(previousPreferences);
      
      setError(err.message || "Failed to save preference");
      toast.error("Failed to save settings");
      throw err;
    }
  };

  // Refresh preferences manually
  const refreshPreferences = async () => {
    await loadPreferences();
  };

  // Clear error state
  const clearError = () => {
    setError(null);
  };

  // Load preferences when user changes or on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
    } else {
      // Reset to defaults when not authenticated
      setPreferences(preferencesService.getDefaultPreferences());
      setError(null);
    }
  }, [isAuthenticated, user]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        error,
        updatePreference,
        refreshPreferences,
        clearError,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};

export default PreferencesContext;