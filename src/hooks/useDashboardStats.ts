import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction } from "@/types/database";
import { convertCurrency } from "@/hooks/useProfile";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

export type DateFilterType = "this-week" | "last-7-days" | "this-month" | "last-30-days" | "this-year" | "last-365-days" | "custom-month" | "custom-year" | "custom-date";

interface DateRange {
  start: Date;
  end: Date;
}

interface DashboardStats {
  income: number;
  expenses: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  incomeByAccount: Record<string, number>;
  expensesByAccount: Record<string, number>;
  chartData: Array<{
    date: string;
    income: number;
    expenses: number;
  }>;
}

function getDateRangeStatic(
  dateFilterType: DateFilterType,
  customStartDate: string,
  customEndDate: string,
  customMonth: string,
  customYear: string
): DateRange {
  const now = new Date();
  let start: Date = new Date();
  let end: Date = new Date();

  switch (dateFilterType) {
    case "this-week":
      start = startOfWeek(now);
      end = endOfWeek(now);
      break;
    case "last-7-days":
      start = subDays(now, 7);
      end = now;
      break;
    case "this-month":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "last-30-days":
      start = subDays(now, 30);
      end = now;
      break;
    case "this-year":
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case "last-365-days":
      start = subDays(now, 365);
      end = now;
      break;
    case "custom-date":
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) end = new Date(customEndDate);
      break;
    case "custom-month":
      if (customMonth) {
        const [year, month] = customMonth.split("-");
        start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      }
      break;
    case "custom-year":
      if (customYear) {
        const year = parseInt(customYear);
        start = startOfYear(new Date(year, 0, 1));
        end = endOfYear(new Date(year, 11, 31));
      }
      break;
  }

  return { start, end };
}

export function useDashboardStats(
  preferredCurrency: string = "USD",
  dateFilterType: DateFilterType = "this-month",
  customStartDate: string = "",
  customEndDate: string = "",
  customMonth: string = "",
  customYear: string = new Date().getFullYear().toString()
) {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: [
      "dashboard-stats",
      user?.id,
      dateFilterType,
      customStartDate,
      customEndDate,
      customMonth,
      customYear,
      preferredCurrency,
    ],
    queryFn: async () => {
      const { start, end } = getDateRangeStatic(dateFilterType, customStartDate, customEndDate, customMonth, customYear);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", startStr)
        .lte("transaction_date", endStr);

      if (error) throw error;

      const txns = transactions as Transaction[];

      // Calculate totals
      const income = txns
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + convertCurrency(Number(t.amount), t.currency, preferredCurrency), 0);

      const expenses = txns
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + convertCurrency(Number(t.amount), t.currency, preferredCurrency), 0);

      // Income by category
      const incomeByCategory: Record<string, number> = {};
      txns
        .filter((t) => t.type === "income" && t.category_id)
        .forEach((t) => {
          const categoryId = t.category_id!;
          incomeByCategory[categoryId] = (incomeByCategory[categoryId] || 0) + convertCurrency(Number(t.amount), t.currency, preferredCurrency);
        });

      // Expenses by category
      const expensesByCategory: Record<string, number> = {};
      txns
        .filter((t) => t.type === "expense" && t.category_id)
        .forEach((t) => {
          const categoryId = t.category_id!;
          expensesByCategory[categoryId] = (expensesByCategory[categoryId] || 0) + convertCurrency(Number(t.amount), t.currency, preferredCurrency);
        });

      // Income by account
      const incomeByAccount: Record<string, number> = {};
      txns
        .filter((t) => t.type === "income")
        .forEach((t) => {
          const accountId = t.account_id!;
          incomeByAccount[accountId] = (incomeByAccount[accountId] || 0) + convertCurrency(Number(t.amount), t.currency, preferredCurrency);
        });

      // Expenses by account
      const expensesByAccount: Record<string, number> = {};
      txns
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const accountId = t.account_id!;
          expensesByAccount[accountId] = (expensesByAccount[accountId] || 0) + convertCurrency(Number(t.amount), t.currency, preferredCurrency);
        });

      // Chart data - daily aggregation
      const chartDataMap: Record<string, { income: number; expenses: number }> = {};
      txns.forEach((t) => {
        const date = format(new Date(t.transaction_date), "MMM dd");
        if (!chartDataMap[date]) {
          chartDataMap[date] = { income: 0, expenses: 0 };
        }
        const amount = convertCurrency(Number(t.amount), t.currency, preferredCurrency);
        if (t.type === "income") {
          chartDataMap[date].income += amount;
        } else {
          chartDataMap[date].expenses += amount;
        }
      });

      const chartData = Object.entries(chartDataMap).map(([date, data]) => ({
        date,
        ...data,
      }));

      return {
        income,
        expenses,
        incomeByCategory,
        expensesByCategory,
        incomeByAccount,
        expensesByAccount,
        chartData,
      } as DashboardStats;
    },
    enabled: !!user?.id,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
  };
}
