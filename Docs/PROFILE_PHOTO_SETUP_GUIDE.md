# Complete Profile Photo Feature Implementation Guide

## Overview
This guide walks you through adding a profile photo feature that stores image URLs in your Supabase database with Cloudinary for image hosting.

---

## Step 1: Update Supabase Schema

### 1a. Create Migration for Profile Photo Column

Create a new migration file: `/supabase/migrations/20260201_add_profile_photo.sql`

\`\`\`sql
-- Add profile_photo_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN profile_photo_url TEXT DEFAULT NULL,
ADD COLUMN profile_photo_cloudinary_public_id TEXT DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX idx_profiles_user_id ON profiles(id);

-- Add comment
COMMENT ON COLUMN profiles.profile_photo_url IS 'Cloudinary URL for user profile photo';
COMMENT ON COLUMN profiles.profile_photo_cloudinary_public_id IS 'Cloudinary public ID for deletion purposes';
\`\`\`

### 1b. Run the Migration
Execute this SQL in Supabase dashboard → SQL Editor

---

## Step 2: Update TypeScript Types

### Update `/src/types/database.ts`

\`\`\`typescript
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  profile_photo_url?: string;           // Add this
  profile_photo_cloudinary_public_id?: string;  // Add this
  bio?: string;
  phone?: string;
  currency?: string;
  theme?: string;
  created_at: string;
  updated_at: string;
}
\`\`\`

---

## Step 3: Create Profile Photo Upload Utility

Create `/src/utils/profilePhoto.ts`

\`\`\`typescript
/**
 * Profile photo upload and management utility
 * Uses Cloudinary for storage and Supabase for URL tracking
 */

import { uploadTransactionAttachment } from "./cloudinary";

const PROFILE_PHOTO_MAX_SIZE = 3 * 1024 * 1024; // 3MB for profile photos (smaller than transaction attachments)

export interface ProfilePhotoUploadResponse {
  public_id: string;
  secure_url: string;
  bytes: number;
}

export async function uploadProfilePhoto(
  file: File
): Promise<ProfilePhotoUploadResponse> {
  console.log("[v0] PROFILE PHOTO UPLOAD: Starting upload", {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    timestamp: new Date().toISOString(),
  });

  // Validate file
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedFormats.includes(file.type)) {
    console.error("[v0] PROFILE PHOTO ERROR: Invalid file type", {
      receivedType: file.type,
    });
    throw new Error("Only JPEG, PNG, and WebP images are allowed");
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    console.error("[v0] PROFILE PHOTO ERROR: File size exceeds limit", {
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      maxSize: `${(PROFILE_PHOTO_MAX_SIZE / 1024 / 1024).toFixed(2)}MB`,
    });
    throw new Error("File size exceeds 3MB limit");
  }

  try {
    // Reuse the transaction upload function, Cloudinary will handle it
    const response = await uploadTransactionAttachment(file);
    
    console.log("[v0] PROFILE PHOTO UPLOAD: Success", {
      publicId: response.public_id,
      url: response.secure_url.substring(0, 50) + "***",
    });

    return {
      public_id: response.public_id,
      secure_url: response.secure_url,
      bytes: response.bytes,
    };
  } catch (error) {
    console.error("[v0] PROFILE PHOTO UPLOAD ERROR:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function deleteProfilePhoto(publicId: string): Promise<void> {
  console.log("[v0] PROFILE PHOTO DELETE: Marking for deletion", {
    publicId,
  });
  // Backend will handle actual deletion via Cloudinary Admin API
  // For now, just log for backend processing
}
\`\`\`

---

## Step 4: Create Profile Photo Hook

Create `/src/hooks/useProfilePhoto.ts`

\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadProfilePhoto, deleteProfilePhoto } from "@/utils/profilePhoto";

export function useProfilePhoto() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current profile photo
  const query = useQuery({
    queryKey: ["profile-photo", user?.id],
    queryFn: async () => {
      if (!user) return null;

      console.log("[v0] PROFILE PHOTO FETCH: Getting profile photo", {
        userId: user.id,
      });

      const { data, error } = await supabase
        .from("profiles")
        .select("profile_photo_url, profile_photo_cloudinary_public_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[v0] PROFILE PHOTO FETCH ERROR:", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO FETCH: Success", {
        hasPhoto: !!data?.profile_photo_url,
      });

      return data;
    },
    enabled: !!user,
  });

  // Upload new profile photo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("[v0] PROFILE PHOTO UPLOAD MUTATION: Starting", {
        fileName: file.name,
        userId: user?.id,
      });

      // Upload to Cloudinary
      const uploadedPhoto = await uploadProfilePhoto(file);

      console.log("[v0] PROFILE PHOTO UPLOAD MUTATION: Saved to Cloudinary, updating database", {
        publicId: uploadedPhoto.public_id,
      });

      // Update profile in Supabase
      const { data, error } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: uploadedPhoto.secure_url,
          profile_photo_cloudinary_public_id: uploadedPhoto.public_id,
        })
        .eq("id", user!.id)
        .select()
        .single();

      if (error) {
        console.error("[v0] PROFILE PHOTO UPDATE ERROR:", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO UPLOAD MUTATION: Complete", {
        userId: user?.id,
      });

      return data;
    },
    onSuccess: () => {
      console.log("[v0] PROFILE PHOTO UPLOAD: Success callback");
      queryClient.invalidateQueries({ queryKey: ["profile-photo", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile photo updated successfully" });
    },
    onError: (error) => {
      console.error("[v0] PROFILE PHOTO UPLOAD: Mutation error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast({
        title: "Failed to upload profile photo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Delete profile photo
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!query.data?.profile_photo_cloudinary_public_id) {
        throw new Error("No profile photo to delete");
      }

      console.log("[v0] PROFILE PHOTO DELETE MUTATION: Starting", {
        publicId: query.data.profile_photo_cloudinary_public_id,
      });

      // Mark for deletion (backend will handle actual Cloudinary deletion)
      await deleteProfilePhoto(query.data.profile_photo_cloudinary_public_id);

      // Clear from Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: null,
          profile_photo_cloudinary_public_id: null,
        })
        .eq("id", user!.id);

      if (error) {
        console.error("[v0] PROFILE PHOTO DELETE ERROR:", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO DELETE MUTATION: Complete");
    },
    onSuccess: () => {
      console.log("[v0] PROFILE PHOTO DELETE: Success callback");
      queryClient.invalidateQueries({ queryKey: ["profile-photo", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile photo removed" });
    },
    onError: (error) => {
      console.error("[v0] PROFILE PHOTO DELETE: Error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast({
        title: "Failed to remove profile photo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return {
    profilePhoto: query.data?.profile_photo_url,
    publicId: query.data?.profile_photo_cloudinary_public_id,
    isLoading: query.isLoading,
    uploadPhoto: uploadMutation.mutateAsync,
    deletePhoto: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
\`\`\`

---

## Step 5: Create Profile Photo Component

Create `/src/components/profile/ProfilePhotoUpload.tsx`

\`\`\`typescript
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
    });

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
          className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition"
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
          onClick={() => deletePhoto()}
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
\`\`\`

---

## Step 6: Add Component to Profile Page

In your profile/settings page (e.g., `/src/pages/Profile.tsx` or `/src/pages/Settings.tsx`):

\`\`\`typescript
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>

      {/* Profile Photo Section */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
        <ProfilePhotoUpload className="mx-auto" />
      </div>

      {/* Other profile fields */}
      {/* ... */}
    </div>
  );
}
\`\`\`

---

## Step 7: Enable RLS on Profiles Table (Important)

Go to Supabase Dashboard → Authentication → Policies

### Create RLS Policy for profiles table

\`\`\`sql
-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to create profile
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
\`\`\`

---

## Step 8: Console Logging for Debugging

When testing, check the browser console for these debug logs:

\`\`\`
[v0] PROFILE PHOTO UPLOAD: Starting upload
[v0] PROFILE PHOTO UPLOAD: Success
[v0] PROFILE PHOTO FETCH: Getting profile photo
[v0] PROFILE PHOTO DELETE MUTATION: Starting
\`\`\`

If uploads fail, look for:
\`\`\`
[v0] PROFILE PHOTO ERROR
[v0] PROFILE PHOTO UPLOAD ERROR
[v0] PROFILE PHOTO UPDATE ERROR
\`\`\`

---

## Step 9: Testing Checklist

- [ ] Upload a profile photo (JPEG/PNG/WebP, under 3MB)
- [ ] Verify image appears in profile
- [ ] Check Supabase database - URL and public_id saved
- [ ] Check Cloudinary dashboard - image in `/ezfinance/transactions` folder
- [ ] Delete profile photo
- [ ] Verify URL cleared from database
- [ ] Test with multiple uploads (should replace old photo)
- [ ] Test error states (invalid file type, too large)

---

## Troubleshooting

### Upload shows "Cloudinary configuration is missing"
- Check Vercel environment variables are set correctly
- Verify `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`
- Check browser console for configuration details

### File uploads but doesn't save to database
- Check Supabase RLS policies are created
- Verify user is authenticated
- Check Supabase table columns exist
- Look for database error in console logs

### Photo not displaying
- Verify Cloudinary URL is valid
- Check image hasn't been deleted from Cloudinary
- Clear browser cache

---

## Next Steps

After implementation, you can:
1. Add profile photo to user dropdown menu
2. Show profile photo on transaction cards
3. Add profile photo to transaction history/details
4. Create backend endpoint to handle Cloudinary deletion via Admin API
