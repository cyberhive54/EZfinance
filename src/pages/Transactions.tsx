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
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Target, AlertCircle, Copy, Edit2, ChevronUp, ChevronDown, ArrowUpDown, MoreHorizontal, X } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type SortField = "date_created" | "amount" | "transaction_date";
type SortOrder = "asc" | "desc";
type DateFilterType = "all" | "this-week" | "last-7-days" | "this-month" | "last-30-days" | "this-year" | "last-365-days" | "custom-month" | "custom-year" | "custom-date";

type EditingTransaction = {
  id: string;
  type: "income" | "expense";
  amount: string;
  account_id: string;
  category_id: string;
  description: string;
  transaction_date: string;
} | null;

export default function Transactions() {
  const { transactions, categories, isLoading, createTransaction, updateTransaction, deleteTransaction, isCreating, isUpdating } = useTransactions();
  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { preferredCurrency } = useProfile();
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditingTransaction>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<number | null>(null);
  const [amountMax, setAmountMax] = useState<number | null>(null);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [customMonth, setCustomMonth] = useState<string>("");
  const [customYear, setCustomYear] = useState<string>(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState<SortField>("date_created");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [allSelectedRows, setAllSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    account_id: "",
    category_id: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  // Date filter helper
  const getDateRangeFilter = () => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

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
  };

  // Search and filter logic
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Payment method filter (account-based)
    if (paymentMethodFilter !== "all") {
      result = result.filter((t) => t.account_id === paymentMethodFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category_id === categoryFilter);
    }

    // Amount range filter
    if (amountMin !== null) {
      result = result.filter((t) => t.amount >= amountMin);
    }
    if (amountMax !== null) {
      result = result.filter((t) => t.amount <= amountMax);
    }

    // Date filter
    if (dateFilterType !== "all") {
      const { start, end } = getDateRangeFilter();
      if (start && end) {
        result = result.filter((t) => {
          const tDate = new Date(t.transaction_date);
          return tDate >= start && tDate <= end;
        });
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          categories.find((c) => c.id === t.category_id)?.name?.toLowerCase().includes(query)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = a.created_at || "";
      let bVal: any = b.created_at || "";

      switch (sortField) {
        case "date_created":
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        case "amount":
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case "transaction_date":
          aVal = new Date(a.transaction_date || 0).getTime();
          bVal = new Date(b.transaction_date || 0).getTime();
          break;
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, typeFilter, paymentMethodFilter, categoryFilter, amountMin, amountMax, dateFilterType, customStartDate, customEndDate, customMonth, customYear, searchQuery, sortField, sortOrder, categories]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const handleDuplicateTransaction = async (transaction: any) => {
    const duplicateDescription = `${transaction.description} - Duplicate`;
    await createTransaction({
      type: transaction.type,
      amount: transaction.amount,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      description: duplicateDescription,
      transaction_date: transaction.transaction_date,
      currency: transaction.currency,
      frequency: transaction.frequency,
    });
  };

  const handleSelectAll = () => {
    if (isAllPageSelected()) {
      // Unselect all on current page
      const newSelected = new Set(allSelectedRows);
      paginatedTransactions.forEach((t) => newSelected.delete(t.id));
      setAllSelectedRows(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(allSelectedRows);
      paginatedTransactions.forEach((t) => newSelected.add(t.id));
      setAllSelectedRows(newSelected);
    }
  };

  const isAllPageSelected = () => {
    return paginatedTransactions.length > 0 && paginatedTransactions.every((t) => allSelectedRows.has(t.id));
  };

  const handleBulkDelete = async () => {
    for (const id of allSelectedRows) {
      const transaction = transactions.find((t) => t.id === id);
      if (transaction) {
        await deleteTransaction(transaction);
      }
    }
    setAllSelectedRows(new Set());
    setShowDeleteConfirm(false);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(),
      account_id: transaction.account_id,
      category_id: transaction.category_id || "",
      description: transaction.description || "",
      transaction_date: transaction.transaction_date,
    });
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      account_id: transaction.account_id,
      category_id: transaction.category_id || "",
      description: transaction.description || "",
      transaction_date: transaction.transaction_date,
    });
    setIsDialogOpen(true);
  };

  const resetEditState = () => {
    setEditingTransaction(null);
    resetForm();
  };

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

    const transactionData = {
      ...formData,
      amount: transactionAmount,
      currency: account?.currency || "USD",
      category_id: formData.category_id || null,
      notes: null,
      goal_id: finalGoalId,
      goal_amount: finalGoalAmount,
      goal_allocation_type: finalGoalAllocationType,
    };

    if (editingTransaction) {
      // Update existing transaction
      await updateTransaction({
        id: editingTransaction.id,
        ...transactionData,
      } as any);
      resetEditState();
    } else {
      // Create new transaction
      await createTransaction(transactionData);
      resetForm();
    }

    setIsDialogOpen(false);
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

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Filter goals - only active, non-archived goals, and for expenses only show goals with available amount
  const availableGoals = formData.type === "expense" 
    ? goals.filter((g) => g.status === "active" && !g.is_archived && g.current_amount > 0)
    : goals.filter((g) => g.status === "active" && !g.is_archived && g.current_amount < g.target_amount);

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { 
          setIsDialogOpen(open); 
          if (!open) resetEditState(); 
        }}>
          <DialogTrigger asChild>
            <Button size="icon" className="md:hidden"><Plus className="h-5 w-5" /></Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button className="hidden md:flex"><Plus className="mr-2 h-4 w-4" />{editingTransaction ? "Edit" : "Add"} Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
            </DialogHeader>
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

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-1">
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-md"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={(v: any) => {
            setTypeFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Method Filter */}
          <Select value={paymentMethodFilter} onValueChange={(v) => {
            setPaymentMethodFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={(v) => {
            setCategoryFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Transaction Date Filter */}
          <Select value={dateFilterType} onValueChange={(v: any) => {
            setDateFilterType(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Transaction Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-365-days">Last 365 Days</SelectItem>
              <SelectItem value="custom-date">Custom Date</SelectItem>
              <SelectItem value="custom-month">Custom Month</SelectItem>
              <SelectItem value="custom-year">Custom Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amount Range Filter */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Amount Range</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={amountMin ?? ""}
                onChange={(e) => {
                  setAmountMin(e.target.value ? parseFloat(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={amountMax ?? ""}
                onChange={(e) => {
                  setAmountMax(e.target.value ? parseFloat(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Filters */}
        {dateFilterType === "custom-date" && (
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-40"
              />
            </div>
          </div>
        )}

        {/* Custom Month Filter */}
        {dateFilterType === "custom-month" && (
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Input
                type="number"
                placeholder="2026"
                value={customYear}
                onChange={(e) => {
                  setCustomYear(e.target.value);
                  setCurrentPage(1);
                }}
                min={2000}
                max={2100}
                className="w-24"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select value={customMonth} onValueChange={(v) => {
                setCustomMonth(v);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return (
                      <SelectItem key={month} value={`${customYear}-${String(month).padStart(2, "0")}`}>
                        {format(new Date(parseInt(customYear), month - 1), "MMMM")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Custom Year Filter */}
        {dateFilterType === "custom-year" && (
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Input
                type="number"
                placeholder="2026"
                value={customYear}
                onChange={(e) => {
                  setCustomYear(e.target.value);
                  setCurrentPage(1);
                }}
                min={2000}
                max={2100}
                className="w-24"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {allSelectedRows.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {allSelectedRows.size} transaction{allSelectedRows.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllSelectedRows(new Set())}
            >
              Reset Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({allSelectedRows.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox 
                      checked={isAllPageSelected()}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => toggleSort("date_created")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Date Created
                      {getSortIcon("date_created")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Title</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell font-semibold text-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted/70" onClick={() => toggleSort("amount")}>
                    <div className="flex items-center justify-end gap-2 font-semibold text-foreground">
                      Amount
                      {getSortIcon("amount")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hidden lg:table-cell hover:bg-muted/70" onClick={() => toggleSort("transaction_date")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Transaction Date
                      {getSortIcon("transaction_date")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell font-semibold text-foreground">Payment Method</th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell font-semibold text-foreground">Frequency</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={allSelectedRows.has(transaction.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(allSelectedRows);
                          if (checked) {
                            newSelected.add(transaction.id);
                          } else {
                            newSelected.delete(transaction.id);
                          }
                          setAllSelectedRows(newSelected);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {format(new Date(transaction.created_at || new Date()), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{transaction.description || "Untitled"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {categories.find((c) => c.id === transaction.category_id)?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                          transaction.type === "income"
                            ? "bg-accent/20 text-accent"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {transaction.type === "income" ? "INCOME" : "EXPENSE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span
                        className={transaction.type === "income" ? "text-accent" : "text-destructive"}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                      {accounts.find((a) => a.id === transaction.account_id)?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="capitalize">{transaction.frequency || "One-time"}</span>
                        {transaction.frequency && transaction.frequency !== "one-time" && (
                          <span className="text-xs text-muted-foreground">Next: Feb 07 2026</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTransaction(transaction)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteTransaction(transaction)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {paginatedTransactions.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border bg-muted/30 px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
              {filteredTransactions.length}
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Rows per page</label>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                setItemsPerPage(parseInt(v));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant={currentPage === totalPages ? "outline" : "default"}
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                {currentPage === totalPages ? currentPage : currentPage}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {allSelectedRows.size} transaction{allSelectedRows.size !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
