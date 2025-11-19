import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Star, Clock, Car, Package, User } from "lucide-react";

// Unified request interface matching TripContext
interface UnifiedRequest {
  _id: string;
  type: 'ride' | 'delivery';
  status: string;
  createdAt: string;
  estimatedPrice?: number;
  estimatedTotalDistance?: string;
  estimatedTotalDuration?: string;
  
  // Ride-specific fields
  rider?: {
    _id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    averageRating?: number;
    phoneNumber?: string;
    profilePicture?: string;
  };
  pickup?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  dropoff?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  
  // Delivery-specific fields
  orderId?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  deliveryFee?: number;
  totalAmount?: number;
}

interface RideRequestModalProps {
  request: UnifiedRequest;
  onAccept: () => void;
  onDecline: () => void;
}

const RideRequestModal = ({ request, onAccept, onDecline }: RideRequestModalProps) => {
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

  const isRide = request.type === 'ride';
  const isDelivery = request.type === 'delivery';
  
  // Helper functions to get data
  const getCustomerName = () => {
    if (isRide && request.rider) {
      return request.rider.fullName || `${request.rider.firstName} ${request.rider.lastName}`;
    }
    if (isDelivery && request.customer) {
      return request.customer.name;
    }
    return 'Customer';
  };

  const getCustomerRating = () => {
    return isRide && request.rider?.averageRating ? request.rider.averageRating : 4.5;
  };

  const getPickupAddress = () => {
    return request.pickup?.address || 'Pickup location';
  };

  const getDropoffAddress = () => {
    return request.dropoff?.address || 'Dropoff location';
  };

  const getDistance = () => {
    return request.estimatedTotalDistance || 'Unknown';
  };

  const getDuration = () => {
    return request.estimatedTotalDuration || 'Unknown';
  };

  const getEarnings = () => {
    if (isRide) {
      return request.estimatedPrice || 0;
    }
    if (isDelivery) {
      return request.deliveryFee || request.totalAmount || 0;
    }
    return 0;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
                {isRide ? (
                  <Car className="w-5 h-5 text-vaye-navy" />
                ) : (
                  <Package className="w-5 h-5 text-vaye-navy" />
                )}
                <span className="font-semibold text-vaye-navy">
                  New {isRide ? 'Ride' : 'Delivery'} Request
                </span>
                <Badge variant={isRide ? "default" : "secondary"} className="ml-2">
                  {isRide ? 'Ride' : 'Delivery'}
                </Badge>
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
                style={{ width: `${(timeLeft / 20) * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-primary">
                <AvatarImage src={isRide ? request.rider?.profilePicture : undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {getInitials(getCustomerName())}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{getCustomerName()}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-medium">{getCustomerRating().toFixed(1)}</span>
                </div>
                {isDelivery && request.orderId && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Order #{request.orderId}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Items */}
            {isDelivery && request.items && request.items.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Order Items:</p>
                <div className="space-y-1">
                  {request.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>{item.quantity}x {item.name}</span>
                      {item.price && <span>R{item.price.toFixed(2)}</span>}
                    </div>
                  ))}
                  {request.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{request.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            )}

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
                    <p className="text-xs text-muted-foreground mb-1">
                      {isDelivery ? 'Pickup from' : 'Pickup'}
                    </p>
                    <p className="font-medium text-sm">{getPickupAddress()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isDelivery ? 'Deliver to' : 'Dropoff'}
                    </p>
                    <p className="font-medium text-sm">{getDropoffAddress()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-xl">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="font-semibold">{getDistance()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="font-semibold">{getDuration()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {isDelivery ? 'Delivery Fee' : 'Fare'}
                </p>
                <p className="font-semibold text-success">R{getEarnings().toFixed(2)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  console.log("🎯 RideRequestModal: Accept button clicked for request:", request._id);
                  onAccept();
                }}
                className="w-full bg-success hover:bg-success/90 text-white shadow-lg"
                size="lg"
              >
                Accept {isRide ? 'Ride' : 'Delivery'}
              </Button>
              <Button
                onClick={() => {
                  console.log("🚫 RideRequestModal: Decline button clicked for request:", request._id);
                  onDecline();
                }}
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
