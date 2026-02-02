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
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase
        .from("profiles")
        .select("profile_photo_url, profile_photo_cloudinary_public_id")
        .eq("user_id", user.id)
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
        timestamp: new Date().toISOString(),
      });

      // Upload to Cloudinary
      const uploadedPhoto = await uploadProfilePhoto(file);

      console.log("[v0] PROFILE PHOTO UPLOAD MUTATION: Saved to Cloudinary, updating database", {
        publicId: uploadedPhoto.public_id,
        userId: user?.id,
      });

      // Update profile in Supabase
      const { data, error } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: uploadedPhoto.secure_url,
          profile_photo_cloudinary_public_id: uploadedPhoto.public_id,
        })
        .eq("user_id", user!.id)
        .select()
        .single();

      if (error) {
        console.error("[v0] PROFILE PHOTO UPDATE ERROR:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO UPLOAD MUTATION: Complete", {
        userId: user?.id,
        photoUrl: uploadedPhoto.secure_url.substring(0, 50) + "***",
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
        userId: user?.id,
        timestamp: new Date().toISOString(),
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
        .eq("user_id", user!.id);

      if (error) {
        console.error("[v0] PROFILE PHOTO DELETE ERROR:", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO DELETE MUTATION: Complete", {
        userId: user?.id,
      });
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
