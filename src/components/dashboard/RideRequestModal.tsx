import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Navigation, Star, Clock } from "lucide-react";

interface RideRequestModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const RideRequestModal = ({ onAccept, onDecline }: RideRequestModalProps) => {
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  const mockRequest = {
    passenger: {
      name: "Sarah Johnson",
      rating: 4.8,
      profilePicture: "",
    },
    pickup: {
      address: "123 Main Street, Sandton",
    },
    dropoff: {
      address: "456 Oak Avenue, Rosebank",
    },
    distance: 3.2,
    duration: 12,
    fare: 45.00,
  };

  return (
    <>
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto">
        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Timer Header */}
          <div className="bg-gradient-yellow px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-vaye-navy" />
                <span className="font-semibold text-vaye-navy">New Ride Request</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-vaye-navy flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{timeLeft}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 h-1 bg-vaye-navy/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-vaye-navy transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              />
            </div>
          </div>

          {/* Passenger Info */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-primary">
                <AvatarImage src={mockRequest.passenger.profilePicture} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {mockRequest.passenger.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{mockRequest.passenger.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-medium">{mockRequest.passenger.rating}</span>
                </div>
              </div>
            </div>

            {/* Route Info */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <div className="w-0.5 h-12 bg-border" />
                  <Navigation className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                    <p className="font-medium text-sm">{mockRequest.pickup.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dropoff</p>
                    <p className="font-medium text-sm">{mockRequest.dropoff.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-xl">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="font-semibold">{mockRequest.distance} km</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="font-semibold">{mockRequest.duration} min</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Fare</p>
                <p className="font-semibold text-success">R{mockRequest.fare.toFixed(2)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onAccept}
                className="w-full bg-success hover:bg-success/90 text-white shadow-lg"
                size="lg"
              >
                Accept Request
              </Button>
              <Button
                onClick={onDecline}
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                size="lg"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RideRequestModal;
