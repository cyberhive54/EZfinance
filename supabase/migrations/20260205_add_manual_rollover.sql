-- The budget form sends manual_rollover on create/update. Add the column so
-- budget creation works on a database built from these migrations.
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS manual_rollover BOOLEAN NOT NULL DEFAULT false;
