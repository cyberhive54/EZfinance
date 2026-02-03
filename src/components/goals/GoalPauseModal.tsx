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
import { Loader2 } from "lucide-react";

interface GoalPauseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPause: () => void;
  isPausing: boolean;
}

export function GoalPauseModal({ open, onOpenChange, onPause, isPausing }: GoalPauseModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Pause this goal?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will pause the goal. Instead, you might want to try extending the deadline date.
            </p>
            <p className="text-sm text-muted-foreground">
              Pausing will remove this goal from active goals and goal progress tracking. 
              You can reactivate it anytime.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={onPause} disabled={isPausing}>
            {isPausing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pause Goal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
