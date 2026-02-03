import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction, Category } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert([{ ...transaction, user_id: user!.id }])
        .select()
        .single();
      if (error) throw error;
      
      // Update account balance
      let balanceChange: number;
      if (transaction.type === "income" || transaction.type === "transfer-receiver") {
        balanceChange = transaction.amount;
      } else {
        balanceChange = -transaction.amount;
      }
      await supabase.rpc("update_account_balance", { account_id: transaction.account_id, amount_change: balanceChange });
      
      // Update goal if linked
      if (transaction.goal_id && transaction.goal_amount) {
        // For income: add to goal, for expense: subtract from goal
        const goalChange = transaction.type === "income" ? transaction.goal_amount : -transaction.goal_amount;
        
        // Get current goal amount
        const { data: goal, error: goalError } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", transaction.goal_id)
          .single();
        
        if (!goalError && goal) {
          const newAmount = Math.max(0, goal.current_amount + goalChange);
          await supabase
            .from("goals")
            .update({ current_amount: newAmount })
            .eq("id", transaction.goal_id);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Transaction added" });
    },
    onError: (error) => {
      toast({ title: "Failed to add transaction", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.category_id,
          account_id: transaction.account_id,
          transaction_date: transaction.transaction_date,
          currency: transaction.currency,
          frequency: transaction.frequency,
          notes: transaction.notes,
        })
        .eq("id", transaction.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
      toast({ title: "Transaction updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update transaction", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
      if (error) throw error;
      
      // Revert account balance
      let balanceChange: number;
      if (transaction.type === "income" || transaction.type === "transfer-receiver") {
        balanceChange = -transaction.amount;
      } else {
        balanceChange = transaction.amount;
      }
      await supabase.rpc("update_account_balance", { account_id: transaction.account_id, amount_change: balanceChange });
      
      // Revert goal if linked
      if (transaction.goal_id && transaction.goal_amount) {
        // For income deletion: subtract from goal, for expense deletion: add back to goal
        const goalChange = transaction.type === "income" ? -transaction.goal_amount : transaction.goal_amount;
        
        const { data: goal, error: goalError } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", transaction.goal_id)
          .single();
        
        if (!goalError && goal) {
          const newAmount = Math.max(0, goal.current_amount + goalChange);
          await supabase
            .from("goals")
            .update({ current_amount: newAmount })
            .eq("id", transaction.goal_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Transaction deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete transaction", description: error.message, variant: "destructive" });
    },
  });

  return {
    transactions: query.data || [],
    categories: categoriesQuery.data || [],
    isLoading: query.isLoading,
    createTransaction: createMutation.mutateAsync,
    updateTransaction: updateMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
