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
    <nav className="bg-card border-t border-border">
      <div className="flex items-center justify-around h-20 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "transition-all",
                    isActive && "scale-110"
                  )}
                >
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
