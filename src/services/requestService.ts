import config from "../config";

// Request service for ride-sharing operations
export interface RideRequest {
  _id: string;
  rider: {
    _id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    averageRating?: number;
    phoneNumber?: string;
    profilePicture?: string;
  };
  pickup: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  dropoff: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  estimatedPrice?: number;
  estimatedTotalDistance?: string;
  estimatedTotalDuration?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  type: 'ride';
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  timestamp?: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface DriverStats {
  todayEarnings: number;
  todayTrips: number;
  onlineHours: number;
  averageRating: number;
  totalEarnings?: number;
  totalTrips?: number;
  weeklyEarnings?: number;
}

// Get nearby ride requests for the driver
export async function getNearbyRequests(
  token: string,
  latitude?: number,
  longitude?: number
): Promise<RideRequest[]> {
  try {
    let url = `${config.apiBaseUrl}/api/rides/nearby-requests`;
    
    if (latitude && longitude) {
      url += `?latitude=${latitude}&longitude=${longitude}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch nearby requests");
    }

    return await response.json();
  } catch (error) {
    console.error("Get nearby requests error:", error);
    throw error;
  }
}

// Accept a ride request
export async function acceptRideRequest(
  rideId: string,
  token: string
): Promise<{ success: boolean; message: string; ride?: RideRequest }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/rides/accept/${rideId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to accept ride request");
    }

    return await response.json();
  } catch (error) {
    console.error("Accept ride request error:", error);
    throw error;
  }
}

// Decline a ride request
export async function declineRideRequest(
  rideId: string,
  token: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/rides/decline/${rideId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to decline ride request");
    }

    return await response.json();
  } catch (error) {
    console.error("Decline ride request error:", error);
    throw error;
  }
}

// Cancel a ride/trip
export async function cancelTrip(
  rideId: string,
  token: string,
  reason?: string
): Promise<{ success: boolean; message: string; ride?: any }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/rides/cancel/${rideId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to cancel trip");
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message,
      ride: result.ride,
    };
  } catch (error) {
    console.error("Cancel trip error:", error);
    throw error;
  }
}

// Update ride status
export async function updateRideStatus(
  rideId: string,
  status: string,
  token: string,
  location?: LocationUpdate,
  rating?: number
): Promise<{ success: boolean; message: string; ride?: RideRequest }> {
  try {
    const body: any = { status };
    if (location) {
      body.driverLocation = location;
    }
    if (rating && status === 'completed') {
      body.driverRating = rating;
    }

    const response = await fetch(`${config.apiBaseUrl}/api/rides/status/${rideId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update ride status");
    }

    return await response.json();
  } catch (error) {
    console.error("Update ride status error:", error);
    throw error;
  }
}

// Set driver availability status
export async function setDriverAvailability(
  token: string,
  isAvailable: boolean
): Promise<{ success: boolean; message: string; available?: boolean }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/drivers/availability`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ available: isAvailable }), // Use 'available' parameter name as expected by VayeBack
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update driver availability");
    }

    return await response.json();
  } catch (error) {
    console.error("Set driver availability error:", error);
    throw error;
  }
}

// Set driver online/offline status (alias for availability for clarity)
export async function setDriverOnlineStatus(
  token: string,
  isOnline: boolean
): Promise<{ success: boolean; message: string; available?: boolean }> {
  return setDriverAvailability(token, isOnline);
}

// Update driver location
export async function updateDriverLocation(
  token: string,
  location: LocationUpdate
): Promise<{ success: boolean; message: string }> {
  try {
    // VayeBack expects coordinates as [longitude, latitude] array
    const requestBody: any = {
      coordinates: [location.lng, location.lat], // [longitude, latitude] format
      // Also send individual lat/lng for compatibility
      latitude: location.lat,
      longitude: location.lng,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    // Add optional fields if available
    if (location.accuracy !== undefined) {
      requestBody.accuracy = location.accuracy;
    }
    if (location.speed !== undefined) {
      requestBody.speed = location.speed;
    }
    if (location.heading !== undefined) {
      requestBody.heading = location.heading;
    }

    const response = await fetch(`${config.apiBaseUrl}/api/drivers/location`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update driver location");
    }

    return await response.json();
  } catch (error) {
    console.error("Update driver location error:", error);
    throw error;
  }
}

// Get driver statistics
export async function getDriverStats(token: string): Promise<DriverStats> {
  try {
    // Fetch both earnings and performance data in parallel
    const [earningsResponse, performanceResponse] = await Promise.all([
      fetch(`${config.apiBaseUrl}/api/drivers/earnings?period=day`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${config.apiBaseUrl}/api/drivers/performance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    ]);

    if (!earningsResponse.ok || !performanceResponse.ok) {
      throw new Error("Failed to fetch driver stats");
    }

    const earnings = await earningsResponse.json();
    const performance = await performanceResponse.json();

    // Combine the data into the expected DriverStats format
    return {
      todayEarnings: earnings.summary?.totalEarnings || 0,
      todayTrips: earnings.summary?.totalRides || 0,
      onlineHours: 0, // This would need to be tracked separately
      averageRating: performance.metrics?.averageRating || 0,
    };
  } catch (error) {
    console.error("Get driver stats error:", error);
    // Return default values instead of throwing to prevent crashes
    return {
      todayEarnings: 0,
      todayTrips: 0,
      onlineHours: 0,
      averageRating: 0,
    };
  }
}

// Get driver's active rides  
export async function getActiveRides(token: string): Promise<RideRequest[]> {
  try {
    // Since /api/rides/active doesn't exist, we'll use the history endpoint with active status filter
    // This is a workaround until the backend implements a proper active rides endpoint
    const response = await fetch(`${config.apiBaseUrl}/api/rides/history?status=accepted,arrived,in_progress,pickup_confirmed`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If the endpoint doesn't exist or fails, return empty array instead of throwing
      console.warn("Active rides endpoint not available, returning empty array");
      return [];
    }

    const result = await response.json();
    // The history endpoint might return an object with rides array, or just an array
    return Array.isArray(result) ? result : (result.rides || []);
  } catch (error) {
    console.warn("Get active rides error, returning empty array:", error);
    return []; // Return empty array instead of throwing to prevent blocking
  }
}

// Get ride history
export async function getRideHistory(
  token: string,
  page: number = 1,
  limit: number = 10
): Promise<{ rides: RideRequest[]; total: number; page: number; limit: number }> {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/rides/history?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch ride history");
    }

    return await response.json();
  } catch (error) {
    console.error("Get ride history error:", error);
    throw error;
  }
}