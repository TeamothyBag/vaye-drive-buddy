import { NavLink } from "react-router-dom";
import { Home, Navigation, DollarSign, User } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { to: "/dashboard", icon: Home, label: "Dashboard" },
    { to: "/trips", icon: Navigation, label: "Trips" },
    { to: "/earnings", icon: DollarSign, label: "Earnings" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="mobile-bottom-nav bg-card/90 backdrop-blur-md border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-around h-20 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <div
                    className={cn(
                      "transition-all duration-200",
                      isActive && "scale-110"
                    )}
                  >
                    <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all",
                  isActive && "font-semibold"
                )}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
