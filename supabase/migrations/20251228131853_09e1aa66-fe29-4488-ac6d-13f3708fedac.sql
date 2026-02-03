-- Create budget_logs table for activity tracking
CREATE TABLE public.budget_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own budget logs"
ON public.budget_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget logs"
ON public.budget_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget logs"
ON public.budget_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_budget_logs_budget_id ON public.budget_logs(budget_id);
CREATE INDEX idx_budget_logs_user_id ON public.budget_logs(user_id);
