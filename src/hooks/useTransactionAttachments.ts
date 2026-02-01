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
      const { data, error } = await supabase
        .from("transaction_attachments")
        .insert([{ ...attachment, user_id: user!.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments", transactionId] });
      toast({ title: "Attachment added" });
    },
    onError: (error) => {
      toast({ title: "Failed to add attachment", description: error.message, variant: "destructive" });
    },
  });

  // Delete attachment
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from("transaction_attachments")
        .delete()
        .eq("id", attachmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments", transactionId] });
      toast({ title: "Attachment removed" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
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
