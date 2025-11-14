import { useState } from "react";
import { ChevronRight, Bell, Volume2, Globe, Lock, HelpCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/dashboard/BottomNav";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  const settingsSections = [
    {
      title: "App Settings",
      icon: Bell,
      items: [
        { 
          label: "Notifications", 
          description: "Ride requests and updates",
          type: "toggle",
          value: notifications,
          onChange: setNotifications,
        },
        { 
          label: "Sound & Vibration", 
          description: "Alert sounds and haptics",
          type: "toggle",
          value: sounds,
          onChange: setSounds,
        },
        { label: "Language", description: "English", type: "navigate" },
        { label: "Theme", description: "System default", type: "navigate" },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Lock,
      items: [
        { 
          label: "Location Sharing", 
          description: "Share location when online",
          type: "toggle",
          value: locationSharing,
          onChange: setLocationSharing,
        },
        { label: "Two-Factor Authentication", description: "Not enabled", type: "navigate" },
        { label: "Data Privacy", description: "Manage your data", type: "navigate" },
      ],
    },
    {
      title: "Communication",
      icon: Volume2,
      items: [
        { label: "Auto-reply Messages", description: "Quick responses", type: "navigate" },
        { label: "Call Preferences", description: "Manage call settings", type: "navigate" },
      ],
    },
    {
      title: "Support",
      icon: HelpCircle,
      items: [
        { label: "Help Center", description: "FAQs and guides", type: "navigate" },
        { label: "Report an Issue", description: "Get help", type: "navigate" },
        { label: "Contact Support", description: "Chat with us", type: "navigate" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-gradient-yellow glass shadow-md px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-vaye-navy mb-2"
        >
          ← Back
        </Button>
        <h1 className="text-2xl font-bold text-vaye-navy">Settings</h1>
        <p className="text-sm text-vaye-navy/70 mt-1">Customize your experience</p>
      </header>

      {/* Settings List */}
      <div className="flex-1 p-4 space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <section.icon className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h2>
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              {section.items.map((item, index) => (
                <div
                  key={item.label}
                  className={`p-4 ${
                    index !== section.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {item.type === "toggle" ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor={item.label} className="text-base font-medium">
                          {item.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <Switch
                        id={item.label}
                        checked={item.value as boolean}
                        onCheckedChange={item.onChange as (checked: boolean) => void}
                      />
                    </div>
                  ) : (
                    <button className="w-full flex items-center justify-between text-left">
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* App Version */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Vaye Driver v1.0.0</p>
          <p className="text-xs mt-1">© 2024 Vaye. All rights reserved.</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
