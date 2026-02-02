import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { User } from "lucide-react";

export function ProfileSection() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhoneNumber(profile.phone_number || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        phone_number: phoneNumber.trim() || null,
      });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Photo */}
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground mb-4">Profile Photo</p>
            <ProfilePhotoUpload className="justify-center" />
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-1">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
