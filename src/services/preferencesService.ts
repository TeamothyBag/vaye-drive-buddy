import config from "../config";
import { authStorage } from './storageService';

// User preferences interface
export interface UserPreferences {
  notifications: boolean;
  sounds: boolean;
  locationSharing: boolean;
  autoReply: boolean;
  twoFactorAuth: boolean;
  language: string;
  theme: string;
}

// API response interface
export interface PreferencesResponse {
  message: string;
  preferences: UserPreferences;
}

class PreferencesService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authStorage.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get user preferences
  async getPreferences(): Promise<UserPreferences> {
    try {
      console.log('🔧 Fetching user preferences...');

      const response = await fetch(`${config.apiBaseUrl}/api/auth/users/preferences`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PreferencesResponse = await response.json();
      
      console.log('✅ User preferences loaded:', data.preferences);
      return data.preferences;

    } catch (error: any) {
      console.error('❌ Error fetching preferences:', error);
      throw error;
    }
  }

  // Update user preferences
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      console.log('🔧 Updating preferences:', preferences);

      const response = await fetch(`${config.apiBaseUrl}/api/auth/users/preferences`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ preferences })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PreferencesResponse = await response.json();
      
      console.log('✅ Preferences updated successfully:', data.preferences);
      return data.preferences;

    } catch (error: any) {
      console.error('❌ Error updating preferences:', error);
      throw error;
    }
  }

  // Get default preferences
  getDefaultPreferences(): UserPreferences {
    return {
      notifications: true,
      sounds: true,
      locationSharing: true,
      autoReply: false,
      twoFactorAuth: false,
      language: 'English',
      theme: 'System default'
    };
  }
}

export const preferencesService = new PreferencesService();
export default preferencesService;