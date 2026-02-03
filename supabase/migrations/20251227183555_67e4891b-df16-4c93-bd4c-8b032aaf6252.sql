-- Create function to update account balance
CREATE OR REPLACE FUNCTION public.update_account_balance(account_id UUID, amount_change DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET balance = balance + amount_change
  WHERE id = account_id;
END;
$$;
