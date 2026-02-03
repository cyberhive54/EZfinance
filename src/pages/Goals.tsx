import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useGoals, GoalLog } from "@/hooks/useGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { useProfile, formatCurrency, getCurrencySymbol } from "@/hooks/useProfile";
import { usePriorities } from "@/hooks/usePriorities";
import { Plus, Target, PiggyBank, TrendingUp, Calendar, Flag, ArrowUpDown } from "lucide-react";
import { differenceInDays } from "date-fns";
import { GoalsSkeleton } from "@/components/skeletons/PageSkeletons";
import { GoalStatusBadge, getGoalStatus } from "@/components/goals/GoalStatusBadge";
import { GoalViewModal } from "@/components/goals/GoalViewModal";

const GOAL_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const GOAL_ICONS = [
  { icon: "Target", label: "Target" },
  { icon: "PiggyBank", label: "Savings" },
  { icon: "Home", label: "Home" },
  { icon: "Car", label: "Car" },
  { icon: "Plane", label: "Travel" },
  { icon: "GraduationCap", label: "Education" },
  { icon: "Heart", label: "Health" },
  { icon: "Gift", label: "Gift" },
];

export default function Goals() {
  const { goals, goalLogs, isLoading, createGoal, updateGoal, isCreating } = useGoals();
  const { transactions } = useTransactions();
  const { preferredCurrency } = useProfile();
  const { priorities, initializePriorities, isLoading: prioritiesLoading } = usePriorities();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<typeof goals[0] | null>(null);
  const [sortBy, setSortBy] = useState<string>("deadline");
  
  // Create form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("Target");
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>("");

  // Sort function
  const sortGoals = (goalsToSort: typeof goals) => {
    return [...goalsToSort].sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "priority":
          const aPriority = priorities.find(p => p.id === a.priority_id);
          const bPriority = priorities.find(p => p.id === b.priority_id);
          if (!aPriority && !bPriority) return 0;
          if (!aPriority) return 1;
          if (!bPriority) return -1;
          return aPriority.sort_order - bPriority.sort_order;
        case "progress_low":
          const aProgress = a.target_amount ? (a.current_amount / a.target_amount) : 0;
          const bProgress = b.target_amount ? (b.current_amount / b.target_amount) : 0;
          return aProgress - bProgress;
        case "progress_high":
          const aProgressH = a.target_amount ? (a.current_amount / a.target_amount) : 0;
          const bProgressH = b.target_amount ? (b.current_amount / b.target_amount) : 0;
          return bProgressH - aProgressH;
        case "amount_high":
          return b.target_amount - a.target_amount;
        case "amount_low":
          return a.target_amount - b.target_amount;
        case "remaining_high":
          return (b.target_amount - b.current_amount) - (a.target_amount - a.current_amount);
        case "remaining_low":
          return (a.target_amount - a.current_amount) - (b.target_amount - b.current_amount);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  };

  const currencySymbol = getCurrencySymbol(preferredCurrency);
  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  // Initialize priorities if needed
  useEffect(() => {
    if (!prioritiesLoading && priorities.length === 0) {
      initializePriorities();
    }
  }, [prioritiesLoading, priorities.length, initializePriorities]);

  const resetCreateForm = () => {
    setName("");
    setTargetAmount("");
    setStartDate("");
    setDeadline("");
    setSelectedColor(GOAL_COLORS[0]);
    setSelectedIcon("Target");
    setSelectedPriorityId("");
  };

  const handleCreate = () => {
    if (!name || !targetAmount || !deadline) return;
    
    createGoal({
      name,
      target_amount: parseFloat(targetAmount),
      deadline,
      start_date: startDate || null,
      color: selectedColor,
      icon: selectedIcon,
      priority_id: selectedPriorityId || null,
    });
    
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const handleEdit = () => {
    if (!selectedGoal || !name || !targetAmount || !deadline) return;
    
    updateGoal({
      id: selectedGoal.id,
      name,
      target_amount: parseFloat(targetAmount),
      deadline,
      start_date: startDate || null,
      color: selectedColor,
      icon: selectedIcon,
      priority_id: selectedPriorityId || null,
    });
    
    setIsEditOpen(false);
    resetCreateForm();
    setSelectedGoal(null);
  };

  const openEditDialog = (goal: typeof goals[0]) => {
    setSelectedGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setStartDate(goal.start_date || "");
    setDeadline(goal.deadline || "");
    setSelectedColor(goal.color || GOAL_COLORS[0]);
    setSelectedIcon(goal.icon || "Target");
    setSelectedPriorityId(goal.priority_id || "");
    setIsEditOpen(true);
    setIsViewOpen(false);
  };

  const openViewModal = (goal: typeof goals[0]) => {
    setSelectedGoal(goal);
    setIsViewOpen(true);
  };

  // Get transactions for selected goal
  const goalTransactions = useMemo(() => {
    if (!selectedGoal) return [];
    return transactions.filter(t => t.goal_id === selectedGoal.id);
  }, [selectedGoal, transactions]);

  // Get logs for selected goal
  const selectedGoalLogs = useMemo(() => {
    if (!selectedGoal) return [];
    return goalLogs.filter(l => l.goal_id === selectedGoal.id);
  }, [selectedGoal, goalLogs]);

  if (isLoading) {
    return <GoalsSkeleton />;
  }

  // Calculate summary stats (only active, non-archived goals)
  const activeGoals = goals.filter(g => g.status === "active" && !g.is_archived);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const completedGoals = goals.filter(g => g.status === "completed" || g.current_amount >= g.target_amount).length;

  // Get priority color for goal
  const getPriorityColor = (priorityId: string | null) => {
    if (!priorityId) return null;
    return priorities.find(p => p.id === priorityId)?.color || null;
  };

  const GoalForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Goal Name</Label>
        <Input
          placeholder="e.g., Emergency Fund"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Target Amount</Label>
        <CurrencyInput
          currencySymbol={currencySymbol}
          placeholder="10000"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date (Optional)</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Target Date <span className="text-destructive">*</span></Label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Priority Selector */}
      {priorities.length > 0 && (
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select 
            value={selectedPriorityId || "none"} 
            onValueChange={(val) => setSelectedPriorityId(val === "none" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Priority</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {GOAL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                selectedColor === color ? "scale-110 border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map(({ icon, label }) => (
            <button
              key={icon}
              type="button"
              className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selectedIcon === icon
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
              onClick={() => setSelectedIcon(icon)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={isEdit ? handleEdit : handleCreate} 
        disabled={isCreating || !name || !targetAmount || !deadline} 
        className="w-full"
      >
        {isEdit ? "Save Changes" : "Create Goal"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Goals</h1>
          <p className="text-sm text-muted-foreground">Track your financial goals</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:hidden">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button className="hidden md:flex">
              <Plus className="mr-2 h-4 w-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <GoalForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards - Responsive */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Target</p>
              <p className="text-lg font-semibold text-foreground">{fmt(totalTarget)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <PiggyBank className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-lg font-semibold text-foreground">{fmt(totalSaved)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-foreground">{completedGoals} / {goals.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Goals</h2>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline (soonest)</SelectItem>
                <SelectItem value="priority">Priority (highest)</SelectItem>
                <SelectItem value="progress_low">Progress (lowest)</SelectItem>
                <SelectItem value="progress_high">Progress (highest)</SelectItem>
                <SelectItem value="amount_high">Amount (highest)</SelectItem>
                <SelectItem value="amount_low">Amount (lowest)</SelectItem>
                <SelectItem value="remaining_high">Remaining (highest)</SelectItem>
                <SelectItem value="remaining_low">Remaining (lowest)</SelectItem>
                <SelectItem value="created">Recently created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {goals.filter(g => !g.is_archived && g.status !== "completed" && g.current_amount < g.target_amount).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Target className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
              <p className="text-center text-sm sm:text-base text-muted-foreground">
                No active goals. Create your first goal to start tracking!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {sortGoals(goals
              .filter(g => !g.is_archived && g.status !== "completed" && g.current_amount < g.target_amount))
              .map((goal) => {
                const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                const status = getGoalStatus(goal);
                const isComplete = status === "completed_timely" || status === "completed_delayed";
                const remaining = goal.target_amount - goal.current_amount;
                const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                const priorityColor = getPriorityColor(goal.priority_id);
                const priority = priorities.find(p => p.id === goal.priority_id);
                
                return (
                  <Card 
                    key={goal.id} 
                    className={`cursor-pointer transition-shadow hover:shadow-md ${status === "paused" ? "opacity-60" : ""}`}
                    style={{ 
                      borderColor: priorityColor || undefined,
                      borderWidth: priorityColor ? "2px" : undefined,
                    }}
                    onClick={() => openViewModal(goal)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div
                            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${goal.color}20` }}
                          >
                            <Target className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: goal.color || "#3b82f6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{goal.name}</h3>
                              {priority && (
                                <Badge 
                                  variant="outline" 
                                  className="flex items-center gap-1 text-xs"
                                  style={{ borderColor: priority.color, color: priority.color }}
                                >
                                  <Flag className="h-2.5 w-2.5" />
                                  <span className="hidden sm:inline">{priority.name}</span>
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1">
                              <GoalStatusBadge goal={goal} showArchived={true} />
                            </div>
                            
                            <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm">
                              <span className="font-medium text-foreground">{fmt(goal.current_amount)}</span>
                              <span className="text-muted-foreground">of {fmt(goal.target_amount)}</span>
                            </div>
                            
                            <Progress 
                              value={progress} 
                              className="mt-2 h-1.5 sm:h-2"
                              style={{ 
                                // @ts-ignore
                                "--progress-color": goal.color 
                              }}
                            />
                            
                            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                              <span>{progress.toFixed(0)}%</span>
                              {!isComplete && remaining > 0 && <span className="hidden sm:inline">{fmt(remaining)} left</span>}
                              {goal.deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {daysLeft !== null && daysLeft > 0 
                                    ? `${daysLeft}d` 
                                    : daysLeft === 0 
                                      ? "Today"
                                      : "Overdue"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Archived & Completed Goals Section */}
      {goals.filter(g => g.is_archived || g.status === "completed" || g.current_amount >= g.target_amount).length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Completed & Archived</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {goals
              .filter(g => g.is_archived || g.status === "completed" || g.current_amount >= g.target_amount)
              .map((goal) => {
                const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                const status = getGoalStatus(goal);
                const priorityColor = getPriorityColor(goal.priority_id);
                const priority = priorities.find(p => p.id === goal.priority_id);
                
                return (
                  <Card 
                    key={goal.id} 
                    className="cursor-pointer transition-shadow hover:shadow-md opacity-70"
                    style={{ 
                      borderColor: priorityColor || undefined,
                      borderWidth: priorityColor ? "2px" : undefined,
                    }}
                    onClick={() => openViewModal(goal)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div
                            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${goal.color}20` }}
                          >
                            <Target className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: goal.color || "#3b82f6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{goal.name}</h3>
                              {priority && (
                                <Badge 
                                  variant="outline" 
                                  className="flex items-center gap-1 text-xs"
                                  style={{ borderColor: priority.color, color: priority.color }}
                                >
                                  <Flag className="h-2.5 w-2.5" />
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1">
                              <GoalStatusBadge goal={goal} showArchived={true} />
                            </div>
                            
                            <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm">
                              <span className="font-medium text-foreground">{fmt(goal.current_amount)}</span>
                              <span className="text-muted-foreground">of {fmt(goal.target_amount)}</span>
                            </div>
                            
                            <Progress 
                              value={progress} 
                              className="mt-2 h-1.5 sm:h-2"
                              style={{ 
                                // @ts-ignore
                                "--progress-color": goal.color 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Goal View Modal */}
      <GoalViewModal
        goal={selectedGoal}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        onEdit={openEditDialog}
        transactions={goalTransactions}
        logs={selectedGoalLogs}
      />
    </div>
  );
}
