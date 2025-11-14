import { useState } from "react";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/dashboard/BottomNav";

const Earnings = () => {
  const [activeTab, setActiveTab] = useState("today");

  const stats = {
    today: {
      total: 847.50,
      rides: 12,
      hours: 6.5,
      average: 70.63,
    },
    week: {
      total: 4234.00,
      rides: 58,
      hours: 32,
      average: 73.00,
    },
    month: {
      total: 18567.50,
      rides: 247,
      hours: 142,
      average: 75.17,
    },
  };

  const currentStats = stats[activeTab as keyof typeof stats];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-6">
        <h1 className="text-2xl font-bold text-vaye-navy">Earnings</h1>
        <p className="text-sm text-vaye-navy/70 mt-1">Track your income</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Period Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {/* Total Earnings Card */}
            <div className="glass rounded-3xl p-8 shadow-lg text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-yellow">
                <DollarSign className="w-8 h-8 text-vaye-navy" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
                <h2 className="text-5xl font-bold text-foreground">
                  R{currentStats.total.toFixed(2)}
                </h2>
              </div>
              <div className="flex items-center justify-center gap-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12.5% from last period</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Rides</p>
                <p className="text-2xl font-bold text-foreground">{currentStats.rides}</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Hours</p>
                <p className="text-2xl font-bold text-foreground">{currentStats.hours}</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Average</p>
                <p className="text-2xl font-bold text-foreground">R{currentStats.average.toFixed(0)}</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4">Earnings Breakdown</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-semibold">R{(currentStats.total * 0.85).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Surge Pricing</span>
                  <span className="font-semibold text-warning">R{(currentStats.total * 0.10).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tips</span>
                  <span className="font-semibold text-success">R{(currentStats.total * 0.05).toFixed(2)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-success">R{currentStats.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button className="w-full bg-gradient-yellow text-vaye-navy hover:opacity-90 shadow-yellow" size="lg">
                <Calendar className="w-5 h-5 mr-2" />
                View Detailed Report
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                Export to PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Earnings;
