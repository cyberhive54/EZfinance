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
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Target, AlertCircle, Copy, Edit2, ChevronUp, ChevronDown, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

type SortField = "date_created" | "description" | "category" | "type" | "amount" | "transaction_date" | "payment_method" | "frequency";
type SortOrder = "asc" | "desc";

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
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date_created");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    account_id: "",
    category_id: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  // Search and filter logic
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Frequency filter (if field exists)
    if (frequencyFilter !== "all") {
      result = result.filter((t) => {
        const freq = t.frequency || "one-time";
        return freq.toLowerCase() === frequencyFilter.toLowerCase();
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.category_id?.toString().includes(query)
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
        case "description":
          aVal = a.description || "";
          bVal = b.description || "";
          break;
        case "category":
          aVal = a.category_id || "";
          bVal = b.category_id || "";
          break;
        case "type":
          aVal = a.type || "";
          bVal = b.type || "";
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
  }, [transactions, typeFilter, frequencyFilter, searchQuery, sortField, sortOrder]);

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
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const handleDuplicateTransaction = async (transaction: any) => {
    await createTransaction({
      ...transaction,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
    });
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
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
          <Select value={typeFilter} onValueChange={(v: any) => {
            setTypeFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={frequencyFilter} onValueChange={(v) => {
            setFrequencyFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Frequently" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequency</SelectItem>
              <SelectItem value="one-time">One-time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                    <Checkbox />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => toggleSort("date_created")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Date Created
                      {getSortIcon("date_created")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => toggleSort("description")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Title
                      {getSortIcon("description")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hidden sm:table-cell hover:bg-muted/70" onClick={() => toggleSort("category")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Category
                      {getSortIcon("category")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => toggleSort("type")}>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Type
                      {getSortIcon("type")}
                    </div>
                  </th>
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
                        checked={selectedRows.has(transaction.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedRows);
                          if (checked) {
                            newSelected.add(transaction.id);
                          } else {
                            newSelected.delete(transaction.id);
                          }
                          setSelectedRows(newSelected);
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
    </div>
  );
}
