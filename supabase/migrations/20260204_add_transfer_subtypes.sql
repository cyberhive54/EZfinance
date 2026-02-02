-- Update transactions table CHECK constraint to support transfer-sender and transfer-receiver
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer-sender', 'transfer-receiver'));
