-- Add frequency field to transactions table
ALTER TABLE public.transactions ADD COLUMN frequency TEXT DEFAULT 'none' CHECK (frequency IN ('none', 'daily', 'every-2-days', 'weekly', 'monthly', 'yearly'));

-- Add next_occurrence_date for cron job reference
ALTER TABLE public.transactions ADD COLUMN next_occurrence_date DATE;

-- Create transaction_attachments table
CREATE TABLE public.transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transaction_attachments
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for transaction_attachments
CREATE POLICY "Users can view their own transaction attachments"
  ON public.transaction_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction attachments"
  ON public.transaction_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction attachments"
  ON public.transaction_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_transaction_attachments_transaction_id ON public.transaction_attachments(transaction_id);
CREATE INDEX idx_transaction_attachments_user_id ON public.transaction_attachments(user_id);
