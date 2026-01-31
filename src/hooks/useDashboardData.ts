import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Account, Transaction } from "@/types/database";
import { convertCurrency } from "@/hooks/useProfile";

export function useDashboardData(preferredCurrency: string = "USD") {
  const { user } = useAuth();

  const accountsQuery = useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  const monthlyStatsQuery = useQuery({
    queryKey: ["monthly-stats", user?.id, preferredCurrency],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, currency")
        .gte("transaction_date", startOfMonth)
        .lte("transaction_date", endOfMonth);

      if (error) throw error;

      const income = (data || [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + convertCurrency(Number(t.amount), t.currency, preferredCurrency), 0);
      
      const expenses = (data || [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + convertCurrency(Number(t.amount), t.currency, preferredCurrency), 0);

      return { income, expenses };
    },
    enabled: !!user,
  });

  // Convert all account balances to preferred currency
  const totalBalance = (accountsQuery.data || []).reduce(
    (sum, account) => sum + convertCurrency(Number(account.balance), account.currency, preferredCurrency),
    0
  );

  return {
    accounts: accountsQuery.data || [],
    transactions: transactionsQuery.data || [],
    totalBalance,
    monthlyIncome: monthlyStatsQuery.data?.income || 0,
    monthlyExpenses: monthlyStatsQuery.data?.expenses || 0,
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading || monthlyStatsQuery.isLoading,
    error: accountsQuery.error || transactionsQuery.error || monthlyStatsQuery.error,
  };
}
