/**
 * Profile photo upload and management utility
 * Uses Cloudinary for storage and Supabase for URL tracking
 */

import { validateImageFile, MAX_FILE_SIZE } from "./cloudinary";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const PROFILE_PHOTO_MAX_SIZE = 3 * 1024 * 1024; // 3MB for profile photos

export interface ProfilePhotoUploadResponse {
  public_id: string;
  secure_url: string;
  bytes: number;
}

/**
 * Validates and uploads a profile photo to Cloudinary
 */
export async function uploadProfilePhoto(
  file: File
): Promise<ProfilePhotoUploadResponse> {
  console.log("[v0] PROFILE PHOTO UPLOAD: Starting upload", {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    timestamp: new Date().toISOString(),
  });

  // Validate file type
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedFormats.includes(file.type)) {
    console.error("[v0] PROFILE PHOTO ERROR: Invalid file type", {
      receivedType: file.type,
      allowedTypes: allowedFormats,
    });
    throw new Error("Only JPEG, PNG, and WebP images are allowed");
  }

  // Validate file size (3MB for profile photos)
  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    console.error("[v0] PROFILE PHOTO ERROR: File size exceeds limit", {
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      maxSize: `${(PROFILE_PHOTO_MAX_SIZE / 1024 / 1024).toFixed(2)}MB`,
    });
    throw new Error(`File size exceeds ${(PROFILE_PHOTO_MAX_SIZE / 1024 / 1024).toFixed(0)}MB limit`);
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.error("[v0] PROFILE PHOTO ERROR: Missing Cloudinary configuration");
    throw new Error("Cloudinary configuration is missing. Please check environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
  formData.append("folder", "ezfinance/profile");

  console.log("[v0] PROFILE PHOTO: Sending upload request to Cloudinary");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[v0] PROFILE PHOTO ERROR: Cloudinary upload failed", {
        status: response.status,
        errorMessage: errorData.error?.message,
      });
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    console.log("[v0] PROFILE PHOTO UPLOAD: Success", {
      publicId: data.public_id,
      fileSize: `${(data.bytes / 1024 / 1024).toFixed(2)}MB`,
    });

    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error("[v0] PROFILE PHOTO UPLOAD ERROR:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Marks a profile photo for deletion
 * Backend should handle actual Cloudinary deletion via Admin API
 */
export async function deleteProfilePhoto(publicId: string): Promise<void> {
  console.log("[v0] PROFILE PHOTO DELETE: Marking for deletion", {
    publicId,
    timestamp: new Date().toISOString(),
  });
  // Note: Actual deletion from Cloudinary should be handled by a backend service
  // that has access to the Admin API key. For now, we just track the deletion.
}
