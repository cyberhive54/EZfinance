import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Goal, GoalLog, useGoals } from "@/hooks/useGoals";
import { usePriorities } from "@/hooks/usePriorities";
import { useProfile, formatCurrency } from "@/hooks/useProfile";
import { GoalStatusBadge, getGoalStatus, getStatusLabel, getStatusColor } from "./GoalStatusBadge";
import { GoalPauseModal } from "./GoalPauseModal";
import { GoalDeleteModal } from "./GoalDeleteModal";
import { differenceInDays, format, parseISO, isAfter } from "date-fns";
import { Target, Calendar, Pencil, Pause, Play, Archive, ArchiveRestore, Trash2, ArrowUpRight, ArrowDownRight, Clock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GoalViewModalProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (goal: Goal) => void;
  transactions: Array<{
    id: string;
    description: string | null;
    amount: number;
    transaction_date: string;
    goal_amount: number | null;
    type: "income" | "expense";
    currency: string;
    created_at: string;
  }>;
  logs: GoalLog[];
}

export function GoalViewModal({ goal, open, onOpenChange, onEdit, transactions, logs }: GoalViewModalProps) {
  const { preferredCurrency } = useProfile();
  const { priorities } = usePriorities();
  const { 
    pauseGoal, 
    activateGoal, 
    archiveGoal, 
    unarchiveGoal,
    isPausing, 
    isActivating,
    isArchiving,
    isUnarchiving,
  } = useGoals();
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [runningBalance, setRunningBalance] = useState<number[]>([]);

  // Keep local goal state synced for real-time updates
  const [localGoal, setLocalGoal] = useState<Goal | null>(null);
  
  useEffect(() => {
    if (goal) {
      setLocalGoal(goal);
    }
  }, [goal]);

  const fmt = (amount: number) => formatCurrency(amount, preferredCurrency);

  useEffect(() => {
    if (localGoal && transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      let balance = 0;
      const balances = sorted.map((t) => {
        const amount = t.goal_amount || 0;
        if (t.type === "income") {
          balance += amount;
        } else {
          balance -= amount;
        }
        return balance;
      });
      setRunningBalance(balances);
    }
  }, [localGoal, transactions]);

  if (!localGoal) return null;

  const status = getGoalStatus(localGoal);
  const statusColor = getStatusColor(status);
  const remaining = localGoal.target_amount - localGoal.current_amount;
  const isPaused = status === "paused";
  const isComplete = status === "completed_timely" || status === "completed_delayed";
  const isArchived = localGoal.is_archived;
  const canArchive = isComplete;

  // Get priority info
  const priority = priorities.find(p => p.id === localGoal.priority_id);

  // Calculate days status
  const getDaysStatus = () => {
    const today = new Date();
    
    if (localGoal.start_date) {
      const startDate = parseISO(localGoal.start_date);
      if (isAfter(startDate, today)) {
        const daysUntilStart = differenceInDays(startDate, today);
        return `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}`;
      }
    }
    
    if (localGoal.deadline) {
      const deadline = parseISO(localGoal.deadline);
      const daysLeft = differenceInDays(deadline, today);
      
      if (isComplete) {
        return "Goal completed";
      } else if (daysLeft < 0) {
        return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
      } else if (daysLeft === 0) {
        return "Due today";
      } else {
        return `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`;
      }
    }
    
    return "No deadline set";
  };

  const handlePause = () => {
    pauseGoal(localGoal.id);
    setLocalGoal(prev => prev ? { ...prev, status: "paused", paused_at: new Date().toISOString() } : null);
    setPauseModalOpen(false);
  };

  const handleActivate = () => {
    activateGoal(localGoal.id);
    setLocalGoal(prev => prev ? { ...prev, status: "active", paused_at: null } : null);
  };

  const handleArchive = () => {
    archiveGoal(localGoal.id);
    setLocalGoal(prev => prev ? { ...prev, is_archived: true, archived_at: new Date().toISOString() } : null);
  };

  const handleUnarchive = () => {
    unarchiveGoal(localGoal.id);
    setLocalGoal(prev => prev ? { ...prev, is_archived: false, archived_at: null } : null);
  };

  // Sort transactions by created_at desc for display
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Reverse the running balance to match desc order
  const displayBalances = [...runningBalance].reverse();

  const archivedTooltip = "Unarchive goal to perform this action";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-h-[90vh] w-[95vw] max-w-lg p-0 overflow-hidden"
          style={{ borderColor: statusColor, borderWidth: "2px" }}
        >
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <div className="flex items-start gap-2 sm:gap-3">
              <div
                className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${localGoal.color}20` }}
              >
                <Target className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: localGoal.color || "#3b82f6" }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg truncate">{localGoal.name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                  <GoalStatusBadge goal={localGoal} />
                  {priority && (
                    <Badge 
                      variant="outline" 
                      className="flex items-center gap-1 text-xs"
                      style={{ borderColor: priority.color, color: priority.color }}
                    >
                      <Flag className="h-3 w-3" />
                      <span className="hidden sm:inline">{priority.name}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Goal Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Target Amount</p>
                  <p className="text-base sm:text-lg font-semibold">{fmt(localGoal.target_amount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Current Amount</p>
                  <p className="text-base sm:text-lg font-semibold">{fmt(localGoal.current_amount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-base sm:text-lg font-semibold">{fmt(Math.max(0, remaining))}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-medium">
                    {localGoal.deadline ? format(parseISO(localGoal.deadline), "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">
                    {localGoal.start_date ? format(parseISO(localGoal.start_date), "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  {priority ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: priority.color }}
                      />
                      <p className="text-sm font-medium">{priority.name}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>

              {/* Days Status */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getDaysStatus()}</span>
              </div>

              {/* Action Buttons */}
              <TooltipProvider>
                <div className="grid grid-cols-4 gap-2">
                  {/* Edit Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex flex-col gap-1 h-auto py-2 w-full"
                          onClick={() => onEdit(localGoal)}
                          disabled={isArchived}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="text-xs">Edit</span>
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {isArchived && <TooltipContent>{archivedTooltip}</TooltipContent>}
                  </Tooltip>
                  
                  {/* Pause/Activate Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        {isPaused ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-2 w-full"
                            onClick={handleActivate}
                            disabled={isActivating || isArchived}
                          >
                            <Play className="h-4 w-4" />
                            <span className="text-xs">Activate</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-2 w-full"
                            onClick={() => setPauseModalOpen(true)}
                            disabled={isComplete || isArchived}
                          >
                            <Pause className="h-4 w-4" />
                            <span className="text-xs">Pause</span>
                          </Button>
                        )}
                      </div>
                    </TooltipTrigger>
                    {isArchived && <TooltipContent>{archivedTooltip}</TooltipContent>}
                  </Tooltip>
                  
                  {/* Archive/Unarchive Button */}
                  {isArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col gap-1 h-auto py-2"
                      onClick={handleUnarchive}
                      disabled={isUnarchiving}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                      <span className="text-xs">Unarchive</span>
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-2 w-full"
                            onClick={handleArchive}
                            disabled={!canArchive || isArchiving}
                          >
                            <Archive className="h-4 w-4" />
                            <span className="text-xs">Archive</span>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canArchive && <TooltipContent>Complete the goal to archive</TooltipContent>}
                    </Tooltip>
                  )}
                  
                  {/* Delete Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex flex-col gap-1 h-auto py-2 w-full text-destructive hover:text-destructive"
                          onClick={() => setDeleteModalOpen(true)}
                          disabled={isArchived}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-xs">Delete</span>
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {isArchived && <TooltipContent>{archivedTooltip}</TooltipContent>}
                  </Tooltip>
                </div>
              </TooltipProvider>

              <Separator />

              {/* Transactions Section */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Transactions
                </h3>
                {sortedTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transactions linked to this goal yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sortedTransactions.map((t, idx) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          t.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                        }`}>
                          {t.type === "income" 
                            ? <ArrowUpRight className="h-4 w-4 text-green-500" />
                            : <ArrowDownRight className="h-4 w-4 text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.description || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(t.transaction_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${t.type === "income" ? "text-green-500" : "text-red-500"}`}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.goal_amount || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {fmt(displayBalances[idx] || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Goal Log Section */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Activity Log
                </h3>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity logged yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 text-sm border-l-2 border-border pl-3 py-1"
                      >
                        <div className="flex-1">
                          <p className="font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground">
                              {typeof log.details === "object" 
                                ? JSON.stringify(log.details) 
                                : String(log.details)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(log.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <GoalPauseModal
        open={pauseModalOpen}
        onOpenChange={setPauseModalOpen}
        onPause={handlePause}
        isPausing={isPausing}
      />

      <GoalDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        goal={localGoal}
        onPause={() => {
          setDeleteModalOpen(false);
          setPauseModalOpen(true);
        }}
        onArchive={() => {
          handleArchive();
          setDeleteModalOpen(false);
        }}
        onDeleted={() => {
          setDeleteModalOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
