-- Add new columns for enhanced budget system
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS rollover_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Create index for faster overlap checking
CREATE INDEX IF NOT EXISTS idx_budgets_category_dates ON public.budgets(category_id, start_date, end_date);

-- Create index for parent-child relationship (Phase 2)
CREATE INDEX IF NOT EXISTS idx_budgets_parent ON public.budgets(parent_budget_id);

-- Create a function to check for overlapping budgets
CREATE OR REPLACE FUNCTION public.check_budget_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count INTEGER;
  new_end_date DATE;
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
  
  -- Check for overlapping budgets with same category and user
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
  
  -- Set end_date if not provided
  IF NEW.end_date IS NULL THEN
    NEW.end_date := new_end_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to check for overlaps before insert/update
DROP TRIGGER IF EXISTS check_budget_overlap_trigger ON public.budgets;
CREATE TRIGGER check_budget_overlap_trigger
BEFORE INSERT OR UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.check_budget_overlap();

-- Create function to auto-create recurring budgets
CREATE OR REPLACE FUNCTION public.create_recurring_budgets()
RETURNS void AS $$
DECLARE
  budget_record RECORD;
  new_start_date DATE;
  new_end_date DATE;
  unused_amount NUMERIC;
  rollover NUMERIC;
BEGIN
  FOR budget_record IN 
    SELECT * FROM public.budgets 
    WHERE is_recurring = true 
    AND period IN ('weekly', 'monthly')
    AND end_date < CURRENT_DATE
  LOOP
    -- Calculate new period dates
    IF budget_record.period = 'weekly' THEN
      new_start_date := budget_record.end_date + INTERVAL '1 day';
      new_end_date := new_start_date + INTERVAL '6 days';
    ELSE -- monthly
      new_start_date := date_trunc('month', budget_record.end_date + INTERVAL '1 month')::date;
      new_end_date := (new_start_date + INTERVAL '1 month - 1 day')::date;
    END IF;
    
    -- Calculate rollover (capped at original amount)
    SELECT COALESCE(SUM(amount), 0) INTO unused_amount
    FROM public.transactions
    WHERE user_id = budget_record.user_id
      AND category_id = budget_record.category_id
      AND type = 'expense'
      AND transaction_date BETWEEN budget_record.start_date AND budget_record.end_date;
    
    unused_amount := budget_record.amount + budget_record.rollover_amount - unused_amount;
    rollover := LEAST(GREATEST(unused_amount, 0), budget_record.amount);
    
    -- Check if new budget already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE user_id = budget_record.user_id 
      AND category_id = budget_record.category_id
      AND start_date = new_start_date
    ) THEN
      -- Create new recurring budget
      INSERT INTO public.budgets (
        user_id, category_id, amount, period, start_date, end_date, 
        is_recurring, rollover_amount
      ) VALUES (
        budget_record.user_id, budget_record.category_id, budget_record.amount,
        budget_record.period, new_start_date, new_end_date,
        true, rollover
      );
      
      -- Mark old budget as non-recurring (it's now historical)
      UPDATE public.budgets SET is_recurring = false WHERE id = budget_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;