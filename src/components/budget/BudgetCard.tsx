import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, FileText, Smartphone, Home, Car, Utensils, Heart, ShoppingBag, Plane, Lightbulb, Music, GraduationCap, Briefcase, RefreshCw, Layers } from "lucide-react";
import { Budget, BudgetPeriod } from "@/hooks/useBudgets";
import { format, parseISO } from "date-fns";

interface BudgetCardProps {
  budget: Budget;
  categoryName: string;
  categoryColor?: string | null;
  categoryIcon?: string | null;
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

// Map of string icon names to Lucide components
const iconMap: Record<string, any> = {
  Smartphone,
  Home,
  Car,
  Utensils,
  Heart,
  ShoppingBag,
  Plane,
  Lightbulb,
  Music,
  GraduationCap,
  Briefcase,
  FileText,
  Layers
};

export function BudgetCard({
  budget,
  categoryName,
  categoryColor,
  categoryIcon,
  spent,
  formatCurrency,
  onEdit,
  onDelete,
  onView,
}: BudgetCardProps) {
  const totalBudget = Number(budget.amount) + Number(budget.rollover_amount);
  const percentage = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const remaining = totalBudget - spent;

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "MM/dd/yyyy");
    } catch {
      return date;
    }
  };

  // Resolve icon component
  const IconComponent = (categoryIcon && iconMap[categoryIcon]) ? iconMap[categoryIcon] : FileText;

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-shadow bg-card" onClick={() => onView(budget)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{
                backgroundColor: categoryColor || "#22c55e",
                color: "#ffffff"
              }}
            >
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-foreground leading-none mb-1 truncate">{categoryName}</h3>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-sm text-muted-foreground capitalize">
                  {periodLabels[budget.period as BudgetPeriod] || budget.period}
                </span>
                {budget.is_recurring && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1 bg-secondary text-secondary-foreground font-normal gap-1">
                    <RefreshCw className="h-2 w-2" />
                    Recurring
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onView(budget);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(budget);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-base text-muted-foreground font-medium">Progress</span>
            <span className="text-base font-medium">{Math.min(percentage, 100).toFixed(1)}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full w-full flex-1 transition-all ${spent > totalBudget ? "bg-destructive" : (!categoryColor ? "bg-primary" : "")}`}
              style={{
                transform: `translateX(-${100 - Math.min(percentage, 100)}%)`,
                backgroundColor: (spent <= totalBudget && categoryColor) ? categoryColor : undefined
              }}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-base text-muted-foreground">Spent</span>
            <span className="text-base font-medium">{formatCurrency(spent)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base text-muted-foreground">Budget</span>
            <span className="text-base font-medium">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base text-muted-foreground">Remaining</span>
            <span className={`text-base font-bold ${remaining < 0 ? "text-destructive" : "text-green-500"}`}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        {/* Footer Date */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {formatDate(budget.start_date)} - {budget.end_date ? formatDate(budget.end_date) : "Ongoing"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
