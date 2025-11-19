import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "red" | "orange" | "green";
  showZero?: boolean;
  animate?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  className,
  size = "md",
  variant = "red",
  showZero = false,
  animate = true
}) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const shouldShow = count > 0 || showZero;

  const sizeClasses = {
    sm: "h-4 w-4 text-[10px] min-w-4",
    md: "h-5 w-5 text-xs min-w-5", 
    lg: "h-6 w-6 text-sm min-w-6"
  };

  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    red: "bg-red-500 text-white shadow-red-500/25",
    orange: "bg-orange-500 text-white shadow-orange-500/25", 
    green: "bg-green-500 text-white shadow-green-500/25"
  };

  // Animation variants for mobile-friendly feel
  const badgeVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        mass: 0.8
      }
    },
    bounce: {
      scale: [1, 1.3, 1],
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Counter increment animation
  const counterVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key={`badge-${count}`}
          variants={animate ? badgeVariants : {}}
          initial={animate ? "hidden" : "visible"}
          animate={animate ? "visible" : "visible"}
          exit={animate ? "hidden" : "visible"}
          whileTap={{ scale: 0.9 }}
          className={cn(
            // Base styles
            "absolute -top-2 -right-2 rounded-full",
            "flex items-center justify-center",
            "font-bold leading-none",
            "border-2 border-background",
            "shadow-lg",
            // Size classes
            sizeClasses[size],
            // Variant classes
            variantClasses[variant],
            // Custom classes
            className
          )}
          style={{
            // Ensure proper circular shape for single digits
            minWidth: count <= 9 ? undefined : "auto",
            paddingLeft: count > 9 ? "6px" : undefined,
            paddingRight: count > 9 ? "6px" : undefined
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={`count-${count}`}
              variants={animate ? counterVariants : {}}
              initial={animate ? "hidden" : "visible"}
              animate={animate ? "visible" : "visible"}
              exit={animate ? "hidden" : "visible"}
              className="select-none"
            >
              {displayCount}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pulse animation component for urgent notifications
export const PulsingBadge: React.FC<NotificationBadgeProps> = (props) => (
  <motion.div
    animate="pulse"
    variants={{
      pulse: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }}
  >
    <NotificationBadge {...props} animate={false} />
  </motion.div>
);

// Bouncing badge for new notifications
export const BouncingBadge: React.FC<NotificationBadgeProps & { onAnimationComplete?: () => void }> = ({ 
  onAnimationComplete, 
  ...props 
}) => (
  <motion.div
    animate="bounce"
    variants={{
      bounce: {
        scale: [1, 1.4, 1.1, 1],
        rotate: [0, -10, 10, 0],
        transition: {
          duration: 0.8,
          ease: "easeInOut"
        }
      }
    }}
    onAnimationComplete={onAnimationComplete}
  >
    <NotificationBadge {...props} animate={false} />
  </motion.div>
);

export default NotificationBadge;