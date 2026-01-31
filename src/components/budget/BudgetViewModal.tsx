import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Budget } from "@/hooks/useBudgets";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { BudgetDeleteModal } from "./BudgetDeleteModal";
import { format, parseISO } from "date-fns";
import {
  Wallet,
  Calendar,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  Globe,
  TrendingUp,
} from "lucide-react";

interface BudgetLog {
  id: string;
  budget_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Transaction {
  id: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  type: "income" | "expense";
  currency: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface BudgetViewModalProps {
  budget: Budget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => Promise<void>;
  spending: number;
  transactions: Transaction[];
  logs: BudgetLog[];
  categories: Category[];
  isDeleting?: boolean;
}

export function BudgetViewModal({
  budget,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  spending,
  transactions,
  logs,
  categories,
  isDeleting,
}: BudgetViewModalProps) {
  const { preferredCurrency } = useProfile();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [localBudget, setLocalBudget] = useState<Budget | null>(null);

  useEffect(() => {
    if (budget) {
      setLocalBudget(budget);
    }
  }, [budget]);

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  // Sort transactions by date desc - must be before early return
  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    ), [transactions]
  );

  // Sort logs by date desc - must be before early return
  const sortedLogs = useMemo(() =>
    [...logs].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ), [logs]
  );

  if (!localBudget) return null;

  const category = categories.find((c) => c.id === localBudget.category_id);
  const totalBudget = Number(localBudget.amount) + Number(localBudget.rollover_amount);
  const remaining = totalBudget - spending;
  const percentage = totalBudget > 0 ? Math.min((spending / totalBudget) * 100, 100) : 0;
  const isOverBudget = spending > totalBudget;

  // Period label
  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "yearly": return "Yearly";
      case "custom": return "Custom";
      default: return period;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {localBudget.is_overall ? (
                  <Globe className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                ) : (
                  <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm sm:text-lg truncate">
                  {localBudget.is_overall
                    ? `Overall ${getPeriodLabel(localBudget.period)} Budget`
                    : category?.name || "Budget"}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {getPeriodLabel(localBudget.period)}
                  </Badge>
                  {localBudget.is_recurring && (
                    <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs">
                      <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="hidden xs:inline">Recurring</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Budget Info Grid - responsive */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm sm:text-lg font-semibold">{fmt(localBudget.amount)}</p>
                  {localBudget.rollover_amount > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      +{fmt(localBudget.rollover_amount)} rollover
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Used</p>
                  <p className={`text-sm sm:text-lg font-semibold ${isOverBudget ? "text-destructive" : ""}`}>
                    {fmt(spending)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Remaining</p>
                  <p className={`text-sm sm:text-lg font-semibold ${remaining < 0 ? "text-destructive" : "text-green-600"}`}>
                    {fmt(remaining)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Used %</p>
                  <p className={`text-sm sm:text-lg font-semibold ${percentage >= 100 ? "text-destructive" : percentage >= 80 ? "text-yellow-600" : ""}`}>
                    {percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <Progress 
                value={percentage} 
                className={`h-1.5 sm:h-2 ${isOverBudget ? "[&>div]:bg-destructive" : percentage >= 80 ? "[&>div]:bg-yellow-500" : ""}`}
              />

              {/* Date Range - responsive */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm truncate">
                  {format(parseISO(localBudget.start_date), "MMM d, yyyy")} -{" "}
                  {localBudget.end_date
                    ? format(parseISO(localBudget.end_date), "MMM d, yyyy")
                    : "Ongoing"}
                </span>
              </div>

              {/* Flags Row */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {localBudget.is_overall && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" /> Overall
                  </div>
                )}
                {!localBudget.is_recurring && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> One-time
                  </div>
                )}
              </div>

              {/* Action Buttons - responsive grid */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10"
                  onClick={() => onEdit(localBudget)}
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 text-destructive hover:text-destructive"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Delete</span>
                </Button>
              </div>

              <Separator />

              {/* Transactions Section */}
              <div>
                <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Transactions ({sortedTransactions.length})
                </h3>
                {sortedTransactions.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
                    No transactions for this budget period
                  </p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                    {sortedTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border p-2 text-xs sm:text-sm"
                      >
                        <div
                          className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full ${
                            t.type === "income"
                              ? "bg-green-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          {t.type === "income" ? (
                            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-xs sm:text-sm">
                            {t.description || "No description"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {format(parseISO(t.transaction_date), "MMM d")}
                          </p>
                        </div>
                        <p
                          className={`font-medium text-xs sm:text-sm shrink-0 ${
                            t.type === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {t.type === "income" ? "+" : "-"}
                          {fmt(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity Log */}
              <div>
                <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Activity ({sortedLogs.length})
                </h3>
                {sortedLogs.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
                    No activity recorded
                  </p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
                    {sortedLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground"
                      >
                        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-muted-foreground shrink-0" />
                        <span className="capitalize">{log.action}</span>
                        <span>•</span>
                        <span className="truncate">{format(parseISO(log.created_at), "MMM d, h:mm a")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <BudgetDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        budgetName={localBudget.is_overall ? `Overall ${localBudget.period} Budget` : category?.name || "Budget"}
        onConfirm={async () => {
          await onDelete(localBudget.id);
          setDeleteModalOpen(false);
          onOpenChange(false);
        }}
        isDeleting={isDeleting}
      />
    </>
  );
}
