import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Navigation, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationInstructionsProps {
  directions: google.maps.DirectionsResult | null;
  driverLocation?: { lat: number; lng: number };
  isVisible?: boolean;
  onToggle?: () => void;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
  icon: React.ReactNode;
}

const NavigationInstructions: React.FC<NavigationInstructionsProps> = ({
  directions,
  driverLocation,
  isVisible = true,
  onToggle
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  // Parse directions into navigation steps
  useEffect(() => {
    if (!directions || !directions.routes[0]) {
      setNavigationSteps([]);
      return;
    }

    const route = directions.routes[0];
    const leg = route.legs[0];
    
    if (!leg || !leg.steps) {
      setNavigationSteps([]);
      return;
    }

    const steps = leg.steps.map((step, index) => {
      const instruction = step.instructions?.replace(/<[^>]*>/g, '') || 'Continue straight';
      const distance = step.distance?.text || '';
      const duration = step.duration?.text || '';
      const maneuver = step.maneuver || '';

      // Determine icon based on maneuver type
      let icon = <ArrowUp className="w-4 h-4" />;
      
      if (maneuver.includes('left') || instruction.toLowerCase().includes('left')) {
        icon = <ArrowLeft className="w-4 h-4" />;
      } else if (maneuver.includes('right') || instruction.toLowerCase().includes('right')) {
        icon = <ArrowRight className="w-4 h-4" />;
      } else if (maneuver.includes('uturn') || instruction.toLowerCase().includes('u-turn')) {
        icon = <RotateCcw className="w-4 h-4" />;
      } else if (maneuver.includes('straight') || instruction.toLowerCase().includes('straight')) {
        icon = <ArrowUp className="w-4 h-4" />;
      }

      return {
        instruction,
        distance,
        duration,
        maneuver,
        icon
      };
    });

    setNavigationSteps(steps);
    setCurrentStep(0);
  }, [directions]);

  // Update current step based on driver location (simplified logic)
  useEffect(() => {
    if (!driverLocation || navigationSteps.length === 0) return;

    // This is a simplified implementation
    // In a production app, you'd calculate the actual progress along the route
    // For now, we'll just cycle through steps based on time or distance
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < navigationSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 30000); // Change step every 30 seconds for demo purposes

    return () => clearInterval(interval);
  }, [driverLocation, navigationSteps]);

  if (!isVisible || navigationSteps.length === 0) return null;

  const currentInstruction = navigationSteps[currentStep];
  const nextInstruction = navigationSteps[currentStep + 1];

  return (
    <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none">
      <div className="max-w-sm mx-auto">
        {/* Minimized view */}
        {isMinimized ? (
          <div 
            className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-3 pointer-events-auto cursor-pointer transition-all duration-300 hover:bg-black/30"
            onClick={() => setIsMinimized(false)}
          >
            <div className="flex items-center gap-3">
              <div className="text-vaye-yellow">
                {currentInstruction?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {currentInstruction?.instruction}
                </p>
              </div>
              <div className="text-white/70 text-xs">
                {currentInstruction?.distance}
              </div>
            </div>
          </div>
        ) : (
          /* Expanded view */
          <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-4 pointer-events-auto transition-all duration-300">
            {/* Header with minimize/close buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-vaye-yellow" />
                <span className="text-white text-sm font-medium">Navigation</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setIsMinimized(true)}
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
                {onToggle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={onToggle}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Current instruction */}
            <div className="flex items-start gap-3 mb-3">
              <div className="text-vaye-yellow mt-1 flex-shrink-0">
                {currentInstruction?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-base font-medium leading-tight mb-1">
                  {currentInstruction?.instruction}
                </p>
                <div className="flex items-center gap-4 text-xs text-white/70">
                  <span>{currentInstruction?.distance}</span>
                  {currentInstruction?.duration && (
                    <span>• {currentInstruction.duration}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Next instruction preview */}
            {nextInstruction && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-white/50 text-xs mb-2">Then:</p>
                <div className="flex items-center gap-3">
                  <div className="text-white/40 flex-shrink-0">
                    {nextInstruction.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">
                      {nextInstruction.instruction}
                    </p>
                  </div>
                  <div className="text-white/40 text-xs">
                    {nextInstruction.distance}
                  </div>
                </div>
              </div>
            )}

            {/* Progress indicator */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Step {currentStep + 1} of {navigationSteps.length}</span>
                <span>{Math.round(((currentStep + 1) / navigationSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1">
                <div 
                  className="bg-vaye-yellow h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / navigationSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationInstructions;