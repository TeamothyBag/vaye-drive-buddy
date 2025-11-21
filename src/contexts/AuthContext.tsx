import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { 
  login as apiLogin, 
  logout as apiLogout, 
  isTokenValid,
  User as ApiUser 
} from "../services/authService";
import { authStorage, storageService } from "../services/storageService";
import driverSocketService from "../services/DriverSocketService";
import config from "../config";

interface User {
  userId: string;
  name: string;
  email: string;
  role: 'driver' | 'delivery' | 'rider';
  phone?: string;
  memberSince?: string;
  rating?: number;
  totalTrips?: number;
  profileImage?: string | null;
  address?: any;
  confirmationRate?: number;
  cancellationRate?: number;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
  } | null;
  highlights?: Array<{
    label: number | string;
    sublabel: string;
  }>;
  // Legacy compatibility fields
  _id?: string;
  fullName?: string;
  userType?: 'delivery' | 'driver';
  phoneNumber?: string;
  averageRating?: number;
  isAvailable?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  profilePicture?: string;
  vehicleDetails?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    licensePlate?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session and validate token
    const initializeAuth = async () => {
      try {
        // Migrate old localStorage data to secure storage
        await storageService.migrateFromLocalStorage();
        
        const storedToken = await authStorage.getToken();
        const storedUser = await authStorage.getUserData();

        if (storedToken && storedUser && isTokenValid(storedToken)) {
          setToken(storedToken);
          
          // Cast and normalize stored user data
          const anyUser = storedUser as any;
          const normalizedUser: User = {
            userId: anyUser.userId || anyUser._id,
            name: anyUser.name || anyUser.fullName,
            email: anyUser.email,
            role: anyUser.role,
            phone: anyUser.phone || anyUser.phoneNumber,
            rating: anyUser.rating || anyUser.averageRating,
            totalTrips: anyUser.totalTrips,
            profileImage: anyUser.profileImage || anyUser.profilePicture,
            vehicle: anyUser.vehicle || (anyUser.vehicleDetails ? {
              make: anyUser.vehicleDetails.make || '',
              model: anyUser.vehicleDetails.model || '',
              year: anyUser.vehicleDetails.year || 0,
              color: anyUser.vehicleDetails.color || '',
              licensePlate: anyUser.vehicleDetails.licensePlate || '',
            } : null),
            // Legacy compatibility
            _id: anyUser.userId || anyUser._id,
            fullName: anyUser.name || anyUser.fullName,
            userType: anyUser.userType,
            phoneNumber: anyUser.phone || anyUser.phoneNumber,
            averageRating: anyUser.rating || anyUser.averageRating,
            isAvailable: anyUser.isAvailable,
            location: anyUser.location,
            profilePicture: anyUser.profileImage || anyUser.profilePicture,
            vehicleDetails: anyUser.vehicleDetails,
          };
          
          setUser(normalizedUser);
          
          // Initialize socket connection for authenticated user
          driverSocketService.connect(storedToken, normalizedUser.userId || normalizedUser._id);
          driverSocketService.joinDriverRoom();
        } else {
          // Clear invalid/expired session
          await authStorage.clearAuth();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        await authStorage.clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiLogin({ email, password });
      
      // Normalize API response to match User interface
      const anyUser = response.user as any;
      const normalizedUser: User = {
        userId: anyUser.userId,
        name: anyUser.name,
        email: anyUser.email,
        role: anyUser.role,
        phone: anyUser.phone,
        memberSince: anyUser.memberSince,
        rating: anyUser.rating,
        totalTrips: anyUser.totalTrips,
        profileImage: anyUser.profileImage,
        address: anyUser.address,
        confirmationRate: anyUser.confirmationRate,
        cancellationRate: anyUser.cancellationRate,
        vehicle: anyUser.vehicle,
        highlights: anyUser.highlights,
        // Legacy compatibility
        _id: anyUser.userId,
        fullName: anyUser.name,
        userType: anyUser.role === 'delivery' ? 'delivery' : 'driver',
        phoneNumber: anyUser.phone,
        averageRating: anyUser.rating,
        profilePicture: anyUser.profileImage || undefined,
        vehicleDetails: anyUser.vehicle ? {
          make: anyUser.vehicle.make,
          model: anyUser.vehicle.model,
          year: anyUser.vehicle.year,
          color: anyUser.vehicle.color,
          licensePlate: anyUser.vehicle.licensePlate,
        } : undefined
      };
      
      // Store auth data securely
      await authStorage.setToken(response.token);
      await authStorage.setUserData(normalizedUser);
      
      setToken(response.token);
      setUser(normalizedUser);
      
      // Initialize socket connection
      driverSocketService.connect(response.token, normalizedUser.userId);
      driverSocketService.joinDriverRoom();
      
      // Initialize push notifications after successful login
      try {
        const { initializePushNotifications } = await import("../firebase");
        await initializePushNotifications();
      } catch (error) {
        console.warn("⚠️ Push notifications initialization failed:", error);
      }
      
      console.log("✅ Login successful:", normalizedUser.name);
    } catch (err: any) {
      console.error("❌ Login failed:", err.message);
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (!token) {
        console.log("🔄 No token available for refresh");
        return;
      }
      
      setIsLoading(true);
      console.log("🔄 Refreshing user data...");
      
      const response = await fetch(`${config.apiBaseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, logout user
          await logout();
          return;
        }
        throw new Error('Failed to refresh user data');
      }
      
      const data = await response.json();
      
      if (data.user) {
        // Normalize user data
        const anyUser = data.user as any;
        const normalizedUser: User = {
          userId: anyUser.userId,
          name: anyUser.name,
          email: anyUser.email,
          role: anyUser.role,
          phone: anyUser.phone,
          memberSince: anyUser.memberSince,
          rating: anyUser.rating,
          totalTrips: anyUser.totalTrips,
          profileImage: anyUser.profileImage,
          address: anyUser.address,
          confirmationRate: anyUser.confirmationRate,
          cancellationRate: anyUser.cancellationRate,
          vehicle: anyUser.vehicle,
          highlights: anyUser.highlights,
          // Legacy compatibility
          _id: anyUser.userId,
          fullName: anyUser.name,
          userType: anyUser.role === 'delivery' ? 'delivery' : 'driver',
          phoneNumber: anyUser.phone,
          averageRating: anyUser.rating,
          profilePicture: anyUser.profileImage || undefined,
          vehicleDetails: anyUser.vehicle ? {
            make: anyUser.vehicle.make,
            model: anyUser.vehicle.model,
            year: anyUser.vehicle.year,
            color: anyUser.vehicle.color,
            licensePlate: anyUser.vehicle.licensePlate,
          } : undefined
        };
        
        setUser(normalizedUser);
        await authStorage.setUserData(normalizedUser);
        
        console.log("✅ User data refreshed successfully");
      }
    } catch (err: any) {
      console.error("❌ Failed to refresh user data:", err);
      setError(err.message || 'Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Disconnect socket first
      driverSocketService.disconnect();
      
      // Clear secure storage first
      await authStorage.clearAuth();
      
      // Call API logout
      await apiLogout(() => {
        setToken(null);
        setUser(null);
        setError(null);
        navigate("/login");
      }, token || undefined);
      
      console.log("✅ Logout successful");
    } catch (err: any) {
      console.error("❌ Logout error:", err.message);
      // Still clear local data and storage even if API call fails
      await authStorage.clearAuth();
      setToken(null);
      setUser(null);
      setError(null);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Auto-refresh user data on mount if token exists
  useEffect(() => {
    if (token && user) {
      refreshUser();
    }
  }, []); // Only run once on mount

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
