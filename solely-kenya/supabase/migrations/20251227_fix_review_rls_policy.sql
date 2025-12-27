-- Fix RLS policy for reviews to allow inserts when order is in 'arrived' status
-- This is needed because the OrderConfirmationModal inserts reviews BEFORE
-- the order is marked as 'completed' by the confirm-order edge function.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create reviews for their completed orders" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

-- Create a more permissive policy that allows review creation when order is in confirmation states
CREATE POLICY "Users can create reviews for their orders" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    order_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND o.customer_id = auth.uid()
      AND o.status IN ('arrived', 'delivered', 'completed')
    )
  )
);
