import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals, Goal } from "@/hooks/useGoals";
import { useProfile, formatCurrency, getCurrencySymbol } from "@/hooks/useProfile";
import { TransactionsSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Target, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Transactions() {
  const { transactions, categories, isLoading, createTransaction, deleteTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { preferredCurrency } = useProfile();
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    account_id: "",
    category_id: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  // Goal contribution/deduction state
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [goalAllocationType, setGoalAllocationType] = useState<"all" | "split">("all");
  const [goalAmount, setGoalAmount] = useState("");

  // Get selected goal for validation
  const selectedGoal = useMemo(() => 
    goals.find((g) => g.id === selectedGoalId),
    [goals, selectedGoalId]
  );

  // Validation messages
  const getGoalValidationMessage = (): { type: "error" | "warning"; message: string } | null => {
    const transactionAmount = parseFloat(formData.amount) || 0;
    const goalAmountNum = parseFloat(goalAmount) || 0;

    if (!goalEnabled || !selectedGoalId) return null;

    // For split allocation, check amount entered
    if (goalAllocationType === "split") {
      if (!formData.amount) {
        return { type: "warning", message: `Enter the ${formData.type} amount first` };
      }
      if (goalAmountNum > transactionAmount) {
        return { type: "error", message: `Goal amount cannot exceed ${formData.type} amount` };
      }
    }

    // For expense (deduction from goal)
    if (formData.type === "expense" && selectedGoal) {
      const effectiveAmount = goalAllocationType === "all" ? transactionAmount : goalAmountNum;
      
      if (effectiveAmount > selectedGoal.current_amount) {
        if (goalAllocationType === "all") {
          return { 
            type: "error", 
            message: `Goal only has ${fmt(selectedGoal.current_amount)}. Use "Split" to specify a smaller amount.` 
          };
        } else {
          return { 
            type: "error", 
            message: `Cannot exceed goal's available amount (${fmt(selectedGoal.current_amount)})` 
          };
        }
      }
    }

    return null;
  };

  const validationMessage = getGoalValidationMessage();
  const hasValidationError = validationMessage?.type === "error";

  const resetForm = () => {
    setFormData({ 
      type: "expense", 
      amount: "", 
      account_id: "", 
      category_id: "", 
      description: "", 
      transaction_date: format(new Date(), "yyyy-MM-dd") 
    });
    setGoalEnabled(false);
    setSelectedGoalId("");
    setGoalAllocationType("all");
    setGoalAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.amount || hasValidationError) return;
    
    const account = accounts.find((a) => a.id === formData.account_id);
    const transactionAmount = parseFloat(formData.amount);
    
    // Calculate goal amount to update
    let finalGoalId: string | null = null;
    let finalGoalAmount: number | null = null;
    let finalGoalAllocationType: string | null = null;

    if (goalEnabled && selectedGoalId) {
      finalGoalId = selectedGoalId;
      finalGoalAllocationType = goalAllocationType;
      finalGoalAmount = goalAllocationType === "all" 
        ? transactionAmount 
        : parseFloat(goalAmount) || 0;
    }

    await createTransaction({
      ...formData,
      amount: transactionAmount,
      currency: account?.currency || "USD",
      category_id: formData.category_id || null,
      notes: null,
      goal_id: finalGoalId,
      goal_amount: finalGoalAmount,
      goal_allocation_type: finalGoalAllocationType,
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const handleTypeChange = (type: "income" | "expense") => {
    setFormData({ ...formData, type, category_id: "" });
    // Reset goal state when changing type
    setGoalEnabled(false);
    setSelectedGoalId("");
    setGoalAllocationType("all");
    setGoalAmount("");
  };

  if (isLoading) return <TransactionsSkeleton />;

  const filteredTransactions = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Filter goals - only active, non-archived goals, and for expenses only show goals with available amount
  const availableGoals = formData.type === "expense" 
    ? goals.filter((g) => g.status === "active" && !g.is_archived && g.current_amount > 0)
    : goals.filter((g) => g.status === "active" && !g.is_archived && g.current_amount < g.target_amount);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Transactions</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="icon" className="md:hidden"><Plus className="h-5 w-5" /></Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button className="hidden md:flex"><Plus className="mr-2 h-4 w-4" />Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={formData.type} onValueChange={(v) => handleTypeChange(v as "income" | "expense")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">Expense</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <CurrencyInput 
                    currencySymbol={currencySymbol}
                    step="0.01" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(formData.type === "income" ? incomeCategories : expenseCategories).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              {/* Goal Section */}
              {availableGoals.length > 0 && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Label className="font-medium">
                        {formData.type === "income" ? "Contribute to Goal" : "Deduct from Goal"}
                      </Label>
                    </div>
                    <Switch checked={goalEnabled} onCheckedChange={setGoalEnabled} />
                  </div>

                  {goalEnabled && (
                    <div className="space-y-3 pt-2">
                      {/* Goal Select */}
                      <div className="space-y-2">
                        <Label className="text-sm">Select Goal</Label>
                        <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a goal" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableGoals.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                <span className="flex items-center gap-2">
                                  {g.name}
                                  <span className="text-xs text-muted-foreground">
                                    ({fmt(g.current_amount)} / {fmt(g.target_amount)})
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedGoalId && (
                        <>
                          {/* Allocation Type */}
                          <div className="space-y-2">
                            <Label className="text-sm">Allocation</Label>
                            <Tabs value={goalAllocationType} onValueChange={(v) => setGoalAllocationType(v as "all" | "split")}>
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="split">Split</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>

                          {/* Split Amount */}
                          {goalAllocationType === "split" && (
                            <div className="space-y-2">
                              <Label className="text-sm">
                                Amount to {formData.type === "income" ? "contribute" : "deduct"}
                              </Label>
                              <CurrencyInput
                                currencySymbol={currencySymbol}
                                step="0.01"
                                placeholder="Enter amount"
                                value={goalAmount}
                                onChange={(e) => setGoalAmount(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Validation Message */}
                          {validationMessage && (
                            <div className={`flex items-start gap-2 rounded-md p-2 text-sm ${
                              validationMessage.type === "error" 
                                ? "bg-destructive/10 text-destructive" 
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}>
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{validationMessage.message}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isCreating || !formData.account_id || hasValidationError}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredTransactions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No transactions yet</CardContent></Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.type === "income" ? "bg-accent" : "bg-muted"}`}>
                {t.type === "income" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.description || "Untitled"}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{format(new Date(t.transaction_date), "MMM d, yyyy")}</span>
                  {t.goal_id && (
                    <>
                      <span>•</span>
                      <Target className="h-3 w-3" />
                    </>
                  )}
                </div>
              </div>
              <p className={`font-semibold whitespace-nowrap ${t.type === "income" ? "text-foreground" : "text-destructive"}`}>
                {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
              </p>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteTransaction(t)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}