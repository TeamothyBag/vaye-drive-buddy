import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, RefreshCw, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import earningsService, { EarningsResponse } from "@/services/earningsService";
import { toast } from "sonner";

const Earnings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const [earningsData, setEarningsData] = useState<EarningsResponse | null>(null);
  const [walletBalance, setWalletBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch earnings data from API
  const fetchEarnings = async (period: 'today' | 'week' | 'month', showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      console.log('📊 Fetching earnings for:', period);
      const data = await earningsService.getEarnings({ period });
      setEarningsData(data);

      console.log('✅ Earnings loaded:', {
        period: data.period,
        totalEarnings: data.summary.totalEarnings,
        totalRides: data.summary.totalRides
      });

    } catch (err: any) {
      console.error('❌ Error fetching earnings:', err);
      setError(err.message || 'Failed to load earnings');
      toast.error('Failed to load earnings data');
      
      // Set empty state on error
      setEarningsData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      const balance = await earningsService.getWalletBalance();
      setWalletBalance(balance);
    } catch (err: any) {
      console.warn('⚠️ Could not fetch wallet balance:', err.message);
    }
  };

  // Load earnings on component mount and when tab changes
  useEffect(() => {
    if (user) {
      fetchEarnings(activeTab as 'today' | 'week' | 'month');
    }
  }, [user, activeTab]);

  // Load wallet balance on mount
  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
  }, [user]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarnings(activeTab as 'today' | 'week' | 'month', false);
    fetchWalletBalance();
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Calculate current stats from API data
  const currentStats = earningsData ? {
    total: earningsData.summary.totalEarnings,
    rides: earningsData.summary.totalRides,
    distance: earningsData.summary.totalDistance,
    average: earningsData.summary.averageEarningsPerRide,
  } : {
    total: 0,
    rides: 0,
    distance: 0,
    average: 0,
  };

  // Calculate earnings breakdown
  const earningsBreakdown = earningsData ? 
    earningsService.calculateEarningsBreakdown(earningsData.summary.totalEarnings) : null;

  return (
    <MobileLayout title="Earnings">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Earnings</h1>
            {walletBalance && (
              <div className="flex items-center gap-2 mt-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Balance: R{walletBalance.balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading earnings...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div className="space-y-1">
                <p className="font-semibold">Unable to load earnings</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => fetchEarnings(activeTab as 'today' | 'week' | 'month')} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Content - Show only when not loading and no error */}
        {!loading && !error && (
          <>
            {/* Period Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {/* Total Earnings Card */}
            <div className="glass rounded-3xl p-8 shadow-lg text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-yellow">
                <DollarSign className="w-8 h-8 text-vaye-navy" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
                <h2 className="text-5xl font-bold text-foreground">
                  R{currentStats.total.toFixed(2)}
                </h2>
              </div>
              <div className="flex items-center justify-center gap-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12.5% from last period</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Rides</p>
                <p className="text-2xl font-bold text-foreground">{currentStats.rides}</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Distance</p>
                <p className="text-2xl font-bold text-foreground">{currentStats.distance.toFixed(1)}km</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Average</p>
                <p className="text-2xl font-bold text-foreground">R{currentStats.average.toFixed(0)}</p>
              </div>
            </div>

            {/* Breakdown */}
            {earningsBreakdown && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg mb-4">Earnings Breakdown</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base Fare</span>
                    <span className="font-semibold">R{earningsBreakdown.baseFare.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Surge Pricing</span>
                    <span className="font-semibold text-warning">R{earningsBreakdown.surgePricing.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tips</span>
                    <span className="font-semibold text-success">R{earningsBreakdown.tips.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (15%)</span>
                    <span className="font-semibold text-destructive">-R{earningsBreakdown.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Net Earnings</span>
                    <span className="font-bold text-lg text-success">R{earningsBreakdown.netEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button className="w-full bg-gradient-yellow text-vaye-navy hover:opacity-90 shadow-yellow" size="lg">
                <Calendar className="w-5 h-5 mr-2" />
                View Detailed Report
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                Export to PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </MobileLayout>
  );
};

export default Earnings;
