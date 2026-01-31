import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  start_date: string | null;
  status: "active" | "paused" | "completed";
  paused_at: string | null;
  completed_at: string | null;
  icon: string | null;
  color: string | null;
  priority_id: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalLog {
  id: string;
  goal_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const useGoals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });

  const goalLogsQuery = useQuery({
    queryKey: ["goal_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goal_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GoalLog[];
    },
    enabled: !!user,
  });

  const addGoalLog = async (goalId: string, action: string, details?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from("goal_logs").insert([{
      goal_id: goalId,
      user_id: user.id,
      action,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
    }]);
  };

  const createMutation = useMutation({
    mutationFn: async (goal: {
      name: string;
      target_amount: number;
      current_amount?: number;
      deadline: string;
      start_date?: string | null;
      icon?: string;
      color?: string;
      priority_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          ...goal,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Log goal creation
      await addGoalLog(data.id, "created", { name: goal.name, target_amount: goal.target_amount });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating goal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      target_amount?: number;
      current_amount?: number;
      deadline?: string | null;
      start_date?: string | null;
      icon?: string;
      color?: string;
      priority_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Log goal update
      await addGoalLog(id, "edited", updates);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating goal", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ status: "paused", paused_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await addGoalLog(id, "paused");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal paused" });
    },
    onError: (error) => {
      toast({ title: "Error pausing goal", description: error.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ status: "active", paused_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await addGoalLog(id, "activated");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal activated" });
    },
    onError: (error) => {
      toast({ title: "Error activating goal", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await addGoalLog(id, "completed");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal completed!" });
    },
    onError: (error) => {
      toast({ title: "Error completing goal", description: error.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await addGoalLog(id, "archived");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal archived" });
    },
    onError: (error) => {
      toast({ title: "Error archiving goal", description: error.message, variant: "destructive" });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ is_archived: false, archived_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await addGoalLog(id, "unarchived");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal_logs"] });
      toast({ title: "Goal unarchived" });
    },
    onError: (error) => {
      toast({ title: "Error unarchiving goal", description: error.message, variant: "destructive" });
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // First get current amount
      const { data: goal, error: fetchError } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const newAmount = (goal.current_amount || 0) + amount;

      const { data, error } = await supabase
        .from("goals")
        .update({ current_amount: newAmount })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Contribution added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding contribution", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First clear goal references from transactions
      await supabase
        .from("transactions")
        .update({ goal_id: null, goal_amount: null, goal_allocation_type: null })
        .eq("goal_id", id);
      
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Goal deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting goal", description: error.message, variant: "destructive" });
    },
  });

  return {
    goals: goalsQuery.data || [],
    goalLogs: goalLogsQuery.data || [],
    isLoading: goalsQuery.isLoading,
    createGoal: createMutation.mutate,
    updateGoal: updateMutation.mutate,
    pauseGoal: pauseMutation.mutate,
    activateGoal: activateMutation.mutate,
    completeGoal: completeMutation.mutate,
    archiveGoal: archiveMutation.mutate,
    unarchiveGoal: unarchiveMutation.mutate,
    addContribution: addContributionMutation.mutate,
    deleteGoal: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isPausing: pauseMutation.isPending,
    isActivating: activateMutation.isPending,
    isCompleting: completeMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isUnarchiving: unarchiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
