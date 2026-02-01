import { useState } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { uploadProfilePhoto } from "@/utils/profilePhotoUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfilePhotoUploadProps {
  userId: string | undefined;
  onPhotoUpdate?: (url: string) => void;
}

export function ProfilePhotoUpload({ userId, onPhotoUpdate }: ProfilePhotoUploadProps) {
  const { profilePhoto, isLoading, uploadMutation, deleteMutation } = useProfilePhoto(userId);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    console.log("[v0] PROFILE PHOTO COMPONENT: File selected", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });

    try {
      // Upload to Cloudinary
      console.log("[v0] PROFILE PHOTO COMPONENT: Starting Cloudinary upload");
      const uploadedFile = await uploadProfilePhoto(file);
      console.log("[v0] PROFILE PHOTO COMPONENT: Cloudinary upload complete, saving to database");

      // Save to database
      await uploadMutation.mutateAsync(uploadedFile);
      console.log("[v0] PROFILE PHOTO COMPONENT: Database save complete");

      if (onPhotoUpdate) {
        onPhotoUpdate(uploadedFile.secure_url);
      }
    } catch (error) {
      console.error("[v0] PROFILE PHOTO COMPONENT ERROR", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    console.log("[v0] PROFILE PHOTO COMPONENT: Delete triggered");
    await deleteMutation.mutateAsync();
    setDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        {profilePhoto?.cloudinary_url ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border">
            <img
              src={profilePhoto.cloudinary_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handlePhotoSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <label className="flex items-center justify-center w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer">
            <Camera className="w-6 h-6 text-muted-foreground" />
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handlePhotoSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <label asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={uploading || uploadMutation.isPending}
            className="flex-1"
          >
            {uploading || uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handlePhotoSelect}
              disabled={uploading}
              className="hidden"
            />
          </Button>
        </label>

        {profilePhoto && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirm(true)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
