import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, PanInfo, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  Navigation, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCcw,
  X,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Local types
interface LocationCoords {
  lat: number;
  lng: number;
}

interface UnifiedRequest {
  _id: string;
  type: 'ride' | 'delivery';
  status: string;
  pickup?: {
    address: string;
    coordinates: LocationCoords;
  };
  dropoff?: {
    address: string;
    coordinates: LocationCoords;
  };
  rider?: {
    fullName: string;
  };
  customer?: {
    name: string;
  };
}

interface SwipeableBottomSheetProps {
  activeTrip: UnifiedRequest;
  directions: google.maps.DirectionsResult | null;
  currentDestination: { lat: number; lng: number } | null;
  distanceToDestination?: number;
  hasArrivedAtPickup: boolean;
  hasArrivedAtDestination: boolean;
  onStartTrip: () => void;
  onCompleteTrip: () => void;
  onNavigateExternal: () => void;
  onCancelTrip?: (reason?: string) => void;
}

type SheetPosition = 'collapsed' | 'partial' | 'expanded';

// Constants for better maintainability
const SHEET_HEIGHTS = {
  collapsed: 160, // Increased for better touch targets
  partial: 340,
  expanded: () => Math.min(window.innerHeight * 0.7, 600), // 70% max for better content viewing
} as const;

const DRAG_CONFIG = {
  velocityThreshold: 500, // Increased for more deliberate gestures
  offsetThreshold: 50,
  dragElastic: 0.1,
  dampingCollapsed: 30,
  dampingExpanded: 35,
  stiffness: 300,
} as const;

const getManeuverIcon = (maneuver: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'turn-left': <ArrowLeft className="w-4 h-4" />,
    'turn-right': <ArrowRight className="w-4 h-4" />,
    'turn-slight-left': <ArrowLeft className="w-4 h-4 opacity-60" />,
    'turn-slight-right': <ArrowRight className="w-4 h-4 opacity-60" />,
    'straight': <ArrowUp className="w-4 h-4" />,
    'uturn-left': <RotateCcw className="w-4 h-4" />,
    'uturn-right': <RotateCcw className="w-4 h-4 scale-x-[-1]" />,
    'ramp-left': <ArrowLeft className="w-4 h-4 opacity-60" />,
    'ramp-right': <ArrowRight className="w-4 h-4 opacity-60" />,
    'merge': <ArrowUp className="w-4 h-4" />,
    'fork-left': <ArrowLeft className="w-4 h-4 opacity-60" />,
    'fork-right': <ArrowRight className="w-4 h-4 opacity-60" />,
    'ferry': <Navigation className="w-4 h-4" />,
    'ferry-train': <Navigation className="w-4 h-4" />,
    'roundabout-left': <RotateCcw className="w-4 h-4" />,
    'roundabout-right': <RotateCcw className="w-4 h-4 scale-x-[-1]" />,
  };
  
  return iconMap[maneuver] || <Navigation className="w-4 h-4" />;
};

