import { useState } from "react";
import { Camera, Star, Car, FileText, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCamera } from "@/hooks/useCamera";

const Profile = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { choosePhotoSource, isLoading: cameraLoading } = useCamera();
  const [profilePhoto, setProfilePhoto] = useState<string>("");

  const driverData = {
    name: user?.name || "Demo Driver",
    email: user?.email || "demo@vaye.com",
    phone: user?.phone || "+27 12 345 6789",
    rating: user?.rating || 4.8,
    totalRides: user?.totalTrips || 0,
    memberSince: user?.memberSince || "Jan 2023",
    vehicle: {
      make: user?.vehicle?.make || "Toyota",
      model: user?.vehicle?.model || "Corolla",
      year: user?.vehicle?.year || 2021,
      color: user?.vehicle?.color || "White",
      plate: user?.vehicle?.licensePlate || "CA 123-456",
    },
    stats: {
      totalEarnings: 125678.50,
      acceptanceRate: 94,
      completionRate: 98,
    },
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const handleChangePhoto = async () => {
    const photo = await choosePhotoSource();
    if (photo?.webPath) {
      setProfilePhoto(photo.webPath);
      toast.success("Profile photo updated");
    }
  };

  return (
    <MobileLayout 
      title="Profile"
      headerAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="glass rounded-3xl p-6 shadow-lg text-center space-y-4">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 ring-4 ring-primary">
              <AvatarImage src={profilePhoto} />
              <AvatarFallback className="bg-gradient-yellow text-vaye-navy text-2xl font-bold">
                DD
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary shadow-lg"
              onClick={handleChangePhoto}
              disabled={cameraLoading}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <h2 className="text-2xl font-bold">{driverData.name}</h2>
            <p className="text-muted-foreground">{driverData.email}</p>
            <p className="text-sm text-muted-foreground mt-1">{driverData.phone}</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 fill-warning text-warning" />
            <span className="text-xl font-bold">{driverData.rating}</span>
            <Badge variant="outline" className="ml-2">Verified</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Member since {driverData.memberSince}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Performance Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Rides</p>
              <p className="text-2xl font-bold text-foreground">{driverData.totalRides}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-success">R{driverData.stats.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Accept Rate</p>
              <p className="text-2xl font-bold text-foreground">{driverData.stats.acceptanceRate}%</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Complete Rate</p>
              <p className="text-2xl font-bold text-foreground">{driverData.stats.completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Vehicle Information</h3>
            <Button variant="ghost" size="sm">Edit</Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">
                  {driverData.vehicle.year} {driverData.vehicle.make} {driverData.vehicle.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  {driverData.vehicle.color} • {driverData.vehicle.plate}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="lg"
            onClick={() => toast.info("Documents feature coming soon")}
          >
            <FileText className="w-5 h-5 mr-3" />
            Documents
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="lg"
            onClick={() => navigate("/settings")}
          >
            <SettingsIcon className="w-5 h-5 mr-3" />
            Settings
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            size="lg"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Profile;
