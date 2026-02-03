-- Drop the old constraint first to allow the update
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Backfill existing 'transfer' records - assume transfers are from the source account (sender perspective)
UPDATE transactions SET type = 'transfer-sender' WHERE type = 'transfer';

-- Add the new constraint that supports transfer-sender and transfer-receiver
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer-sender', 'transfer-receiver'));
