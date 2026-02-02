/**
 * Cloudinary utility for uploading and managing transaction attachments
 * Supports multiple image formats (jpg, jpeg, png, webp) up to 6MB per image
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Allowed file types and max file size
export const ALLOWED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
}

/**
 * Validates a file for upload
 * @param file - File to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Validate file type
  if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed. Received: ${file.type}`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 6MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { isValid: true };
}

export async function uploadTransactionAttachment(
  file: File
): Promise<CloudinaryUploadResponse> {
  console.log("[v0] ATTACHMENT UPLOAD: Starting upload process", {
    fileName: file.name,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    timestamp: new Date().toISOString(),
  });

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    console.error("[v0] ATTACHMENT ERROR: File validation failed", {
      fileName: file.name,
      error: validation.error,
    });
    throw new Error(validation.error);
  }

  console.log("[v0] ATTACHMENT: Environment variables check", {
    cloudNameExists: !!CLOUDINARY_CLOUD_NAME,
    uploadPresetExists: !!CLOUDINARY_UPLOAD_PRESET,
    cloudName: CLOUDINARY_CLOUD_NAME?.substring(0, 5) + "***",
    uploadPreset: CLOUDINARY_UPLOAD_PRESET?.substring(0, 5) + "***",
  });

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.error("[v0] ATTACHMENT ERROR: Missing Cloudinary configuration", {
      VITE_CLOUDINARY_CLOUD_NAME: process.env.VITE_CLOUDINARY_CLOUD_NAME,
      VITE_CLOUDINARY_UPLOAD_PRESET: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    });
    throw new Error("Cloudinary configuration is missing. Please check environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
  formData.append("folder", "ezfinance/transactions");

  console.log("[v0] ATTACHMENT: Sending upload request to Cloudinary", {
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

    console.log("[v0] ATTACHMENT: Cloudinary response received", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[v0] ATTACHMENT ERROR: Upload failed", {
        status: response.status,
        errorMessage: errorData.error?.message,
        errorData: errorData,
      });
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    console.log("[v0] ATTACHMENT: Upload successful", {
      publicId: data.public_id,
      url: data.secure_url?.substring(0, 50) + "***",
      fileSize: `${(data.bytes / 1024 / 1024).toFixed(2)}MB`,
    });

    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      original_filename: data.original_filename || file.name,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error("[v0] ATTACHMENT ERROR: Upload request failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
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
