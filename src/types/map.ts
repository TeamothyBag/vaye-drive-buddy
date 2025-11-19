// Google Maps API types for the application

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface Trip {
  _id: string;
  status: string;
  type?: string;
  isDelivery?: boolean;
  pickup: {
    address: string;
    location: {
      coordinates: [number, number];
    };
  };
  dropoff: {
    address: string;
    location: {
      coordinates: [number, number];
    };
  };
  customer?: {
    name: string;
    phone: string;
  };
  rider?: {
    fullName: string;
  };
  deliveryPin?: string;
  orderId?: string;
  notes?: string;
  allPickupDeliveries?: Trip[];
}

export interface MapMarkerInfo {
  position: LocationCoords;
  title: string;
  icon?: {
    path: number;
    scale: number;
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWeight: number;
  };
}

export interface NavigationInstruction {
  instructions: string;
  distance?: {
    text: string;
    value: number;
  };
  duration?: {
    text: string;
    value: number;
  };
}

// Custom direction result type to avoid Google Maps dependency
export interface CustomDirectionsResult {
  routes?: Array<{
    legs?: Array<{
      steps?: NavigationInstruction[];
      distance?: {
        text: string;
        value: number;
      };
      duration?: {
        text: string;
        value: number;
      };
    }>;
  }>;
}

export interface MapProps {
  center?: LocationCoords;
  activeTrip?: Trip | null;
  isOnline: boolean;
  onTripUpdate?: (trip: Trip) => void;
  onTripStatusChange?: (status: string) => void;
}

export interface SlideToConfirmProps {
  onConfirm: () => void;
  text: string;
  confirmText: string;
  bgColor?: string;
  disabled?: boolean;
  variant?: string;
}