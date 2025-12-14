-- Add delivery_type field to order_shipping_details table
ALTER TABLE public.order_shipping_details 
ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup'));

-- Make address fields nullable since they're not needed for pickup
ALTER TABLE public.order_shipping_details 
ALTER COLUMN address_line1 DROP NOT NULL,
ALTER COLUMN city DROP NOT NULL;

