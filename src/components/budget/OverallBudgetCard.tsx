import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Globe, Pencil, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { Budget, BudgetPeriod } from "@/hooks/useBudgets";
import { format, parseISO } from "date-fns";

interface OverallBudgetCardProps {
  budget: Budget;
  spent: number;
  formatCurrency: (amount: number) => string;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
  onView: (budget: Budget) => void;
}

const periodLabels: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

export function OverallBudgetCard({ 
  budget, 
  spent, 
  formatCurrency, 
  onEdit, 
  onDelete,
  onView
}: OverallBudgetCardProps) {
  const totalBudget = Number(budget.amount) + Number(budget.rollover_amount);
  const percentage = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const isOverBudget = spent > totalBudget;
  const remaining = Math.max(totalBudget - spent, 0);
  
  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "MMM d");
    } catch {
      return date;
    }
  };

  return (
    <Card 
      className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent cursor-pointer active:scale-[0.99] transition-transform" 
      onClick={() => onView(budget)}
    >
      <CardHeader className="pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <CardTitle className="text-sm sm:text-lg truncate">
              Overall {periodLabels[budget.period as BudgetPeriod]} Budget
            </CardTitle>
          </div>
          {/* Action buttons - always visible on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(budget);
              }}
            >
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(budget.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 pb-3 sm:px-6 sm:pb-6">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
            {periodLabels[budget.period as BudgetPeriod]}
          </Badge>
          {budget.is_recurring && (
            <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-2">
              <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden xs:inline">Recurring</span>
            </Badge>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {formatDate(budget.start_date)} - {budget.end_date ? formatDate(budget.end_date) : "ongoing"}
          </span>
        </div>

        {/* Stats grid - responsive */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="bg-background/50 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Budget</p>
            <p className="text-sm sm:text-lg font-bold text-foreground">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Spent</p>
            <p className={`text-sm sm:text-lg font-bold ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
              {formatCurrency(spent)}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Left</p>
            <p className="text-sm sm:text-lg font-bold text-foreground">{formatCurrency(remaining)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] sm:text-xs mb-1">
            <span className={isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}>
              {percentage.toFixed(1)}% spent
            </span>
            {isOverBudget && <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />}
          </div>
          <Progress 
            value={Math.min(percentage, 100)} 
            className={`h-2 sm:h-3 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
