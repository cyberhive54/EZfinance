import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

export type BudgetPeriod = "weekly" | "monthly" | "yearly" | "custom";

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string | null;
  is_recurring: boolean;
  rollover_amount: number;
  is_overall: boolean;
  manual_rollover: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetLog {
  id: string;
  budget_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateBudgetInput {
  category_id?: string | null;
  amount: number;
  period: BudgetPeriod;
  start_date?: string;
  end_date?: string;
  is_recurring?: boolean;
  is_overall?: boolean;
  manual_rollover?: boolean;
}

export interface UpdateBudgetInput {
  id: string;
  amount?: number;
  period?: BudgetPeriod;
  start_date?: string;
  end_date?: string;
  is_recurring?: boolean;
  manual_rollover?: boolean;
}

// Calculate period dates based on period type
export function getPeriodDates(period: BudgetPeriod, referenceDate: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case "weekly":
      return { start: startOfWeek(referenceDate, { weekStartsOn: 1 }), end: endOfWeek(referenceDate, { weekStartsOn: 1 }) };
    case "monthly":
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
    case "yearly":
      return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
    default:
      return { start: referenceDate, end: referenceDate };
  }
}

// Log a budget action
async function logBudgetAction(
  budgetId: string, 
  userId: string, 
  action: string, 
  details?: Record<string, unknown>
) {
  await supabase.from("budget_logs").insert({
    budget_id: budgetId,
    user_id: userId,
    action,
    details: details as Json,
  });
}

