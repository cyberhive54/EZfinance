import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Priority {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

// Default priorities with colors (Blue, Yellow, Orange, Red)
export const DEFAULT_PRIORITIES = [
  { name: "Low", color: "#3b82f6", sort_order: 0 },
  { name: "Medium", color: "#eab308", sort_order: 1 },
  { name: "High", color: "#f97316", sort_order: 2 },
  { name: "Critical", color: "#ef4444", sort_order: 3 },
];

export const usePriorities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const prioritiesQuery = useQuery({
    queryKey: ["priorities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("priority_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Priority[];
    },
    enabled: !!user,
  });

  // Initialize default priorities if none exist
  const initializeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: existing } = await supabase
        .from("priority_types")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) return; // Already initialized

      const priorities = DEFAULT_PRIORITIES.map((p, idx) => ({
        ...p,
        user_id: user.id,
        is_default: false,
        sort_order: idx,
      }));

      const { error } = await supabase.from("priority_types").insert(priorities);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (priority: { name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: maxOrder } = await supabase
        .from("priority_types")
        .select("sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0;

      const { data, error } = await supabase
        .from("priority_types")
        .insert({
          name: priority.name,
          color: priority.color,
          user_id: user.id,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
      toast({ title: "Priority created" });
    },
    onError: (error) => {
      toast({ title: "Error creating priority", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("priority_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
      toast({ title: "Priority updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating priority", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("priority_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
      toast({ title: "Priority deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting priority", description: error.message, variant: "destructive" });
    },
  });

  return {
    priorities: prioritiesQuery.data || [],
    isLoading: prioritiesQuery.isLoading,
    initializePriorities: initializeMutation.mutate,
    createPriority: createMutation.mutate,
    updatePriority: updateMutation.mutate,
    deletePriority: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
