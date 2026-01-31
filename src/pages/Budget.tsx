import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudgets, Budget as BudgetType, BudgetLog, CreateBudgetInput, UpdateBudgetInput } from "@/hooks/useBudgets";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { BudgetSkeleton } from "@/components/skeletons/PageSkeletons";
import { BudgetCard } from "@/components/budget/BudgetCard";
import { BudgetFormDialog } from "@/components/budget/BudgetFormDialog";
import { BudgetHistory } from "@/components/budget/BudgetHistory";
import { OverallBudgetCard } from "@/components/budget/OverallBudgetCard";
import { BudgetViewModal } from "@/components/budget/BudgetViewModal";
import { Plus, Target } from "lucide-react";

export default function Budget() {
  const {
    budgets,
    overallBudgets,
    categoryBudgets,
    history,
    categories,
    spending,
    historySpending,
    isLoading,
    isHistoryLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    isCreating,
    isUpdating,
    isDeleting,
    fetchBudgetLogs,
    fetchBudgetTransactions,
  } = useBudgets();
  const { preferredCurrency } = useProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingBudget, setViewingBudget] = useState<BudgetType | null>(null);
  const [viewLogs, setViewLogs] = useState<BudgetLog[]>([]);
  const [viewTransactions, setViewTransactions] = useState<any[]>([]);

  // Load logs and transactions when viewing a budget
  useEffect(() => {
    if (viewingBudget && viewModalOpen) {
      fetchBudgetLogs(viewingBudget.id).then(setViewLogs).catch(() => setViewLogs([]));
      fetchBudgetTransactions(viewingBudget).then(setViewTransactions).catch(() => setViewTransactions([]));
    }
  }, [viewingBudget, viewModalOpen]);

  if (isLoading) {
    return <BudgetSkeleton />;
  }

  const handleEdit = (budget: BudgetType) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleView = (budget: BudgetType) => {
    setViewingBudget(budget);
    setViewModalOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingBudget(null);
    }
  };

  const handleViewModalClose = (open: boolean) => {
    setViewModalOpen(open);
    if (!open) {
      setViewingBudget(null);
      setViewLogs([]);
      setViewTransactions([]);
    }
  };

  const handleSubmit = async (data: CreateBudgetInput | UpdateBudgetInput) => {
    if ('id' in data) {
      await updateBudget(data);
    } else {
      await createBudget(data);
    }
  };

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find(c => c.id === categoryId)?.name || "Unknown";
  };

  const usedCategoryIds: string[] = [];

  // Calculate totals
  const totalBudgeted = categoryBudgets.reduce((sum, b) => sum + Number(b.amount) + Number(b.rollover_amount), 0);
  const totalSpent = categoryBudgets.reduce((sum, b) => sum + (spending[b.id] || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-4">
      {/* Header - responsive layout */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Budget</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Track your spending limits</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          size="sm"
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Budget</span>
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
          <TabsTrigger value="active" className="text-sm sm:text-base">Active</TabsTrigger>
          <TabsTrigger value="history" className="text-sm sm:text-base">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Overall Budgets */}
          {overallBudgets.length > 0 && (
            <div className="space-y-3">
              {overallBudgets.map((budget) => (
                <OverallBudgetCard
                  key={budget.id}
                  budget={budget}
                  spent={spending[budget.id] || 0}
                  formatCurrency={fmt}
                  onEdit={handleEdit}
                  onDelete={deleteBudget}
                  onView={handleView}
                />
              ))}
            </div>
          )}

          {/* Summary Card for Category Budgets - responsive grid */}
          {categoryBudgets.length > 0 && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Category Budgets</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{fmt(totalBudgeted)}</p>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-bold ${totalSpent > totalBudgeted ? "text-destructive" : "text-foreground"}`}>
                      {fmt(totalSpent)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <Progress value={totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}% of budget used
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Budget List - responsive grid */}
          <div className="space-y-3">
            {budgets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                  <Target className="mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                  <p className="text-base sm:text-lg font-medium text-foreground text-center">No active budgets</p>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">Create your first budget to start tracking</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {categoryBudgets.map((budget) => {
                  const category = categories.find(c => c.id === budget.category_id);
                  return (
                    <BudgetCard
                      key={budget.id}
                      budget={budget}
                      categoryName={category?.name || "Uncategorized"}
                      categoryColor={category?.color}
                      categoryIcon={category?.icon}
                      spent={spending[budget.id] || 0}
                      formatCurrency={fmt}
                      onEdit={handleEdit}
                      onDelete={deleteBudget}
                      onView={handleView}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 sm:mt-6">
          <BudgetHistory
            history={history}
            spending={historySpending}
            categories={categories}
            formatCurrency={fmt}
            isLoading={isHistoryLoading}
          />
        </TabsContent>
      </Tabs>

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        budget={editingBudget}
        categories={categories}
        usedCategoryIds={usedCategoryIds}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <BudgetViewModal
        budget={viewingBudget}
        open={viewModalOpen}
        onOpenChange={handleViewModalClose}
        onEdit={(budget) => {
          setViewModalOpen(false);
          handleEdit(budget);
        }}
        onDelete={deleteBudget}
        spending={viewingBudget ? (spending[viewingBudget.id] || 0) : 0}
        transactions={viewTransactions}
        logs={viewLogs}
        categories={categories}
        isDeleting={isDeleting}
      />
    </div>
  );
}
