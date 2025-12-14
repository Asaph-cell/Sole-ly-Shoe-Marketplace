-- Create vendor_ratings table
CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vendor_id, buyer_id, order_id)
);

-- Enable RLS
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view vendor ratings
CREATE POLICY "Anyone can view vendor ratings"
ON public.vendor_ratings
FOR SELECT
USING (true);

-- Only buyers who have completed orders can create ratings
CREATE POLICY "Buyers can rate vendors they ordered from"
ON public.vendor_ratings
FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id 
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_id
    AND orders.vendor_id = vendor_ratings.vendor_id
    AND (orders.buyer_email = (auth.jwt() ->> 'email'::text) OR auth.uid() IS NOT NULL)
    AND orders.status = 'completed'
  )
);

-- Buyers can update their own ratings
CREATE POLICY "Buyers can update own ratings"
ON public.vendor_ratings
FOR UPDATE
USING (auth.uid() = buyer_id);

-- Buyers can delete their own ratings
CREATE POLICY "Buyers can delete own ratings"
ON public.vendor_ratings
FOR DELETE
USING (auth.uid() = buyer_id);

-- Add updated_at trigger
CREATE TRIGGER update_vendor_ratings_updated_at
BEFORE UPDATE ON public.vendor_ratings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_vendor_ratings_vendor_id ON public.vendor_ratings(vendor_id);
CREATE INDEX idx_vendor_ratings_buyer_id ON public.vendor_ratings(buyer_id);