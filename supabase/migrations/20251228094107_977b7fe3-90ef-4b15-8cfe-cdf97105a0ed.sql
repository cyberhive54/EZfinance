-- Create priority_types table
CREATE TABLE public.priority_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.priority_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view default and own priorities" 
ON public.priority_types 
FOR SELECT 
USING ((is_default = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can insert their own priorities" 
ON public.priority_types 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own priorities" 
ON public.priority_types 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (is_default = false));

CREATE POLICY "Users can delete their own priorities" 
ON public.priority_types 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_default = false));

-- Add priority_id and is_archived to goals
ALTER TABLE public.goals 
ADD COLUMN priority_id UUID REFERENCES public.priority_types(id) ON DELETE SET NULL,
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX idx_goals_priority ON public.goals(priority_id);
CREATE INDEX idx_goals_archived ON public.goals(is_archived);
CREATE INDEX idx_priority_types_user ON public.priority_types(user_id);