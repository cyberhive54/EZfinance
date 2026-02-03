import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGoals, Goal } from "@/hooks/useGoals";
import { Loader2, AlertTriangle, Pause, Archive } from "lucide-react";
import { getGoalStatus } from "./GoalStatusBadge";

interface GoalDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onPause: () => void;
  onArchive: () => void;
  onDeleted: () => void;
}

export function GoalDeleteModal({ open, onOpenChange, goal, onPause, onArchive, onDeleted }: GoalDeleteModalProps) {
  const { deleteGoal, isDeleting } = useGoals();

  const status = getGoalStatus(goal);
  const isPaused = status === "paused";
  const isComplete = status === "completed_timely" || status === "completed_delayed";

  const handleDelete = async () => {
    await deleteGoal(goal.id);
    onDeleted();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="font-medium text-foreground">
              This will delete the goal and this process can't be undone.
            </p>
            <p>
              {isComplete 
                ? "Consider archiving instead to keep your goal history."
                : "Consider pausing instead if you might want to continue this goal later."
              }
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Deleting will remove all contribution/deduction data from related transactions permanently.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="mt-0">Close</AlertDialogCancel>
          
          {isComplete ? (
            <Button variant="outline" onClick={onArchive} className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archive Instead
            </Button>
          ) : isPaused ? (
            <Button variant="outline" disabled className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Already Paused
            </Button>
          ) : (
            <Button variant="outline" onClick={onPause} className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause Instead
            </Button>
          )}
          
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Goal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
