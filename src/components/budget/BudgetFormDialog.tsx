import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Globe, FolderTree } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Budget, BudgetPeriod, CreateBudgetInput, UpdateBudgetInput, getPeriodDates } from "@/hooks/useBudgets";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Category {
  id: string;
  name: string;
}

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  categories: Category[];
  usedCategoryIds: string[];
  onSubmit: (data: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  isSubmitting: boolean;
}

const periodOptions: { value: BudgetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export function BudgetFormDialog({
  open,
  onOpenChange,
  budget,
  categories,
  usedCategoryIds,
  onSubmit,
  isSubmitting,
}: BudgetFormDialogProps) {
  const isEditing = !!budget;
  
  const [budgetType, setBudgetType] = useState<"category" | "overall">("category");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isRecurring, setIsRecurring] = useState(false);

  // Reset form when dialog opens/closes or budget changes
  useEffect(() => {
    if (open) {
      if (budget) {
        setBudgetType(budget.is_overall ? "overall" : "category");
        setCategoryId(budget.category_id || "");
        setAmount(String(budget.amount));
        setPeriod(budget.period as BudgetPeriod);
        setStartDate(budget.start_date ? parseISO(budget.start_date) : undefined);
        setEndDate(budget.end_date ? parseISO(budget.end_date) : undefined);
        setIsRecurring(budget.is_recurring);
      } else {
        setBudgetType("category");
        setCategoryId("");
        setAmount("");
        setPeriod("monthly");
        const dates = getPeriodDates("monthly");
        setStartDate(dates.start);
        setEndDate(dates.end);
        setIsRecurring(false);
      }
    }
  }, [open, budget]);

  // Update dates when period changes
  useEffect(() => {
    if (period !== "custom" && !isEditing) {
      const dates = getPeriodDates(period);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  }, [period, isEditing]);

  const canRecur = period === "weekly" || period === "monthly";

  const availableCategories = isEditing 
    ? categories 
    : categories.filter(c => !usedCategoryIds.includes(c.id));

  const handleSubmit = async () => {
    if (!amount) return;
    if (budgetType === "category" && !isEditing && !categoryId) return;

    if (isEditing && budget) {
      await onSubmit({
        id: budget.id,
        amount: parseFloat(amount),
        period,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        is_recurring: canRecur ? isRecurring : false,
      });
    } else {
      await onSubmit({
        category_id: budgetType === "overall" ? null : categoryId,
        amount: parseFloat(amount),
        period,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        is_recurring: canRecur ? isRecurring : false,
        is_overall: budgetType === "overall",
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? "Edit Budget" : "Create Budget"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Budget Type Selection - only for create */}
          {!isEditing && (
            <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as "category" | "overall")}>
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="category" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <FolderTree className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Category
                </TabsTrigger>
                <TabsTrigger value="overall" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Overall
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Category Selection - only for category budget */}
          {budgetType === "category" && !isEditing && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-sm">Budget Amount</Label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="h-10 sm:h-11"
            />
          </div>

          {/* Period Selection */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-sm">Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm">Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 sm:h-11 text-xs sm:text-sm",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {startDate ? format(startDate, "MMM d") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm">End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 sm:h-11 text-xs sm:text-sm",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {endDate ? format(endDate, "MMM d") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Recurring Toggle - only for weekly/monthly */}
          {canRecur && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label className="text-sm font-medium">Recurring Budget</Label>
                <p className="text-xs text-muted-foreground">
                  Auto-create next {period === "weekly" ? "week's" : "month's"} budget
                </p>
              </div>
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
          )}

          {/* Period Preview */}
          {period !== "custom" && startDate && endDate && (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-1">
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
            </p>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !amount || (budgetType === "category" && !isEditing && !categoryId)} 
            className="w-full h-10 sm:h-11"
          >
            {isEditing ? "Update Budget" : "Create Budget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
