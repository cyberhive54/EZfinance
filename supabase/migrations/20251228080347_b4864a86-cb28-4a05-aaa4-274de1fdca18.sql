-- Add goal-related columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
ADD COLUMN goal_amount numeric DEFAULT NULL,
ADD COLUMN goal_allocation_type text DEFAULT NULL; -- 'all' or 'split'

-- Create index for faster goal-related queries
CREATE INDEX idx_transactions_goal_id ON public.transactions(goal_id);

-- Comment for clarity
COMMENT ON COLUMN public.transactions.goal_id IS 'Reference to the goal this transaction contributes to or deducts from';
COMMENT ON COLUMN public.transactions.goal_amount IS 'Amount allocated to/from the goal (for split allocations)';
COMMENT ON COLUMN public.transactions.goal_allocation_type IS 'Type of allocation: all or split';