import React, { useState, useEffect } from 'react';
import { DollarSign, Car, Star, TrendingUp, ChevronLeft, X } from 'lucide-react';
import { DriverStats } from '../../services/requestService';

interface DynamicIslandProps {
  stats: DriverStats | null;
  isVisible: boolean;
}

export function DynamicIsland({ stats, isVisible }: DynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isNewStats, setIsNewStats] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false);
      setShowDetails(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (stats && isVisible) {
      setIsNewStats(true);
      const timer = setTimeout(() => setIsNewStats(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [stats, isVisible]);

  // Floating animation
  useEffect(() => {
    if (!isVisible) return;
    
    const animate = () => {
      const time = Date.now() * 0.001;
      setBubblePosition({
        x: Math.sin(time * 0.5) * 8,
        y: Math.cos(time * 0.3) * 6
      });
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => setShowDetails(true), 300);
      // Auto collapse after 7 seconds
      setTimeout(() => {
        setShowDetails(false);
        setTimeout(() => setIsExpanded(false), 400);
      }, 7000);
    } else {
      // Manual collapse if clicked while expanded
      setShowDetails(false);
      setTimeout(() => setIsExpanded(false), 300);
    }
  };

  if (!isVisible || !stats) {
    return null;
  }

  return (
    <div 
      className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 pointer-events-auto"
      style={{
        transform: `translate(${bubblePosition.x}px, calc(-50% + ${bubblePosition.y}px))`
      }}
    >
      <div
        className={`
          relative transition-all duration-700 ease-out cursor-pointer
          ${isExpanded 
            ? 'translate-x-0' 
            : 'translate-x-2 hover:translate-x-0'
          }
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {/* Main Bubble Container */}
        <div
          className={`
            relative overflow-hidden transition-all duration-500 ease-out
            bg-gradient-to-br from-blue-600/90 to-purple-700/90 backdrop-blur-md
            border border-white/30 shadow-2xl shadow-blue-500/20
            ${isExpanded 
              ? 'rounded-2xl p-6 min-w-[350px]' 
              : 'rounded-full p-4 w-16 h-16 hover:w-18 hover:h-18'
            }
            ${isNewStats && !isExpanded ? 'animate-bounce' : ''}
            ${isHovered && !isExpanded ? 'scale-110' : ''}
          `}
        >
          {/* Bubble Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse" />
          
          {/* Collapsed State - Icon Only */}
          {!isExpanded && (
            <div className="relative flex items-center justify-center w-full h-full">
              <TrendingUp className="w-6 h-6 text-white animate-pulse" />
              {/* Notification Dot */}
              {isNewStats && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
              )}
            </div>
          )}

          {/* Expanded State - Bubble Panel */}
          {isExpanded && (
            <div className="relative text-white">
              {/* Close Button */}
              <button 
                title="Close stats bubble"
                className="absolute -top-2 -right-2 w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(false);
                  setTimeout(() => setIsExpanded(false), 300);
                }}
              >
                <X className="w-3 h-3" />
              </button>

              {/* Header */}
              <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-white/20">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Today's Stats</h3>
              </div>
              
              {showDetails && (
                <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                  {/* Earnings Row */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-green-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-300">Earnings</div>
                        <div className="text-xl font-bold text-green-400">
                          ${stats.todayEarnings.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-green-400 rotate-180" />
                  </div>

                  {/* Trips Row */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-blue-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-300">Trips</div>
                        <div className="text-xl font-bold text-blue-400">
                          {stats.todayTrips}
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-blue-400 rotate-180" />
                  </div>

                  {/* Rating Row */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-yellow-400/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-300">Rating</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {stats.averageRating.toFixed(1)} ★
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-yellow-400 rotate-180" />
                  </div>
                </div>
              )}

              {/* Loading state for details */}
              {!showDetails && (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full mx-auto mb-2" />
                  <div className="text-xs text-gray-400">Loading details...</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}