export function useBudgets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active budgets (current period budgets)
  const budgetsQuery = useQuery({
    queryKey: ["budgets", "active", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .order("is_overall", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });

  // Fetch budget history (past budgets)
  const historyQuery = useQuery({
    queryKey: ["budgets", "history", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .lt("end_date", today)
        .order("end_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "expense")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate spending for each budget based on its specific date range
  const spendingQuery = useQuery({
    queryKey: ["budget-spending", user?.id, budgetsQuery.data?.map(b => b.id).join(",")],
    queryFn: async () => {
      const budgets = budgetsQuery.data || [];
      if (budgets.length === 0) return {};

      const startDates = budgets.map(b => b.start_date);
      const endDates = budgets.map(b => b.end_date).filter(Boolean) as string[];
      
      const minStart = startDates.sort()[0];
      const maxEnd = endDates.sort().reverse()[0] || format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("transactions")
        .select("category_id, amount, transaction_date")
        .eq("type", "expense")
        .gte("transaction_date", minStart)
        .lte("transaction_date", maxEnd);
      
      if (error) throw error;
      
      const spendingByBudget: Record<string, number> = {};
      
      budgets.forEach(budget => {
        const budgetStart = budget.start_date;
        const budgetEnd = budget.end_date || format(new Date(), "yyyy-MM-dd");
        
        if (budget.is_overall) {
          // Overall budget: sum all expenses in date range
          const relevantTxs = data.filter(tx => 
            tx.transaction_date >= budgetStart &&
            tx.transaction_date <= budgetEnd
          );
          spendingByBudget[budget.id] = relevantTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);
        } else {
          // Category budget: sum expenses for specific category
          const relevantTxs = data.filter(tx => 
            tx.category_id === budget.category_id &&
            tx.transaction_date >= budgetStart &&
            tx.transaction_date <= budgetEnd
          );
          spendingByBudget[budget.id] = relevantTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);
        }
      });
      
      return spendingByBudget;
    },
    enabled: !!user && (budgetsQuery.data?.length ?? 0) > 0,
  });

  // Fetch spending for history budgets
  const historySpendingQuery = useQuery({
    queryKey: ["budget-history-spending", user?.id, historyQuery.data?.map(b => b.id).join(",")],
    queryFn: async () => {
      const budgets = historyQuery.data || [];
      if (budgets.length === 0) return {};

      const startDates = budgets.map(b => b.start_date);
      const endDates = budgets.map(b => b.end_date).filter(Boolean) as string[];
      
      const minStart = startDates.sort()[0];
      const maxEnd = endDates.sort().reverse()[0] || format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("transactions")
        .select("category_id, amount, transaction_date")
        .eq("type", "expense")
        .gte("transaction_date", minStart)
        .lte("transaction_date", maxEnd);
      
      if (error) throw error;
      
      const spendingByBudget: Record<string, number> = {};
      
      budgets.forEach(budget => {
        const budgetStart = budget.start_date;
        const budgetEnd = budget.end_date || format(new Date(), "yyyy-MM-dd");
        
        if (budget.is_overall) {
          const relevantTxs = data.filter(tx => 
            tx.transaction_date >= budgetStart &&
            tx.transaction_date <= budgetEnd
          );
          spendingByBudget[budget.id] = relevantTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);
        } else {
          const relevantTxs = data.filter(tx => 
            tx.category_id === budget.category_id &&
            tx.transaction_date >= budgetStart &&
            tx.transaction_date <= budgetEnd
          );
          spendingByBudget[budget.id] = relevantTxs.reduce((sum, tx) => sum + Number(tx.amount), 0);
        }
      });
      
      return spendingByBudget;
    },
    enabled: !!user && (historyQuery.data?.length ?? 0) > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const { period, start_date, end_date, is_recurring = false, is_overall = false, category_id, ...rest } = input;
      
      let startDate: string;
      let endDate: string | undefined;
      
      if (period === "custom" && start_date && end_date) {
        startDate = start_date;
        endDate = end_date;
      } else {
        const dates = getPeriodDates(period);
        startDate = format(dates.start, "yyyy-MM-dd");
        endDate = format(dates.end, "yyyy-MM-dd");
      }
      
      // Validate recurring - only weekly/monthly
      const canRecur = period === "weekly" || period === "monthly";
      
      const { data, error } = await supabase
        .from("budgets")
        .insert([{ 
          ...rest,
          category_id: is_overall ? null : category_id,
          user_id: user!.id,
          period,
          start_date: startDate,
          end_date: endDate,
          is_recurring: canRecur ? is_recurring : false,
          is_overall,
        }])
        .select()
        .single();
      if (error) throw error;
      
      // Log the creation
      await logBudgetAction(data.id, user!.id, "created", {
        amount: data.amount,
        period: data.period,
        is_overall: data.is_overall,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-logs"] });
      toast({ title: "Budget created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create budget", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateBudgetInput) => {
      const { id, period, start_date, end_date, is_recurring, amount } = input;
      
      const updateData: Record<string, unknown> = {};
      
      if (amount !== undefined) updateData.amount = amount;
      if (period !== undefined) updateData.period = period;
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      if (is_recurring !== undefined) {
        const currentPeriod = period || (await supabase.from("budgets").select("period").eq("id", id).single()).data?.period;
        const canRecur = currentPeriod === "weekly" || currentPeriod === "monthly";
        updateData.is_recurring = canRecur ? is_recurring : false;
      }
      
      const { data, error } = await supabase
        .from("budgets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      
      // Log the update
      await logBudgetAction(id, user!.id, "updated", updateData as Record<string, unknown>);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-logs"] });
      toast({ title: "Budget updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update budget", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Log before delete since budget will be gone
      await logBudgetAction(id, user!.id, "deleted", {});
      
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-logs"] });
      toast({ title: "Budget deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete budget", description: error.message, variant: "destructive" });
    },
  });

  // Trigger recurring budget creation
  const triggerRecurringMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_recurring_budgets");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  // Trigger on mount to create any pending recurring budgets
  if (user && !triggerRecurringMutation.isPending && !triggerRecurringMutation.isSuccess) {
    triggerRecurringMutation.mutate();
  }

  // Organize budgets
  const organizeBudgets = (budgets: Budget[]) => {
    const overallBudgets = budgets.filter(b => b.is_overall);
    const categoryBudgets = budgets.filter(b => !b.is_overall);
    return { overallBudgets, categoryBudgets };
  };

  const { overallBudgets, categoryBudgets } = organizeBudgets(budgetsQuery.data || []);

  // Fetch logs for a specific budget
  const fetchBudgetLogs = async (budgetId: string): Promise<BudgetLog[]> => {
    const { data, error } = await supabase
      .from("budget_logs")
      .select("*")
      .eq("budget_id", budgetId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as BudgetLog[];
  };

  // Fetch transactions for a budget
  const fetchBudgetTransactions = async (budget: Budget) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, description, amount, transaction_date, type, currency, category_id")
      .gte("transaction_date", budget.start_date)
      .lte("transaction_date", budget.end_date || format(new Date(), "yyyy-MM-dd"))
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    
    // Filter by category for non-overall budgets
    if (!budget.is_overall && budget.category_id) {
      return data.filter(t => t.category_id === budget.category_id);
    }
    return data;
  };

  return {
    budgets: budgetsQuery.data || [],
    overallBudgets,
    categoryBudgets,
    history: historyQuery.data || [],
    categories: categoriesQuery.data || [],
    spending: spendingQuery.data || {},
    historySpending: historySpendingQuery.data || {},
    isLoading: budgetsQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    fetchBudgetLogs,
    fetchBudgetTransactions,
  };
}
