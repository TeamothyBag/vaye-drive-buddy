import { useState, useEffect } from "react";
import { ChevronRight, Bell, Volume2, Globe, Lock, HelpCircle, Shield, RefreshCw, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useNetwork } from "@/hooks/useNetwork";

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { preferences, isLoading, error, updatePreference, refreshPreferences, clearError } = usePreferences();
  const { isOnline: networkOnline } = useNetwork();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Handle preference toggle with network check
  const handlePreferenceToggle = async (key: keyof typeof preferences, value: boolean) => {
    if (!networkOnline) {
      toast.error('No internet connection. Please check your network and try again.');
      return;
    }
    
    try {
      await updatePreference(key, value);
    } catch (err) {
      // Error handling is done in the context
      console.error('Failed to update preference:', err);
    }
  };

  const settingsSections = [
    {
      title: "App Settings",
      icon: Bell,
      items: [
        { 
          label: "Notifications", 
          description: "Ride requests and updates",
          type: "toggle",
          value: preferences.notifications,
          onChange: (value: boolean) => handlePreferenceToggle('notifications', value),
        },
        { 
          label: "Sound & Vibration", 
          description: "Alert sounds and haptics",
          type: "toggle",
          value: preferences.sounds,
          onChange: (value: boolean) => handlePreferenceToggle('sounds', value),
        },
        { label: "Language", description: preferences.language, type: "navigate", action: () => toast.info('Language settings coming soon') },
        { label: "Theme", description: preferences.theme, type: "navigate", action: () => toast.info('Theme settings coming soon') },
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
          value: preferences.locationSharing,
          onChange: (value: boolean) => handlePreferenceToggle('locationSharing', value),
        },
        { 
          label: "Two-Factor Authentication", 
          description: preferences.twoFactorAuth ? "Enabled" : "Not enabled", 
          type: "toggle",
          value: preferences.twoFactorAuth,
          onChange: (value: boolean) => handlePreferenceToggle('twoFactorAuth', value),
        },
        { label: "Data Privacy", description: "Manage your data", type: "navigate", action: () => toast.info('Data privacy settings coming soon') },
      ],
    },
    {
      title: "Communication",
      icon: Volume2,
      items: [
        { 
          label: "Auto-reply Messages", 
          description: preferences.autoReply ? "Enabled" : "Disabled",
          type: "toggle",
          value: preferences.autoReply,
          onChange: (value: boolean) => handlePreferenceToggle('autoReply', value),
        },
        { label: "Call Preferences", description: "Manage call settings", type: "navigate", action: () => toast.info('Call preferences coming soon') },
      ],
    },
    {
      title: "Support",
      icon: HelpCircle,
      items: [
        { label: "Help Center", description: "FAQs and guides", type: "navigate", action: () => toast.info('Help center coming soon') },
        { label: "Report an Issue", description: "Get help", type: "navigate", action: () => toast.info('Issue reporting coming soon') },
        { label: "Contact Support", description: "Chat with us", type: "navigate", action: () => toast.info('Support chat coming soon') },
      ],
    },
    {
      title: "Account",
      icon: Shield,
      items: [
        { 
          label: "Logout", 
          description: "Sign out of your account",
          type: "action",
          action: () => setShowLogoutDialog(true),
          destructive: true
        },
      ],
    },
  ];

  return (
    <MobileLayout 
      title="Settings" 
      showBackButton
      headerAction={
        <div className="flex items-center gap-2">
          {!networkOnline && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={refreshPreferences}
            disabled={isLoading || !networkOnline}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* User Info */}
        {user && (
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-vaye-gold via-amber-400 to-yellow-500 flex items-center justify-center">
                <span className="text-vaye-navy font-semibold text-lg">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{user.name || 'Driver'}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div className="space-y-1">
                <p className="font-semibold">Unable to load settings</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={refreshPreferences} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Settings List */}
        {!isLoading && !error && (
          <>
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
                            <Label htmlFor={item.label} className={`text-base font-medium ${item.destructive ? 'text-destructive' : ''}`}>
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
                              disabled={isLoading || !networkOnline}
                            />
                        </div>
                      ) : (
                        <button 
                          className={`w-full flex items-center justify-between text-left ${item.destructive ? 'text-destructive' : ''}`}
                          onClick={item.action}
                          disabled={isLoading}
                        >
                          <div className="flex-1">
                            <p className="font-medium flex items-center gap-2">
                              {item.destructive && <LogOut className="w-4 h-4" />}
                              {item.label}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>
                          {!item.destructive && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
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
              <p className="text-xs mt-1">© 2025 Vaye. All rights reserved.</p>
            </div>
          </>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to continue using the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutDialog(false);
                logout();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default Settings;
