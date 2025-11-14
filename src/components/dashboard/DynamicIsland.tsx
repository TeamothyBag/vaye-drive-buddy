import { DollarSign } from "lucide-react";

interface DynamicIslandProps {
  earnings: number;
}

const DynamicIsland = ({ earnings }: DynamicIslandProps) => {
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
      <button className="glass rounded-full px-6 py-3 shadow-lg hover:scale-105 transition-transform cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-yellow flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-vaye-navy" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Today's Earnings</p>
            <p className="font-bold text-lg text-foreground">R{earnings.toFixed(2)}</p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default DynamicIsland;
