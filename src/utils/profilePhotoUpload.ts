import { ProfilePhoto } from "@/types/database";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
}

export async function uploadProfilePhoto(
  file: File
): Promise<CloudinaryUploadResponse> {
  console.log("[v0] PROFILE PHOTO UPLOAD: Starting upload process", {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    timestamp: new Date().toISOString(),
  });

  // Validate file
  if (!ALLOWED_FORMATS.includes(file.type)) {
    console.error("[v0] PROFILE PHOTO ERROR: Invalid file type", {
      receivedType: file.type,
      allowedTypes: ALLOWED_FORMATS,
    });
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    console.error("[v0] PROFILE PHOTO ERROR: File size exceeds limit", {
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      maxSize: `${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
    });
    throw new Error("File size exceeds 6MB limit.");
  }

  console.log("[v0] PROFILE PHOTO: Environment variables check", {
    cloudNameExists: !!CLOUDINARY_CLOUD_NAME,
    uploadPresetExists: !!CLOUDINARY_UPLOAD_PRESET,
  });

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.error("[v0] PROFILE PHOTO ERROR: Missing Cloudinary configuration");
    throw new Error("Cloudinary configuration is missing. Please check environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
  formData.append("folder", "ezfinance/profile_photos");

  console.log("[v0] PROFILE PHOTO: Sending upload request to Cloudinary", {
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
  });

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    console.log("[v0] PROFILE PHOTO: Cloudinary response received", {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[v0] PROFILE PHOTO ERROR: Upload failed", {
        status: response.status,
        errorMessage: errorData.error?.message,
      });
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    console.log("[v0] PROFILE PHOTO: Upload successful", {
      publicId: data.public_id,
      url: data.secure_url?.substring(0, 50) + "***",
    });

    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      original_filename: data.original_filename || file.name,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error("[v0] PROFILE PHOTO ERROR: Upload request failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
