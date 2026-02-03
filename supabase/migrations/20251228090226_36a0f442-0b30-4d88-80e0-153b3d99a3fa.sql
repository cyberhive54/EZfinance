-- Add new columns to goals table
ALTER TABLE public.goals 
ADD COLUMN start_date date DEFAULT NULL,
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN paused_at timestamp with time zone DEFAULT NULL,
ADD COLUMN completed_at timestamp with time zone DEFAULT NULL;

-- Add check constraint for valid status values
ALTER TABLE public.goals 
ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'paused', 'completed'));

-- Create goal_logs table for audit trail
CREATE TABLE public.goal_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on goal_logs
ALTER TABLE public.goal_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goal_logs
CREATE POLICY "Users can view their own goal logs" 
ON public.goal_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal logs" 
ON public.goal_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal logs" 
ON public.goal_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster goal log lookups
CREATE INDEX idx_goal_logs_goal_id ON public.goal_logs(goal_id);
CREATE INDEX idx_goal_logs_created_at ON public.goal_logs(created_at DESC);
