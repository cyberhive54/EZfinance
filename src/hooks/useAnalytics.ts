import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export function useAnalytics() {
  const { user } = useAuth();

  const monthlyDataQuery = useQuery({
    queryKey: ["analytics-monthly", user?.id],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = format(startOfMonth(date), "yyyy-MM-dd");
        const end = format(endOfMonth(date), "yyyy-MM-dd");
        
        const { data, error } = await supabase
          .from("transactions")
          .select("type, amount")
          .gte("transaction_date", start)
          .lte("transaction_date", end);
        
        if (error) throw error;
        
        const income = data.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = data.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
        
        months.push({
          month: format(date, "MMM"),
          income,
          expenses,
          net: income - expenses,
        });
      }
      return months;
    },
    enabled: !!user,
  });

  const categoryBreakdownQuery = useQuery({
    queryKey: ["analytics-categories", user?.id],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("category_id, amount, type")
        .eq("type", "expense")
        .gte("transaction_date", start)
        .lte("transaction_date", end);
      
      if (txError) throw txError;
      
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, color");
      
      if (catError) throw catError;
      
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const breakdown: Record<string, { name: string; amount: number; color: string }> = {};
      
      transactions.forEach(tx => {
        const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
        const name = cat?.name || "Uncategorized";
        const color = cat?.color || "#94a3b8";
        
        if (!breakdown[name]) {
          breakdown[name] = { name, amount: 0, color };
        }
        breakdown[name].amount += Number(tx.amount);
      });
      
      return Object.values(breakdown).sort((a, b) => b.amount - a.amount);
    },
    enabled: !!user,
  });

  const summaryQuery = useQuery({
    queryKey: ["analytics-summary", user?.id],
    queryFn: async () => {
      const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const thisMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      
      const [thisMonth, lastMonth] = await Promise.all([
        supabase
          .from("transactions")
          .select("type, amount")
          .gte("transaction_date", thisMonthStart)
          .lte("transaction_date", thisMonthEnd),
        supabase
          .from("transactions")
          .select("type, amount")
          .gte("transaction_date", lastMonthStart)
          .lte("transaction_date", lastMonthEnd),
      ]);
      
      if (thisMonth.error) throw thisMonth.error;
      if (lastMonth.error) throw lastMonth.error;
      
      const thisMonthIncome = thisMonth.data.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const thisMonthExpenses = thisMonth.data.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
      const lastMonthIncome = lastMonth.data.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const lastMonthExpenses = lastMonth.data.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
      
      const incomeChange = lastMonthIncome ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
      const expenseChange = lastMonthExpenses ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
      
      return {
        thisMonthIncome,
        thisMonthExpenses,
        incomeChange,
        expenseChange,
        savingsRate: thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100 : 0,
      };
    },
    enabled: !!user,
  });

  return {
    monthlyData: monthlyDataQuery.data || [],
    categoryBreakdown: categoryBreakdownQuery.data || [],
    summary: summaryQuery.data,
    isLoading: monthlyDataQuery.isLoading || categoryBreakdownQuery.isLoading || summaryQuery.isLoading,
  };
}
