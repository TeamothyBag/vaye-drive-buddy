import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Storage keys - centralized to avoid conflicts
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vaye_auth_token',
  USER_DATA: 'vaye_user_data',
  PREFERENCES: 'vaye_preferences',
  NOTIFICATIONS: 'vaye_notifications',
  DRIVER_STATUS: 'vaye_driver_status',
  TRIP_DATA: 'vaye_trip_data',
} as const;

/**
 * Cross-platform storage service that uses Capacitor Preferences on mobile
 * and localStorage as fallback for web
 */
class StorageService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Store a value securely
   */
  async set(key: string, value: string): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.set({ key, value });
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to localStorage even on mobile if Preferences fails
      localStorage.setItem(key, value);
    }
  }

  /**
   * Get a stored value
   */
  async get(key: string): Promise<string | null> {
    try {
      if (this.isNative) {
        const result = await Preferences.get({ key });
        return result.value;
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage get error:', error);
      // Fallback to localStorage
      return localStorage.getItem(key);
    }
  }

  /**
   * Remove a stored value
   */
  async remove(key: string): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage remove error:', error);
      // Fallback to localStorage
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all stored values
   */
  async clear(): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      localStorage.clear();
    }
  }

  /**
   * Store JSON data
   */
  async setJSON(key: string, value: any): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString);
  }

  /**
   * Get and parse JSON data
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        console.error('JSON parse error for key:', key, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get all keys (useful for debugging)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (this.isNative) {
        const result = await Preferences.keys();
        return result.keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      console.error('Get all keys error:', error);
      return Object.keys(localStorage);
    }
  }

  /**
   * Migrate old localStorage data to secure storage
   */
  async migrateFromLocalStorage(): Promise<void> {
    if (!this.isNative) return; // No need to migrate on web

    try {
      // Migration map for old keys to new keys
      const migrationMap = {
        'vaye_token': STORAGE_KEYS.AUTH_TOKEN,
        'auth_token': STORAGE_KEYS.AUTH_TOKEN,
        'token': STORAGE_KEYS.AUTH_TOKEN,
        'vaye_user': STORAGE_KEYS.USER_DATA,
        'user_data': STORAGE_KEYS.USER_DATA,
      };

      for (const [oldKey, newKey] of Object.entries(migrationMap)) {
        const value = localStorage.getItem(oldKey);
        if (value) {
          await this.set(newKey, value);
          localStorage.removeItem(oldKey);
          console.log(`Migrated ${oldKey} to ${newKey}`);
        }
      }

      // Migrate notifications (they have dynamic keys)
      const allLocalStorageKeys = Object.keys(localStorage);
      for (const key of allLocalStorageKeys) {
        if (key.startsWith('vaye_notifications_')) {
          const value = localStorage.getItem(key);
          if (value) {
            await this.set(key, value);
            localStorage.removeItem(key);
            console.log(`Migrated notification key: ${key}`);
          }
        }
      }

      console.log('Storage migration completed');
    } catch (error) {
      console.error('Storage migration failed:', error);
    }
  }
}

export const storageService = new StorageService();

// Helper functions for common auth operations
export const authStorage = {
  async setToken(token: string): Promise<void> {
    await storageService.set(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return await storageService.get(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setUserData(userData: any): Promise<void> {
    await storageService.setJSON(STORAGE_KEYS.USER_DATA, userData);
  },

  async getUserData<T>(): Promise<T | null> {
    return await storageService.getJSON<T>(STORAGE_KEYS.USER_DATA);
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      storageService.remove(STORAGE_KEYS.AUTH_TOKEN),
      storageService.remove(STORAGE_KEYS.USER_DATA),
    ]);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    const userData = await this.getUserData();
    return !!(token && userData);
  },
};