import { io, Socket } from "socket.io-client";
import config from "../config";
import { LocationUpdate } from "./requestService";

// Driver Socket Service for real-time communication
class DriverSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private driverId: string | null = null;
  private locationBroadcastInterval: number | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  // Connect to Socket.io server
  connect(token: string, driverId: string): void {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    console.log("🔌 Connecting to Socket.io server...");
    
    this.driverId = driverId;
    this.socket = io(config.socketUrl, {
      auth: {
        token,
        driverId,
      },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    this.setupEventListeners();
  }

  // Disconnect from Socket.io server
  disconnect(): void {
    console.log("🔌 Disconnecting from Socket.io server...");
    
    this.stopLocationBroadcast();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.driverId = null;
    this.eventListeners.clear();
  }

  // Check if socket is connected
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Setup default event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Socket connected successfully");
      this.isConnected = true;
      this.emitEvent('socketConnected', { socketId: this.socket?.id });
      
      // Auto-join driver room for notifications
      if (this.driverId) {
        this.joinDriverRoom();
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.isConnected = false;
      this.stopLocationBroadcast();
      this.emitEvent('socketDisconnected', { reason });
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
      this.emitEvent('socketError', { error: error.message });
    });

    // Driver-specific events
    this.socket.on("nearbyRequest", (data) => {
      console.log("🚗 New nearby request received:", data);
      this.emitEvent('nearbyRequest', data);
    });

    this.socket.on("requestCancelled", (data) => {
      console.log("❌ Request cancelled:", data);
      this.emitEvent('requestCancelled', data);
    });

    this.socket.on("tripStatusUpdate", (data) => {
      console.log("📍 Trip status update:", data);
      this.emitEvent('tripStatusUpdate', data);
    });

    this.socket.on("deliveryAssigned", (data) => {
      console.log("📦 Delivery assigned:", data);
      this.emitEvent('deliveryAssigned', data);
    });

    this.socket.on("deliveryStatusUpdate", (data) => {
      console.log("📦 Delivery status update:", data);
      this.emitEvent('deliveryStatusUpdate', data);
    });

    this.socket.on("newMessage", (data) => {
      console.log("💬 New message received:", data);
      this.emitEvent('newMessage', data);
    });

    this.socket.on("driverStatusChanged", (data) => {
      console.log("👤 Driver status changed:", data);
      this.emitEvent('driverStatusChanged', data);
    });

    // Backend notification events
    this.socket.on("driverNotification", (data) => {
      console.log("🔔 Driver notification received:", data);
      this.emitEvent('driverNotification', data);
    });

    // Authentication events
    this.socket.on("authenticated", (data) => {
      console.log("🔐 Socket authenticated successfully:", data);
      this.emitEvent('authenticated', data);
    });

    this.socket.on("auth-error", (data) => {
      console.error("🔐 Socket authentication error:", data);
      this.emitEvent('auth-error', data);
    });
  }

  // Start broadcasting driver location every 5 seconds
  startLocationBroadcast(): void {
    if (this.locationBroadcastInterval) {
      this.stopLocationBroadcast();
    }

    console.log("📍 Starting location broadcast...");
    
    this.locationBroadcastInterval = window.setInterval(() => {
      this.broadcastCurrentLocation();
    }, 5000); // Broadcast every 5 seconds
  }

  // Stop location broadcasting
  stopLocationBroadcast(): void {
    if (this.locationBroadcastInterval) {
      console.log("📍 Stopping location broadcast...");
      clearInterval(this.locationBroadcastInterval);
      this.locationBroadcastInterval = null;
    }
  }

  // Broadcast current location (to be called by geolocation hook)
  broadcastLocation(location: LocationUpdate): void {
    if (!this.isSocketConnected() || !this.driverId) {
      return;
    }

    const locationData = {
      driverId: this.driverId,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      timestamp: location.timestamp || new Date().toISOString(),
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
    };

    this.socket?.emit("driverLocationUpdate", locationData);
    console.log("📍 Location broadcast:", locationData);
  }

  // Internal method to get current location
  private broadcastCurrentLocation(): void {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationUpdate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
        };
        this.broadcastLocation(location);
      },
      (error) => {
        console.warn("Location broadcast failed:", error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Broadcast delivery status update
  broadcastDeliveryStatusUpdate(
    deliveryId: string,
    status: string,
    additionalData: any = {}
  ): void {
    if (!this.isSocketConnected()) {
      console.warn("Socket not connected, delivery status update not broadcasted");
      return;
    }

    const statusData = {
      deliveryId,
      status,
      driverId: this.driverId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    this.socket?.emit("deliveryStatusUpdate", statusData);
    console.log("📦 Delivery status broadcast:", statusData);
  }

  // Join driver room for targeted communication
  joinDriverRoom(): void {
    if (!this.isSocketConnected() || !this.driverId) {
      return;
    }

    this.socket?.emit("joinDriverRoom", { driverId: this.driverId });
    console.log("🏠 Joined driver room:", this.driverId);
  }

  // Leave driver room
  leaveDriverRoom(): void {
    if (!this.isSocketConnected() || !this.driverId) {
      return;
    }

    this.socket?.emit("leaveDriverRoom", { driverId: this.driverId });
    console.log("🏠 Left driver room:", this.driverId);
  }

  // Update driver status
  updateDriverStatus(status: string, additionalData: any = {}): void {
    if (!this.isSocketConnected()) {
      return;
    }

    const statusData = {
      driverId: this.driverId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    this.socket?.emit("driverStatusUpdate", statusData);
    console.log("👤 Driver status update:", statusData);
  }

  // Send message in trip/delivery context
  sendMessage(recipientId: string, message: string, tripId?: string): void {
    if (!this.isSocketConnected()) {
      return;
    }

    const messageData = {
      senderId: this.driverId,
      recipientId,
      message,
      tripId,
      timestamp: new Date().toISOString(),
    };

    this.socket?.emit("sendMessage", messageData);
    console.log("💬 Message sent:", messageData);
  }

  // Event listener management
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit events to registered listeners
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Emit a socket event (for testing/debugging)
  emitSocketEvent(eventName: string, data: any): void {
    if (this.isSocketConnected()) {
      this.socket?.emit(eventName, data);
      console.log(`📡 Emitted socket event: ${eventName}`, data);
    } else {
      console.warn(`⚠️ Cannot emit ${eventName}: socket not connected`);
    }
  }

  // Broadcast driver availability status (online/offline)
  broadcastDriverAvailability(isOnline: boolean, userType: string = 'driver'): void {
    if (!this.isSocketConnected() || !this.driverId) {
      console.warn("⚠️ Cannot broadcast availability: Not connected or no driver ID");
      return;
    }

    const availabilityData = {
      driverId: this.driverId,
      isOnline,
      userType,
      timestamp: new Date().toISOString(),
    };

    this.socket?.emit("driver-availability-update", availabilityData);
    console.log(`🚦 Broadcasting driver availability: ${isOnline ? 'ONLINE' : 'OFFLINE'}`, availabilityData);
  }

  // Manual emit for custom events
  emit(event: string, data: any): void {
    if (this.isSocketConnected()) {
      this.socket?.emit(event, data);
    }
  }

  // Manual listener for custom events
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove manual listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Export singleton instance
const driverSocketService = new DriverSocketService();
export default driverSocketService;