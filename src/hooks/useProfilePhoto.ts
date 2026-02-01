import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfilePhoto } from "@/types/database";

export function useProfilePhoto(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile photo
  const { data: profilePhoto, isLoading } = useQuery({
    queryKey: ["profile-photo", userId],
    queryFn: async () => {
      if (!userId) return null;

      console.log("[v0] PROFILE PHOTO FETCH: Starting fetch", { userId });

      const { data, error } = await supabase
        .from("profile_photos")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is ok
        console.error("[v0] PROFILE PHOTO FETCH ERROR", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO FETCH: Success", {
        photoId: data?.id,
        hasData: !!data,
      });

      return data as ProfilePhoto | null;
    },
    enabled: !!userId,
  });

  // Upload/Update profile photo
  const uploadMutation = useMutation({
    mutationFn: async (uploadData: { public_id: string; secure_url: string; original_filename: string; bytes: number }) => {
      if (!userId) throw new Error("User ID is required");

      console.log("[v0] PROFILE PHOTO SAVE: Starting save", {
        userId,
        publicId: uploadData.public_id,
      });

      // First check if profile photo exists
      const { data: existing, error: fetchError } = await supabase
        .from("profile_photos")
        .select("id")
        .eq("user_id", userId)
        .single();

      let result;

      if (existing) {
        // Update existing
        console.log("[v0] PROFILE PHOTO SAVE: Updating existing record", { photoId: existing.id });

        const { data, error } = await supabase
          .from("profile_photos")
          .update({
            cloudinary_public_id: uploadData.public_id,
            cloudinary_url: uploadData.secure_url,
            original_filename: uploadData.original_filename,
            file_size: uploadData.bytes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("[v0] PROFILE PHOTO SAVE ERROR: Update failed", {
            code: error.code,
            message: error.message,
          });
          throw error;
        }

        result = data;
      } else {
        // Create new
        console.log("[v0] PROFILE PHOTO SAVE: Creating new record");

        const { data, error } = await supabase
          .from("profile_photos")
          .insert([
            {
              user_id: userId,
              cloudinary_public_id: uploadData.public_id,
              cloudinary_url: uploadData.secure_url,
              original_filename: uploadData.original_filename,
              file_size: uploadData.bytes,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("[v0] PROFILE PHOTO SAVE ERROR: Insert failed", {
            code: error.code,
            message: error.message,
            details: error.details,
          });
          throw error;
        }

        result = data;
      }

      console.log("[v0] PROFILE PHOTO SAVE: Success", {
        photoId: result.id,
      });

      return result as ProfilePhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-photo", userId] });
      toast({ title: "Profile photo updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile photo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Delete profile photo
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User ID is required");

      console.log("[v0] PROFILE PHOTO DELETE: Starting delete", { userId });

      const { error } = await supabase
        .from("profile_photos")
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error("[v0] PROFILE PHOTO DELETE ERROR", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log("[v0] PROFILE PHOTO DELETE: Success");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-photo", userId] });
      toast({ title: "Profile photo removed" });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove profile photo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return {
    profilePhoto,
    isLoading,
    uploadMutation,
    deleteMutation,
  };
}
