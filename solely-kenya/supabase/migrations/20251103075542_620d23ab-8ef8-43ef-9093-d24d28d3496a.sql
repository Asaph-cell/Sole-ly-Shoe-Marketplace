-- Create M-Pesa transactions table
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT NOT NULL,
  vendor_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mpesa_receipt_number TEXT,
  transaction_date TEXT,
  result_code INTEGER,
  result_desc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Vendors can view own transactions"
ON public.mpesa_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = vendor_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_mpesa_transactions_checkout_request_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX idx_mpesa_transactions_vendor_id ON public.mpesa_transactions(vendor_id);
CREATE INDEX idx_mpesa_transactions_status ON public.mpesa_transactions(status);