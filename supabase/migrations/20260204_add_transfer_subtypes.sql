-- Backfill existing 'transfer' records - assume transfers are from the source account (sender perspective)
UPDATE transactions SET type = 'transfer-sender' WHERE type = 'transfer';

-- Update transactions table CHECK constraint to support transfer-sender and transfer-receiver
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer-sender', 'transfer-receiver'));
