import { useState } from "react";
import { X, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EarningsModalProps {
  onClose: () => void;
  todayEarnings: number;
  todayRides: number;
}

const EarningsModal = ({ onClose, todayEarnings, todayRides }: EarningsModalProps) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ["Today", "This Week", "This Month"];

  const data = [
    {
      total: todayEarnings,
      rides: todayRides,
      hours: 6.5,
      average: todayEarnings / todayRides,
      trend: "+12.5%",
    },
    {
      total: 4234.00,
      rides: 58,
      hours: 32,
      average: 73.00,
      trend: "+8.3%",
    },
    {
      total: 18567.50,
      rides: 247,
      hours: 142,
      average: 75.17,
      trend: "+15.7%",
    },
  ];

  const currentData = data[activeTab];

  const nextTab = () => {
    setActiveTab((prev) => (prev + 1) % tabs.length);
  };

  const prevTab = () => {
    setActiveTab((prev) => (prev - 1 + tabs.length) % tabs.length);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto max-h-[80vh] overflow-hidden">
        <div className="bg-card rounded-3xl shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-yellow px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-vaye-navy">Earnings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-vaye-navy hover:bg-vaye-navy/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevTab}
                className="w-8 h-8"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex-1 text-center">
                <h3 className="text-lg font-semibold">{tabs[activeTab]}</h3>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {tabs.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeTab
                          ? "w-8 bg-primary"
                          : "w-1.5 bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextTab}
                className="w-8 h-8"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[50vh]">
            {/* Total Earnings */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <h3 className="text-4xl font-bold text-foreground">
                R{currentData.total.toFixed(2)}
              </h3>
              <div className="flex items-center justify-center gap-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{currentData.trend} from last period</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Rides</p>
                <p className="text-xl font-bold">{currentData.rides}</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Hours</p>
                <p className="text-xl font-bold">{currentData.hours}</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg/Ride</p>
                <p className="text-xl font-bold">R{currentData.average.toFixed(0)}</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Earnings Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-medium">R{(currentData.total * 0.85).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surge Pricing</span>
                  <span className="font-medium text-warning">R{(currentData.total * 0.10).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tips</span>
                  <span className="font-medium text-success">R{(currentData.total * 0.05).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EarningsModal;
