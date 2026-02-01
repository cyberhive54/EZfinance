/**
 * Cloudinary utility for uploading and managing transaction attachments
 * Supports multiple image formats (jpg, jpeg, png, webp) up to 6MB per image
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Allowed file types and max file size
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
}

export async function uploadTransactionAttachment(
  file: File
): Promise<CloudinaryUploadResponse> {
  // Validate file
  if (!ALLOWED_FORMATS.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 6MB limit.");
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary configuration is missing. Please check environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
  formData.append("folder", "ezfinance/transactions");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Upload failed");
    }

    const data = await response.json();
    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      original_filename: data.original_filename || file.name,
      bytes: data.bytes,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to upload attachment to Cloudinary");
  }
}

export async function deleteTransactionAttachment(publicId: string): Promise<void> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary configuration is missing.");
  }

  // Note: Deletion from client-side requires a signed request or API key
  // For now, we'll mark it for deletion on the backend
  // The backend should handle actual deletion using Cloudinary Admin API
  console.log("Attachment deletion should be handled by backend:", publicId);
}

export function getCloudinaryImageUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
}): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    return "";
  }

  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  let transformations = "";

  if (options) {
    const transforms = [];
    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.quality) transforms.push(`q_${options.quality}`);
    if (transforms.length > 0) {
      transformations = `/${transforms.join(",")}`;
    }
  }

  return `${baseUrl}${transformations}/${publicId}`;
}
