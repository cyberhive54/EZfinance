-- Add Phase 2 columns for hierarchy and overall budget
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS is_overall boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS enforce_child_limit boolean NOT NULL DEFAULT false;

-- Update the overlap check function to allow overall budgets (no category)
CREATE OR REPLACE FUNCTION public.check_budget_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count INTEGER;
  new_end_date DATE;
  parent_budget RECORD;
  children_sum NUMERIC;
BEGIN
  -- Calculate end_date based on period if not provided
  new_end_date := COALESCE(NEW.end_date, 
    CASE NEW.period
      WHEN 'weekly' THEN NEW.start_date + INTERVAL '6 days'
      WHEN 'monthly' THEN (date_trunc('month', NEW.start_date) + INTERVAL '1 month - 1 day')::date
      WHEN 'yearly' THEN (date_trunc('year', NEW.start_date) + INTERVAL '1 year - 1 day')::date
      ELSE NEW.start_date + INTERVAL '30 days'
    END
  );
  
  -- For category budgets, check for overlapping budgets with same category
  IF NEW.category_id IS NOT NULL THEN
    SELECT COUNT(*) INTO overlap_count
    FROM public.budgets
    WHERE user_id = NEW.user_id
      AND category_id = NEW.category_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_date, new_end_date) OVERLAPS (
          start_date, 
          COALESCE(end_date, 
            CASE period
              WHEN 'weekly' THEN start_date + INTERVAL '6 days'
              WHEN 'monthly' THEN (date_trunc('month', start_date) + INTERVAL '1 month - 1 day')::date
              WHEN 'yearly' THEN (date_trunc('year', start_date) + INTERVAL '1 year - 1 day')::date
              ELSE start_date + INTERVAL '30 days'
            END
          )
        )
      );
    
    IF overlap_count > 0 THEN
      RAISE EXCEPTION 'A budget for this category already exists in the selected date range';
    END IF;
  END IF;
  
  -- For overall budgets (no category), check for overlapping overall budgets of same period type
  IF NEW.is_overall = true THEN
    SELECT COUNT(*) INTO overlap_count
    FROM public.budgets
    WHERE user_id = NEW.user_id
      AND is_overall = true
      AND period = NEW.period
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_date, new_end_date) OVERLAPS (
          start_date, 
          COALESCE(end_date, 
            CASE period
              WHEN 'weekly' THEN start_date + INTERVAL '6 days'
              WHEN 'monthly' THEN (date_trunc('month', start_date) + INTERVAL '1 month - 1 day')::date
              WHEN 'yearly' THEN (date_trunc('year', start_date) + INTERVAL '1 year - 1 day')::date
              ELSE start_date + INTERVAL '30 days'
            END
          )
        )
      );
    
    IF overlap_count > 0 THEN
      RAISE EXCEPTION 'An overall budget for this period already exists in the selected date range';
    END IF;
  END IF;
  
  -- Validate parent budget constraints if parent is set
  IF NEW.parent_budget_id IS NOT NULL THEN
    SELECT * INTO parent_budget FROM public.budgets WHERE id = NEW.parent_budget_id;
    
    IF parent_budget IS NULL THEN
      RAISE EXCEPTION 'Parent budget not found';
    END IF;
    
    -- Check if parent enforces child limit
    IF parent_budget.enforce_child_limit = true THEN
      -- Calculate sum of all children budgets (excluding current one being updated)
      SELECT COALESCE(SUM(amount), 0) INTO children_sum
      FROM public.budgets
      WHERE parent_budget_id = NEW.parent_budget_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      
      -- Add current budget amount
      children_sum := children_sum + NEW.amount;
      
      IF children_sum > parent_budget.amount THEN
        RAISE EXCEPTION 'Total of child budgets (%) exceeds parent budget limit (%)', children_sum, parent_budget.amount;
      END IF;
    END IF;
  END IF;
  
  -- Set end_date if not provided
  IF NEW.end_date IS NULL THEN
    NEW.end_date := new_end_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create index for overall budgets
CREATE INDEX IF NOT EXISTS idx_budgets_overall ON public.budgets(is_overall, period, start_date);