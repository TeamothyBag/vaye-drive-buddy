import config from "../config";

// Earnings data types based on VayeBack API response
export interface DailyEarning {
  _id: {
    year: number;
    month: number;
    day: number;
  };
  totalEarnings: number;
  totalRides: number;
  totalDistance: number;
}

export interface EarningsSummary {
  totalEarnings: number;
  totalRides: number;
  totalDistance: number;
  averageEarningsPerRide: number;
}

export interface EarningsResponse {
  period: string;
  summary: EarningsSummary;
  dailyBreakdown: DailyEarning[];
}

export interface EarningsParams {
  period: 'today' | 'week' | 'month' | 'year';
}

class EarningsService {
  private getAuthHeaders(): Record<string, string> {
    // Check multiple possible token keys for compatibility
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

  private calculateTodayEarnings(dailyBreakdown: DailyEarning[]): EarningsSummary {
    const today = new Date();
    const todayEarning = dailyBreakdown.find(earning => 
      earning._id.year === today.getFullYear() &&
      earning._id.month === (today.getMonth() + 1) &&
      earning._id.day === today.getDate()
    );

    return {
      totalEarnings: todayEarning?.totalEarnings || 0,
      totalRides: todayEarning?.totalRides || 0,
      totalDistance: todayEarning?.totalDistance || 0,
      averageEarningsPerRide: todayEarning ? (todayEarning.totalEarnings / todayEarning.totalRides) : 0
    };
  }

  async getEarnings(params: EarningsParams): Promise<EarningsResponse> {
    try {
      console.log('🏦 Fetching earnings for period:', params.period);

      // Map frontend period to backend period
      let apiPeriod = params.period;
      if (params.period === 'today') {
        apiPeriod = 'week'; // Get week data and filter for today on frontend
      }

      const response = await fetch(`${config.apiBaseUrl}/api/drivers/earnings?period=${apiPeriod}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EarningsResponse = await response.json();
      
      console.log('✅ Earnings data received:', {
        period: data.period,
        totalEarnings: data.summary.totalEarnings,
        totalRides: data.summary.totalRides
      });

      // If requesting today's data, calculate from daily breakdown
      if (params.period === 'today') {
        return {
          ...data,
          period: 'today',
          summary: this.calculateTodayEarnings(data.dailyBreakdown)
        };
      }

      return data;

    } catch (error: any) {
      console.error('❌ Error fetching earnings:', error);
      throw error;
    }
  }

  // Get wallet balance (if available)
  async getWalletBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/wallet/current`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        // Wallet might not exist, return null instead of throwing
        return null;
      }

      const data = await response.json();
      return {
        balance: data.wallet?.balance || 0,
        currency: 'ZAR'
      };

    } catch (error: any) {
      console.warn('⚠️ Could not fetch wallet balance:', error.message);
      return null;
    }
  }

  // Calculate earnings breakdown (estimates for display)
  calculateEarningsBreakdown(totalEarnings: number) {
    return {
      baseFare: totalEarnings * 0.85,
      surgePricing: totalEarnings * 0.10,
      tips: totalEarnings * 0.05,
      platformFee: totalEarnings * 0.15, // Assuming 15% platform fee
      netEarnings: totalEarnings * 0.85
    };
  }
}

export const earningsService = new EarningsService();
export default earningsService;