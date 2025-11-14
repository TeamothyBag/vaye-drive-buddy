import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/dashboard/BottomNav";

const Trips = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const mockTrips = [
    {
      id: "1",
      date: "2024-01-14",
      time: "14:30",
      passenger: "Sarah Johnson",
      pickup: "Sandton City",
      dropoff: "Rosebank Mall",
      fare: 45.00,
      status: "completed",
      rating: 5,
    },
    {
      id: "2",
      date: "2024-01-14",
      time: "12:15",
      passenger: "Mike Anderson",
      pickup: "OR Tambo Airport",
      dropoff: "Sandton",
      fare: 125.00,
      status: "completed",
      rating: 4,
    },
    {
      id: "3",
      date: "2024-01-14",
      time: "09:45",
      passenger: "Lisa Chen",
      pickup: "Fourways Mall",
      dropoff: "Centurion",
      fare: 89.50,
      status: "cancelled",
      rating: null,
    },
  ];

  const filters = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

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
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-6">
        <h1 className="text-2xl font-bold text-vaye-navy">Trip History</h1>
        <p className="text-sm text-vaye-navy/70 mt-1">View your past rides</p>
      </header>

      {/* Search Bar */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by passenger name..."
            className="pl-10"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
              className={activeFilter === filter.id ? "bg-primary text-primary-foreground" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Trip List */}
      <div className="flex-1 px-4 space-y-3">
        {mockTrips.map((trip) => (
          <div
            key={trip.id}
            className="glass rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-lg">{trip.passenger}</p>
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
                {trip.rating && (
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="font-semibold">{"⭐".repeat(trip.rating)}</p>
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

      <BottomNav />
    </div>
  );
};

export default Trips;
