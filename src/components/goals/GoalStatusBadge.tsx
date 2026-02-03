import { Goal } from "@/hooks/useGoals";
import { Badge } from "@/components/ui/badge";
import { isAfter, isBefore, parseISO, isToday, startOfDay } from "date-fns";

export type GoalStatusType = 
  | "upcoming" 
  | "in_progress" 
  | "delayed" 
  | "completed_timely" 
  | "completed_delayed"
  | "paused";

export function getGoalStatus(goal: Goal): GoalStatusType {
  const today = startOfDay(new Date());
  const isAmountComplete = goal.current_amount >= goal.target_amount;
  
  if (goal.status === "paused") {
    return "paused";
  }
  
  if (goal.start_date) {
    const startDate = startOfDay(parseISO(goal.start_date));
    if (isAfter(startDate, today)) {
      return "upcoming";
    }
  }
  
  if (isAmountComplete) {
    const deadline = goal.deadline ? startOfDay(parseISO(goal.deadline)) : null;
    const completedAt = goal.completed_at ? startOfDay(parseISO(goal.completed_at)) : today;
    
    if (deadline && isAfter(completedAt, deadline)) {
      return "completed_delayed";
    }
    return "completed_timely";
  }
  
  if (goal.deadline) {
    const deadline = startOfDay(parseISO(goal.deadline));
    if (isBefore(deadline, today) && !isToday(parseISO(goal.deadline))) {
      return "delayed";
    }
  }
  
  return "in_progress";
}

export function getStatusLabel(status: GoalStatusType): string {
  switch (status) {
    case "upcoming": return "Upcoming";
    case "in_progress": return "In Progress";
    case "delayed": return "Delayed";
    case "completed_timely": return "Completed";
    case "completed_delayed": return "Delay Completed";
    case "paused": return "Paused";
    default: return "Unknown";
  }
}

export function getStatusColor(status: GoalStatusType): string {
  switch (status) {
    case "upcoming": return "hsl(217, 91%, 60%)";
    case "in_progress": return "hsl(142, 76%, 36%)";
    case "delayed": return "hsl(25, 95%, 53%)";
    case "completed_timely": return "hsl(142, 71%, 45%)";
    case "completed_delayed": return "hsl(45, 93%, 47%)";
    case "paused": return "hsl(215, 20%, 65%)";
    default: return "hsl(215, 20%, 65%)";
  }
}

export function getStatusClasses(status: GoalStatusType): string {
  switch (status) {
    case "upcoming": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "in_progress": return "bg-primary/10 text-primary border-primary/20";
    case "delayed": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "completed_timely": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "completed_delayed": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "paused": return "bg-muted text-muted-foreground border-muted-foreground/20";
    default: return "bg-muted text-muted-foreground";
  }
}

interface GoalStatusBadgeProps {
  goal: Goal;
  showArchived?: boolean;
}

export function GoalStatusBadge({ goal, showArchived = true }: GoalStatusBadgeProps) {
  const status = getGoalStatus(goal);
  const label = getStatusLabel(status);
  const colorClasses = getStatusClasses(status);
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={`${colorClasses} text-xs`}>
        {label}
      </Badge>
      {showArchived && goal.is_archived && (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 text-xs">
          Archived
        </Badge>
      )}
    </div>
  );
}
