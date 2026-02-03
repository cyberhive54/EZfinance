import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, History } from "lucide-react";
import { Budget, BudgetPeriod } from "@/hooks/useBudgets";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BudgetHistoryProps {
  history: Budget[];
  spending: Record<string, number>;
  categories: { id: string; name: string }[];
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}

const periodLabels: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

export function BudgetHistory({ history, spending, categories, formatCurrency, isLoading }: BudgetHistoryProps) {
  const { user } = useAuth();
  const [expandedBudget, setExpandedBudget] = useState<string | null>(null);

  const getBudgetName = (budget: Budget) => {
    if (budget.is_overall) return `Overall ${budget.period}`;
    if (!budget.category_id) return "Uncategorized";
    return categories.find(c => c.id === budget.category_id)?.name || "Unknown";
  };

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  const formatDateShort = (date: string) => {
    try {
      return format(parseISO(date), "MMM d");
    } catch {
      return date;
    }
  };

  // Fetch transactions for expanded budget
  const transactionsQuery = useQuery({
    queryKey: ["budget-transactions", expandedBudget],
    queryFn: async () => {
      if (!expandedBudget) return [];
      const budget = history.find(b => b.id === expandedBudget);
      if (!budget) return [];

      let query = supabase
        .from("transactions")
        .select("id, amount, description, transaction_date, category_id")
        .eq("type", "expense")
        .gte("transaction_date", budget.start_date)
        .lte("transaction_date", budget.end_date || format(new Date(), "yyyy-MM-dd"))
        .order("transaction_date", { ascending: false });

      // Only filter by category if not an overall budget
      if (!budget.is_overall && budget.category_id) {
        query = query.eq("category_id", budget.category_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!expandedBudget && !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 sm:py-12">
          <div className="animate-pulse text-sm text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <History className="mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
          <p className="text-base sm:text-lg font-medium text-foreground text-center">No budget history</p>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">Past budgets will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {history.map((budget) => {
        const totalBudget = Number(budget.amount) + Number(budget.rollover_amount);
        const spent = spending[budget.id] || 0;
        const percentage = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
        const isOverBudget = spent > totalBudget;
        const isExpanded = expandedBudget === budget.id;

        return (
          <Collapsible
            key={budget.id}
            open={isExpanded}
            onOpenChange={(open) => setExpandedBudget(open ? budget.id : null)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h3 className="font-medium text-sm sm:text-base text-foreground truncate">
                            {getBudgetName(budget)}
                          </h3>
                          {isOverBudget ? (
                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          <span className="hidden sm:inline">
                            {formatDate(budget.start_date)} - {budget.end_date ? formatDate(budget.end_date) : "ongoing"}
                          </span>
                          <span className="sm:hidden">
                            {formatDateShort(budget.start_date)} - {budget.end_date ? formatDateShort(budget.end_date) : "ongoing"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-medium text-xs sm:text-sm ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
                        <span className="hidden sm:inline">{formatCurrency(spent)} / {formatCurrency(totalBudget)}</span>
                        <span className="sm:hidden">{formatCurrency(spent)}</span>
                      </p>
                      <Badge variant={isOverBudget ? "destructive" : "secondary"} className="text-[10px] sm:text-xs">
                        {percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className={`h-1 sm:h-1.5 mt-2 sm:mt-3 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                  />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-3 py-2 sm:px-4 sm:py-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Transactions</p>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {periodLabels[budget.period as BudgetPeriod]}
                    </Badge>
                  </div>
                  {transactionsQuery.isLoading ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">Loading...</p>
                  ) : transactionsQuery.data && transactionsQuery.data.length > 0 ? (
                    <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                      {transactionsQuery.data.map((tx) => (
                        <div key={tx.id} className="flex justify-between text-xs sm:text-sm gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate">{tx.description || "No description"}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatDateShort(tx.transaction_date)}
                            </p>
                          </div>
                          <p className="font-medium text-foreground shrink-0">{formatCurrency(Number(tx.amount))}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground">No transactions found</p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
