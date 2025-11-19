import config from "../config";

// Delivery service for delivery operations
export interface DeliveryOrder {
  _id: string;
  orderId: string;
  externalOrderId?: string;
  type: 'delivery';
  status: 'pending' | 'accepted' | 'pickup_confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  
  // Customer information
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  
  // Pickup location (merchant/store)
  pickup: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
  };
  
  // Delivery location
  dropoff: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    instructions?: string;
  };
  
  // Order details
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  
  // Delivery details
  deliveryFee?: number;
  totalAmount?: number;
  estimatedDistance?: string;
  estimatedDuration?: string;
  deliveryPin?: string;
  
  // Driver assignment
  driver?: {
    _id: string;
    fullName: string;
    phoneNumber?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  pickupTime?: string;
  deliveryTime?: string;
}

export interface DeliveryRoute {
  _id: string;
  driver: string;
  deliveries: DeliveryOrder[];
  optimizedRoute?: Array<{
    deliveryId: string;
    order: number;
    estimatedArrival: string;
  }>;
  totalDistance?: string;
  totalDuration?: string;
  status: 'active' | 'completed' | 'paused';
}

export interface JobCombination {
  jobs: DeliveryOrder[];
  totalDistance: string;
  totalDuration: string;
  totalEarnings: number;
  pickupClusters: Array<{
    address: string;
    coordinates: { lat: number; lng: number };
    jobCount: number;
  }>;
}

// Get available delivery jobs (unassigned deliveries)
export async function getAvailableDeliveryJobs(
  token: string,
  latitude?: number,
  longitude?: number
): Promise<DeliveryOrder[]> {
  try {
    let url = `${config.apiBaseUrl}/api/deliveries/available-jobs`;
    
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
      throw new Error(error.message || "Failed to fetch available delivery jobs");
    }

    return await response.json();
  } catch (error) {
    console.error("Get available delivery jobs error:", error);
    throw error;
  }
}

// Accept a delivery job
export async function acceptDeliveryJob(
  deliveryId: string,
  token: string
): Promise<{ success: boolean; message: string; delivery?: DeliveryOrder }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/accept-job/${deliveryId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to accept delivery job");
    }

    return await response.json();
  } catch (error) {
    console.error("Accept delivery job error:", error);
    throw error;
  }
}

// Accept multiple delivery jobs as a batch
export async function acceptJobBatch(
  token: string,
  jobIds: string[],
  optimizedRoute?: any
): Promise<{ success: boolean; message: string; route?: DeliveryRoute }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/accept-job-batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        jobIds,
        optimizedRoute,
        batchAcceptance: true
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to accept job batch");
    }

    return await response.json();
  } catch (error) {
    console.error("Accept job batch error:", error);
    throw error;
  }
}

// Get delivery person's current route and active deliveries
export async function getMyDeliveryRoute(token: string): Promise<DeliveryRoute | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/my-route`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch delivery route");
    }

    return await response.json();
  } catch (error) {
    console.error("Get delivery route error:", error);
    throw error;
  }
}

// Update delivery status
export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  token: string
): Promise<{ success: boolean; message: string; delivery?: DeliveryOrder }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/update-status/${deliveryId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update delivery status");
    }

    return await response.json();
  } catch (error) {
    console.error("Update delivery status error:", error);
    throw error;
  }
}

// Update multiple delivery statuses in batch
export async function updateMultipleDeliveryStatuses(
  deliveryIds: string[],
  status: string,
  token: string
): Promise<{ success: boolean; message: string; batchUpdate?: any }> {
  try {
    if (!Array.isArray(deliveryIds) || deliveryIds.length === 0) {
      throw new Error('deliveryIds must be a non-empty array');
    }

    if (deliveryIds.length > 50) {
      throw new Error('Cannot update more than 50 deliveries at once');
    }

    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/update-batch-status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        deliveryIds,
        status 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Batch update was not successful');
    }

    return data;
  } catch (error) {
    console.error("Batch delivery status update error:", error);
    throw error;
  }
}

// Confirm delivery with PIN
export async function confirmDelivery(
  deliveryId: string,
  deliveryPin: string,
  token: string
): Promise<{ success: boolean; message: string; delivery?: DeliveryOrder }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/confirm-delivery/${deliveryId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryPin }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to confirm delivery");
    }

    return await response.json();
  } catch (error) {
    console.error("Confirm delivery error:", error);
    throw error;
  }
}

// Get delivery status by order ID
export async function getDeliveryStatus(
  orderId: string,
  token: string
): Promise<DeliveryOrder> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/status/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch delivery status");
    }

    return await response.json();
  } catch (error) {
    console.error("Get delivery status error:", error);
    throw error;
  }
}

// Set delivery personnel availability
export async function setDeliveryAvailability(
  token: string,
  available: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/drivers/availability`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isAvailable: available }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update delivery availability");
    }

    return await response.json();
  } catch (error) {
    console.error("Set delivery availability error:", error);
    throw error;
  }
}

// Get optimized job combinations
export async function getOptimizedJobCombinations(
  token: string,
  latitude?: number,
  longitude?: number,
  maxRadius: number = 0.5
): Promise<JobCombination[]> {
  try {
    let url = `${config.apiBaseUrl}/api/deliveries/optimized-combinations`;
    
    const params = new URLSearchParams();
    if (latitude && longitude) {
      params.append('latitude', latitude.toString());
      params.append('longitude', longitude.toString());
    }
    if (maxRadius) {
      params.append('maxRadius', maxRadius.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
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
      throw new Error(error.message || "Failed to fetch optimized job combinations");
    }

    return await response.json();
  } catch (error) {
    console.error("Get optimized job combinations error:", error);
    throw error;
  }
}

// Get pickup location clusters
export async function getPickupLocationClusters(
  token: string,
  latitude?: number,
  longitude?: number,
  radius: number = 1.0
): Promise<any[]> {
  try {
    let url = `${config.apiBaseUrl}/api/deliveries/pickup-clusters`;
    
    const params = new URLSearchParams();
    if (latitude && longitude) {
      params.append('latitude', latitude.toString());
      params.append('longitude', longitude.toString());
    }
    params.append('radius', radius.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
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
      throw new Error(error.message || "Failed to fetch pickup clusters");
    }

    return await response.json();
  } catch (error) {
    console.error("Get pickup clusters error:", error);
    throw error;
  }
}

// Calculate route optimization for selected jobs
export async function calculateOptimizedRoute(
  token: string,
  jobIds: string[],
  driverLocation?: { lat: number; lng: number }
): Promise<any> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/deliveries/calculate-route`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        jobIds,
        driverLocation
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to calculate optimized route");
    }

    return await response.json();
  } catch (error) {
    console.error("Calculate optimized route error:", error);
    throw error;
  }
}