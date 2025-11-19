import config from "../config";

// Authentication service following Driver-FrontEnd patterns
export interface User {
  // New API response format (primary)
  userId?: string;
  name?: string;
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
  
  // Legacy format (for backward compatibility)
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  email: string;
  bio?: string;
  role: 'driver' | 'delivery' | 'rider';
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

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  bio?: string;
  password: string;
}

// Register new driver/delivery personnel
export async function register(userData: RegisterData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Registration failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Login function with callback support
export async function login(
  credentials: LoginCredentials, 
  onLoginSuccess?: (data: AuthResponse) => void
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || "Login failed");
    }

    const data: AuthResponse = await response.json();
    
    // Store authentication data
    localStorage.setItem("vaye_token", data.token);
    localStorage.setItem("vaye_user", JSON.stringify(data.user));
    
    // Call success callback if provided
    if (onLoginSuccess) {
      onLoginSuccess(data);
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Logout function with cleanup
export async function logout(
  onLogoutSuccess?: () => void,
  token?: string
): Promise<void> {
  try {
    // Attempt server-side logout if token is available
    if (token) {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Server logout failed, proceeding with local cleanup");
      }
    }
  } catch (error) {
    console.warn("Server logout error:", error);
  } finally {
    // Always clear local storage regardless of server response
    localStorage.removeItem("vaye_token");
    sessionStorage.removeItem("vaye_token");
    localStorage.removeItem("vaye_user");
    sessionStorage.removeItem("vaye_user");
    
    // Call success callback
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  }
}

// Get stored auth data
export function getStoredAuth(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem("vaye_token");
    const userStr = localStorage.getItem("vaye_user");
    const user = userStr ? JSON.parse(userStr) : null;
    
    return { user, token };
  } catch (error) {
    console.error("Error retrieving stored auth:", error);
    return { user: null, token: null };
  }
}

// Verify token validity (optional - can be enhanced with server verification)
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    return payload.exp > now;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

// Clear auth data
export function clearAuthData(): void {
  localStorage.removeItem("vaye_token");
  sessionStorage.removeItem("vaye_token");
  localStorage.removeItem("vaye_user");
  sessionStorage.removeItem("vaye_user");
}