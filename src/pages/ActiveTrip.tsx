import { Phone, MessageCircle, Navigation as NavigationIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTrip } from "@/contexts/TripContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ActiveTrip = () => {
  const { activeTrip, arriveAtPickup, startTrip, completeTrip, cancelTrip } = useTrip();
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [rating, setRating] = useState(5);

  if (!activeTrip) {
    navigate("/dashboard");
    return null;
  }

  const handleNavigate = () => {
    const destination = activeTrip.status === "accepted" || activeTrip.status === "arrived"
      ? activeTrip.pickup
      : activeTrip.dropoff;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.coordinates.latitude},${destination.coordinates.longitude}`;
    window.open(url, "_blank");
    toast.success("Opening navigation...");
  };

  const handleCall = () => {
    window.location.href = `tel:${activeTrip.passenger.phone}`;
  };

  const handleMessage = () => {
    toast.info("Chat feature coming soon");
  };

  const handleComplete = () => {
    completeTrip(rating);
    setShowCompleteDialog(false);
    navigate("/dashboard");
  };

  const handleCancel = () => {
    cancelTrip();
    setShowCancelDialog(false);
    navigate("/dashboard");
  };

  const getStatusText = () => {
    switch (activeTrip.status) {
      case "accepted":
        return "On the way to pickup";
      case "arrived":
        return "Arrived at pickup";
      case "started":
        return "Trip in progress";
      default:
        return "Active Trip";
    }
  };

  const getProgressPercentage = () => {
    switch (activeTrip.status) {
      case "accepted":
        return 25;
      case "arrived":
        return 50;
      case "started":
        return 75;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Map Placeholder */}
      <div className="flex-1 relative bg-gradient-to-br from-muted to-muted-foreground/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <MapPin className="w-16 h-16 text-primary mx-auto" />
            <p className="text-lg font-semibold">Navigation View</p>
            <p className="text-sm text-muted-foreground">
              Route map would appear here
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="absolute top-4 inset-x-4 glass rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-primary">{getStatusText()}</span>
            <span className="text-xs text-muted-foreground">
              {activeTrip.distance} km • {activeTrip.duration} min
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-yellow transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Navigate Button */}
        <Button
          onClick={handleNavigate}
          size="lg"
          className="absolute bottom-6 right-4 bg-primary text-primary-foreground shadow-lg"
        >
          <NavigationIcon className="w-5 h-5 mr-2" />
          Navigate
        </Button>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-card rounded-t-3xl shadow-2xl p-6 space-y-6">
        {/* Passenger Info */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-primary">
            <AvatarImage src={activeTrip.passenger.profilePicture} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {activeTrip.passenger.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{activeTrip.passenger.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>⭐ {activeTrip.passenger.rating}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCall}>
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleMessage}>
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Route */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="w-0.5 flex-1 bg-border" />
              <NavigationIcon className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 space-y-4 pb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                <p className="font-medium text-sm">{activeTrip.pickup.address}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dropoff</p>
                <p className="font-medium text-sm">{activeTrip.dropoff.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {activeTrip.status === "accepted" && (
            <Button
              onClick={arriveAtPickup}
              className="w-full bg-gradient-yellow text-vaye-navy hover:opacity-90 shadow-yellow"
              size="lg"
            >
              Arrived at Pickup
            </Button>
          )}

          {activeTrip.status === "arrived" && (
            <Button
              onClick={startTrip}
              className="w-full bg-success hover:bg-success/90 text-white"
              size="lg"
            >
              Start Trip
            </Button>
          )}

          {activeTrip.status === "started" && (
            <Button
              onClick={() => setShowCompleteDialog(true)}
              className="w-full bg-success hover:bg-success/90 text-white"
              size="lg"
            >
              Complete Trip
            </Button>
          )}

          <Button
            onClick={() => setShowCancelDialog(true)}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
            size="lg"
          >
            Cancel Trip
          </Button>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this trip? This may affect your completion rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continue Trip</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-white">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Rate your passenger</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">You earned</p>
                  <p className="text-2xl font-bold text-success">R{activeTrip.fare.toFixed(2)}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} className="bg-success text-white">
              Complete & Rate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveTrip;
