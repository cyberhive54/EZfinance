import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePhotoUploadProps {
  className?: string;
}

export function ProfilePhotoUpload({ className }: ProfilePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profilePhoto, isUploading, isDeleting, uploadPhoto, deletePhoto } =
    useProfilePhoto();

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[v0] PROFILE PHOTO COMPONENT: File selected", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    });

    // Validate file before upload
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      alert(`File size exceeds 3MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      await uploadPhoto(file);
    } catch (error) {
      console.error("[v0] PROFILE PHOTO COMPONENT: Upload error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = async () => {
    if (window.confirm("Are you sure you want to remove your profile photo?")) {
      try {
        await deletePhoto();
      } catch (error) {
        console.error("[v0] PROFILE PHOTO COMPONENT: Delete error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        {/* Profile Photo Display */}
        {profilePhoto ? (
          <img
            src={profilePhoto}
            alt="Profile"
            className="h-32 w-32 rounded-full object-cover border-4 border-primary"
          />
        ) : (
          <div className="h-32 w-32 rounded-full bg-muted border-4 border-border flex items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Upload Button - Camera Icon */}
        <label
          htmlFor="profile-photo-input"
          className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </label>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="profile-photo-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        disabled={isUploading || isDeleting}
        className="hidden"
      />

      {/* Delete Button */}
      {profilePhoto && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isDeleting || isUploading}
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-2" />
              Remove Photo
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        JPEG, PNG, or WebP • Max 3MB
      </p>
    </div>
  );
}
