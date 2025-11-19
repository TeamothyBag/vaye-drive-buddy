import { Button } from "@/components/ui/button";
import { Power } from "lucide-react";

interface OnlineToggleProps {
  onGoOnline: () => void;
}

const OnlineToggle = ({ onGoOnline }: OnlineToggleProps) => {
  return (
    <div className="max-w-md mx-auto">
      <div className="glass rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
          <Power className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">You're Offline</h3>
          <p className="text-muted-foreground">
            Go online to start receiving ride requests
          </p>
        </div>

        <Button
          onClick={onGoOnline}
          className="w-full bg-gradient-yellow text-vaye-navy hover:opacity-90 shadow-yellow font-semibold"
          size="lg"
        >
          Go Online
        </Button>

        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="font-semibold text-lg">0</p>
            <p className="text-muted-foreground text-xs">Rides Today</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="font-semibold text-lg">R0.00</p>
            <p className="text-muted-foreground text-xs">Today's Earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineToggle;
