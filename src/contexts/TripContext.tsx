import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

interface Passenger {
  id: string;
  name: string;
  phone: string;
  rating: number;
  profilePicture?: string;
}

interface Location {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface RideRequest {
  id: string;
  passenger: Passenger;
  pickup: Location;
  dropoff: Location;
  distance: number;
  duration: number;
  fare: number;
  requestTime: number;
}

interface ActiveTrip extends RideRequest {
  status: "accepted" | "arrived" | "started" | "completed";
  startTime?: number;
  endTime?: number;
}

interface TripContextType {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  activeTrip: ActiveTrip | null;
  rideRequest: RideRequest | null;
  acceptRide: () => void;
  declineRide: () => void;
  arriveAtPickup: () => void;
  startTrip: () => void;
  completeTrip: (rating: number) => void;
  cancelTrip: () => void;
  todayEarnings: number;
  todayRides: number;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(847.50);
  const [todayRides, setTodayRides] = useState(12);

  // Simulate ride request polling
  useEffect(() => {
    if (isOnline && !activeTrip && !rideRequest) {
      const pollInterval = setInterval(() => {
        // 30% chance of getting a request
        if (Math.random() > 0.7) {
          const mockRequest: RideRequest = {
            id: "ride_" + Date.now(),
            passenger: {
              id: "pass_123",
              name: "Sarah Johnson",
              phone: "+27 81 234 5678",
              rating: 4.8,
            },
            pickup: {
              address: "123 Main Street, Sandton, Johannesburg",
              coordinates: { latitude: -26.1076, longitude: 28.0567 },
            },
            dropoff: {
              address: "456 Oak Avenue, Rosebank, Johannesburg",
              coordinates: { latitude: -26.1445, longitude: 28.0407 },
            },
            distance: 3.2,
            duration: 12,
            fare: 45.00,
            requestTime: Date.now(),
          };
          setRideRequest(mockRequest);
          toast("New Ride Request!", {
            description: "You have 20 seconds to accept",
          });
        }
      }, 4000);

      return () => clearInterval(pollInterval);
    }
  }, [isOnline, activeTrip, rideRequest]);

  // Auto-decline after 20 seconds
  useEffect(() => {
    if (rideRequest) {
      const timeout = setTimeout(() => {
        setRideRequest(null);
        toast.error("Request expired");
      }, 20000);

      return () => clearTimeout(timeout);
    }
  }, [rideRequest]);

  const acceptRide = () => {
    if (rideRequest) {
      setActiveTrip({
        ...rideRequest,
        status: "accepted",
        startTime: Date.now(),
      });
      setRideRequest(null);
      toast.success("Ride accepted! Navigate to pickup location");
    }
  };

  const declineRide = () => {
    setRideRequest(null);
    toast.info("Request declined");
  };

  const arriveAtPickup = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: "arrived" });
      toast.success("Marked as arrived. Waiting for passenger");
    }
  };

  const startTrip = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: "started" });
      toast.success("Trip started! Navigate to destination");
    }
  };

  const completeTrip = (rating: number) => {
    if (activeTrip) {
      setTodayEarnings(prev => prev + activeTrip.fare);
      setTodayRides(prev => prev + 1);
      setActiveTrip(null);
      toast.success(`Trip completed! You earned R${activeTrip.fare.toFixed(2)}`);
    }
  };

  const cancelTrip = () => {
    setActiveTrip(null);
    toast.error("Trip cancelled");
  };

  return (
    <TripContext.Provider
      value={{
        isOnline,
        setIsOnline,
        activeTrip,
        rideRequest,
        acceptRide,
        declineRide,
        arriveAtPickup,
        startTrip,
        completeTrip,
        cancelTrip,
        todayEarnings,
        todayRides,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error("useTrip must be used within a TripProvider");
  }
  return context;
};