const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
  activeTrip,
  directions,
  currentDestination,
  distanceToDestination,
  hasArrivedAtPickup,
  hasArrivedAtDestination,
  onStartTrip,
  onCompleteTrip,
  onNavigateExternal,
  onCancelTrip,
}) => {
  const [position, setPosition] = useState<SheetPosition>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const isEnRoute = activeTrip.status === "accepted" || activeTrip.status === "arrived";
  const isInProgress = activeTrip.status === "started" || activeTrip.status === "in_progress";

  // Monitor trip status changes
  useEffect(() => {
    console.log('🔄 SwipeableBottomSheet: activeTrip.status changed to:', activeTrip.status);
    console.log('🎯 SwipeableBottomSheet: isEnRoute:', isEnRoute, 'isInProgress:', isInProgress);
  }, [activeTrip.status, isEnRoute, isInProgress]);

  // Memoized calculations for better performance
  const navigationSteps = useMemo(
    () => directions?.routes[0]?.legs[0]?.steps || [],
    [directions]
  );
  
  const currentStep = navigationSteps[0];
  const nextFewSteps = useMemo(
    () => navigationSteps.slice(0, 6),
    [navigationSteps]
  );

  const expandedHeight = useMemo(() => SHEET_HEIGHTS.expanded(), []);

  const getSheetHeight = useCallback((pos: SheetPosition): number => {
    switch (pos) {
      case 'collapsed': return SHEET_HEIGHTS.collapsed;
      case 'partial': return SHEET_HEIGHTS.partial;
      case 'expanded': return expandedHeight;
      default: return SHEET_HEIGHTS.collapsed;
    }
  }, [expandedHeight]);

  // Prevent body scroll when sheet is expanded
  useEffect(() => {
    if (position === 'expanded') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [position]);

  // Handle escape key to collapse sheet
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && position === 'expanded') {
        setPosition('partial');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [position]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false);
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Determine new position based on drag direction and velocity
    if (velocity > DRAG_CONFIG.velocityThreshold || offset > DRAG_CONFIG.offsetThreshold) {
      // Dragging down - collapse sheet
      if (position === 'expanded') setPosition('partial');
      else if (position === 'partial') setPosition('collapsed');
    } else if (velocity < -DRAG_CONFIG.velocityThreshold || offset < -DRAG_CONFIG.offsetThreshold) {
      // Dragging up - expand sheet
      if (position === 'collapsed') setPosition('partial');
      else if (position === 'partial') setPosition('expanded');
    }
  }, [position]);

  const togglePosition = useCallback(() => {
    setPosition(prev => {
      if (prev === 'collapsed') return 'partial';
      if (prev === 'partial') return 'expanded';
      return 'collapsed';
    });
  }, []);

  const collapseSheet = useCallback(() => {
    setPosition('collapsed');
  }, []);

  // Backdrop click handler
  const handleBackdropClick = useCallback(() => {
    if (position === 'expanded') {
      setPosition('partial');
    }
  }, [position]);

  // Show appropriate action button based on arrival status and trip state
  const getActionButton = useCallback(() => {
    console.log('🔘 SwipeableBottomSheet: getActionButton called');
    console.log('📊 Trip status:', activeTrip.status);
    console.log('🎯 isEnRoute:', isEnRoute, 'isInProgress:', isInProgress);
    console.log('📍 hasArrivedAtPickup:', hasArrivedAtPickup, 'hasArrivedAtDestination:', hasArrivedAtDestination);
    
    if (isEnRoute && hasArrivedAtPickup) {
      console.log('✅ SwipeableBottomSheet: Showing START TRIP button');
      return (
        <Button
          onClick={onStartTrip}
          className="w-full arrival-button text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Start the trip"
        >
          Start Trip
        </Button>
      );
    } else if (isInProgress && hasArrivedAtDestination) {
      console.log('✅ SwipeableBottomSheet: Showing COMPLETE TRIP button');
      return (
        <Button
          onClick={onCompleteTrip}
          className="w-full completion-button text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Complete the trip"
        >
          Complete Trip
        </Button>
      );
    }
    console.log('❌ SwipeableBottomSheet: No action button shown');
    return null;
  }, [activeTrip.status, isEnRoute, isInProgress, hasArrivedAtPickup, hasArrivedAtDestination, onStartTrip, onCompleteTrip]);

  const customerInitial = useMemo(
    () => activeTrip.customer?.name?.charAt(0).toUpperCase() || activeTrip.rider?.fullName?.charAt(0).toUpperCase() || 'R',
    [activeTrip]
  );

  const customerName = useMemo(
    () => activeTrip.customer?.name || activeTrip.rider?.fullName || 'Rider',
    [activeTrip]
  );

  const handleCancelTrip = useCallback(() => {
    if (onCancelTrip) {
      onCancelTrip(cancelFeedback.trim() || undefined);
      setShowCancelDialog(false);
      setCancelFeedback('');
    }
  }, [onCancelTrip, cancelFeedback]);

  const handleCancelDialog = useCallback(() => {
    setShowCancelDialog(false);
    setCancelFeedback('');
  }, []);

  return (
    <>
      {/* Backdrop - only visible when expanded */}
      <AnimatePresence>
        {position === 'expanded' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
        <motion.div
          ref={sheetRef}
          className={`bottom-sheet-glass rounded-t-3xl pointer-events-auto transition-shadow duration-200 ${
            position === 'expanded' ? 'shadow-2xl' : 'shadow-lg'
          }`}
          style={{
            height: getSheetHeight(position),
            y: 0,
            // Safe area handling for notched devices
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          animate={{
            height: getSheetHeight(position),
          }}
          transition={{
            type: "spring",
            damping: position === 'expanded' ? DRAG_CONFIG.dampingExpanded : DRAG_CONFIG.dampingCollapsed,
            stiffness: DRAG_CONFIG.stiffness,
            duration: shouldReduceMotion ? 0 : undefined,
          }}
          drag="y"
          dragConstraints={{ 
            top: 0,
            bottom: 0 
          }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          role="dialog"
          aria-label="Trip details bottom sheet"
          aria-expanded={position === 'expanded'}
        >
          {/* Drag Handle Area - Larger touch target */}
          <div 
            className="flex justify-center py-4 cursor-grab active:cursor-grabbing swipe-handle relative"
            onClick={togglePosition}
            role="button"
            tabIndex={0}
            aria-label={`${position === 'expanded' ? 'Collapse' : 'Expand'} bottom sheet`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePosition();
              }
            }}
          >
            {/* Visual drag handle */}
            <div className={`w-12 h-1.5 rounded-full transition-all duration-200 ${
              position === 'expanded' 
                ? 'bg-primary/70 shadow-sm' 
                : isDragging 
                  ? 'bg-primary/50 w-16' 
                  : 'bg-gray-300 hover:bg-gray-400'
            }`} />
            
            {/* Indicator for collapsed state */}
            {position === 'collapsed' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-1 text-xs text-muted-foreground"
              >
                <ChevronUp className="w-4 h-4" />
              </motion.div>
            )}
          </div>

          {/* Sheet Content */}
          <div 
            ref={contentRef}
            className="px-6 pb-6 overflow-hidden flex flex-col h-full"
            style={{ 
              maxHeight: `calc(${getSheetHeight(position)}px - 48px - env(safe-area-inset-bottom))` 
            }}
          >
            {/* Trip Summary */}
            <div className="flex-shrink-0">
              {/* Header with close button for expanded state */}
              {position === 'expanded' && (
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Trip Details</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseSheet}
                    className="h-8 w-8 p-0 rounded-full"
                    aria-label="Close details"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-md"
                    aria-hidden="true"
                  >
                    <span className="text-white font-bold text-lg">
                      {customerInitial}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg truncate">{customerName}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {activeTrip.type === 'delivery' ? 'Delivery' : 'Ride'}
                      </Badge>
                      {distanceToDestination && distanceToDestination > 0 && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Math.round(distanceToDestination)}m away
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateExternal}
                  className="flex items-center gap-2 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
                  aria-label="Open external navigation"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="hidden sm:inline">Navigate</span>
                </Button>
              </div>

              {/* Destination Info with better visual hierarchy */}
              <div className="space-y-3 mb-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-green-500 ring-2 ring-green-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-green-600 mb-1">
                      {isEnRoute ? 'Pickup Location' : 'Current Location'}
                    </p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {isEnRoute 
                        ? activeTrip.pickup?.address || 'Pickup location'
                        : 'Your current location'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Connection line */}
                <div className="ml-[7px] w-0.5 h-4 bg-gradient-to-b from-green-500 to-red-500" />
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-red-500 ring-2 ring-red-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-red-600 mb-1">
                      {isEnRoute ? 'Destination (after pickup)' : 'Destination'}
                    </p>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {activeTrip.dropoff?.address || 'Drop-off location'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mb-4 space-y-3">
                {getActionButton()}
                
                {/* Cancel Trip Button - Show for active trips */}
                {(isEnRoute || isInProgress) && onCancelTrip && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                    aria-label="Cancel trip"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Trip
                  </Button>
                )}
              </div>
            </div>

            {/* Navigation Instructions - Only shown when partial or expanded */}
            <AnimatePresence mode="wait">
              {position !== 'collapsed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ 
                    duration: shouldReduceMotion ? 0 : 0.2,
                    ease: "easeInOut" 
                  }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  <div className="border-t border-border pt-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h4 className="font-semibold text-base flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        Navigation
                      </h4>
                      {position === 'partial' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPosition('expanded')}
                          className="text-xs"
                          aria-label="View all navigation steps"
                        >
                          View All
                          <ChevronUp className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>

                    {/* Current Step Highlight */}
                    {currentStep && (
                      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-3 border border-primary/20 shadow-sm flex-shrink-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5 text-primary">
                            {getManeuverIcon(currentStep.maneuver || 'straight')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary text-sm mb-2">
                              {stripHtml(currentStep.instructions)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium">{currentStep.distance?.text}</span>
                              {currentStep.duration && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{currentStep.duration.text}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upcoming Steps - Scrollable */}
                    {position === 'expanded' && nextFewSteps.length > 1 && (
                      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                        <div className="space-y-2 pb-4">
                          <h5 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-950 py-2 z-10">
                            <span>Upcoming Steps</span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {nextFewSteps.length - 1}
                            </span>
                          </h5>
                          {nextFewSteps.slice(1).map((step, index) => (
                            <motion.div
                              key={`${step.distance?.value}-${index}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                delay: shouldReduceMotion ? 0 : index * 0.05,
                                duration: shouldReduceMotion ? 0 : 0.2 
                              }}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                                {getManeuverIcon(step.maneuver || 'straight')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm line-clamp-2 mb-1">
                                  {stripHtml(step.instructions)}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{step.distance?.text}</span>
                                  {step.duration && (
                                    <>
                                      <span>•</span>
                                      <span>{step.duration.text}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No navigation data message */}
                    {!currentStep && (
                      <div className="flex-1 flex items-center justify-center py-8">
                        <div className="text-center text-muted-foreground">
                          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Navigation data loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Cancel Trip Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={handleCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cancel Trip
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this trip? This action cannot be undone and may affect your driver rating.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="cancel-feedback" className="text-sm font-medium">
                Reason for cancellation (optional)
              </Label>
              <Textarea
                id="cancel-feedback"
                placeholder="Please provide a brief reason for cancelling this trip..."
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancelFeedback.length}/250 characters
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDialog}
              className="flex-1"
            >
              Keep Trip
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelTrip}
              className="flex-1"
            >
              Cancel Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SwipeableBottomSheet;