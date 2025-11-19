import { useState, useEffect } from "react";
import { Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import tripService, { Trip, TripSummary, TripPagination } from "@/services/tripService";
import { useAuth } from "@/contexts/AuthContext";

const Trips = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [pagination, setPagination] = useState<TripPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Fetch trips from API
  const fetchTrips = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const data = await tripService.getTrips({
        status: activeFilter as 'all' | 'completed' | 'cancelled',
        search: searchTerm,
        page: 1,
        limit: 50 // Get more trips for better UX
      });

      setTrips(data.trips);
      setSummary(data.summary);
      setPagination(data.pagination);

      console.log('📱 Trips loaded:', data.trips.length);

    } catch (err: any) {
      console.error('❌ Error fetching trips:', err);
      setError(err.message || 'Failed to load trips');
      toast.error('Failed to load trip history');
      
      // Set empty state on error
      setTrips([]);
      setSummary(null);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load trips on component mount and when filters change
  useEffect(() => {
    if (user) {
      console.log('🔄 Loading trips for user:', user.name, 'with filter:', activeFilter);
      fetchTrips();
    }
  }, [user, activeFilter]);

  // Handle search with debounce
  useEffect(() => {
    if (user && searchTerm !== undefined) {
      const timer = setTimeout(() => {
        fetchTrips();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrips(false);
  };

  // Handle filter change
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    setSearchTerm(""); // Clear search when changing filters
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <MobileLayout title="Trip History">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search trips..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(filter.id)}
              className={activeFilter === filter.id ? "bg-primary text-primary-foreground" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Summary Stats */}
        {summary && !loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-success">R{summary.totalEarnings.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{summary.totalTrips}</p>
              <p className="text-xs text-muted-foreground">Total Trips</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{summary.totalDistance} km</p>
              <p className="text-xs text-muted-foreground">Distance Driven</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-500">{parseFloat(summary.avgRating).toFixed(1) || '0.0'}⭐</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading trips...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold">Unable to load trips</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => fetchTrips()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trips.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">No trips found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try a different search term' : 'Your trip history will appear here'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trip List */}
      {!loading && !error && trips.length > 0 && (
        <div className="flex-1 px-4 space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="glass rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-lg">{trip.passenger || 'Unknown Passenger'}</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.date} at {trip.time}
                  </p>
                </div>
                <Badge variant="outline" className={getStatusColor(trip.status)}>
                  {trip.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-success mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="text-sm font-medium">{trip.pickup}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Dropoff</p>
                    <p className="text-sm font-medium">{trip.dropoff}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fare Earned</p>
                    <p className="font-bold text-success">R{trip.fare.toFixed(2)}</p>
                  </div>
                  {trip.rating > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="font-semibold">{"⭐".repeat(Math.min(trip.rating, 5))}</p>
                    </div>
                  )}
                  {trip.distance && (
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="font-semibold text-xs">{trip.distance}</p>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
};

export default Trips;
