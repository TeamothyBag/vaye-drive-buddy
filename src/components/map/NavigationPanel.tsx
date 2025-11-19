import React, { useMemo } from 'react';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { Trip, CustomDirectionsResult } from '@/types/map';

interface NavigationPanelProps {
  activeTrip: Trip | null;
  currentTripStatus: string | null;
  distanceToDestination?: number;
  estimatedTime?: number;
  directions?: CustomDirectionsResult | null;
  onRecenterMap?: () => void;
  onShowFullRoute?: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  activeTrip,
  currentTripStatus,
  distanceToDestination,
  estimatedTime,
  directions,
  onRecenterMap,
  onShowFullRoute,
}) => {
  const isDelivery = useMemo(() => {
    return activeTrip && (
      activeTrip.type === 'delivery' || 
      activeTrip.isDelivery ||
      activeTrip.orderId
    );
  }, [activeTrip]);

  const navigationInstruction = useMemo(() => {
    if (!directions || !directions.routes?.[0]?.legs?.[0]?.steps?.[0]) {
      return null;
    }
    return directions.routes[0].legs[0].steps[0];
  }, [directions]);

  const currentDestination = useMemo(() => {
    if (!activeTrip || !currentTripStatus) return null;
    
    if (currentTripStatus === "accepted" || currentTripStatus === "arrived") {
      return {
        address: activeTrip.pickup.address,
        type: isDelivery ? 'Pickup Location' : 'Pickup Location',
        icon: '📦'
      };
    } else if (currentTripStatus === "started" || currentTripStatus === "in_progress") {
      return {
        address: activeTrip.dropoff.address,
        type: isDelivery ? 'Delivery Location' : 'Dropoff Location',
        icon: isDelivery ? '🏠' : '🎯'
      };
    }
    return null;
  }, [activeTrip, currentTripStatus, isDelivery]);

  if (!activeTrip || !currentDestination) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-white shadow-lg border-b">
      <div className="p-4">
        {/* Destination Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">{currentDestination.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              {currentDestination.type}
            </h3>
            <p className="text-gray-600 text-xs truncate">
              {currentDestination.address}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        {(activeTrip.customer || activeTrip.rider) && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">
                {isDelivery ? 'Customer' : 'Passenger'}: 
              </span>
              <span className="text-gray-600 ml-1">
                {activeTrip.customer?.name || activeTrip.rider?.fullName}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Instruction */}
        {navigationInstruction && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p 
                className="text-blue-900 text-sm font-medium"
                dangerouslySetInnerHTML={{ 
                  __html: navigationInstruction.instructions.replace(/<[^>]*>/g, '') 
                }}
              />
              {navigationInstruction.distance?.text && (
                <p className="text-blue-700 text-xs mt-1">
                  {navigationInstruction.distance.text}
                  {navigationInstruction.duration?.text && ` • ${navigationInstruction.duration.text}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Trip Stats */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {distanceToDestination !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{Math.round(distanceToDestination)}m away</span>
              </div>
            )}
            {estimatedTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{Math.round(estimatedTime / 60)} min</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {onRecenterMap && (
              <button
                onClick={onRecenterMap}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Center map"
              >
                <MapPin className="w-4 h-4" />
              </button>
            )}
            {onShowFullRoute && directions && (
              <button
                onClick={onShowFullRoute}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Show full route"
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationPanel;