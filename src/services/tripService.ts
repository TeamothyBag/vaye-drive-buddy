import config from "../config";

// Trip data types based on VayeBack API response
export interface Trip {
  id: string;
  date: string;
  time: string;
  passenger?: string;
  pickup: string;
  dropoff: string;
  distance: string;
  duration: string;
  fare: number;
  paymentMethod: string;
  cardType?: string;
  cardNumber?: string;
  status: 'completed' | 'cancelled';
  rating: number;
}

export interface TripSummary {
  totalEarnings: number;
  totalDistance: string;
  avgRating: string;
  totalTrips: number;
}

export interface TripPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
}

export interface TripsResponse {
  trips: Trip[];
  summary: TripSummary;
  pagination: TripPagination;
}

export interface TripFilters {
  page?: number;
  limit?: number;
  status?: 'completed' | 'cancelled' | 'all';
  paymentMethod?: string;
  search?: string;
}

class TripService {
  private getAuthHeaders() {
    // Check multiple possible token storage keys for compatibility
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('vaye_token') ||
                  localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get driver trips with filters and pagination
  async getTrips(filters: TripFilters = {}): Promise<TripsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters.paymentMethod) queryParams.set('paymentMethod', filters.paymentMethod);
      if (filters.search && filters.search.trim()) queryParams.set('search', filters.search.trim());

      const url = `${config.apiBaseUrl}/api/drivers/trips${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('🚗 Fetching trips from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch trips');
      }

      const data = await response.json();
      
      console.log('✅ Trips fetched successfully:', data.trips?.length || 0, 'trips');

      return {
        trips: data.trips || [],
        summary: data.summary || {
          totalEarnings: 0,
          totalDistance: '0.0',
          avgRating: '0.0',
          totalTrips: 0
        },
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: data.trips?.length || 0,
          hasNext: false,
          hasPrev: false,
          limit: 20
        }
      };

    } catch (error) {
      console.error('❌ Error fetching trips:', error);
      throw error;
    }
  }

  // Get ride history (alternative endpoint)
  async getRideHistory(filters: TripFilters = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);

      const url = `${config.apiBaseUrl}/api/rides/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('📊 Fetching ride history from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch ride history');
      }

      const data = await response.json();
      console.log('✅ Ride history fetched successfully:', data.history?.length || 0, 'records');

      return data;

    } catch (error) {
      console.error('❌ Error fetching ride history:', error);
      throw error;
    }
  }

  // Get ride statistics
  async getRideStats(): Promise<any> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/rides/history/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch ride statistics');
      }

      const data = await response.json();
      console.log('📈 Ride stats fetched successfully:', data);

      return data;

    } catch (error) {
      console.error('❌ Error fetching ride stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
const tripService = new TripService();
export default tripService;