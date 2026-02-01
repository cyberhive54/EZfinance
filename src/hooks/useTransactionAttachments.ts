import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionAttachment } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export function useTransactionAttachments(transactionId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all attachments for a transaction
  const query = useQuery({
    queryKey: ["transaction-attachments", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      
      const { data, error } = await supabase
        .from("transaction_attachments")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as TransactionAttachment[];
    },
    enabled: !!transactionId && !!user,
  });

  // Create attachment
  const createMutation = useMutation({
    mutationFn: async (attachment: Omit<TransactionAttachment, "id" | "created_at">) => {
      console.log("[v0] ATTACHMENT SAVE: Starting attachment save to Supabase", {
        transactionId: attachment.transaction_id,
        userId: user?.id,
        publicId: attachment.cloudinary_public_id?.substring(0, 20) + "***",
        fileName: attachment.original_filename,
        fileSize: `${(attachment.file_size / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString(),
      });

      const insertData = { ...attachment, user_id: user!.id };
      console.log("[v0] ATTACHMENT SAVE: Insert payload", {
        keys: Object.keys(insertData),
        transactionId: insertData.transaction_id,
      });

      const { data, error } = await supabase
        .from("transaction_attachments")
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error("[v0] ATTACHMENT SAVE ERROR: Supabase insert failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("[v0] ATTACHMENT SAVE: Successfully saved", {
        attachmentId: data.id,
        transactionId: data.transaction_id,
      });
      return data;
    },
    onSuccess: () => {
      console.log("[v0] ATTACHMENT SAVE: Success callback triggered");
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments", transactionId] });
      toast({ title: "Attachment added" });
    },
    onError: (error) => {
      console.error("[v0] ATTACHMENT SAVE: Mutation error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast({ title: "Failed to add attachment", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  // Delete attachment
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      console.log("[v0] ATTACHMENT DELETE: Starting deletion", {
        attachmentId,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from("transaction_attachments")
        .delete()
        .eq("id", attachmentId);
      
      if (error) {
        console.error("[v0] ATTACHMENT DELETE ERROR: Supabase delete failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          attachmentId,
        });
        throw error;
      }

      console.log("[v0] ATTACHMENT DELETE: Successfully deleted", {
        attachmentId,
      });
    },
    onSuccess: () => {
      console.log("[v0] ATTACHMENT DELETE: Success callback triggered");
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments", transactionId] });
      toast({ title: "Attachment removed" });
    },
    onError: (error) => {
      console.error("[v0] ATTACHMENT DELETE: Mutation error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast({ title: "Failed to remove attachment", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    addAttachment: createMutation.mutateAsync,
    removeAttachment: deleteMutation.mutateAsync,
    isAdding: createMutation.isPending,
    isRemoving: deleteMutation.isPending,
  };
}
